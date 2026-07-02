import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const lesson = searchParams.get('lesson');

    const query = lesson ? { lesson } : {};
    const vocabularies = await Vocabulary.find(query).sort({ createdAt: 1 });

    const formattedData = vocabularies.map(v => ({
      id: v._id.toString(),
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      meaning: v.meaning,
      lesson: v.lesson,
    }));
    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, lesson } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid data format. Expected array of items.' }, { status: 400 });
    }

    if (!lesson || !lesson.trim()) {
      return NextResponse.json({ error: 'Lesson name is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const itemsWithLesson = items.map((item: { hanzi: string; pinyin: string; meaning: string }) => ({
      ...item,
      lesson: lesson.trim(),
    }));

    const result = await Vocabulary.insertMany(itemsWithLesson);
    return NextResponse.json({ success: true, count: result.length }, { status: 201 });
  } catch (error) {
    console.error('Failed to save vocabulary:', error);
    return NextResponse.json({ error: 'Failed to save vocabulary' }, { status: 500 });
  }
}
