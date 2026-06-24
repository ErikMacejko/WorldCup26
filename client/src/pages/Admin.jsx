import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';
import { stageLabel, flag, teamCode, fmtDateTime } from '../lib/format.js';
import GroupsAdminTab from './admin/GroupsAdminTab.jsx';
import BracketView, { deriveBracketState } from '../components/BracketTree.jsx';

function TeamTag({ team }) {
  if (!team) return <span className="muted">—</span>;
  return (
    <>
      <span className="flag">{flag(team)}</span>
      <span className="cc-full">{team}</span>
      <span className="cc-short">{teamCode(team)}</span>
    </>
  );
}

// Shown next to the "PlayOff" tab in the detail panel, independent of
// whether that tab is actually open.
function ChampionLabel({ id }) {
  const [champion, setChampion] = useState(undefined);

  useEffect(() => {
    setChampion(undefined);
    api.admin.playoff(id).then((d) => setChampion(d.champion));
  }, [id]);

  if (champion === undefined) return null;
  return (
    <span className="champion-label muted">
      Šampión: <TeamTag team={champion} />
    </span>
  );
}

// Read-only pavúk for one player, derived from their saved playoff picks.
function PlayoffSummary({ id }) {
  const [data, setData] = useState(null);
  const [activeRound, setActiveRound] = useState('r32');

  useEffect(() => {
    setData(null);
    api.admin.playoff(id).then(setData);
  }, [id]);

  if (!data) return <div className="muted small">Načítavam pavúk…</div>;
  if (!data.bracket) {
    return <p className="muted small">Hráč ešte nedokončil tipovanie skupín, pavúk nie je k dispozícii.</p>;
  }

  return (
    <>
      {data.points != null && <p className="muted small">Body za playoff: {data.points} b</p>}
      <BracketView
        rounds={deriveBracketState(data.bracket, data)}
        locked
        activeRound={activeRound}
        onActiveRoundChange={setActiveRound}
      />
    </>
  );
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function ptsTagClass(pts, max) {
  return pts === max ? 'pts-max' : pts > 0 ? 'pts-good' : 'pts-zero';
}

// Read-only Skupiny order for one player, derived from their saved picks.
function GroupsSummary({ id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.admin.groups(id).then(setData);
  }, [id]);

  if (!data) return <div className="muted small">Načítavam skupiny…</div>;

  const letters = LETTERS.filter((l) => data.groups?.[l]?.order?.length === 4);
  if (letters.length === 0) {
    return <p className="muted small">Hráč ešte nedokončil tipovanie skupín.</p>;
  }

  return (
    <>
      {data.points != null && (
        <p className="muted small">
          Body za skupiny: {data.points} b
          {data.thirdsBonus != null && ` · z toho tretie miesta: ${data.thirdsBonus} b`}
        </p>
      )}
      <div className="groups-grid">
        {letters.map((letter) => {
          const g = data.groups[letter];
          const pts = data.perGroup?.[letter];
          return (
            <div key={letter} className="group-card">
              <div className="group-card-header">
                <h3>Skupina {letter}</h3>
                {pts != null && <span className={`pts-tag ${ptsTagClass(pts, 5)}`}>+{pts} b</span>}
              </div>
              <div className="group-rank-list">
                {g.order.map((team, i) => (
                  <div key={team} className="group-rank-row">
                    <span className="rank-num">{i + 1}.</span>
                    <span className="flag">{flag(team)}</span>
                    <span className="team-name">
                      <span className="cc-full">{team}</span>
                      <span className="cc-short">{teamCode(team)}</span>
                    </span>
                    {i === 2 && g.thirdAdvances && <span className="tag">postupuje</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function UserDetail({ id, onChanged }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('tipy');

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

      <div className="tabs detail-tabs">
        <button className={tab === 'tipy' ? 'active' : ''} onClick={() => setTab('tipy')}>
          Tipy ({data.predictions.length})
        </button>
        <button className={tab === 'skupiny' ? 'active' : ''} onClick={() => setTab('skupiny')}>
          Skupiny
        </button>
        <button className={tab === 'playoff' ? 'active' : ''} onClick={() => setTab('playoff')}>
          PlayOff
        </button>
        <ChampionLabel id={id} />
      </div>

      {tab === 'tipy' && (
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
      )}

      {tab === 'skupiny' && <GroupsSummary id={id} />}
      {tab === 'playoff' && <PlayoffSummary id={id} />}
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
                <td>
                  {u.blocked && <span className="tag danger">Zablokovaný</span>}
                  {u.hiddenFromLeaderboard && <span className="tag warn">Skrytý</span>}
                  {!u.blocked && !u.hiddenFromLeaderboard && <span className="muted">OK</span>}
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

// Opened via "Odomknúť" on a locked match: lets the admin pick which
// players get a one-shot back-fill for this locked match (the result itself
// is auto-synced and shown read-only here).
function BackfillPicker({ match, players, onClose, onSaved }) {
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
      await api.admin.setBackfill(match.id, [...selected]);
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

        <div className="backfill-result muted small">
          Výsledok: {match.result?.home != null && match.result?.away != null
            ? `${match.result.home}:${match.result.away}`
            : '–:–'}
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
          <button className="btn-sm" disabled={busy} onClick={save}>
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const finished = match.status === 'finished';
  const locked = match.locked;
  const result =
    match.result?.home != null && match.result?.away != null
      ? `${match.result.home}:${match.result.away}`
      : '–:–';
  const penalty = match.result?.penaltyWinner
    ? ` (pen. ${teamCode(match.result.penaltyWinner === 'home' ? match.homeTeam : match.awayTeam)})`
    : '';

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
          <span className="vs">
            {result}
            {penalty && <span className="muted small">{penalty}</span>}
          </span>
        </td>
        <td className="col-flag">{flag(match.awayTeam)}</td>
        <td className="col-team col-away">
          <span className="cc-full">{match.awayTeam}</span>
          <span className="cc-short">{teamCode(match.awayTeam)}</span>
        </td>
        <td>
          {!locked ? (
            <span className="muted small">otvorené</span>
          ) : match.backfillFor.length > 0 ? (
            <span className="tag warn">odomknuté ({match.backfillFor.length})</span>
          ) : (
            <span className="tag">zamknuté</span>
          )}
        </td>
        <td>
          {locked && (
            <button className="btn-sm" onClick={() => setPickerOpen((v) => !v)}>
              Odomknúť
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
  const [groupResult, setGroupResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [ms, us, gr] = await Promise.all([
      api.admin.matches(),
      api.admin.users(),
      api.admin.groupResult(),
    ]);
    setMatches(ms);
    setPlayers(
      us.filter((u) => u.nickname).sort((a, b) => a.nickname.localeCompare(b.nickname))
    );
    setGroupResult(gr);
  }
  useEffect(() => {
    load();
  }, []);

  async function syncNow() {
    setSyncing(true);
    try {
      await api.admin.syncNow();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <p className="muted">
        Výsledky zápasov sa automaticky synchronizujú z reálneho turnaja (football-data.org)
        každých 10 minút. „Odomknúť" pri zamknutom zápase umožní vybraným hráčom dotipovať ho po
        termíne (jeden tip, vyhodnotí sa podľa synchronizovaného výsledku).
      </p>

      {groupResult && (
        <div className="card sync-status">
          <span>
            {groupResult.lastSyncAt
              ? `Posledná synchronizácia: ${fmtDateTime(groupResult.lastSyncAt)}`
              : 'Ešte nebola vykonaná žiadna synchronizácia.'}
          </span>
          {groupResult.lastSyncError && (
            <span className="error small">Chyba: {groupResult.lastSyncError}</span>
          )}
          <button className="btn-sm" onClick={syncNow} disabled={syncing}>
            {syncing ? 'Synchronizujem…' : 'Synchronizovať teraz'}
          </button>
        </div>
      )}

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
        <button className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>
          Skupiny
        </button>
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'results' && <ResultsTab />}
      {tab === 'groups' && <GroupsAdminTab />}
    </div>
  );
}
