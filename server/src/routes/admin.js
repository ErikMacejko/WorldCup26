import { Router } from 'express';
import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { computePoints } from '../lib/scoring.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// Recompute the points of every prediction for one match.
async function rescoreMatch(match) {
  const preds = await Prediction.find({ match: match._id });
  const finished =
    match.status === 'finished' &&
    match.result?.home != null &&
    match.result?.away != null;

  for (const p of preds) {
    p.points = finished
      ? computePoints(
          { home: p.homeScore, away: p.awayScore },
          { home: match.result.home, away: match.result.away }
        )
      : null;
    await p.save();
  }
}

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

// Delete a single tip of a player (e.g. they back-filled it wrong for an
// already-played match and can't edit it themselves once locked). After this,
// the normal PUT /predictions/:matchId route treats it as a fresh tip again
// and accepts a new one even though the match is locked/finished.
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

// List matches (for result entry).
router.get('/matches', async (req, res) => {
  const now = new Date();
  const matches = await Match.find().sort({ kickoff: 1, matchNumber: 1 });
  res.json(matches.map((m) => m.toClient(now)));
});

// Set / update the actual result of a match, then rescore all predictions.
router.put('/matches/:id/result', async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'not_found' });

  const home = Number(req.body?.home);
  const away = Number(req.body?.away);
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return res.status(400).json({ error: 'invalid_result' });
  }

  match.result = { home, away };
  match.status = 'finished';
  await match.save();
  await rescoreMatch(match);

  res.json(match.toClient());
});

// Clear a result (e.g. entered by mistake).
router.delete('/matches/:id/result', async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'not_found' });
  match.result = { home: null, away: null };
  match.status = 'scheduled';
  await match.save();
  await rescoreMatch(match);
  res.json(match.toClient());
});

export default router;
