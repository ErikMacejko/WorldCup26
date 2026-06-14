import { Router } from 'express';
import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { GroupResult } from '../models/GroupResult.js';
import { syncResults } from '../lib/sync.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// Overview of all players with quick stats.
router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  const agg = await Prediction.aggregate([
    {
      $group: {
        _id: '$user',
        predictions: { $sum: 1 },
        totalPoints: { $sum: { $ifNull: ['$points', 0] } },
      },
    },
  ]);
  const stats = new Map(agg.map((a) => [a._id.toString(), a]));

  res.json(
    users.map((u) => {
      const s = stats.get(u._id.toString());
      return {
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        nickname: u.nickname,
        isAdmin: u.isAdmin,
        blocked: u.blocked,
        hiddenFromLeaderboard: u.hiddenFromLeaderboard,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        predictions: s?.predictions || 0,
        totalPoints: s?.totalPoints || 0,
      };
    })
  );
});

// Detailed view of one player: profile, login history, and all their tips.
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });

  const preds = await Prediction.find({ user: user._id }).populate(
    'match',
    'matchNumber stage group homeTeam awayTeam kickoff result status'
  );

  const predictions = preds
    .filter((p) => p.match)
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff))
    .map((p) => ({
      matchId: p.match._id.toString(),
      matchNumber: p.match.matchNumber,
      stage: p.match.stage,
      group: p.match.group,
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      kickoff: p.match.kickoff,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      points: p.points,
      result:
        p.match.result?.home != null && p.match.result?.away != null
          ? { home: p.match.result.home, away: p.match.result.away }
          : null,
      updatedAt: p.updatedAt,
    }));

  res.json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    nickname: user.nickname,
    isAdmin: user.isAdmin,
    blocked: user.blocked,
    hiddenFromLeaderboard: user.hiddenFromLeaderboard,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    loginHistory: [...user.loginHistory].reverse().slice(0, 50),
    predictions,
  });
});

// Hide / un-hide a user from the leaderboard.
router.post('/users/:id/toggle-hide', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  user.hiddenFromLeaderboard = !user.hiddenFromLeaderboard;
  await user.save();
  res.json({ id: user._id.toString(), hiddenFromLeaderboard: user.hiddenFromLeaderboard });
});

// Delete a single tip of a player (e.g. they entered it wrong and the match
// is locked so they can't fix it themselves). Combine with unlocking the
// match if they also need to resubmit.
router.delete('/users/:id/predictions/:matchId', async (req, res) => {
  const pred = await Prediction.findOneAndDelete({
    user: req.params.id,
    match: req.params.matchId,
  });
  if (!pred) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// Block / unblock a user from logging in.
router.post('/users/:id/toggle-block', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  if (user._id.equals(req.user._id)) {
    return res.status(400).json({ error: 'cannot_block_self' });
  }
  user.blocked = !user.blocked;
  await user.save();
  res.json({ id: user._id.toString(), blocked: user.blocked });
});

// List matches (for result entry), including which players currently hold a
// back-fill grant for each one.
router.get('/matches', async (req, res) => {
  const now = new Date();
  const matches = await Match.find().sort({ kickoff: 1, matchNumber: 1 });
  res.json(
    matches.map((m) => ({
      ...m.toClient(now),
      backfillFor: m.backfillFor.map((id) => id.toString()),
    }))
  );
});

// Replace the set of players granted a one-shot back-fill for this locked
// match (see predictions.js). Pass an empty array to revoke all.
router.post('/matches/:id/backfill', async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'not_found' });

  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  match.backfillFor = userIds;
  await match.save();

  res.json({ id: match._id.toString(), backfillFor: match.backfillFor.map((id) => id.toString()) });
});

// Real final group standings + advancing-thirds picks (auto-synced from
// football-data.org by lib/sync.js), used as the scoring reference for
// Skupiny/Playoff predictions.
router.get('/group-result', async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  res.json({
    groups: groupResult.groups || {},
    advancingThirds: groupResult.advancingThirds || [],
    predictionsLocked: groupResult.predictionsLocked,
    lastSyncAt: groupResult.lastSyncAt,
    lastSyncError: groupResult.lastSyncError,
  });
});

// Toggle the global Skupiny/Playoff prediction lock.
router.post('/group-result/toggle-lock', async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  groupResult.predictionsLocked = !groupResult.predictionsLocked;
  await groupResult.save();
  res.json({ predictionsLocked: groupResult.predictionsLocked });
});

// Trigger an immediate sync against football-data.org.
router.post('/sync-results', async (req, res) => {
  const status = await syncResults();
  res.json(status);
});

export default router;
