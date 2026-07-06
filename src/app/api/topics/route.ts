import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Topic from '@/models/Topic';

export async function GET() {
  try {
    await connectToDatabase();

    const topics = await Topic.find().sort({ createdAt: 1 }).lean();
    return NextResponse.json({ data: topics.map((topic) => ({ name: topic.name })) });
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Topic name is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Topic.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Topic already exists.' }, { status: 409 });
    }

    const topic = await Topic.create({ name });
    return NextResponse.json({ data: { name: topic.name } });
  } catch (error) {
    console.error('Failed to create topic:', error);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'Topic name is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await Topic.deleteOne({ name });
    if (deleted.deletedCount === 0) {
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete topic:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
