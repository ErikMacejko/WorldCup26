import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { flag, teamCode } from '../../lib/format.js';
import ThirdsModal from '../../components/ThirdsModal.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function GroupOrderCard({ letter, order, hasSaved, onMove, onClear, clearing }) {
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
            <div className="rank-controls">
              <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => onMove(i, -1)}>
                ▲
              </button>
              <button className="btn-ghost btn-sm" disabled={i === order.length - 1} onClick={() => onMove(i, 1)}>
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="save-row">
        <button className="btn-sm warn" onClick={onClear} disabled={!hasSaved || clearing}>
          {clearing ? 'Mažem…' : 'Zmazať poradie'}
        </button>
      </div>
    </div>
  );
}

export default function GroupsAdminTab() {
  const [order, setOrder] = useState(null);
  const [savedOrders, setSavedOrders] = useState({});
  const [advancingThirds, setAdvancingThirds] = useState([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearingLetter, setClearingLetter] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');
  const [thirdsModalOpen, setThirdsModalOpen] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);

  async function load() {
    const [teams, gr] = await Promise.all([api.groups(), api.admin.groupResult()]);
    const ord = {};
    const saved = {};
    for (const l of LETTERS) {
      saved[l] = !!gr.groups?.[l]?.order;
      ord[l] = gr.groups?.[l]?.order ? [...gr.groups[l].order] : [...teams[l]];
    }
    setOrder(ord);
    setSavedOrders(saved);
    setAdvancingThirds(gr.advancingThirds || []);
    setLocked(gr.predictionsLocked);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !order) return <div className="center muted">Načítavam…</div>;

  function move(letter, idx, dir) {
    setOrder((prev) => {
      const arr = [...prev[letter]];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...prev, [letter]: arr };
    });
  }

  async function clearOrder(letter) {
    setClearingLetter(letter);
    try {
      await api.admin.clearGroupResultOrder(letter);
      await load();
    } finally {
      setClearingLetter(null);
    }
  }

  async function startSaveAll() {
    setError('');
    setSavingAll(true);
    try {
      for (const letter of LETTERS) {
        await api.admin.setGroupResultOrder(letter, order[letter]);
      }
      setSavedOrders(Object.fromEntries(LETTERS.map((l) => [l, true])));
      setThirdsModalOpen(true);
    } catch {
      setError('Uloženie poradia zlyhalo.');
    } finally {
      setSavingAll(false);
    }
  }

  async function confirmThirds(selectedLetters) {
    await api.admin.setAdvancingThirds(selectedLetters);
    await load();
    setThirdsModalOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function toggleLock() {
    setTogglingLock(true);
    try {
      const res = await api.admin.toggleGroupLock();
      setLocked(res.predictionsLocked);
    } finally {
      setTogglingLock(false);
    }
  }

  const candidates = LETTERS.map((l) => ({ letter: l, team: order[l][2] }));

  return (
    <div>
      <p className="muted">
        Zoraď reálne konečné poradie v každej skupine (1.–4. miesto) a ulož. Po uložení sa
        zobrazí výber 8 z 12 tímov na 3. mieste, ktoré skutočne postúpili do play-off. Body za
        Skupiny a Playoff sa hráčom zobrazia až po zadaní všetkých 12 skupín a presne 8
        postupujúcich tretích miest.
      </p>

      <div className="card group-lock-row">
        <span>
          Tipovanie Skupín a Playoff je{' '}
          {locked ? <strong>uzamknuté</strong> : <strong>odomknuté</strong>}.
        </span>
        <button className={`btn-sm ${locked ? '' : 'warn'}`} onClick={toggleLock} disabled={togglingLock}>
          {locked ? 'Odomknúť tipovanie' : 'Uzamknúť tipovanie'}
        </button>
      </div>

      <div className="save-row">
        <button className="btn" onClick={startSaveAll} disabled={savingAll}>
          {savingAll ? 'Ukladám…' : 'Uložiť poradie skupín'}
        </button>
        <span className="muted">Postupujúce tretie miesta: {advancingThirds.length} / 8</span>
        {savedFlash && <span className="ok">✓ uložené</span>}
        {error && <span className="error small">{error}</span>}
      </div>

      <div className="groups-grid">
        {LETTERS.map((letter) => (
          <GroupOrderCard
            key={letter}
            letter={letter}
            order={order[letter]}
            hasSaved={savedOrders[letter]}
            onMove={(idx, dir) => move(letter, idx, dir)}
            onClear={() => clearOrder(letter)}
            clearing={clearingLetter === letter}
          />
        ))}
      </div>

      {thirdsModalOpen && (
        <ThirdsModal
          candidates={candidates}
          initialSelected={advancingThirds}
          onClose={() => setThirdsModalOpen(false)}
          onSave={confirmThirds}
        />
      )}
    </div>
  );
}
