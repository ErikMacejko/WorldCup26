// Real 2026 FIFA World Cup schedule (group stage confirmed after the final draw
// on 5 Dec 2025). Knockout matches are placeholders (teams TBD) with approximate
// dates/venues — edit them once the bracket is known.
//
// Kickoff times are stored in UTC. The group-stage times below were converted
// from the ET (Eastern, UTC-4 in June) kickoff times published by ESPN/FIFA.

// city -> stadium name
const VENUES = {
  'Mexico City': 'Estadio Azteca',
  'Guadalajara': 'Estadio Akron',
  'Monterrey': 'Estadio BBVA',
  'Toronto': 'BMO Field',
  'Vancouver': 'BC Place',
  'Inglewood': 'SoFi Stadium',
  'Santa Clara': "Levi's Stadium",
  'East Rutherford': 'MetLife Stadium',
  'Foxborough': 'Gillette Stadium',
  'Houston': 'NRG Stadium',
  'Arlington': 'AT&T Stadium',
  'Philadelphia': 'Lincoln Financial Field',
  'Atlanta': 'Mercedes-Benz Stadium',
  'Seattle': 'Lumen Field',
  'Miami Gardens': 'Hard Rock Stadium',
  'Kansas City': 'Arrowhead Stadium',
};

// The 12 groups (A–L) and their four teams.
export const GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

