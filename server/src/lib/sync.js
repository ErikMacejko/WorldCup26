// Auto-sync engine: pulls real results from football-data.org and writes
// them onto our Match/GroupResult collections, then feeds the existing
// rescoring pipeline. This is the single source of truth for results - the
// admin UI no longer accepts manual result entry.

import { Match } from '../models/Match.js';
import { GroupResult } from '../models/GroupResult.js';
import { GROUPS } from '../seed/matchData.js';
import { fetchStandings, fetchMatches } from './footballData.js';
import { rescoreMatch, rescoreGroups, rescorePlayoffs } from './rescoring.js';

const LETTERS = Object.keys(GROUPS);

// Our matchNumber ranges per knockout stage, in our convention (see
// seed/matchData.js KNOCKOUT_MATCHES).
const KNOCKOUT_STAGES = [
  { api: 'LAST_32', start: 73, end: 88 },
  { api: 'LAST_16', start: 89, end: 96 },
  { api: 'QUARTER_FINALS', start: 97, end: 100 },
  { api: 'SEMI_FINALS', start: 101, end: 102 },
  { api: 'THIRD_PLACE', start: 103, end: 103 },
  { api: 'FINAL', start: 104, end: 104 },
];

function resultFromScore(score) {
  const home = score?.fullTime?.home;
  const away = score?.fullTime?.away;
  if (home == null || away == null) return null;

  let penaltyWinner = null;
  if (home === away && score.duration === 'PENALTY_SHOOTOUT') {
    if (score.winner === 'HOME_TEAM') penaltyWinner = 'home';
    else if (score.winner === 'AWAY_TEAM') penaltyWinner = 'away';
  }
  return { home, away, penaltyWinner };
}

// Group-stage matches (matchNumber 1-72): match API matches onto our Match
// docs by (group, {homeTeam, awayTeam}) as an unordered pair, so either
// orientation is handled. Refreshes the real kickoff time from the API for
// every match (the seed data only has approximate hand-converted times), and
// writes the result once the match is finished.
async function syncGroupMatches(apiMatches) {
  const ourMatches = await Match.find({ stage: 'group' });
  // Returned so the caller can derive completedGroups from these matches'
  // actual `status`, instead of football-data.org's `standings` endpoint -
  // that endpoint marks a team's `playedGames` as done (and bakes the
  // in-progress score into the table) as soon as a match goes LIVE, not
  // only once it's FINISHED, which would score a group while it's still
  // being played.

  for (const am of apiMatches) {
    if (am.stage !== 'GROUP_STAGE') continue;
    if (!am.group || !am.homeTeam || !am.awayTeam) continue;

    const match = ourMatches.find((m) => {
      if (m.group !== am.group) return false;
      return (
        (m.homeTeam === am.homeTeam && m.awayTeam === am.awayTeam) ||
        (m.homeTeam === am.awayTeam && m.awayTeam === am.homeTeam)
      );
    });
    if (!match) continue;

    let changed = false;

    if (am.utcDate) {
      const newKickoff = new Date(am.utcDate);
      if (match.kickoff.getTime() !== newKickoff.getTime()) {
        match.kickoff = newKickoff;
        changed = true;
      }
    }

    if (am.status === 'FINISHED') {
      const result = resultFromScore(am.score);
      if (result) {
        const swapped = match.homeTeam === am.awayTeam && match.awayTeam === am.homeTeam;
        const home = swapped ? result.away : result.home;
        const away = swapped ? result.home : result.away;
        if (match.status !== 'finished' || match.result?.home !== home || match.result?.away !== away) {
          match.result = { home, away, penaltyWinner: null };
          match.status = 'finished';
          changed = true;
        }
      }
    }

    if (changed) {
      await match.save();
      if (match.status === 'finished') await rescoreMatch(match);
    }
  }

  return ourMatches;
}

// For R16+ rounds: map each API match to its correct bracket slot by looking
// up one of its teams in the prev-round slot map (team → prev-round index).
// Each R16 slot i receives the two winners from R32 slots 2i and 2i+1, so
// floor(prevSlot/2) gives the current-round slot. Matches with no known team
// (still TBD) fall back to date order for the remaining empty slots.
function orderByBracketSlot(stageApiMatches, prevTeamSlotMap, count) {
  const result = new Array(count).fill(null);
  const unplaced = [];

  for (const am of stageApiMatches) {
    const home = am.homeTeam || null;
    const away = am.awayTeam || null;
    const prevSlot = prevTeamSlotMap.get(home) ?? prevTeamSlotMap.get(away);

    if (prevSlot != null) {
      const slot = Math.floor(prevSlot / 2);
      if (!result[slot]) result[slot] = am;
    } else {
      unplaced.push(am);
    }
  }

  unplaced.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  let ui = 0;
  for (let i = 0; i < count; i++) {
    if (!result[i] && ui < unplaced.length) result[i] = unplaced[ui++];
  }
  return result;
}

