import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import { DEFAULT_VOCABULARY } from '@/lib/defaultVocabulary';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const lesson = searchParams.get('lesson');
    const excludeRadicals = searchParams.get('excludeRadicals') === '1';

    const query: Record<string, unknown> = {};
    if (topic) {
      (query as Record<string, unknown>)['topic'] = topic;
    }
    if (lesson) {
      (query as Record<string, unknown>)['lesson'] = lesson;
    }
    if (!lesson && excludeRadicals) {
      (query as Record<string, unknown>)['lesson'] = { $not: /bộ thủ/i };
    }

    const dbVocabularies = await Vocabulary.find(query).sort({ createdAt: 1 });
    const vocabularies = dbVocabularies.map((v) => ({
      id: v._id.toString(),
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      meaning: v.meaning,
      topic: v.topic,
      lesson: v.lesson,
    }));

    return NextResponse.json({ data: vocabularies });
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

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic name is required.' }, { status: 400 });
    }

    if (!lesson || !lesson.trim()) {
      return NextResponse.json({ error: 'Lesson name is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const itemsWithTopicLesson = items.map((item: { hanzi: string; pinyin: string; meaning: string }) => ({
      ...item,
      topic: topic.trim(),
      lesson: lesson.trim(),
    }));

    const result = await Vocabulary.insertMany(itemsWithTopicLesson);
    return NextResponse.json({ success: true, count: result.length }, { status: 201 });
  } catch (error) {
    console.error('Failed to save vocabulary:', error);
    return NextResponse.json({ error: 'Failed to save vocabulary' }, { status: 500 });
  }
}
