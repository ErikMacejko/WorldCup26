import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { stageLabel, flag, teamCode, fmtTime, fmtDay } from '../../lib/format.js';

function matchExtra(m) {
  if (!m?.matchDuration || !m.result) return null;
  if (m.matchDuration === 'PENALTY_SHOOTOUT' && m.result.penaltyHome != null) {
    return `pen. ${m.result.penaltyHome}:${m.result.penaltyAway}`;
  }
  if (m.matchDuration === 'EXTRA_TIME') return 'po pred.';
  return null;
}

export default function MatchesScheduleTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.matches().then((m) => {
      setMatches(m);
      setLoading(false);
    });
  }, []);

  const days = useMemo(() => {
    const map = new Map();
    for (const m of matches) {
      const key = new Date(m.kickoff).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });
      if (!map.has(key)) map.set(key, { date: m.kickoff, matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [matches]);

  if (loading) return <div className="center muted">Načítavam rozpis…</div>;

  return (
    <>
      <p className="muted">Kompletný rozpis MS 2026 — všetkých 104 zápasov.</p>
      {days.map((d, i) => (
        <div key={i} className="sched-day">
          <h3 className="sched-date">{fmtDay(d.date)}</h3>
          <div className="sched-list">
            {d.matches.map((m) => (
              <div key={m.id} className="sched-row">
                <span className="sched-time">{fmtTime(m.kickoff)}</span>
                <span className="sched-stage muted">{stageLabel(m)}</span>
                <span className="sched-match">
                  <span className="team-name sched-home">
                    <span className="cc-full">{m.homeTeam}</span>
                    <span className="cc-short">{teamCode(m.homeTeam)}</span>
                  </span>
                  <span className="flag">{flag(m.homeTeam)}</span>
                  <span className="vs">
                    {m.result ? `${m.result.home}:${m.result.away}` : '–'}
                    {matchExtra(m) && <span className="sched-extra">{matchExtra(m)}</span>}
                  </span>
                  <span className="flag">{flag(m.awayTeam)}</span>
                  <span className="team-name sched-away">
                    <span className="cc-full">{m.awayTeam}</span>
                    <span className="cc-short">{teamCode(m.awayTeam)}</span>
                  </span>
                </span>
                <span className="sched-venue muted">{m.venue}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
