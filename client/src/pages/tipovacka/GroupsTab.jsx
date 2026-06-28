import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { flag, teamCode } from '../../lib/format.js';
import ThirdsModal from '../../components/ThirdsModal.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function PtsBadge({ pts, max }) {
  if (pts == null) return null;
  const cls = pts === max ? 'pts-max' : pts > 0 ? 'pts-good' : 'pts-zero';
  return <span className={`pts-tag ${cls}`}>+{pts} b</span>;
}

function GroupCard({ letter, order, thirdAdvances, onMove, locked, pts }) {
  return (
    <div className="group-card">
      <div className="group-card-header">
        <h3>Skupina {letter}</h3>
        <PtsBadge pts={pts} max={5} />
      </div>
      <div className="group-rank-list">
        {order.map((team, i) => (
          <div key={team} className="group-rank-row">
            <span className={`rank-badge ${i < 2 ? 'rank-adv-top' : i === 2 && thirdAdvances ? 'rank-adv-third' : ''}`}>{i + 1}</span>
            <span className="flag">{flag(team)}</span>
            <span className="team-name">
              <span className="cc-full">{team}</span>
              <span className="cc-short">{teamCode(team)}</span>
            </span>
            {!locked && (
              <div className="rank-controls">
                <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => onMove(i, -1)}>
                  ▲
                </button>
                <button className="btn-ghost btn-sm" disabled={i === order.length - 1} onClick={() => onMove(i, 1)}>
                  ▼
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GroupsTab() {
  const [groups, setGroups] = useState(null);
  const [points, setPoints] = useState(null);
  const [perGroup, setPerGroup] = useState(null);
  const [thirdsBonus, setThirdsBonus] = useState(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');
  const [thirdsModalOpen, setThirdsModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.groups(), api.myGroupPrediction()]).then(([teams, mine]) => {
      const initial = {};
      for (const letter of LETTERS) {
        const saved = mine.groups?.[letter];
        initial[letter] = {
          order: saved?.order ? [...saved.order] : [...teams[letter]],
          thirdAdvances: !!saved?.thirdAdvances,
        };
      }
      setGroups(initial);
      setPoints(mine.points);
      setPerGroup(mine.perGroup);
      setThirdsBonus(mine.thirdsBonus);
      setLocked(mine.locked);
      setLoading(false);
    });
  }, []);

  if (loading || !groups) return <div className="center muted">Načítavam skupiny…</div>;

  function move(letter, idx, dir) {
    setGroups((prev) => {
      const order = [...prev[letter].order];
      const j = idx + dir;
      if (j < 0 || j >= order.length) return prev;
      [order[idx], order[j]] = [order[j], order[idx]];
      return { ...prev, [letter]: { ...prev[letter], order } };
    });
  }

  async function startSave() {
    setError('');
    try {
      const pp = await api.myPlayoffPrediction();
      if (pp.champion) {
        const ok = window.confirm(
          'Uložením tipov na skupiny sa vymaže tvoja predpoveď Playoff, lebo sa môže zmeniť pavúk. Pokračovať?'
        );
        if (!ok) return;
      }
    } catch {
      /* ignore */
    }
    setThirdsModalOpen(true);
  }

  async function confirmSave(selectedLetters) {
    const selected = new Set(selectedLetters);
    const payload = {};
    for (const letter of LETTERS) {
      payload[letter] = { order: groups[letter].order, thirdAdvances: selected.has(letter) };
    }
    try {
      const res = await api.saveGroupPrediction(payload);
      setGroups((prev) => {
        const next = {};
        for (const letter of LETTERS) {
          next[letter] = { order: prev[letter].order, thirdAdvances: selected.has(letter) };
        }
        return next;
      });
      setPoints(res.points);
      setPerGroup(res.perGroup);
      setThirdsBonus(res.thirdsBonus);
      setLocked(res.locked);
      setThirdsModalOpen(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      if (err.code === 'locked') {
        setError('Tipovanie skupín je uzamknuté.');
        setThirdsModalOpen(false);
        return;
      }
      throw err;
    }
  }

  const candidates = LETTERS.map((l) => ({ letter: l, team: groups[l].order[2] }));
  const initialSelected = LETTERS.filter((l) => groups[l].thirdAdvances);

  return (
    <div>
      <p className="muted">
        Zoraď tímy v každej skupine od 1. do 4. miesta. Trafené 1. miesto = +2 b, každé ďalšie
        trafené miesto = +1 b (max 5 b / skupina). Po uložení poradia vyberieš presne 8 tímov na
        3. mieste, ktoré podľa teba postúpia do play-off (+1 b za každý trafený) — body sa zobrazia
        až po zadaní kompletných výsledkov skupín administrátorom.
      </p>

      {points != null && (
        <div className="card group-points-summary">
          <strong>Body za skupiny: {points} b</strong>
          {thirdsBonus != null && (
            <span className="muted"> · z toho tretie miesta: {thirdsBonus} b</span>
          )}
        </div>
      )}

      <div className="groups-grid">
        {LETTERS.map((letter) => (
          <GroupCard
            key={letter}
            letter={letter}
            order={groups[letter].order}
            thirdAdvances={groups[letter].thirdAdvances}
            onMove={(idx, dir) => move(letter, idx, dir)}
            locked={locked}
            pts={perGroup?.[letter]}
          />
        ))}
      </div>

      {locked ? (
        <div className="muted">🔒 Tipovanie skupín je uzamknuté.</div>
      ) : (
        <div className="save-row">
          <button className="btn" onClick={startSave}>
            Uložiť poradie
          </button>
          {savedFlash && <span className="ok">✓ uložené</span>}
          {error && <span className="error small">{error}</span>}
        </div>
      )}

      {thirdsModalOpen && (
        <ThirdsModal
          candidates={candidates}
          initialSelected={initialSelected}
          onClose={() => setThirdsModalOpen(false)}
          onSave={confirmSave}
        />
      )}
    </div>
  );
}
