import { GroupPrediction } from '../models/GroupPrediction.js';
import { PlayoffPrediction } from '../models/PlayoffPrediction.js';
import { GroupResult } from '../models/GroupResult.js';
import { buildBracket32, isBracketComplete, thirdSlotOptions } from './bracket.js';
import { getThirdAdvancesLetters } from './groupScoring.js';

// A given user's derived 32-team bracket + saved Playoff prediction. Shared
// by the player-facing /playoff/mine route and the admin player-detail view.
export async function getPlayoffView(userId) {
  const [gp, pp, groupResult] = await Promise.all([
    GroupPrediction.findOne({ user: userId }),
    PlayoffPrediction.findOne({ user: userId }),
    GroupResult.getSingleton(),
  ]);

  const groups = gp?.groups || {};
  const thirds = getThirdAdvancesLetters(groups);
  const complete = isBracketComplete(groups, thirds);
  const thirdPicks = pp?.thirdPicks || Array(16).fill(null);
  const bracket = complete ? buildBracket32(groups, thirdPicks) : null;
  const thirdOptions = complete ? thirdSlotOptions(groups, thirds) : {};

  return {
    bracket,
    thirdPicks,
    thirdOptions,
    r32Winners: pp?.r32Winners || [],
    r16Winners: pp?.r16Winners || [],
    qfWinners: pp?.qfWinners || [],
    sfWinners: pp?.sfWinners || [],
    champion: pp?.champion || null,
    points: pp?.points ?? null,
    breakdown: pp?.breakdown ?? null,
    locked: groupResult.predictionsLocked,
  };
}
