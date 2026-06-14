// Scoring for the Playoff (knockout bracket) predictions.
//
// For each round, a player's predicted entrants (the previous round's
// winners) are compared against the teams that *really* reached that round
// in the actual tournament — by set membership, independent of bracket
// position — plus a bonus for each predicted pairing that also occurs as a
// real matchup in that round. The champion pick is a flat bonus.

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

// Teams whose real depth is >= threshold, i.e. teams that *won* their match
// in the previous round and so really reached this round.
function realAdvancers(depths, threshold) {
  const out = [];
  for (const [team, depth] of depths) {
    if (depth >= threshold) out.push(team);
  }
  return out;
}

// [a, b, c, d] -> [[a, b], [c, d]] (consecutive bracket pairs).
function chunkPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

function pairKey(a, b) {
  return [a, b].sort().join('|');
}

// Real matchups for a knockout stage, as team pairs (only matches whose two
// teams are already assigned).
function realPairings(knockoutMatches, stage) {
  return (knockoutMatches || [])
    .filter((m) => m.stage === stage && m.homeTeam !== 'TBD' && m.awayTeam !== 'TBD')
    .map((m) => [m.homeTeam, m.awayTeam]);
}

// +1 per predicted team that's also in the real set for that round.
function countTeamHits(predicted, realSet) {
  return (predicted || []).filter((team) => team && realSet.has(team)).length;
}

// +1 per predicted pairing that's also a real pairing for that round.
function countPairingHits(predictedPairs, realPairs) {
  const realKeys = new Set(realPairs.map(([a, b]) => pairKey(a, b)));
  return predictedPairs.filter(([a, b]) => a && b && realKeys.has(pairKey(a, b))).length;
}

// Depth a team needs to have *really reached* (won its previous-round match
// and advanced into) each round.
const ADVANCE_DEPTH = { r16: 2, qf: 3, sf: 4, final: 5 };

// predictedWinners: { r32Winners[16], r16Winners[8], qfWinners[4], sfWinners[2], champion }
// depths: result of computeRealDepths(...)
// knockoutMatches: Match docs for matchNumber 73-104
// Returns { total, breakdown }, max 54.
export function computePlayoffPoints(predictedWinners, depths, knockoutMatches) {
  const breakdown = {};
  let total = 0;

  function scoreRound(key, predictedTeams, advanceDepth, stage) {
    const realTeams = new Set(realAdvancers(depths, advanceDepth));
    const team = countTeamHits(predictedTeams, realTeams);
    const pairing = countPairingHits(chunkPairs(predictedTeams), realPairings(knockoutMatches, stage));
    breakdown[key] = { team, pairing };
    total += team + pairing;
  }

  scoreRound('r16', predictedWinners.r32Winners, ADVANCE_DEPTH.r16, 'round16');
  scoreRound('qf', predictedWinners.r16Winners, ADVANCE_DEPTH.qf, 'quarter');
  scoreRound('sf', predictedWinners.qfWinners, ADVANCE_DEPTH.sf, 'semi');

  const realFinalists = new Set(realAdvancers(depths, ADVANCE_DEPTH.final));
  const finalTeam = countTeamHits(predictedWinners.sfWinners, realFinalists);
  const realChampion = realAdvancers(depths, 6)[0] || null;
  const championPts = realChampion && predictedWinners.champion === realChampion ? 10 : 0;
  breakdown.final = { team: finalTeam, champion: championPts };
  total += finalTeam + championPts;

  return { total, breakdown };
}
