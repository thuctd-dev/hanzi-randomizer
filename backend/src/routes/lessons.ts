import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import connectToDatabase from '../lib/mongodb';
import Lesson from '../models/Lesson';
import Vocabulary from '../models/Vocabulary';

const router = Router();

// GET /api/lessons
// Returns all lessons with word count
router.get('/', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const lessons = await Lesson.find().sort({ order: 1, createdAt: 1 }).lean();

    const countAgg = await Vocabulary.aggregate([
      { $match: { lessonId: { $in: lessons.map((l) => l._id) } } },
      { $group: { _id: '$lessonId', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const item of countAgg) countMap[item._id.toString()] = item.count;

    res.json({
      data: lessons.map((l) => ({
        id:        l._id.toString(),
        name:      l.name,
        order:     l.order,
        wordCount: countMap[l._id.toString()] ?? 0,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// POST /api/lessons — create a new lesson
router.post('/', async (req: Request, res: Response) => {
  try {
    const name  = (req.body.name  || '').trim();
    const order = Number(req.body.order ?? 0);

    if (!name) {
      res.status(400).json({ error: 'Lesson name is required.' });
      return;
    }

    await connectToDatabase();

    const existing = await Lesson.findOne({ name }).lean();
    if (existing) {
      res.status(409).json({ error: 'Lesson already exists.' });
      return;
    }

    const lesson = await Lesson.create({ name, order });
    res.status(201).json({
      data: { id: lesson._id.toString(), name: lesson.name, order: lesson.order },
    });
  } catch (error) {
    console.error('Failed to create lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// PATCH /api/lessons/:id — rename or reorder a lesson
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name  = req.body.name  !== undefined ? (req.body.name as string).trim() : undefined;
    const order = req.body.order !== undefined ? Number(req.body.order) : undefined;

    if (name === undefined && order === undefined) {
      res.status(400).json({ error: 'Nothing to update.' });
      return;
    }

    await connectToDatabase();

    if (name) {
      const conflict = await Lesson.findOne({ name, _id: { $ne: id } }).lean();
      if (conflict) {
        res.status(409).json({ error: 'Lesson name already exists.' });
        return;
      }
    }

    const updated = await Lesson.findByIdAndUpdate(
      id,
      { ...(name !== undefined && { name }), ...(order !== undefined && { order }) },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    res.json({ data: { id: updated._id.toString(), name: updated.name, order: updated.order } });
  } catch (error) {
    console.error('Failed to update lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /api/lessons/:id — delete lesson and its vocabulary
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await connectToDatabase();

    const deleted = await Lesson.findByIdAndDelete(id).lean();
    if (!deleted) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    await Vocabulary.deleteMany({ lessonId: id });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// POST /api/lessons/migrate — one-time: migrate old string lesson field to lessonId refs
router.post('/migrate', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    // Find all unique lesson strings still in old vocabulary docs
    const oldVocabs = await (Vocabulary as unknown as mongoose.Model<mongoose.Document & { lesson?: string }>)
      .find({ lesson: { $nin: [null, ''] } })
      .lean();

    const lessonNames = [...new Set(oldVocabs.map((v: { lesson?: string }) => v.lesson as string))];

    let created = 0;
    const lessonMap: Record<string, string> = {};

    for (let i = 0; i < lessonNames.length; i++) {
      const name = lessonNames[i];
      let lesson = await Lesson.findOne({ name }).lean();
      if (!lesson) {
        lesson = await Lesson.create({ name, order: i });
        created++;
      }
      lessonMap[name] = (lesson._id as mongoose.Types.ObjectId).toString();
    }

    // Update each vocabulary doc
    let updated = 0;
    for (const vocab of oldVocabs) {
      const lessonName = (vocab as { lesson?: string }).lesson;
      if (lessonName && lessonMap[lessonName]) {
        await Vocabulary.findByIdAndUpdate(vocab._id, {
          $set:   { lessonId: lessonMap[lessonName] },
          $unset: { lesson: '', topic: '' },
        });
        updated++;
      }
    }

    res.json({ success: true, lessonsCreated: created, vocabularyUpdated: updated });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

export default router;
