import { Router } from 'express';
import { Match } from '../models/Match.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All matches (sorted by kickoff). Used by the tipovacka, schedule and the
// week navigation. The client decides which week to show.
router.get('/', requireAuth, async (req, res) => {
  const now = new Date();
  const matches = await Match.find().sort({ kickoff: 1, matchNumber: 1 });
  res.json(matches.map((m) => m.toClient(now)));
});

export default router;
