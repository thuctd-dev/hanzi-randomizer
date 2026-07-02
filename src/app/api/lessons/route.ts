import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';

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

    return NextResponse.json({ data: lessons });
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}
