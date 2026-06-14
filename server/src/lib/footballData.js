// Thin wrapper around the football-data.org v4 API (competition WC, 2026),
// with the name/letter mappings needed to line their data up with our
// GROUPS/Match conventions, plus a short cache so the periodic sync, the
// admin "sync now" button and the player-facing /api/results endpoints
// don't multiply calls against the free tier's 10 req/min limit.

import { config } from '../config.js';

const BASE_URL = 'https://api.football-data.org/v4';
const CACHE_TTL_MS = 60 * 1000;

// football-data.org team names that differ from our seed/matchData.js GROUPS.
const TEAM_NAME_MAP = {
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  Turkey: 'Türkiye',
  'Cape Verde Islands': 'Cape Verde',
  'Congo DR': 'DR Congo',
};

export function mapTeamName(name) {
  if (!name) return name;
  return TEAM_NAME_MAP[name] || name;
}

// "GROUP_A" (matches endpoint) or "Group A" (standings endpoint) -> "A".
export function mapGroupLetter(group) {
  if (!group) return null;
  const m = /([A-L])$/.exec(group);
  return m ? m[1] : null;
}

const cache = new Map();

// Serves a cached response for CACHE_TTL_MS; if a refresh fails, falls back
// to the last successful response (if any) so a transient API hiccup
// doesn't break the player-facing results pages.
async function cachedFetch(path) {
  const entry = cache.get(path);
  const now = Date.now();
  if (entry && entry.expiresAt > now) return entry.data;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-Auth-Token': config.footballDataToken },
    });
    if (!res.ok) throw new Error(`football-data.org ${path} -> ${res.status}`);
    const data = await res.json();
    cache.set(path, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } catch (err) {
    if (entry) return entry.data;
    throw err;
  }
}

// { [letter]: [{ team, position, played, won, draw, lost, points, goalsFor, goalsAgainst, goalDifference }, ...4] }
export async function fetchStandings() {
  const data = await cachedFetch('/competitions/WC/standings');
  const groups = {};
  for (const group of data.standings || []) {
    const letter = mapGroupLetter(group.group);
    if (!letter) continue;
    groups[letter] = (group.table || []).map((row) => ({
      team: mapTeamName(row.team?.name),
      position: row.position,
      played: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      points: row.points,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
    }));
  }
  return groups;
}

// All 104 matches, name-mapped, with `group` reduced to a letter (or null
// for knockout matches).
export async function fetchMatches() {
  const data = await cachedFetch('/competitions/WC/matches');
  return (data.matches || []).map((m) => ({
    id: m.id,
    stage: m.stage,
    group: mapGroupLetter(m.group),
    status: m.status,
    utcDate: m.utcDate,
    homeTeam: mapTeamName(m.homeTeam?.name),
    awayTeam: mapTeamName(m.awayTeam?.name),
    score: m.score,
  }));
}
