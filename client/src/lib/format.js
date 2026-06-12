// Group matches into Monday–Sunday weeks and format dates/teams for display.

const STAGE_LABELS = {
  group: 'Skupina',
  round32: 'Šestnásťfinále (R32)',
  round16: 'Osemfinále',
  quarter: 'Štvrťfinále',
  semi: 'Semifinále',
  third: 'O 3. miesto',
  final: 'Finále',
};

export function stageLabel(m) {
  if (m.stage === 'group') return `Skupina ${m.group}`;
  return STAGE_LABELS[m.stage] || m.stage;
}

// Country -> flag emoji (regional indicator pair). Falls back to a soccer ball.
const FLAGS = {
  Mexico: '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', Czechia: '🇨🇿',
  Canada: '🇨🇦', 'Bosnia and Herzegovina': '🇧🇦', Qatar: '🇶🇦', Switzerland: '🇨🇭',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Haiti: '🇭🇹', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States': '🇺🇸', Paraguay: '🇵🇾', Australia: '🇦🇺', 'Türkiye': '🇹🇷',
  Germany: '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', Ecuador: '🇪🇨',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Sweden: '🇸🇪', Tunisia: '🇹🇳',
  Belgium: '🇧🇪', Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', Uruguay: '🇺🇾',
  France: '🇫🇷', Senegal: '🇸🇳', Iraq: '🇮🇶', Norway: '🇳🇴',
  Argentina: '🇦🇷', Algeria: '🇩🇿', Austria: '🇦🇹', Jordan: '🇯🇴',
  Portugal: '🇵🇹', 'DR Congo': '🇨🇩', Uzbekistan: '🇺🇿', Colombia: '🇨🇴',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', Ghana: '🇬🇭', Panama: '🇵🇦',
  TBD: '⚽',
};

export function flag(team) {
  return FLAGS[team] || '⚽';
}

// Country -> 3-letter code (FIFA-style), shown instead of the full name on
// narrow screens.
const CODES = {
  Mexico: 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR', Czechia: 'CZE',
  Canada: 'CAN', 'Bosnia and Herzegovina': 'BIH', Qatar: 'QAT', Switzerland: 'SUI',
  Brazil: 'BRA', Morocco: 'MAR', Haiti: 'HAI', Scotland: 'SCO',
  'United States': 'USA', Paraguay: 'PAR', Australia: 'AUS', 'Türkiye': 'TUR',
  Germany: 'GER', 'Curaçao': 'CUW', 'Ivory Coast': 'CIV', Ecuador: 'ECU',
  Netherlands: 'NED', Japan: 'JPN', Sweden: 'SWE', Tunisia: 'TUN',
  Belgium: 'BEL', Egypt: 'EGY', Iran: 'IRN', 'New Zealand': 'NZL',
  Spain: 'ESP', 'Cape Verde': 'CPV', 'Saudi Arabia': 'KSA', Uruguay: 'URU',
  France: 'FRA', Senegal: 'SEN', Iraq: 'IRQ', Norway: 'NOR',
  Argentina: 'ARG', Algeria: 'ALG', Austria: 'AUT', Jordan: 'JOR',
  Portugal: 'POR', 'DR Congo': 'COD', Uzbekistan: 'UZB', Colombia: 'COL',
  England: 'ENG', Croatia: 'CRO', Ghana: 'GHA', Panama: 'PAN',
  TBD: 'TBD',
};

export function teamCode(team) {
  return CODES[team] || team.slice(0, 3).toUpperCase();
}

export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('sk-SK', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDay(iso) {
  return new Date(iso).toLocaleDateString('sk-SK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Monday 00:00 of the week containing `d` (local time).
function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

export function buildWeeks(matches) {
  const map = new Map();
  for (const m of matches) {
    const ws = weekStart(m.kickoff);
    const key = ws.getTime();
    if (!map.has(key)) map.set(key, { start: ws, matches: [] });
    map.get(key).matches.push(m);
  }
  const weeks = [...map.values()].sort((a, b) => a.start - b.start);
  return weeks.map((w, i) => {
    const end = new Date(w.start);
    end.setDate(end.getDate() + 6);
    return {
      index: i,
      start: w.start,
      end,
      label: `${w.start.toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'numeric',
      })} – ${end.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })}`,
      matches: w.matches.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)),
    };
  });
}

// Index of the week containing `now` (or the closest upcoming/most recent).
export function currentWeekIndex(weeks, now = new Date()) {
  if (weeks.length === 0) return 0;
  const t = now.getTime();
  for (let i = 0; i < weeks.length; i++) {
    if (t >= weeks[i].start.getTime() && t <= weeks[i].end.getTime() + 86400000) {
      return i;
    }
  }
  if (t < weeks[0].start.getTime()) return 0;
  return weeks.length - 1;
}