// [matchNumber, group, home, away, kickoffUtcISO, city]
const GROUP_MATCHES = [
  [1, 'A', 'Mexico', 'South Africa', '2026-06-11T23:00:00Z', 'Mexico City'],
  [2, 'A', 'South Korea', 'Czechia', '2026-06-12T02:00:00Z', 'Guadalajara'],
  [3, 'B', 'Canada', 'Bosnia and Herzegovina', '2026-06-12T19:00:00Z', 'Toronto'],
  [4, 'D', 'United States', 'Paraguay', '2026-06-13T01:00:00Z', 'Inglewood'],
  [5, 'B', 'Qatar', 'Switzerland', '2026-06-13T19:00:00Z', 'Santa Clara'],
  [6, 'C', 'Brazil', 'Morocco', '2026-06-13T22:00:00Z', 'East Rutherford'],
  [7, 'C', 'Haiti', 'Scotland', '2026-06-14T01:00:00Z', 'Foxborough'],
  [8, 'D', 'Australia', 'Türkiye', '2026-06-14T04:00:00Z', 'Vancouver'],
  [9, 'E', 'Germany', 'Curaçao', '2026-06-14T17:00:00Z', 'Houston'],
  [10, 'F', 'Netherlands', 'Japan', '2026-06-14T20:00:00Z', 'Arlington'],
  [11, 'E', 'Ivory Coast', 'Ecuador', '2026-06-14T23:00:00Z', 'Philadelphia'],
  [12, 'F', 'Sweden', 'Tunisia', '2026-06-15T02:00:00Z', 'Monterrey'],
  [13, 'H', 'Spain', 'Cape Verde', '2026-06-15T17:00:00Z', 'Atlanta'],
  [14, 'G', 'Belgium', 'Egypt', '2026-06-15T22:00:00Z', 'Seattle'],
  [15, 'H', 'Saudi Arabia', 'Uruguay', '2026-06-15T22:00:00Z', 'Miami Gardens'],
  [16, 'G', 'Iran', 'New Zealand', '2026-06-16T04:00:00Z', 'Inglewood'],
  [17, 'I', 'France', 'Senegal', '2026-06-16T19:00:00Z', 'East Rutherford'],
  [18, 'I', 'Iraq', 'Norway', '2026-06-16T22:00:00Z', 'Foxborough'],
  [19, 'J', 'Argentina', 'Algeria', '2026-06-17T01:00:00Z', 'Kansas City'],
  [20, 'J', 'Austria', 'Jordan', '2026-06-17T04:00:00Z', 'Santa Clara'],
  [21, 'K', 'Portugal', 'DR Congo', '2026-06-17T17:00:00Z', 'Houston'],
  [22, 'L', 'England', 'Croatia', '2026-06-17T20:00:00Z', 'Arlington'],
  [23, 'L', 'Ghana', 'Panama', '2026-06-17T23:00:00Z', 'Toronto'],
  [24, 'K', 'Uzbekistan', 'Colombia', '2026-06-18T02:00:00Z', 'Mexico City'],
  [25, 'A', 'Czechia', 'South Africa', '2026-06-18T16:00:00Z', 'Atlanta'],
  [26, 'B', 'Switzerland', 'Bosnia and Herzegovina', '2026-06-18T19:00:00Z', 'Inglewood'],
  [27, 'B', 'Canada', 'Qatar', '2026-06-18T22:00:00Z', 'Vancouver'],
  [28, 'A', 'Mexico', 'South Korea', '2026-06-19T03:00:00Z', 'Guadalajara'],
  [29, 'D', 'United States', 'Australia', '2026-06-19T19:00:00Z', 'Seattle'],
  [30, 'C', 'Scotland', 'Morocco', '2026-06-19T22:00:00Z', 'Foxborough'],
  [31, 'C', 'Brazil', 'Haiti', '2026-06-20T01:00:00Z', 'Philadelphia'],
  [32, 'D', 'Türkiye', 'Paraguay', '2026-06-20T04:00:00Z', 'Santa Clara'],
  [33, 'F', 'Netherlands', 'Sweden', '2026-06-20T17:00:00Z', 'Houston'],
  [34, 'E', 'Germany', 'Ivory Coast', '2026-06-20T20:00:00Z', 'Toronto'],
  [35, 'E', 'Ecuador', 'Curaçao', '2026-06-21T00:00:00Z', 'Kansas City'],
  [36, 'F', 'Tunisia', 'Japan', '2026-06-21T04:00:00Z', 'Monterrey'],
  [37, 'H', 'Spain', 'Saudi Arabia', '2026-06-21T16:00:00Z', 'Atlanta'],
  [38, 'G', 'Belgium', 'Iran', '2026-06-21T19:00:00Z', 'Inglewood'],
  [39, 'H', 'Uruguay', 'Cape Verde', '2026-06-21T22:00:00Z', 'Miami Gardens'],
  [40, 'G', 'New Zealand', 'Egypt', '2026-06-22T01:00:00Z', 'Vancouver'],
  [41, 'J', 'Argentina', 'Austria', '2026-06-22T17:00:00Z', 'Arlington'],
  [42, 'I', 'France', 'Iraq', '2026-06-22T21:00:00Z', 'Philadelphia'],
  [43, 'I', 'Norway', 'Senegal', '2026-06-23T00:00:00Z', 'East Rutherford'],
  [44, 'J', 'Jordan', 'Algeria', '2026-06-23T03:00:00Z', 'Santa Clara'],
  [45, 'K', 'Portugal', 'Uzbekistan', '2026-06-23T17:00:00Z', 'Houston'],
  [46, 'L', 'England', 'Ghana', '2026-06-23T20:00:00Z', 'Foxborough'],
  [47, 'L', 'Panama', 'Croatia', '2026-06-23T23:00:00Z', 'Toronto'],
  [48, 'K', 'Colombia', 'DR Congo', '2026-06-24T02:00:00Z', 'Guadalajara'],
  [49, 'B', 'Switzerland', 'Canada', '2026-06-24T19:00:00Z', 'Vancouver'],
  [50, 'B', 'Bosnia and Herzegovina', 'Qatar', '2026-06-24T19:00:00Z', 'Seattle'],
  [51, 'C', 'Scotland', 'Brazil', '2026-06-24T22:00:00Z', 'Miami Gardens'],
  [52, 'C', 'Morocco', 'Haiti', '2026-06-24T22:00:00Z', 'Atlanta'],
  [53, 'A', 'Czechia', 'Mexico', '2026-06-25T01:00:00Z', 'Mexico City'],
  [54, 'A', 'South Africa', 'South Korea', '2026-06-25T01:00:00Z', 'Monterrey'],
  [55, 'E', 'Ecuador', 'Germany', '2026-06-25T20:00:00Z', 'East Rutherford'],
  [56, 'E', 'Curaçao', 'Ivory Coast', '2026-06-25T20:00:00Z', 'Philadelphia'],
  [57, 'F', 'Japan', 'Sweden', '2026-06-25T23:00:00Z', 'Arlington'],
  [58, 'F', 'Tunisia', 'Netherlands', '2026-06-25T23:00:00Z', 'Kansas City'],
  [59, 'D', 'Türkiye', 'United States', '2026-06-26T02:00:00Z', 'Inglewood'],
  [60, 'D', 'Paraguay', 'Australia', '2026-06-26T02:00:00Z', 'Santa Clara'],
  [61, 'I', 'Norway', 'France', '2026-06-26T19:00:00Z', 'Foxborough'],
  [62, 'I', 'Senegal', 'Iraq', '2026-06-26T19:00:00Z', 'Toronto'],
  [63, 'H', 'Cape Verde', 'Saudi Arabia', '2026-06-27T00:00:00Z', 'Houston'],
  [64, 'H', 'Uruguay', 'Spain', '2026-06-27T00:00:00Z', 'Guadalajara'],
  [65, 'G', 'Egypt', 'Iran', '2026-06-27T03:00:00Z', 'Seattle'],
  [66, 'G', 'New Zealand', 'Belgium', '2026-06-27T03:00:00Z', 'Vancouver'],
  [67, 'L', 'Panama', 'England', '2026-06-27T21:00:00Z', 'East Rutherford'],
  [68, 'L', 'Croatia', 'Ghana', '2026-06-27T21:00:00Z', 'Philadelphia'],
  [69, 'K', 'Colombia', 'Portugal', '2026-06-27T23:30:00Z', 'Miami Gardens'],
  [70, 'K', 'DR Congo', 'Uzbekistan', '2026-06-27T23:30:00Z', 'Atlanta'],
  [71, 'J', 'Algeria', 'Austria', '2026-06-28T02:00:00Z', 'Kansas City'],
  [72, 'J', 'Jordan', 'Argentina', '2026-06-28T02:00:00Z', 'Arlington'],
];

