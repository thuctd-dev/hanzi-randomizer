import { Router, Request, Response } from 'express';
import connectToDatabase from '../lib/mongodb';
import Vocabulary from '../models/Vocabulary';

const router = Router();

// GET /api/vocabulary
router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { topic, lesson, excludeRadicals, free, hasLesson } = req.query;

    const query: Record<string, unknown> = {};

    if (topic)  query['topic']  = topic;
    if (lesson) query['lesson'] = lesson;

    if (free === '1') {
      query['topic']  = { $in: [null, ''] };
      query['lesson'] = { $in: [null, ''] };
    }
    if (hasLesson === '1') {
      query['lesson'] = { $nin: [null, ''] };
    }
    if (!lesson && !free && excludeRadicals === '1') {
      query['lesson'] = { $not: /bộ thủ/i };
    }

    const docs = await Vocabulary.find(query).sort({ createdAt: 1 }).lean();
    const data = docs.map((v) => ({
      id:      v._id.toString(),
      hanzi:   v.hanzi,
      pinyin:  v.pinyin,
      meaning: v.meaning,
      topic:   v.topic  ?? null,
      lesson:  v.lesson ?? null,
    }));

    res.json({ data });
  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// POST /api/vocabulary
router.post('/', async (req: Request, res: Response) => {
  try {
    const { items, topic, lesson } = req.body;

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Invalid data format. Expected array of items.' });
      return;
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
    const { hanzi, pinyin, meaning, lesson } = req.body;

    if (!hanzi || !pinyin || !meaning) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await connectToDatabase();

    const updated = await Vocabulary.findByIdAndUpdate(
      id,
      { hanzi, pinyin, meaning, ...(lesson ? { lesson } : {}) },
      { new: true }
    ).lean();

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
        lesson:  updated.lesson,
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
