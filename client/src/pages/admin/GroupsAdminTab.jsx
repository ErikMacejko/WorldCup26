import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { flag, teamCode, fmtDateTime } from '../../lib/format.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function GroupSummaryCard({ letter, order, advances }) {
  return (
    <div className="group-card">
      <div className="group-card-header">
        <h3>Skupina {letter}</h3>
      </div>
      <div className="group-rank-list">
        {order.map((team, i) => (
          <div key={team} className="group-rank-row">
            <span className="rank-num">{i + 1}.</span>
            <span className="flag">{flag(team)}</span>
            <span className="team-name">
              <span className="cc-full">{team}</span>
              <span className="cc-short">{teamCode(team)}</span>
            </span>
            {i === 2 && advances && <span className="tag warn">postupuje</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GroupsAdminTab() {
  const [groups, setGroups] = useState(null);
  const [groupResult, setGroupResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingLock, setTogglingLock] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [teams, gr] = await Promise.all([api.groups(), api.admin.groupResult()]);
    setGroups(teams);
    setGroupResult(gr);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !groups || !groupResult) return <div className="center muted">Načítavam…</div>;

  async function toggleLock() {
    setTogglingLock(true);
    try {
      const res = await api.admin.toggleGroupLock();
      setGroupResult((prev) => ({ ...prev, predictionsLocked: res.predictionsLocked }));
    } finally {
      setTogglingLock(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      await api.admin.syncNow();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  const advancingSet = new Set(groupResult.advancingThirds || []);

  return (
    <div>
      <p className="muted">
        Poradie skupín, postupujúce tretie miesta a výsledky zápasov sa automaticky
        synchronizujú z reálneho turnaja (football-data.org) každých 10 minút.
      </p>

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

      <div className="card group-lock-row">
        <span>
          Tipovanie Skupín a Playoff je{' '}
          {groupResult.predictionsLocked ? <strong>uzamknuté</strong> : <strong>odomknuté</strong>}.
        </span>
        <button
          className={`btn-sm ${groupResult.predictionsLocked ? '' : 'warn'}`}
          onClick={toggleLock}
          disabled={togglingLock}
        >
          {groupResult.predictionsLocked ? 'Odomknúť tipovanie' : 'Uzamknúť tipovanie'}
        </button>
      </div>

      <p className="muted">Postupujúce tretie miesta: {advancingSet.size} / 8</p>

      <div className="groups-grid">
        {LETTERS.map((letter) => {
          const order = groupResult.groups?.[letter]?.order || groups[letter];
          return (
            <GroupSummaryCard
              key={letter}
              letter={letter}
              order={order}
              advances={advancingSet.has(letter)}
            />
          );
        })}
      </div>
    </div>
  );
}
