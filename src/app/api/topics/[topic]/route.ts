import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lesson from '@/models/Lesson';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ topic: string }> }
) {
  try {
    const { topic } = await params;
    await connectToDatabase();

    const lessons = await Lesson.find({ topic }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ data: lessons.map((lesson) => ({ name: lesson.name })) });
  } catch (error) {
    console.error('Failed to fetch lessons for topic:', error);
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topic: string }> }
) {
  try {
    const { topic } = await params;
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Lesson name is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await Lesson.findOne({ topic, name });
    if (existing) {
      return NextResponse.json({ error: 'Lesson already exists.' }, { status: 409 });
    }

    const lesson = await Lesson.create({ topic, name });
    return NextResponse.json({ data: { name: lesson.name } });
  } catch (error) {
    console.error('Failed to create lesson:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ topic: string }> }
) {
  try {
    const { topic } = await params;
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'Lesson name is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await Lesson.deleteOne({ topic, name });
    if (deleted.deletedCount === 0) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lesson:', error);
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 });
  }
}
