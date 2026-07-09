import { Router, Request, Response } from 'express';
import connectToDatabase from '../lib/mongodb';
import Vocabulary from '../models/Vocabulary';

const router = Router();

// GET /api/lessons
router.get('/', async (_req: Request, res: Response) => {
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
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id', count: 1, firstCreated: 1 } },
    ]);

    res.json({ data: agg });
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// PATCH /api/lessons — rename lesson
router.patch('/', async (req: Request, res: Response) => {
  try {
    const oldName = (req.body.oldName || '').trim();
    const newName = (req.body.newName || '').trim();

    if (!oldName || !newName) {
      res.status(400).json({ error: 'oldName and newName are required.' });
      return;
    }
    if (oldName === newName) {
      res.json({ success: true });
      return;
    }

    await connectToDatabase();

    const exists = await Vocabulary.findOne({ lesson: newName }).lean();
    if (exists) {
      res.status(409).json({ error: 'Lesson name already exists.' });
      return;
    }

    await Vocabulary.updateMany({ lesson: oldName }, { $set: { lesson: newName } });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to rename lesson:', error);
    res.status(500).json({ error: 'Failed to rename lesson' });
  }
});

// DELETE /api/lessons?name=...
router.delete('/', async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) {
      res.status(400).json({ error: 'Lesson name is required.' });
      return;
    }

    await connectToDatabase();
    const result = await Vocabulary.deleteMany({ lesson: name });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;
