import { Router } from 'express';
import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { GroupPrediction } from '../models/GroupPrediction.js';
import { PlayoffPrediction } from '../models/PlayoffPrediction.js';
import { GroupResult } from '../models/GroupResult.js';
import { GROUPS } from '../seed/matchData.js';
import { computePoints } from '../lib/scoring.js';
import { buildBracket32, isBracketComplete } from '../lib/bracket.js';
import { scoreGroupPrediction, getThirdAdvancesLetters } from '../lib/groupScoring.js';
import { computeRealDepths, buildReferenceRounds, computePlayoffPoints } from '../lib/playoffScoring.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const LETTERS = Object.keys(GROUPS);
const ALL_TEAMS = Object.values(GROUPS).flat();

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

// Recompute every player's Skupiny points against the current GroupResult.
async function rescoreGroups() {
  const groupResult = await GroupResult.getSingleton();
  const preds = await GroupPrediction.find();
  for (const p of preds) {
    const { points, perGroup, thirdsBonus } = scoreGroupPrediction(p.groups, groupResult);
    p.points = points;
    p.perGroup = perGroup;
    p.thirdsBonus = thirdsBonus;
    await p.save();
  }
}

// Recompute every player's Playoff points against the current GroupResult +
// real knockout results.
async function rescorePlayoffs() {
  const groupResult = await GroupResult.getSingleton();
  const realThirds = groupResult.advancingThirds || [];
  const referenceReady = isBracketComplete(groupResult.groups, realThirds);

  const preds = await PlayoffPrediction.find();
  if (!referenceReady) {
    for (const p of preds) {
      p.points = null;
      p.breakdown = null;
      await p.save();
    }
    return;
  }

  const knockoutMatches = await Match.find({ matchNumber: { $gte: 73, $lte: 104 } });
  const depths = computeRealDepths(groupResult, knockoutMatches);
  const referenceBracket = buildBracket32(groupResult.groups, realThirds);
  const referenceRounds = buildReferenceRounds(referenceBracket, depths);

  for (const p of preds) {
    const gp = await GroupPrediction.findOne({ user: p.user });
    const groups = gp?.groups || {};
    const thirds = getThirdAdvancesLetters(groups);
    if (!isBracketComplete(groups, thirds)) {
      p.points = null;
      p.breakdown = null;
      await p.save();
      continue;
    }
    const predictedBracket = buildBracket32(groups, thirds);
    const { total, breakdown } = computePlayoffPoints(
      predictedBracket,
      {
        r32Winners: p.r32Winners,
        r16Winners: p.r16Winners,
        qfWinners: p.qfWinners,
        sfWinners: p.sfWinners,
        champion: p.champion,
      },
      referenceRounds
    );
    p.points = total;
    p.breakdown = breakdown;
    await p.save();
  }
}

function isValidGroupOrder(order, letter) {
  if (!Array.isArray(order) || order.length !== 4) return false;
  const a = [...order].sort();
  const b = [...GROUPS[letter]].sort();
  return a.every((t, i) => t === b[i]);
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

// Set / update the actual result of a match, then rescore all predictions.
router.put('/matches/:id/result', async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'not_found' });

  const home = Number(req.body?.home);
  const away = Number(req.body?.away);
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return res.status(400).json({ error: 'invalid_result' });
  }

  // Penalty shootout winner only makes sense for a draw in a knockout match.
  let penaltyWinner = null;
  if (home === away && match.stage !== 'group') {
    if (req.body?.penaltyWinner === 'home' || req.body?.penaltyWinner === 'away') {
      penaltyWinner = req.body.penaltyWinner;
    }
  }

  match.result = { home, away, penaltyWinner };
  match.status = 'finished';
  await match.save();
  await rescoreMatch(match);
  if (match.stage !== 'group') await rescorePlayoffs();

  res.json(match.toClient());
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

// Set the real teams for a knockout match whose participants were TBD.
router.put('/matches/:id/teams', async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'not_found' });

  const homeTeam = req.body?.homeTeam;
  const awayTeam = req.body?.awayTeam;
  if (!ALL_TEAMS.includes(homeTeam) || !ALL_TEAMS.includes(awayTeam)) {
    return res.status(400).json({ error: 'invalid_team' });
  }

  match.homeTeam = homeTeam;
  match.awayTeam = awayTeam;
  await match.save();
  await rescorePlayoffs();

  res.json(match.toClient());
});

// Real final group standings + advancing-thirds picks, used as the scoring
// reference for Skupiny/Playoff predictions.
router.get('/group-result', async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  res.json({
    groups: groupResult.groups || {},
    advancingThirds: groupResult.advancingThirds || [],
    predictionsLocked: groupResult.predictionsLocked,
  });
});

// Set the real 8 group letters whose 3rd-placed team advances.
// Registered before /group-result/:letter to avoid path conflicts.
router.put('/group-result/advancing-thirds', async (req, res) => {
  const letters = req.body?.letters;
  if (!Array.isArray(letters) || letters.length > 8) {
    return res.status(400).json({ error: 'invalid_thirds' });
  }
  const unique = new Set(letters);
  if (unique.size !== letters.length || ![...unique].every((l) => LETTERS.includes(l))) {
    return res.status(400).json({ error: 'invalid_thirds' });
  }

  const groupResult = await GroupResult.getSingleton();
  groupResult.advancingThirds = letters;
  await groupResult.save();
  await rescoreGroups();
  await rescorePlayoffs();

  res.json({ advancingThirds: groupResult.advancingThirds });
});

// Toggle the global Skupiny/Playoff prediction lock.
// Registered before /group-result/:letter to avoid path conflicts.
router.post('/group-result/toggle-lock', async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  groupResult.predictionsLocked = !groupResult.predictionsLocked;
  await groupResult.save();
  res.json({ predictionsLocked: groupResult.predictionsLocked });
});

// Set the real 1st-4th order for one group.
router.put('/group-result/:letter', async (req, res) => {
  const letter = req.params.letter;
  if (!LETTERS.includes(letter)) return res.status(400).json({ error: 'invalid_group' });

  const order = req.body?.order;
  if (!isValidGroupOrder(order, letter)) return res.status(400).json({ error: 'invalid_order' });

  const groupResult = await GroupResult.getSingleton();
  groupResult.groups = { ...groupResult.groups, [letter]: { order } };
  await groupResult.save();
  await rescoreGroups();
  await rescorePlayoffs();

  res.json({ groups: groupResult.groups, advancingThirds: groupResult.advancingThirds });
});

// Clear the real 1st-4th order for one group (undo an accidental entry).
router.delete('/group-result/:letter', async (req, res) => {
  const letter = req.params.letter;
  if (!LETTERS.includes(letter)) return res.status(400).json({ error: 'invalid_group' });

  const groupResult = await GroupResult.getSingleton();
  const groups = { ...groupResult.groups };
  delete groups[letter];
  groupResult.groups = groups;
  await groupResult.save();
  await rescoreGroups();
  await rescorePlayoffs();

  res.json({ groups: groupResult.groups, advancingThirds: groupResult.advancingThirds });
});

export default router;
