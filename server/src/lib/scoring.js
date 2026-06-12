// Scoring rules for a single prediction vs the actual result:
//
//   - Exact score        -> 3 points
//   - Correct winner      -> 1 point  (or correct draw)
//   - Correct goal count   -> 1 point, but ONLY if exactly ONE team's goals match.
//     If BOTH teams match it is an exact score (3 points) and we do NOT add the
//     goal-count point on top — no cumulation.
//
// Points combine, e.g. predicting 2-1 when it ends 2-0 gives:
//   correct winner (+1) + home goals correct (+1) = 2 points.
//
// pred / actual are { home, away } objects with integer goals.
export function computePoints(pred, actual) {
  const ph = pred.home;
  const pa = pred.away;
  const ah = actual.home;
  const aaw = actual.away;

  // Exact score → 3, nothing else stacks.
  if (ph === ah && pa === aaw) return 3;

  let points = 0;

  // Correct outcome (winner or draw): compare the sign of the goal difference.
  const predSign = Math.sign(ph - pa);
  const actSign = Math.sign(ah - aaw);
  if (predSign === actSign) points += 1;

  // Exactly one team's goal count matched (XOR — both is the exact case above).
  const homeMatch = ph === ah;
  const awayMatch = pa === aaw;
  if (homeMatch !== awayMatch) points += 1;

  return points;
}
