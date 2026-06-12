import { Router } from 'express';
import { Prediction } from '../models/Prediction.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Aggregated leaderboard across all finished/scored matches.
// Hidden (admin-hidden) users are excluded.
router.get('/', requireAuth, async (req, res) => {
  const visibleUsers = await User.find({
    hiddenFromLeaderboard: { $ne: true },
    nickname: { $type: 'string' },
  }).select('_id nickname');

  const idToNick = new Map(visibleUsers.map((u) => [u._id.toString(), u.nickname]));
  const ids = visibleUsers.map((u) => u._id);

  const agg = await Prediction.aggregate([
    { $match: { user: { $in: ids }, points: { $ne: null } } },
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        scored: { $sum: 1 },
        exact: { $sum: { $cond: [{ $eq: ['$points', 3] }, 1, 0] } },
      },
    },
  ]);

  const byUser = new Map(agg.map((a) => [a._id.toString(), a]));

  const rows = visibleUsers
    .map((u) => {
      const a = byUser.get(u._id.toString());
      return {
        nickname: u.nickname,
        totalPoints: a?.totalPoints || 0,
        scored: a?.scored || 0,
        exact: a?.exact || 0,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.exact - a.exact ||
        a.nickname.localeCompare(b.nickname)
    )
    .map((row, i) => ({ rank: i + 1, ...row }));

  res.json(rows);
});

export default router;
