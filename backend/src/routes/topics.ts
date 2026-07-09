import { Router, Request, Response } from 'express';
import connectToDatabase from '../lib/mongodb';
import Topic from '../models/Topic';
import Vocabulary from '../models/Vocabulary';

const router = Router();

// GET /api/topics
router.get('/', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const topics = await Topic.find().sort({ createdAt: 1 }).lean();
    const topicNames = topics.map((t) => t.name);

    const countAgg = await Vocabulary.aggregate([
      { $match: { topic: { $in: topicNames } } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const item of countAgg) countMap[item._id] = item.count;

    res.json({
      data: topics.map((t) => ({ name: t.name, wordCount: countMap[t.name] ?? 0 })),
    });
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /api/topics
router.post('/', async (req: Request, res: Response) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Topic name is required.' });
      return;
    }

    await connectToDatabase();
    const existing = await Topic.findOne({ name }).lean();
    if (existing) {
      res.status(409).json({ error: 'Topic already exists.' });
      return;
    }

    const topic = await Topic.create({ name });
    res.json({ data: { name: topic.name } });
  } catch (error) {
    console.error('Failed to create topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// DELETE /api/topics?name=...
router.delete('/', async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) {
      res.status(400).json({ error: 'Topic name is required.' });
      return;
    }

    await connectToDatabase();
    const deleted = await Topic.deleteOne({ name });
    if (deleted.deletedCount === 0) {
      res.status(404).json({ error: 'Topic not found.' });
      return;
    }

    await Vocabulary.deleteMany({ topic: name });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete topic:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
