import { Router } from 'express';
import { GROUPS } from '../seed/matchData.js';
import { GroupPrediction } from '../models/GroupPrediction.js';
import { PlayoffPrediction } from '../models/PlayoffPrediction.js';
import { GroupResult } from '../models/GroupResult.js';
import { scoreGroupPrediction } from '../lib/groupScoring.js';
import { requireAuth, requireNickname } from '../middleware/auth.js';

const router = Router();
const LETTERS = Object.keys(GROUPS);

// Static team lists per group - { A: [4 names], ..., L: [4 names] }.
router.get('/', requireAuth, async (req, res) => {
  res.json(GROUPS);
});

// The current user's Skupiny prediction, plus the global lock state.
router.get('/mine', requireAuth, async (req, res) => {
  const [pred, groupResult] = await Promise.all([
    GroupPrediction.findOne({ user: req.user._id }),
    GroupResult.getSingleton(),
  ]);
  res.json({
    groups: pred?.groups || {},
    points: pred?.points ?? null,
    perGroup: pred?.perGroup ?? null,
    thirdsBonus: pred?.thirdsBonus ?? null,
    locked: groupResult.predictionsLocked,
  });
});

// Any logged-in user can view another player's group picks (read-only).
router.get('/player/:userId', requireAuth, async (req, res) => {
  const pred = await GroupPrediction.findOne({ user: req.params.userId });
  if (!pred) return res.json({ groups: {}, points: null, perGroup: null, thirdsBonus: null });
  res.json({ groups: pred.groups, points: pred.points, perGroup: pred.perGroup, thirdsBonus: pred.thirdsBonus });
});

function isValidOrder(order, letter) {
  if (!Array.isArray(order) || order.length !== 4) return false;
  const a = [...order].sort();
  const b = [...GROUPS[letter]].sort();
  return a.every((t, i) => t === b[i]);
}

// Save the full 1st-4th order for all 12 groups, plus exactly 8 "3rd place
// advances" picks. Saving a new Skupiny prediction invalidates any existing
// Playoff prediction, since the derived 32-team bracket may have changed.
router.put('/mine', requireAuth, requireNickname, async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  if (groupResult.predictionsLocked) return res.status(423).json({ error: 'locked' });

  const body = req.body?.groups;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'invalid_payload' });

  const groups = {};
  let thirdsCount = 0;
  for (const letter of LETTERS) {
    const g = body[letter];
    if (!isValidOrder(g?.order, letter)) {
      return res.status(400).json({ error: 'invalid_order', letter });
    }
    const thirdAdvances = !!g.thirdAdvances;
    if (thirdAdvances) thirdsCount += 1;
    groups[letter] = { order: g.order, thirdAdvances };
  }
  if (thirdsCount !== 8) {
    return res.status(400).json({ error: 'invalid_thirds_count' });
  }

  const { points, perGroup, thirdsBonus } = scoreGroupPrediction(groups, groupResult);

  const pred = await GroupPrediction.findOneAndUpdate(
    { user: req.user._id },
    { groups, points, perGroup, thirdsBonus },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await PlayoffPrediction.deleteOne({ user: req.user._id });

  res.json({
    groups: pred.groups,
    points: pred.points,
    perGroup: pred.perGroup,
    thirdsBonus: pred.thirdsBonus,
    locked: false,
  });
});

export default router;
