// Scoring for the Playoff (knockout bracket) predictions.
//
// The "reference" bracket is built from the admin-entered GroupResult via
// buildBracket32 (our own convention, see lib/bracket.js), then each
// reference pairing's winner is whichever of its two teams went furthest in
// the real tournament ("depth"). Depths are derived from finished knockout
// Match docs, so reference winners refine progressively as results come in.

import { GROUPS } from '../seed/matchData.js';

const LETTERS = Object.keys(GROUPS);

const LOSS_DEPTH = {
  round32: 1,
  round16: 2,
  quarter: 3,
  semi: 4,
  final: 5,
};

// Map<team, depth 0-6>:
//   0 = eliminated in groups, 1 = lost R32 (or not yet eliminated), 2 = lost
//   R16, 3 = lost QF, 4 = lost SF, 5 = runner-up, 6 = champion.
export function computeRealDepths(groupResult, knockoutMatches) {
  const depths = new Map();
  const groups = groupResult?.groups || {};
  const advancingThirds = groupResult?.advancingThirds || [];

  for (const letter of LETTERS) {
    for (const team of GROUPS[letter]) depths.set(team, 0);
  }
  for (const letter of LETTERS) {
    const order = groups[letter]?.order;
    if (!order) continue;
    if (order[0]) depths.set(order[0], 1);
    if (order[1]) depths.set(order[1], 1);
    if (advancingThirds.includes(letter) && order[2]) depths.set(order[2], 1);
  }

  for (const m of knockoutMatches || []) {
    if (m.status !== 'finished' || !m.result) continue;
    if (m.homeTeam === 'TBD' || m.awayTeam === 'TBD') continue;
    const { home, away, penaltyWinner } = m.result;
    if (home == null || away == null) continue;

    let winner, loser;
    if (home > away) { winner = m.homeTeam; loser = m.awayTeam; }
    else if (away > home) { winner = m.awayTeam; loser = m.homeTeam; }
    else if (penaltyWinner === 'home') { winner = m.homeTeam; loser = m.awayTeam; }
    else if (penaltyWinner === 'away') { winner = m.awayTeam; loser = m.homeTeam; }
    else continue; // unresolved draw

    if (m.stage === 'final') {
      depths.set(winner, 6);
      depths.set(loser, 5);
    } else if (m.stage === 'third') {
      // Both sides already sit at the semi-final-loser depth (4).
      continue;
    } else {
      const lossDepth = LOSS_DEPTH[m.stage];
      if (lossDepth != null) depths.set(loser, lossDepth);
    }
  }

  return depths;
}

function depthOf(depths, team) {
  return depths.get(team) ?? 0;
}

// Winner of a fictional pairing = team with the higher real depth.
// Equal depths -> no scoreable winner (null).
function depthWinner(depths, a, b) {
  const da = depthOf(depths, a);
  const db = depthOf(depths, b);
  if (da === db) return null;
  return da > db ? a : b;
}

// referenceBracket: 16 [teamA, teamB] R32 pairs (from buildBracket32 on GroupResult).
// Returns 5 rounds: [R32 (16), R16 (8), QF (4), SF (2), Final (1)], each an
// array of { pair: [a,b], winner: team|null }.
export function buildReferenceRounds(referenceBracket, depths) {
  const rounds = [];
  let pairs = referenceBracket;
  for (let round = 0; round < 4; round++) {
    rounds.push(pairs.map(([a, b]) => ({ pair: [a, b], winner: depthWinner(depths, a, b) })));
    const advancing = pairs.map(([a, b]) => {
      const w = depthWinner(depths, a, b);
      if (w) return w;
      return [a, b].sort()[0]; // deterministic tiebreak so the bracket stays complete
    });
    const next = [];
    for (let i = 0; i < advancing.length; i += 2) next.push([advancing[i], advancing[i + 1]]);
    pairs = next;
  }
  const finalPair = pairs[0] || [null, null];
  rounds.push([{ pair: finalPair, winner: depthWinner(depths, finalPair[0], finalPair[1]) }]);
  return rounds;
}

const ROUND_KEYS = ['r32Winners', 'r16Winners', 'qfWinners', 'sfWinners'];
const ROUND_NAMES = ['r32', 'r16', 'qf', 'sf'];

function buildPredictedRounds(predictedBracket, predictedWinners) {
  const rounds = [];
  let pairs = predictedBracket;
  for (const key of ROUND_KEYS) {
    const winners = predictedWinners?.[key] || [];
    rounds.push(pairs.map((pair, j) => ({ pair, winner: winners[j] ?? null })));
    const next = [];
    for (let j = 0; j < winners.length; j += 2) next.push([winners[j], winners[j + 1]]);
    pairs = next;
  }
  rounds.push([{ pair: pairs[0] || [null, null], winner: predictedWinners?.champion || null }]);
  return rounds;
}

function pairMatches(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) return false;
  if (a[0] == null || a[1] == null || b[0] == null || b[1] == null) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa[0] === sb[0] && sa[1] === sb[1];
}

// predictedBracket: 16 [a,b] R32 pairs derived from the user's GroupPrediction.
// predictedWinners: { r32Winners[16], r16Winners[8], qfWinners[4], sfWinners[2], champion }
// reference: result of buildReferenceRounds(...)
// Returns { total, breakdown }, total max 71.
export function computePlayoffPoints(predictedBracket, predictedWinners, reference) {
  const predicted = buildPredictedRounds(predictedBracket, predictedWinners);
  const breakdown = {};
  let total = 0;

  for (let r = 0; r < 4; r++) {
    let pairingPts = 0;
    let winnerPts = 0;
    for (let j = 0; j < reference[r].length; j++) {
      const refEntry = reference[r][j];
      const predEntry = predicted[r][j];
      if (predEntry && pairMatches(predEntry.pair, refEntry.pair)) pairingPts += 1;
      if (refEntry.winner && predEntry && predEntry.winner === refEntry.winner) winnerPts += 1;
    }
    breakdown[ROUND_NAMES[r]] = { pairing: pairingPts, winner: winnerPts };
    total += pairingPts + winnerPts;
  }

  const refFinal = reference[4][0];
  const predFinal = predicted[4][0];
  const finalPairing = predFinal && pairMatches(predFinal.pair, refFinal.pair) ? 1 : 0;
  const championPts = refFinal.winner && predFinal?.winner === refFinal.winner ? 10 : 0;
  breakdown.final = { pairing: finalPairing, champion: championPts };
  total += finalPairing + championPts;

  return { total, breakdown };
}
