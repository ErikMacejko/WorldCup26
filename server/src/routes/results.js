import { Router } from 'express';
import { Match } from '../models/Match.js';
import { GroupResult } from '../models/GroupResult.js';
import { fetchStandings } from '../lib/footballData.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Real-time group standings (groups A-L), pulled live from football-data.org.
router.get('/tables', requireAuth, async (req, res) => {
  const groupResult = await GroupResult.getSingleton();
  try {
    const groups = await fetchStandings();
    res.json({ groups, lastSyncAt: groupResult.lastSyncAt, lastSyncError: null });
  } catch (err) {
    res.json({ groups: {}, lastSyncAt: groupResult.lastSyncAt, lastSyncError: err.message || String(err) });
  }
});

function pairFromMatch(m) {
  if (!m || (m.homeTeam === 'TBD' && m.awayTeam === 'TBD')) return null;
  return [m.homeTeam === 'TBD' ? null : m.homeTeam, m.awayTeam === 'TBD' ? null : m.awayTeam];
}

function scoresFromMatch(m) {
  if (!m || m.result?.home == null || m.result?.away == null) return null;
  return [m.result.home, m.result.away];
}

function winnerFromMatch(m) {
  if (!m || m.result?.home == null || m.result?.away == null) return null;
  const { home, away, penaltyWinner } = m.result;
  if (home > away) return m.homeTeam;
  if (away > home) return m.awayTeam;
  if (penaltyWinner === 'home') return m.homeTeam;
  if (penaltyWinner === 'away') return m.awayTeam;
  return null;
}

// Real knockout bracket, built from our Match collection (kept in sync with
// football-data.org by lib/sync.js). Same shape as the prediction bracket's
// derived rounds, for the shared BracketView component.
router.get('/playoff', requireAuth, async (req, res) => {
  const [matches, groupResult] = await Promise.all([
    Match.find({ matchNumber: { $gte: 73, $lte: 104 } }).sort({ matchNumber: 1 }),
    GroupResult.getSingleton(),
  ]);
  const byNumber = new Map(matches.map((m) => [m.matchNumber, m]));

  function buildRound(start, end) {
    const pairs = [];
    const winners = [];
    const scores = [];
    for (let n = start; n <= end; n++) {
      const m = byNumber.get(n);
      pairs.push(pairFromMatch(m));
      winners.push(winnerFromMatch(m));
      scores.push(scoresFromMatch(m));
    }
    return { pairs, winners, scores };
  }

  const r32 = buildRound(73, 88);
  const r16 = buildRound(89, 96);
  const qf = buildRound(97, 100);
  const sf = buildRound(101, 102);
  const final = buildRound(104, 104);

  res.json({
    r32,
    r16,
    qf,
    sf,
    final: { pairs: final.pairs, winner: final.winners[0], scores: final.scores },
    lastSyncAt: groupResult.lastSyncAt,
  });
});

export default router;
