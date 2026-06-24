// Scoring for the Skupiny (group-order) predictions.

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
// completedLetters: group letters whose real order is final - groups not yet
// finished score null (hidden) instead of 0, and don't count toward total.
// Returns { total, perGroup: { [letter]: points|null }, thirdsBonus }.
export function computeGroupPoints(predictedGroups, predictedThirds, realGroups, realThirds, completedLetters) {
  const completedSet = new Set(completedLetters || LETTERS);
  const perGroup = {};
  let total = 0;
  for (const letter of LETTERS) {
    if (!completedSet.has(letter)) {
      perGroup[letter] = null;
      continue;
    }
    const pts = computeGroupOrderPoints(predictedGroups?.[letter]?.order, realGroups?.[letter]?.order);
    perGroup[letter] = pts;
    total += pts;
  }

  // The "best 3rd place" ranking is inherently cross-group, so it's only
  // known once the entire group stage has finished (realThirds.length === 8).
  let thirdsBonus = null;
  if ((realThirds || []).length === 8) {
    const realSet = new Set(realThirds);
    thirdsBonus = 0;
    for (const letter of predictedThirds || []) {
      if (realSet.has(letter)) thirdsBonus += 1;
    }
    total += thirdsBonus;
  }

  return { total, perGroup, thirdsBonus };
}

// Scores a player's GroupPrediction against the admin-entered GroupResult,
// one group at a time as each group's real order becomes final - a player
// gets their Group B points as soon as Group B finishes, without waiting for
// the rest of the group stage. Returns { points: null, perGroup: null,
// thirdsBonus: null } only while no group has finished yet.
export function scoreGroupPrediction(predictedGroups, groupResult) {
  const realGroups = groupResult?.groups || {};
  const realThirds = groupResult?.advancingThirds || [];
  const completedLetters = groupResult?.completedGroups || [];
  if (completedLetters.length === 0) {
    return { points: null, perGroup: null, thirdsBonus: null };
  }
  const predictedThirds = getThirdAdvancesLetters(predictedGroups);
  const { total, perGroup, thirdsBonus } = computeGroupPoints(
    predictedGroups,
    predictedThirds,
    realGroups,
    realThirds,
    completedLetters
  );
  return { points: total, perGroup, thirdsBonus };
}
