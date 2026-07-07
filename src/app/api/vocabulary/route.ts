import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const topic  = searchParams.get('topic');
    const lesson = searchParams.get('lesson');
    const excludeRadicals = searchParams.get('excludeRadicals') === '1';
    const free   = searchParams.get('free') === '1'; // từ tự do: không gắn lesson/topic
    const hasLesson = searchParams.get('hasLesson') === '1'; // chỉ lấy từ có lesson

    const query: Record<string, unknown> = {};
    if (topic)  query['topic']  = topic;
    if (lesson) query['lesson'] = lesson;
    if (free) {
      query['topic']  = { $in: [null, ''] };
      query['lesson'] = { $in: [null, ''] };
    }
    if (hasLesson) {
      query['lesson'] = { $nin: [null, ''] };
    }
    if (!lesson && !free && excludeRadicals) {
      query['lesson'] = { $not: /bộ thủ/i };
    }

    const docs = await Vocabulary.find(query).sort({ createdAt: 1 });
    const data = docs.map((v) => ({
      id:      v._id.toString(),
      hanzi:   v.hanzi,
      pinyin:  v.pinyin,
      meaning: v.meaning,
      topic:   v.topic  ?? null,
      lesson:  v.lesson ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, topic, lesson } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid data format. Expected array of items.' }, { status: 400 });
    }

    await connectToDatabase();

    const docs = items.map((item: { hanzi: string; pinyin: string; meaning: string }) => ({
      hanzi:   item.hanzi,
      pinyin:  item.pinyin,
      meaning: item.meaning,
      topic:   topic?.trim()  || null,
      lesson:  lesson?.trim() || null,
    }));

    const result = await Vocabulary.insertMany(docs);
    return NextResponse.json({ success: true, count: result.length }, { status: 201 });
  } catch (error) {
    console.error('Failed to save vocabulary:', error);
    return NextResponse.json({ error: 'Failed to save vocabulary' }, { status: 500 });
  }
}
