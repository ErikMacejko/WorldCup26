import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { flag, teamCode, fmtDateTime } from '../../lib/format.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function GroupTable({ letter, rows }) {
  return (
    <div className="group-card">
      <div className="group-card-header">
        <h3>Skupina {letter}</h3>
      </div>
      <table className="results-table">
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Z</th>
            <th>V</th>
            <th>R</th>
            <th>P</th>
            <th>+/-</th>
            <th>B</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="8" className="muted small">žiadne dáta</td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.team} className="results-row">
              <td className="rank-num">{i + 1}.</td>
              <td className="col-team">
                <span className="flag">{flag(row.team)}</span>
                <span className="team-name">
                  <span className="cc-full">{row.team}</span>
                  <span className="cc-short">{teamCode(row.team)}</span>
                </span>
              </td>
              <td className="num">{row.played}</td>
              <td className="num">{row.won}</td>
              <td className="num">{row.draw}</td>
              <td className="num">{row.lost}</td>
              <td className="num">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
              <td className="num"><strong>{row.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TablesTab() {
  const [groups, setGroups] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.results.tables().then((res) => {
      setGroups(res.groups || {});
      setLastSyncAt(res.lastSyncAt);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="center muted">Načítavam tabuľky…</div>;

  return (
    <div>
      <p className="muted">
        Aktuálne tabuľky skupín naživo z reálneho turnaja (Z = zápasy, V = výhry, R = remízy, P = prehry, +/- = rozdiel gólov, B = body).
        {lastSyncAt && ` Posledná synchronizácia: ${fmtDateTime(lastSyncAt)}`}
      </p>
      <div className="results-grid">
        {LETTERS.map((letter) => (
          <GroupTable key={letter} letter={letter} rows={groups?.[letter] || []} />
        ))}
      </div>
    </div>
  );
}
