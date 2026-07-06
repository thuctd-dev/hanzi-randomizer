import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';
import { DEFAULT_VOCABULARY } from '@/lib/defaultVocabulary';

export async function GET() {
  try {
    await connectToDatabase();

    // Aggregate distinct lessons with word count, sorted by lesson name
    const lessons = await Vocabulary.aggregate([
      {
        $group: {
          _id: '$lesson',
          count: { $sum: 1 },
          // Grab the earliest createdAt to sort lessons chronologically
          firstCreated: { $min: '$createdAt' },
        },
      },
      { $sort: { firstCreated: 1 } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);

    if (lessons.length > 0) {
      return NextResponse.json({ data: lessons });
    }

    const lessonMap: Record<string, number> = {};
    for (const item of DEFAULT_VOCABULARY) {
      lessonMap[item.lesson] = (lessonMap[item.lesson] ?? 0) + 1;
    }

    const fallbackLessons = Object.entries(lessonMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi')); // stable ordering for display

    return NextResponse.json({ data: fallbackLessons });
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const lessonName = url.searchParams.get('lesson');
    if (!lessonName) {
      return NextResponse.json({ error: 'Missing lesson name' }, { status: 400 });
    }

    await connectToDatabase();
    const result = await Vocabulary.deleteMany({ lesson: lessonName });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lesson:', error);
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 });
  }
}
