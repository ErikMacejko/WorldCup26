import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { stageLabel, flag, teamCode, fmtDateTime } from '../lib/format.js';

function UserDetail({ id, onChanged }) {
  const [data, setData] = useState(null);

  async function load() {
    setData(await api.admin.user(id));
  }
  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <div className="muted">Načítavam…</div>;

  async function toggleHide() {
    await api.admin.toggleHide(id);
    await load();
    onChanged();
  }
  async function toggleBlock() {
    await api.admin.toggleBlock(id);
    await load();
    onChanged();
  }

  async function deletePrediction(p) {
    if (!confirm(`Naozaj zmazať tip pre zápas #${p.matchNumber} (${p.homeTeam} – ${p.awayTeam})?`)) {
      return;
    }
    await api.admin.deletePrediction(id, p.matchId);
    await load();
    onChanged();
  }

  return (
    <div className="card detail">
      <div className="detail-head">
        <div>
          <h3>
            {data.nickname || '(bez prezývky)'}{' '}
            {data.isAdmin && <span className="tag admin">admin</span>}
          </h3>
          <div className="muted small">{data.email}</div>
          <div className="muted small">{data.name}</div>
        </div>
        <div className="detail-actions">
          <button className={`btn-sm ${data.hiddenFromLeaderboard ? 'warn' : ''}`} onClick={toggleHide}>
            {data.hiddenFromLeaderboard ? 'Odkryť v poradí' : 'Skryť z poradia'}
          </button>
          <button className={`btn-sm ${data.blocked ? 'danger' : ''}`} onClick={toggleBlock}>
            {data.blocked ? 'Odblokovať' : 'Zablokovať'}
          </button>
        </div>
      </div>

      <div className="detail-status">
        <span>Stav: {data.blocked ? '⛔ zablokovaný' : '✅ aktívny'}</span>
        <span>{data.hiddenFromLeaderboard ? '🙈 skrytý v poradí' : '👁 viditeľný'}</span>
        <span>Posledné prihlásenie: {data.lastLoginAt ? fmtDateTime(data.lastLoginAt) : '—'}</span>
      </div>

      <h4>História prihlásení</h4>
      <div className="login-history">
        {data.loginHistory.length === 0 && <span className="muted">žiadna</span>}
        {data.loginHistory.map((d, i) => (
          <span key={i} className="login-chip">{fmtDateTime(d)}</span>
        ))}
      </div>

      <h4>Tipy ({data.predictions.length})</h4>
      <table className="table small">
        <thead>
          <tr>
            <th>#</th>
            <th>Zápas</th>
            <th>Tip</th>
            <th>Výsledok</th>
            <th className="num">Body</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.predictions.map((p) => (
            <tr key={p.matchId}>
              <td>{p.matchNumber}</td>
              <td>
                <span className="cc-full">{p.homeTeam}</span>
                <span className="cc-short">{teamCode(p.homeTeam)}</span>
                {' – '}
                <span className="cc-full">{p.awayTeam}</span>
                <span className="cc-short">{teamCode(p.awayTeam)}</span>
              </td>
              <td>{p.homeScore}:{p.awayScore}</td>
              <td>{p.result ? `${p.result.home}:${p.result.away}` : '—'}</td>
              <td className="num">{p.points != null ? p.points : '—'}</td>
              <td>
                <button className="btn-sm warn" onClick={() => deletePrediction(p)}>
                  Zmazať
                </button>
              </td>
            </tr>
          ))}
          {data.predictions.length === 0 && (
            <tr><td colSpan="6" className="muted">žiadne tipy</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);

  async function load() {
    setUsers(await api.admin.users());
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="admin-grid">
      <div>
        <table className="table">
          <thead>
            <tr>
              <th>Prezývka</th>
              <th className="num">Body</th>
              <th className="num">Tipov</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className={`clickable ${selected === u.id ? 'me' : ''}`}
                onClick={() => setSelected(u.id)}
              >
                <td>
                  {u.nickname || <span className="muted">{u.email}</span>}
                  {u.isAdmin && <span className="tag admin">admin</span>}
                </td>
                <td className="num">{u.totalPoints}</td>
                <td className="num">{u.predictions}</td>
                <td>
                  {u.blocked && <span className="tag danger">blok</span>}
                  {u.hiddenFromLeaderboard && <span className="tag warn">skrytý</span>}
                  {!u.blocked && !u.hiddenFromLeaderboard && <span className="muted">ok</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        {selected ? (
          <UserDetail id={selected} onChanged={load} />
        ) : (
          <div className="muted center">Vyber hráča zo zoznamu.</div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ match, onSaved }) {
  const [home, setHome] = useState(match.result?.home ?? '');
  const [away, setAway] = useState(match.result?.away ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.admin.setResult(match.id, Number(home), Number(away));
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  async function clear() {
    setBusy(true);
    try {
      await api.admin.clearResult(match.id);
      setHome('');
      setAway('');
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className={match.status === 'finished' ? 'finished' : ''}>
      <td>{match.matchNumber}</td>
      <td className="muted small">{fmtDateTime(match.kickoff)}</td>
      <td>
        {flag(match.homeTeam)}{' '}
        <span className="cc-full">{match.homeTeam}</span>
        <span className="cc-short">{teamCode(match.homeTeam)}</span>
        {' – '}
        <span className="cc-full">{match.awayTeam}</span>
        <span className="cc-short">{teamCode(match.awayTeam)}</span>
        {' '}{flag(match.awayTeam)}
      </td>
      <td>
        <input type="number" min="0" className="mini" value={home} onChange={(e) => setHome(e.target.value)} />
        :
        <input type="number" min="0" className="mini" value={away} onChange={(e) => setAway(e.target.value)} />
      </td>
      <td>
        <button className="btn-sm" disabled={busy || home === '' || away === ''} onClick={save}>
          Uložiť
        </button>
        {match.status === 'finished' && (
          <button className="btn-sm warn" disabled={busy} onClick={clear}>
            Zmazať
          </button>
        )}
      </td>
    </tr>
  );
}

function ResultsTab() {
  const [matches, setMatches] = useState([]);

  async function load() {
    setMatches(await api.admin.matches());
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <p className="muted">
        Zadaj výsledok zápasu — body sa hráčom prepočítajú automaticky.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Výkop</th>
            <th>Zápas</th>
            <th>Výsledok</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <ResultRow key={m.id} match={m} onSaved={load} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('users');
  return (
    <div className="page">
      <h2>Admin</h2>
      <div className="tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Hráči
        </button>
        <button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>
          Výsledky
        </button>
      </div>
      {tab === 'users' ? <UsersTab /> : <ResultsTab />}
    </div>
  );
}