// Knockout team assignments + results (matchNumber 73-104).
// R32: sort both API and our matches by date (seed dates were placeholders,
//   API dates get written back each run).
// R16+: derive the bracket slot from which R32 slot each team came from —
//   avoids the wrong slot assignment that date-only sorting causes when the
//   first-scheduled R16 match is not bracket slot 0.
async function syncKnockout(apiMatches) {
  let prevOrderedApiMatches = null; // null → R32 (no previous round)

  for (const { api, start, end } of KNOCKOUT_STAGES) {
    const count = end - start + 1;
    const stageApiMatches = apiMatches.filter((m) => m.stage === api);

    let orderedApiMatches;
    let matchSort;

    if (prevOrderedApiMatches === null) {
      // R32: date order (same as before)
      orderedApiMatches = [...stageApiMatches].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
      matchSort = { kickoff: 1, matchNumber: 1 };
    } else {
      // R16+: bracket-position order derived from previous round's teams
      const prevTeamSlotMap = new Map();
      for (let i = 0; i < prevOrderedApiMatches.length; i++) {
        const m = prevOrderedApiMatches[i];
        if (m.homeTeam) prevTeamSlotMap.set(m.homeTeam, i);
        if (m.awayTeam) prevTeamSlotMap.set(m.awayTeam, i);
      }
      orderedApiMatches = orderByBracketSlot(stageApiMatches, prevTeamSlotMap, count);
      matchSort = { matchNumber: 1 };
    }

    const ourMatches = await Match.find({ matchNumber: { $gte: start, $lte: end } }).sort(matchSort);

    for (let i = 0; i < ourMatches.length; i++) {
      const am = orderedApiMatches[i];
      const match = ourMatches[i];

      let changed = false;

      if (am) {
        if (am.homeTeam && match.homeTeam !== am.homeTeam) {
          match.homeTeam = am.homeTeam;
          changed = true;
        }
        if (am.awayTeam && match.awayTeam !== am.awayTeam) {
          match.awayTeam = am.awayTeam;
          changed = true;
        }
        if (am.utcDate) {
          const newKickoff = new Date(am.utcDate);
          if (match.kickoff.getTime() !== newKickoff.getTime()) {
            match.kickoff = newKickoff;
            changed = true;
          }
        }
        if (am.status === 'FINISHED') {
          const result = resultFromScore(am.score);
          if (result) {
            const resultChanged =
              match.result?.home !== result.home ||
              match.result?.away !== result.away ||
              match.result?.penaltyWinner !== result.penaltyWinner;
            if (resultChanged || match.status !== 'finished') {
              match.result = result;
              match.status = 'finished';
              changed = true;
            }
          }
        }
      } else if (prevOrderedApiMatches !== null) {
        // R16+ slot with no API match yet: reset incorrectly-assigned teams to TBD
        if (match.homeTeam !== 'TBD') { match.homeTeam = 'TBD'; changed = true; }
        if (match.awayTeam !== 'TBD') { match.awayTeam = 'TBD'; changed = true; }
      }

      if (changed) {
        await match.save();
        if (match.status === 'finished') await rescoreMatch(match);
      }
    }

    prevOrderedApiMatches = orderedApiMatches;
  }
}

// Letters whose group stage has fully finished (all 6 matches actually
// FINISHED, per our own Match docs - see syncGroupMatches), so that group's
// predictions can be scored on their own without waiting for the rest of
// the group stage to end.
function computeCompletedGroups(ourGroupMatches) {
  return LETTERS.filter((l) => {
    const matches = ourGroupMatches.filter((m) => m.group === l);
    return matches.length > 0 && matches.every((m) => m.status === 'finished');
  });
}

// Once every group has actually finished (all matches FINISHED, not just
// live), rank the 12 third-placed teams by (points, goalDifference,
// goalsFor) and take the top 8 letters. Known limitation: FIFA's official
// tiebreak also includes fair-play points and a draw of lots for true ties,
// which the free API doesn't expose - astronomically unlikely to matter in
// practice.
function computeAdvancingThirds(standings, completedGroups) {
  if (completedGroups.length !== LETTERS.length) return null;

  const thirds = LETTERS.map((letter) => {
    const row = standings[letter]?.[2];
    return {
      letter,
      points: row?.points ?? 0,
      goalDifference: row?.goalDifference ?? 0,
      goalsFor: row?.goalsFor ?? 0,
    };
  });
  thirds.sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
  );
  return thirds.slice(0, 8).map((t) => t.letter);
}

export async function syncResults() {
  const groupResult = await GroupResult.getSingleton();
  try {
    const [standings, apiMatches] = await Promise.all([fetchStandings(), fetchMatches()]);

    const ourGroupMatches = await syncGroupMatches(apiMatches);

    const groups = { ...groupResult.groups };
    for (const letter of LETTERS) {
      const table = standings[letter];
      if (!table || table.length !== 4) continue;
      const order = table.map((row) => row.team);
      const sortedOrder = [...order].sort();
      const sortedExpected = [...GROUPS[letter]].sort();
      if (!sortedOrder.every((t, i) => t === sortedExpected[i])) continue;
      groups[letter] = { ...groups[letter], order };
    }
    groupResult.groups = groups;
    const completedGroups = computeCompletedGroups(ourGroupMatches);
    groupResult.completedGroups = completedGroups;

    // computeAdvancingThirds returns null until every group has actually
    // finished - force [] in that case so isBracketComplete (and thus the
    // thirds bonus + playoff scoring) stays gated until the group stage
    // truly ends, even if a stale value was left over from earlier testing.
    groupResult.advancingThirds = computeAdvancingThirds(standings, completedGroups) || [];

    await groupResult.save();

    await syncKnockout(apiMatches);

    await rescoreGroups();
    await rescorePlayoffs();

    groupResult.lastSyncAt = new Date();
    groupResult.lastSyncError = null;
    await groupResult.save();
  } catch (err) {
    console.error('[sync] failed:', err);
    groupResult.lastSyncError = err.message || String(err);
    await groupResult.save();
  }

  return { lastSyncAt: groupResult.lastSyncAt, lastSyncError: groupResult.lastSyncError };
}
