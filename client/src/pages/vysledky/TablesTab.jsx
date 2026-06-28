import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { flag, teamCode, fmtDateTime } from '../../lib/format.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function rankClass(i, team, r32Teams) {
  if (i === 0 || i === 1) return 'rank-adv-top';
  if (i === 2 && r32Teams?.has(team)) return 'rank-adv-third';
  return '';
}

function GroupTable({ letter, rows, r32Teams }) {
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
              <td className="rank-num"><span className={`rank-badge ${rankClass(i, row.team, r32Teams)}`}>{i + 1}</span></td>
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
  const [r32Teams, setR32Teams] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.results.tables(), api.results.playoff()]).then(([tablesRes, playoffRes]) => {
      setGroups(tablesRes.groups || {});
      setLastSyncAt(tablesRes.lastSyncAt);
      setR32Teams(new Set((playoffRes.r32?.pairs || []).flat().filter(Boolean)));
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
          <GroupTable key={letter} letter={letter} rows={groups?.[letter] || []} r32Teams={r32Teams} />
        ))}
      </div>
    </div>
  );
}
