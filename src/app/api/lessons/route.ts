import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';

// GET /api/lessons — aggregate distinct lessons từ bảng vocabulary
export async function GET() {
  try {
    await connectToDatabase();

    const agg = await Vocabulary.aggregate([
      { $match: { lesson: { $nin: [null, ''] } } },
      {
        $group: {
          _id: '$lesson',
          count: { $sum: 1 },
          firstCreated: { $min: '$createdAt' },
        },
      },
      { $sort: { _id: 1 } }, // sắp xếp theo tên bài
      { $project: { _id: 0, name: '$_id', count: 1, firstCreated: 1 } },
    ]);

    return NextResponse.json({ data: agg });
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}

// PATCH /api/lessons — đổi tên lesson (cập nhật tất cả vocabulary liên quan)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const oldName = (body.oldName || '').trim();
    const newName = (body.newName || '').trim();

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'oldName and newName are required.' }, { status: 400 });
    }
    if (oldName === newName) {
      return NextResponse.json({ success: true });
    }

    await connectToDatabase();

    // Kiểm tra tên mới đã tồn tại chưa
    const exists = await Vocabulary.findOne({ lesson: newName });
    if (exists) {
      return NextResponse.json({ error: 'Lesson name already exists.' }, { status: 409 });
    }

    await Vocabulary.updateMany({ lesson: oldName }, { $set: { lesson: newName } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to rename lesson:', error);
    return NextResponse.json({ error: 'Failed to rename lesson' }, { status: 500 });
  }
}

// DELETE /api/lessons?name=... — xóa lesson + vocabulary liên quan
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'Lesson name is required.' }, { status: 400 });

    await connectToDatabase();
    const result = await Vocabulary.deleteMany({ lesson: name });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lesson:', error);
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 });
  }
}
