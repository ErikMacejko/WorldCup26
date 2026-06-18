import { Router } from 'express';
import { Prediction } from '../models/Prediction.js';
import { GroupPrediction } from '../models/GroupPrediction.js';
import { PlayoffPrediction } from '../models/PlayoffPrediction.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Aggregated leaderboard across all finished/scored matches plus Skupiny and
// Playoff predictions. Hidden (admin-hidden) users are excluded.
router.get('/', requireAuth, async (req, res) => {
  const visibleUsers = await User.find({
    hiddenFromLeaderboard: { $ne: true },
    nickname: { $type: 'string' },
  }).select('_id nickname');

  const ids = visibleUsers.map((u) => u._id);

  const [matchAgg, groupPreds, playoffPreds] = await Promise.all([
    Prediction.aggregate([
      { $match: { user: { $in: ids }, points: { $ne: null } } },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$points' },
          scored: { $sum: 1 },
          exact: { $sum: { $cond: [{ $eq: ['$points', 3] }, 1, 0] } },
        },
      },
    ]),
    GroupPrediction.find({ user: { $in: ids } }).select('user points'),
    PlayoffPrediction.find({ user: { $in: ids } }).select('user points'),
  ]);

  const matchByUser = new Map(matchAgg.map((a) => [a._id.toString(), a]));
  const groupByUser = new Map(groupPreds.map((p) => [p.user.toString(), p.points]));
  const playoffByUser = new Map(playoffPreds.map((p) => [p.user.toString(), p.points]));

  const rows = visibleUsers
    .map((u) => {
      const m = matchByUser.get(u._id.toString());
      const matchPoints = m?.totalPoints || 0;
      const groupPoints = groupByUser.get(u._id.toString()) || 0;
      const playoffPoints = playoffByUser.get(u._id.toString()) || 0;
      return {
        nickname: u.nickname,
        exact: m?.exact || 0,
        matchPoints,
        groupPoints,
        playoffPoints,
        scored: m?.scored || 0, 
        totalPoints: matchPoints + groupPoints + playoffPoints
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
