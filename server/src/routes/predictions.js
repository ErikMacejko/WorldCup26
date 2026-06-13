import { Router } from 'express';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { computePoints } from '../lib/scoring.js';
import { requireAuth, requireNickname } from '../middleware/auth.js';

const router = Router();

// All of the current user's own predictions, keyed by match id.
router.get('/mine', requireAuth, async (req, res) => {
  const preds = await Prediction.find({ user: req.user._id });
  const byMatch = {};
  for (const p of preds) {
    byMatch[p.match.toString()] = {
      matchId: p.match.toString(),
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      points: p.points,
      updatedAt: p.updatedAt,
    };
  }
  res.json(byMatch);
});

function parseScore(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 99) return null;
  return n;
}

// Create or update a prediction for a match. Normally only allowed while the
// match is not locked (more than 30 min before kickoff). Once locked, an
// admin can grant individual players a one-shot back-fill (match.backfillFor)
// from the Results tab — submitting consumes that grant.
router.put('/:matchId', requireAuth, requireNickname, async (req, res) => {
  const homeScore = parseScore(req.body?.homeScore);
  const awayScore = parseScore(req.body?.awayScore);
  if (homeScore === null || awayScore === null) {
    return res.status(400).json({ error: 'invalid_score' });
  }

  const match = await Match.findById(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'match_not_found' });

  if (match.isLocked()) {
    const grantIdx = match.backfillFor.findIndex((id) => id.equals(req.user._id));
    if (grantIdx === -1) {
      return res.status(423).json({ error: 'locked' });
    }
    match.backfillFor.splice(grantIdx, 1);
    await match.save();
  }

  // If the match is already finished, score a back-filled tip immediately
  // (the normal admin "set result" rescore already ran before this tip existed).
  const finished =
    match.status === 'finished' && match.result?.home != null && match.result?.away != null;
  const points = finished
    ? computePoints(
        { home: homeScore, away: awayScore },
        { home: match.result.home, away: match.result.away }
      )
    : null;

  const pred = await Prediction.findOneAndUpdate(
    { user: req.user._id, match: match._id },
    { homeScore, awayScore, points },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({
    matchId: match._id.toString(),
    homeScore: pred.homeScore,
    awayScore: pred.awayScore,
    points: pred.points,
    updatedAt: pred.updatedAt,
  });
});

// Everyone's tips for a single match — only revealed once the match is locked
// (30 min before kickoff).
router.get('/match/:matchId', requireAuth, async (req, res) => {
  const match = await Match.findById(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'match_not_found' });
  if (!match.isLocked()) {
    return res.status(403).json({ error: 'not_revealed_yet' });
  }

  const preds = await Prediction.find({ match: match._id }).populate(
    'user',
    'nickname hiddenFromLeaderboard'
  );

  const tips = preds
    .filter((p) => p.user) // safety
    .map((p) => ({
      nickname: p.user.nickname || '—',
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      points: p.points,
    }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  res.json({ matchId: match._id.toString(), tips });
});

export default router;
