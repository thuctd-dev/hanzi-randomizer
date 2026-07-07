import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Topic from '@/models/Topic';
import Vocabulary from '@/models/Vocabulary';

// GET /api/topics — danh sách chủ đề kèm số từ
export async function GET() {
  try {
    await connectToDatabase();

    const topics = await Topic.find().sort({ createdAt: 1 }).lean();
    const topicNames = topics.map((t) => t.name);

    const countAgg = await Vocabulary.aggregate([
      { $match: { topic: { $in: topicNames } } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const item of countAgg) countMap[item._id] = item.count;

    return NextResponse.json({
      data: topics.map((t) => ({ name: t.name, wordCount: countMap[t.name] ?? 0 })),
    });
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}

// POST /api/topics — tạo chủ đề mới
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Topic name is required.' }, { status: 400 });

    await connectToDatabase();
    const existing = await Topic.findOne({ name });
    if (existing) return NextResponse.json({ error: 'Topic already exists.' }, { status: 409 });

    const topic = await Topic.create({ name });
    return NextResponse.json({ data: { name: topic.name } });
  } catch (error) {
    console.error('Failed to create topic:', error);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}

// DELETE /api/topics?name=... — xóa chủ đề + từ vựng liên quan
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'Topic name is required.' }, { status: 400 });

    await connectToDatabase();
    const deleted = await Topic.deleteOne({ name });
    if (deleted.deletedCount === 0) return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });

    await Vocabulary.deleteMany({ topic: name });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete topic:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
