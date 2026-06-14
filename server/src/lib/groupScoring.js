// Scoring for the Skupiny (group-order) predictions.

import { isBracketComplete } from './bracket.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// groups: { [letter]: { order: [4 team names], thirdAdvances: bool } }
// Returns the letters whose 3rd place is marked as advancing.
export function getThirdAdvancesLetters(groups) {
  return LETTERS.filter((l) => groups?.[l]?.thirdAdvances);
}

// Correct 1st place = +2, every other correctly placed team (2nd/3rd/4th) = +1.
// Max 5 per group.
export function computeGroupOrderPoints(predictedOrder, realOrder) {
  if (!Array.isArray(predictedOrder) || !Array.isArray(realOrder)) return 0;
  let pts = 0;
  for (let i = 0; i < 4; i++) {
    if (predictedOrder[i] && predictedOrder[i] === realOrder[i]) {
      pts += i === 0 ? 2 : 1;
    }
  }
  return pts;
}

// predictedGroups / realGroups: { [letter]: { order: [4 team names] } }
// predictedThirds / realThirds: arrays of group letters whose 3rd place advances
// Returns { total, perGroup: { [letter]: points }, thirdsBonus }, total max 68.
export function computeGroupPoints(predictedGroups, predictedThirds, realGroups, realThirds) {
  const perGroup = {};
  let total = 0;
  for (const letter of LETTERS) {
    const pts = computeGroupOrderPoints(predictedGroups?.[letter]?.order, realGroups?.[letter]?.order);
    perGroup[letter] = pts;
    total += pts;
  }

  const realSet = new Set(realThirds || []);
  let thirdsBonus = 0;
  for (const letter of predictedThirds || []) {
    if (realSet.has(letter)) thirdsBonus += 1;
  }
  total += thirdsBonus;

  return { total, perGroup, thirdsBonus };
}

// Scores a player's GroupPrediction against the admin-entered GroupResult.
// Returns { points: null, perGroup: null, thirdsBonus: null } while the
// reference data is incomplete (all 12 groups + exactly 8 advancing thirds).
export function scoreGroupPrediction(predictedGroups, groupResult) {
  const realGroups = groupResult?.groups || {};
  const realThirds = groupResult?.advancingThirds || [];
  if (!isBracketComplete(realGroups, realThirds)) {
    return { points: null, perGroup: null, thirdsBonus: null };
  }
  const predictedThirds = getThirdAdvancesLetters(predictedGroups);
  const { total, perGroup, thirdsBonus } = computeGroupPoints(
    predictedGroups,
    predictedThirds,
    realGroups,
    realThirds
  );
  return { points: total, perGroup, thirdsBonus };
}
