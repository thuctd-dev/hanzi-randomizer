import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vocabulary from '@/models/Vocabulary';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { hanzi, pinyin, meaning, lesson } = body;

    if (!hanzi || !pinyin || !meaning) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();
    
    const updatedVocab = await Vocabulary.findByIdAndUpdate(
      id,
      { hanzi, pinyin, meaning, ...(lesson ? { lesson } : {}) },
      { new: true }
    );

    if (!updatedVocab) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedVocab._id.toString(),
        hanzi: updatedVocab.hanzi,
        pinyin: updatedVocab.pinyin,
        meaning: updatedVocab.meaning,
        lesson: updatedVocab.lesson,
      }
    });
  } catch (error) {
    console.error('Failed to update vocabulary:', error);
    return NextResponse.json({ error: 'Failed to update vocabulary' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const deletedVocab = await Vocabulary.findByIdAndDelete(id);

    if (!deletedVocab) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete vocabulary:', error);
    return NextResponse.json({ error: 'Failed to delete vocabulary' }, { status: 500 });
  }
}
