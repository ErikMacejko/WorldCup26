import { Router } from 'express';
import { GroupPrediction } from '../models/GroupPrediction.js';
import { PlayoffPrediction } from '../models/PlayoffPrediction.js';
import { GroupResult } from '../models/GroupResult.js';
import { buildBracket32, isBracketComplete } from '../lib/bracket.js';
import { getThirdAdvancesLetters } from '../lib/groupScoring.js';
import { requireAuth, requireNickname } from '../middleware/auth.js';

const router = Router();

// Forms the next round's pairs from this round's pairs + chosen winners.
// Returns null if any winner isn't part of its pair.
function pairsFromWinners(prevPairs, winners) {
  for (let i = 0; i < winners.length; i++) {
    if (!prevPairs[i]?.includes(winners[i])) return null;
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) next.push([winners[i], winners[i + 1]]);
  return next;
}

// The current user's derived 32-team bracket + saved Playoff prediction.
router.get('/mine', requireAuth, async (req, res) => {
  const [gp, pp, groupResult] = await Promise.all([
    GroupPrediction.findOne({ user: req.user._id }),
    PlayoffPrediction.findOne({ user: req.user._id }),
    GroupResult.getSingleton(),
  ]);

  const groups = gp?.groups || {};
  const thirds = getThirdAdvancesLetters(groups);
  const bracket = isBracketComplete(groups, thirds) ? buildBracket32(groups, thirds) : null;

  res.json({
    bracket,
    r32Winners: pp?.r32Winners || [],
    r16Winners: pp?.r16Winners || [],
    qfWinners: pp?.qfWinners || [],
    sfWinners: pp?.sfWinners || [],
    champion: pp?.champion || null,
    points: pp?.points ?? null,
    breakdown: pp?.breakdown ?? null,
    locked: groupResult.predictionsLocked,
  });
});

// Save the full round-by-round bracket picks.
router.put('/mine', requireAuth, requireNickname, async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  if (groupResult.predictionsLocked) return res.status(423).json({ error: 'locked' });

  const gp = await GroupPrediction.findOne({ user: req.user._id });
  const groups = gp?.groups || {};
  const thirds = getThirdAdvancesLetters(groups);
  if (!isBracketComplete(groups, thirds)) {
    return res.status(409).json({ error: 'groups_incomplete' });
  }
  const bracket = buildBracket32(groups, thirds); // 16 R32 pairs

  const body = req.body || {};
  const r32Winners = body.r32Winners;
  if (!Array.isArray(r32Winners) || r32Winners.length !== 16) {
    return res.status(400).json({ error: 'invalid_r32' });
  }
  const r16Pairs = pairsFromWinners(bracket, r32Winners);
  if (!r16Pairs) return res.status(400).json({ error: 'invalid_r32' });

  const r16Winners = body.r16Winners;
  if (!Array.isArray(r16Winners) || r16Winners.length !== 8) {
    return res.status(400).json({ error: 'invalid_r16' });
  }
  const qfPairs = pairsFromWinners(r16Pairs, r16Winners);
  if (!qfPairs) return res.status(400).json({ error: 'invalid_r16' });

  const qfWinners = body.qfWinners;
  if (!Array.isArray(qfWinners) || qfWinners.length !== 4) {
    return res.status(400).json({ error: 'invalid_qf' });
  }
  const sfPairs = pairsFromWinners(qfPairs, qfWinners);
  if (!sfPairs) return res.status(400).json({ error: 'invalid_qf' });

  const sfWinners = body.sfWinners;
  if (!Array.isArray(sfWinners) || sfWinners.length !== 2) {
    return res.status(400).json({ error: 'invalid_sf' });
  }
  const finalPairs = pairsFromWinners(sfPairs, sfWinners);
  if (!finalPairs) return res.status(400).json({ error: 'invalid_sf' });

  const champion = body.champion;
  if (!finalPairs[0].includes(champion)) {
    return res.status(400).json({ error: 'invalid_champion' });
  }

  const pred = await PlayoffPrediction.findOneAndUpdate(
    { user: req.user._id },
    { r32Winners, r16Winners, qfWinners, sfWinners, champion, points: null, breakdown: null },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({
    bracket,
    r32Winners: pred.r32Winners,
    r16Winners: pred.r16Winners,
    qfWinners: pred.qfWinners,
    sfWinners: pred.sfWinners,
    champion: pred.champion,
    points: pred.points,
    breakdown: pred.breakdown,
    locked: false,
  });
});

export default router;
