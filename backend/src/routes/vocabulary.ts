import { Router, Request, Response } from 'express';
import connectToDatabase from '../lib/mongodb';
import Vocabulary from '../models/Vocabulary';
import Lesson from '../models/Lesson';

const router = Router();

// GET /api/vocabulary
// Query params: lessonId, topic, free=1 (no lesson)
router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { lessonId, topic, free } = req.query;
    const query: Record<string, unknown> = {};

    if (lessonId) query['lessonId'] = lessonId;
    if (topic)    query['topic']    = topic;
    if (free === '1') query['lessonId'] = null;

    const docs = await Vocabulary.find(query)
      .populate('lessonId', 'name order')
      .sort({ createdAt: 1 })
      .lean();

    const data = docs.map((v) => ({
      id:       v._id.toString(),
      hanzi:    v.hanzi,
      pinyin:   v.pinyin,
      meaning:  v.meaning,
      topic:    v.topic ?? null,
      lesson:   v.lessonId
        ? { id: (v.lessonId as { _id: unknown; name: string; order: number })._id?.toString(), name: (v.lessonId as { _id: unknown; name: string; order: number }).name, order: (v.lessonId as { _id: unknown; name: string; order: number }).order }
        : null,
    }));

    res.json({ data });
  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// POST /api/vocabulary
// Body: { items: [{hanzi, pinyin, meaning}], lessonId? }
router.post('/', async (req: Request, res: Response) => {
  try {
    const { items, lessonId, topic } = req.body;

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Invalid data format. Expected array of items.' });
      return;
    }

    await connectToDatabase();

    // Validate lessonId if provided
    if (lessonId) {
      const lesson = await Lesson.findById(lessonId).lean();
      if (!lesson) {
        res.status(404).json({ error: 'Lesson not found.' });
        return;
      }
    }

    const docs = items.map((item: { hanzi: string; pinyin: string; meaning: string }) => ({
      hanzi:    item.hanzi,
      pinyin:   item.pinyin,
      meaning:  item.meaning,
      lessonId: lessonId || null,
      topic:    topic?.trim() || null,
    }));

    const result = await Vocabulary.insertMany(docs);
    res.status(201).json({ success: true, count: result.length });
  } catch (error) {
    console.error('Failed to save vocabulary:', error);
    res.status(500).json({ error: 'Failed to save vocabulary' });
  }
});

// PUT /api/vocabulary/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hanzi, pinyin, meaning, lessonId, topic } = req.body;

    if (!hanzi || !pinyin || !meaning) {
      res.status(400).json({ error: 'Missing required fields: hanzi, pinyin, meaning' });
      return;
    }

    await connectToDatabase();

    if (lessonId) {
      const lesson = await Lesson.findById(lessonId).lean();
      if (!lesson) {
        res.status(404).json({ error: 'Lesson not found.' });
        return;
      }
    }

    const updated = await Vocabulary.findByIdAndUpdate(
      id,
      { hanzi, pinyin, meaning, lessonId: lessonId || null, topic: topic?.trim() || null },
      { new: true }
    ).populate('lessonId', 'name order').lean();

    if (!updated) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id:      updated._id.toString(),
        hanzi:   updated.hanzi,
        pinyin:  updated.pinyin,
        meaning: updated.meaning,
        lesson:  updated.lessonId
          ? { id: (updated.lessonId as { _id: unknown; name: string; order: number })._id?.toString(), name: (updated.lessonId as { _id: unknown; name: string; order: number }).name }
          : null,
      },
    });
  } catch (error) {
    console.error('Failed to update vocabulary:', error);
    res.status(500).json({ error: 'Failed to update vocabulary' });
  }
});

// DELETE /api/vocabulary/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await connectToDatabase();

    const deleted = await Vocabulary.findByIdAndDelete(id).lean();
    if (!deleted) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete vocabulary:', error);
    res.status(500).json({ error: 'Failed to delete vocabulary' });
  }
});

export default router;