// Knockout stage — teams are not known yet, so use placeholders. Dates/venues
// are approximate and can be edited later. Format: [num, stage, kickoffUtc, city]
const KNOCKOUT_MATCHES = [
  // Round of 32 (28 Jun – 3 Jul)
  [73, 'round32', '2026-06-28T19:00:00Z', 'Los Angeles'],
  [74, 'round32', '2026-06-28T23:00:00Z', 'Houston'],
  [75, 'round32', '2026-06-29T19:00:00Z', 'Boston'],
  [76, 'round32', '2026-06-29T23:00:00Z', 'Mexico City'],
  [77, 'round32', '2026-06-30T19:00:00Z', 'Dallas'],
  [78, 'round32', '2026-06-30T23:00:00Z', 'Atlanta'],
  [79, 'round32', '2026-07-01T19:00:00Z', 'Seattle'],
  [80, 'round32', '2026-07-01T23:00:00Z', 'Guadalajara'],
  [81, 'round32', '2026-07-02T19:00:00Z', 'New York/New Jersey'],
  [82, 'round32', '2026-07-02T23:00:00Z', 'Philadelphia'],
  [83, 'round32', '2026-07-03T19:00:00Z', 'San Francisco Bay'],
  [84, 'round32', '2026-07-03T23:00:00Z', 'Miami'],
  [85, 'round32', '2026-07-03T16:00:00Z', 'Toronto'],
  [86, 'round32', '2026-07-02T16:00:00Z', 'Kansas City'],
  [87, 'round32', '2026-07-01T16:00:00Z', 'Monterrey'],
  [88, 'round32', '2026-06-30T16:00:00Z', 'Vancouver'],
  // Round of 16 (4 Jul – 7 Jul)
  [89, 'round16', '2026-07-04T19:00:00Z', 'Philadelphia'],
  [90, 'round16', '2026-07-04T23:00:00Z', 'Houston'],
  [91, 'round16', '2026-07-05T19:00:00Z', 'New York/New Jersey'],
  [92, 'round16', '2026-07-05T23:00:00Z', 'Mexico City'],
  [93, 'round16', '2026-07-06T19:00:00Z', 'Dallas'],
  [94, 'round16', '2026-07-06T23:00:00Z', 'Seattle'],
  [95, 'round16', '2026-07-07T19:00:00Z', 'Atlanta'],
  [96, 'round16', '2026-07-07T23:00:00Z', 'Los Angeles'],
  // Quarter-finals (9 Jul – 11 Jul)
  [97, 'quarter', '2026-07-09T23:00:00Z', 'Boston'],
  [98, 'quarter', '2026-07-10T23:00:00Z', 'Los Angeles'],
  [99, 'quarter', '2026-07-11T19:00:00Z', 'Kansas City'],
  [100, 'quarter', '2026-07-11T23:00:00Z', 'Miami'],
  // Semi-finals (14 Jul – 15 Jul)
  [101, 'semi', '2026-07-14T23:00:00Z', 'Dallas'],
  [102, 'semi', '2026-07-15T23:00:00Z', 'Atlanta'],
  // Third place (18 Jul) and Final (19 Jul)
  [103, 'third', '2026-07-18T20:00:00Z', 'Miami'],
  [104, 'final', '2026-07-19T19:00:00Z', 'New York/New Jersey'],
];

function knockoutLabel(stage, num) {
  const names = {
    round32: 'Round of 32',
    round16: 'Round of 16',
    quarter: 'Quarter-final',
    semi: 'Semi-final',
    third: 'Third place',
    final: 'Final',
  };
  return `${names[stage]} #${num}`;
}

export function buildMatches() {
  const out = [];
  for (const [matchNumber, group, home, away, kickoff, city] of GROUP_MATCHES) {
    out.push({
      matchNumber,
      stage: 'group',
      group,
      homeTeam: home,
      awayTeam: away,
      kickoff: new Date(kickoff),
      city,
      venue: VENUES[city] || city,
    });
  }
  for (const [matchNumber, stage, kickoff, city] of KNOCKOUT_MATCHES) {
    out.push({
      matchNumber,
      stage,
      group: null,
      homeTeam: 'TBD',
      awayTeam: 'TBD',
      label: knockoutLabel(stage, matchNumber),
      kickoff: new Date(kickoff),
      city,
      venue: VENUES[city] || city,
    });
  }
  return out;
}
