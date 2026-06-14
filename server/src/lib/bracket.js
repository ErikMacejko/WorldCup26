// Shared bracket-building convention for the Skupiny -> Playoff flow.
//
// Reproduces FIFA's actual 2026 Round-of-32 draw structure (see "2026 FIFA
// World Cup knockout stage"): 8 of the 16 R32 matches pair a group winner or
// runner-up against another group's winner/runner-up (fixed, independent of
// which 3rd-placed teams advance); the other 8 pair a group winner against
// the "best 3rd place" team from a set of 5 candidate groups. Which candidate
// fills each of those 8 slots is decided by FIFA's 495-scenario Annex C
// table, which isn't published anywhere we can read - so instead, each
// player assigns their own predicted 3rd-placed teams to these 8 slots
// (thirdPicks), e.g. by checking FIFA's official bracket predictor.
//
// The 16 slots below are listed in bracket-tree leaf order, i.e. pairing up
// consecutive slots reproduces FIFA's Round-of-16 matchups, and so on through
// the quarters/semis/final (see client BracketTree's toPairs).
export const R32_SLOTS = [
  { a: ['E', 0], thirdCandidates: ['A', 'B', 'C', 'D', 'F'] }, // M74
  { a: ['I', 0], thirdCandidates: ['C', 'D', 'F', 'G', 'H'] }, // M77
  { a: ['A', 1], b: ['B', 1] }, // M73
  { a: ['F', 0], b: ['C', 1] }, // M75
  { a: ['K', 1], b: ['L', 1] }, // M83
  { a: ['H', 0], b: ['J', 1] }, // M84
  { a: ['D', 0], thirdCandidates: ['B', 'E', 'F', 'I', 'J'] }, // M81
  { a: ['G', 0], thirdCandidates: ['A', 'E', 'H', 'I', 'J'] }, // M82
  { a: ['C', 0], b: ['F', 1] }, // M76
  { a: ['E', 1], b: ['I', 1] }, // M78
  { a: ['A', 0], thirdCandidates: ['C', 'E', 'F', 'H', 'I'] }, // M79
  { a: ['L', 0], thirdCandidates: ['E', 'H', 'I', 'J', 'K'] }, // M80
  { a: ['J', 0], b: ['H', 1] }, // M86
  { a: ['D', 1], b: ['G', 1] }, // M88
  { a: ['B', 0], thirdCandidates: ['E', 'F', 'G', 'I', 'J'] }, // M85
  { a: ['K', 0], thirdCandidates: ['D', 'E', 'I', 'J', 'L'] }, // M87
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// groupsData: { [letter]: { order: [1st, 2nd, 3rd, 4th] } }
// thirdPicks: 16-length array; for each "best 3rd" slot (see R32_SLOTS),
// thirdPicks[i] is the group letter the player assigned to that slot, or
// null if not yet chosen. Ignored for fixed-pair slots.
// Returns 16 [teamA, teamB] pairs (R32), in bracket-tree leaf order. teamB
// is null for an unresolved "best 3rd" slot.
export function buildBracket32(groupsData, thirdPicks = []) {
  return R32_SLOTS.map((slot, i) => {
    const a = groupsData?.[slot.a[0]]?.order?.[slot.a[1]] ?? null;
    if (slot.b) {
      const b = groupsData?.[slot.b[0]]?.order?.[slot.b[1]] ?? null;
      return [a, b];
    }
    const letter = thirdPicks?.[i];
    const b = letter ? groupsData?.[letter]?.order?.[2] ?? null : null;
    return [a, b];
  });
}

// For each "best 3rd" slot, the {letter, team} options the player may assign
// to it: the slot's candidate groups, restricted to the player's predicted
// advancing thirds. Returns { [slotIndex]: [{letter, team}] }.
export function thirdSlotOptions(groupsData, thirdLetters) {
  const thirdSet = new Set(thirdLetters || []);
  const out = {};
  for (let i = 0; i < R32_SLOTS.length; i++) {
    const slot = R32_SLOTS[i];
    if (!slot.thirdCandidates) continue;
    out[i] = slot.thirdCandidates
      .filter((l) => thirdSet.has(l))
      .map((l) => ({ letter: l, team: groupsData?.[l]?.order?.[2] ?? null }));
  }
  return out;
}

// True once every "best 3rd" slot has been assigned a distinct letter from
// thirdLetters that's valid for that slot (i.e. a full, unambiguous mapping
// from the player's 8 advancing thirds onto the 8 wildcard R32 slots).
export function isThirdPicksComplete(thirdLetters, thirdPicks) {
  if (!Array.isArray(thirdPicks) || thirdPicks.length !== R32_SLOTS.length) return false;
  const thirdSet = new Set(thirdLetters || []);
  const used = new Set();
  for (let i = 0; i < R32_SLOTS.length; i++) {
    const slot = R32_SLOTS[i];
    if (!slot.thirdCandidates) continue;
    const letter = thirdPicks[i];
    if (!letter || !thirdSet.has(letter) || used.has(letter) || !slot.thirdCandidates.includes(letter)) {
      return false;
    }
    used.add(letter);
  }
  return true;
}

// True once a full bracket can be derived: all 12 groups have a complete
// 4-team order AND exactly 8 thirds have been chosen to advance.
export function isBracketComplete(groupsData, thirdLetters) {
  const ok = LETTERS.every(
    (l) => Array.isArray(groupsData?.[l]?.order) && groupsData[l].order.length === 4
  );
  return ok && Array.isArray(thirdLetters) && thirdLetters.length === 8;
}
