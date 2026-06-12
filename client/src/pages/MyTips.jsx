import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { flag, teamCode, fmtDateTime } from '../lib/format.js';

// Personal overview of tips on matches that have already started/finished
// (same Zápas / Tip / Výsledok / Body table the admin sees per player).
export default function MyTips() {
  const [matches, setMatches] = useState([]);
  const [mine, setMine] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.matches(), api.myPredictions()]).then(([ms, mp]) => {
      setMatches(ms);
      setMine(mp);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="center muted">Načítavam…</div>;

  const rows = matches
    .filter((m) => m.locked)
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

  return (
    <div className="page">
      <h2>Moje tipy</h2>
      <p className="muted">Prehľad tvojich tipov na už odohrané (uzamknuté) zápasy.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th className="mytips-date">Termín</th>
              <th>Zápas</th>
              <th>Tip</th>
              <th>Výsledok</th>
              <th className="num">Body</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const pred = mine[m.id];
              return (
                <tr key={m.id}>
                  <td>{m.matchNumber}</td>
                  <td className="muted small mytips-date">{fmtDateTime(m.kickoff)}</td>
                  <td>
                    {flag(m.homeTeam)}{' '}
                    <span className="cc-full">{m.homeTeam}</span>
                    <span className="cc-short">{teamCode(m.homeTeam)}</span>
                    {' – '}
                    <span className="cc-full">{m.awayTeam}</span>
                    <span className="cc-short">{teamCode(m.awayTeam)}</span>
                    {' '}{flag(m.awayTeam)}
                  </td>
                  <td>{pred ? `${pred.homeScore}:${pred.awayScore}` : '—'}</td>
                  <td>{m.result ? `${m.result.home}:${m.result.away}` : '—'}</td>
                  <td className="num">{pred?.points != null ? pred.points : '—'}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" className="muted center">
                  Zatiaľ žiadne odohrané zápasy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
