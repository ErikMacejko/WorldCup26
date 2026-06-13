import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';
import { stageLabel, flag, teamCode, fmtDateTime } from '../lib/format.js';

// Only allow 0-99 (at most two digits) while typing a score.
function handleScoreChange(setter) {
  return (e) => {
    const v = e.target.value;
    if (/^[0-9]{0,2}$/.test(v)) setter(v);
  };
}

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

// Opened via "Odomknúť" on a finished match: lets the admin correct the
// result and/or pick which players get a one-shot back-fill for this locked
// match. The single "Uložiť" here saves both (and replaces match.backfillFor).
function BackfillPicker({ match, players, onClose, onSaved }) {
  const [home, setHome] = useState(match.result?.home ?? '');
  const [away, setAway] = useState(match.result?.away ?? '');
  const [selected, setSelected] = useState(() => new Set(match.backfillFor));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const allSelected = players.length > 0 && selected.size === players.length;
  const filtered = players.filter((p) =>
    (p.nickname || p.email || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(players.map((p) => p.id)));
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      await Promise.all([
        api.admin.setResult(match.id, Number(home), Number(away)),
        api.admin.setBackfill(match.id, [...selected]),
      ]);
      await onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Odomknúť dotipovanie</h3>
          <button className="modal-close" onClick={onClose} aria-label="Zavrieť">
            ✕
          </button>
        </div>

        <div className="backfill-result">
          <span className="muted small">Výsledok:</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{1,2}"
            maxLength={2}
            className="mini"
            value={home}
            onChange={handleScoreChange(setHome)}
          />
          :
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{1,2}"
            maxLength={2}
            className="mini"
            value={away}
            onChange={handleScoreChange(setAway)}
          />
        </div>

        <input
          type="text"
          className="input backfill-search"
          placeholder="Hľadať hráča…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="backfill-all">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          Všetci
        </label>

        <div className="backfill-users">
          {filtered.map((p) => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleOne(p.id)}
              />
              {p.nickname || p.email}
            </label>
          ))}
          {filtered.length === 0 && <div className="muted small">žiadni hráči</div>}
        </div>

        <div className="backfill-actions">
          <button className="btn-sm" disabled={busy || home === '' || away === ''} onClick={save}>
            Uložiť
          </button>
          <button className="btn-ghost" disabled={busy} onClick={onClose}>
            Zavrieť
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ResultRow({ match, players, onSaved }) {
  const [home, setHome] = useState(match.result?.home ?? '');
  const [away, setAway] = useState(match.result?.away ?? '');
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setHome(match.result?.home ?? '');
    setAway(match.result?.away ?? '');
  }, [match.result?.home, match.result?.away]);

  const finished = match.status === 'finished';

  async function save() {
    setBusy(true);
    try {
      await api.admin.setResult(match.id, Number(home), Number(away));
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className={finished ? 'finished' : ''}>
        <td>{match.matchNumber}</td>
        <td className="muted small">{fmtDateTime(match.kickoff)}</td>
        <td className="col-team col-home">
          <span className="cc-full">{match.homeTeam}</span>
          <span className="cc-short">{teamCode(match.homeTeam)}</span>
        </td>
        <td className="col-flag">{flag(match.homeTeam)}</td>
        <td className="col-vs">
          <span className="vs result-edit">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,2}"
              maxLength={2}
              className="mini"
              value={home}
              disabled={finished}
              onChange={handleScoreChange(setHome)}
            />
            :
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,2}"
              maxLength={2}
              className="mini"
              value={away}
              disabled={finished}
              onChange={handleScoreChange(setAway)}
            />
          </span>
        </td>
        <td className="col-flag">{flag(match.awayTeam)}</td>
        <td className="col-team col-away">
          <span className="cc-full">{match.awayTeam}</span>
          <span className="cc-short">{teamCode(match.awayTeam)}</span>
        </td>
        <td>
          {!finished ? (
            <span className="muted small">otvorené</span>
          ) : match.backfillFor.length > 0 ? (
            <span className="tag warn">odomknuté ({match.backfillFor.length})</span>
          ) : (
            <span className="tag">zamknuté</span>
          )}
        </td>
        <td>
          {finished ? (
            <button className="btn-sm" disabled={busy} onClick={() => setPickerOpen((v) => !v)}>
              Odomknúť
            </button>
          ) : (
            <button className="btn-sm" disabled={busy || home === '' || away === ''} onClick={save}>
              Uložiť
            </button>
          )}
        </td>
      </tr>
      {pickerOpen && (
        <BackfillPicker
          match={match}
          players={players}
          onClose={() => setPickerOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

function ResultsTab() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);

  async function load() {
    const [ms, us] = await Promise.all([api.admin.matches(), api.admin.users()]);
    setMatches(ms);
    setPlayers(
      us.filter((u) => u.nickname).sort((a, b) => a.nickname.localeCompare(b.nickname))
    );
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <p className="muted">
        Zadaj výsledok zápasu — body sa hráčom prepočítajú automaticky. „Odomknúť" pri
        zamknutom zápase umožní vybraným hráčom dotipovať ho (jeden tip, vyhodnotí sa
        podľa zadaného výsledku).
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Výkop</th>
              <th colSpan={5}>Zápas</th>
              <th>Tipovanie</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <ResultRow key={m.id} match={m} players={players} onSaved={load} />
            ))}
          </tbody>
        </table>
      </div>
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
