// Shared rescoring pipeline, used by both the admin "sync now" action and
// the periodic auto-sync job (lib/sync.js).

import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { GroupPrediction } from '../models/GroupPrediction.js';
import { PlayoffPrediction } from '../models/PlayoffPrediction.js';
import { GroupResult } from '../models/GroupResult.js';
import { computePoints } from './scoring.js';
import { isBracketComplete } from './bracket.js';
import { scoreGroupPrediction, getThirdAdvancesLetters } from './groupScoring.js';
import { computeRealDepths, computePlayoffPoints } from './playoffScoring.js';

// Recompute the points of every prediction for one match.
export async function rescoreMatch(match) {
  const preds = await Prediction.find({ match: match._id });
  const finished =
    match.status === 'finished' &&
    match.result?.home != null &&
    match.result?.away != null;

  for (const p of preds) {
    p.points = finished
      ? computePoints(
          { home: p.homeScore, away: p.awayScore },
          { home: match.result.home, away: match.result.away }
        )
      : null;
    await p.save();
  }
}

// Recompute every player's Skupiny points against the current GroupResult.
export async function rescoreGroups() {
  const groupResult = await GroupResult.getSingleton();
  const preds = await GroupPrediction.find();
  for (const p of preds) {
    const { points, perGroup, thirdsBonus } = scoreGroupPrediction(p.groups, groupResult);
    p.points = points;
    p.perGroup = perGroup;
    p.thirdsBonus = thirdsBonus;
    await p.save();
  }
}

// Recompute every player's Playoff points against the current GroupResult +
// real knockout results.
export async function rescorePlayoffs() {
  const groupResult = await GroupResult.getSingleton();
  const realThirds = groupResult.advancingThirds || [];
  const referenceReady = isBracketComplete(groupResult.groups, realThirds);

  const preds = await PlayoffPrediction.find();
  if (!referenceReady) {
    for (const p of preds) {
      p.points = null;
      p.breakdown = null;
      await p.save();
    }
    return;
  }

  const knockoutMatches = await Match.find({ matchNumber: { $gte: 73, $lte: 104 } });
  const depths = computeRealDepths(groupResult, knockoutMatches);

  for (const p of preds) {
    const gp = await GroupPrediction.findOne({ user: p.user });
    const groups = gp?.groups || {};
    const thirds = getThirdAdvancesLetters(groups);
    if (!isBracketComplete(groups, thirds)) {
      p.points = null;
      p.breakdown = null;
      await p.save();
      continue;
    }
    const { total, breakdown } = computePlayoffPoints(
      {
        r32Winners: p.r32Winners,
        r16Winners: p.r16Winners,
        qfWinners: p.qfWinners,
        sfWinners: p.sfWinners,
        champion: p.champion,
      },
      depths,
      knockoutMatches
    );
    p.points = total;
    p.breakdown = breakdown;
    await p.save();
  }
}
