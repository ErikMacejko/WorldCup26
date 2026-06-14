// Mirrors server/src/lib/bracket.js - same fixed pairing convention, used
// here for a live preview of the player's derived 32-team bracket.

export const POT_PAIRS = [
  ['A', 'B'],
  ['C', 'D'],
  ['E', 'F'],
  ['G', 'H'],
  ['I', 'J'],
  ['K', 'L'],
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// groupsData: { [letter]: { order: [1st, 2nd, 3rd, 4th] } }
// thirdLetters: up to 8 group letters whose 3rd place advances
// Returns 16 [teamA, teamB] pairs (R32), in a fixed order.
export function buildBracket32(groupsData, thirdLetters) {
  const pairs = [];
  for (const [x, y] of POT_PAIRS) {
    const gx = groupsData?.[x]?.order;
    const gy = groupsData?.[y]?.order;
    if (!gx || !gy) continue;
    pairs.push([gx[0], gy[1]]); // 1X vs 2Y
    pairs.push([gy[0], gx[1]]); // 1Y vs 2X
  }
  const sorted = [...(thirdLetters || [])].sort();
  for (let i = 0; i < sorted.length; i += 2) {
    const a = groupsData?.[sorted[i]]?.order?.[2];
    const b = groupsData?.[sorted[i + 1]]?.order?.[2];
    if (a == null || b == null) continue;
    pairs.push([a, b]);
  }
  return pairs;
}

// True once a full bracket can be derived: all 12 groups have a complete
// 4-team order AND exactly 8 thirds have been chosen to advance.
export function isBracketComplete(groupsData, thirdLetters) {
  const ok = LETTERS.every(
    (l) => Array.isArray(groupsData?.[l]?.order) && groupsData[l].order.length === 4
  );
  return ok && Array.isArray(thirdLetters) && thirdLetters.length === 8;
}
