import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';
import { flag, teamCode } from '../lib/format.js';
import BracketView, { deriveBracketState } from './BracketTree.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function GroupsView({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.groupsOf(userId).then(setData);
  }, [userId]);

  if (!data) return <div className="muted small">Načítavam skupiny…</div>;

  const letters = LETTERS.filter((l) => data.groups?.[l]?.order?.length === 4);
  if (!letters.length) return <p className="muted small">Hráč ešte nedokončil tipovanie skupín.</p>;

  return (
    <>
      {data.points != null && (
        <p className="muted small" style={{ marginBottom: '0.75rem' }}>
          Body za skupiny: <strong>{data.points} b</strong>
          {data.thirdsBonus != null && ` · tretie miesta: ${data.thirdsBonus} b`}
        </p>
      )}
      <div className="groups-grid">
        {letters.map((letter) => {
          const g = data.groups[letter];
          return (
            <div key={letter} className="group-card">
              <div className="group-card-header"><h3>Skupina {letter}</h3></div>
              <div className="group-rank-list">
                {g.order.map((team, i) => (
                  <div key={team} className="group-rank-row">
                    <span className={`rank-badge ${i < 2 ? 'rank-adv-top' : i === 2 && g.thirdAdvances ? 'rank-adv-third' : ''}`}>{i + 1}</span>
                    <span className="flag">{flag(team)}</span>
                    <span className="team-name">
                      <span className="cc-full">{team}</span>
                      <span className="cc-short">{teamCode(team)}</span>
                    </span>
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

function PlayoffView({ userId }) {
  const [data, setData] = useState(null);
  const [activeRound, setActiveRound] = useState('r32');

  useEffect(() => {
    setData(null);
    api.playoffOf(userId)
      .then(setData)
      .catch((err) => setData({ _err: err.code || 'error' }));
  }, [userId]);

  if (!data) return <div className="muted small">Načítavam playoff…</div>;
  if (data._err === 'groups_not_finished') return <p className="muted small">Playoff tipy sa zobrazia po skončení skupinovej fázy.</p>;
  if (data._err) return <p className="muted small">Nepodarilo sa načítať playoff.</p>;
  if (!data.bracket?.length) return <p className="muted small">Hráč ešte nevyplnil playoff.</p>;

  const derived = deriveBracketState(data.bracket, data);

  return (
    <BracketView
      rounds={derived}
      locked
      activeRound={activeRound}
      onActiveRoundChange={setActiveRound}
    />
  );
}

export default function PlayerModal({ player, onClose }) {
  const [tab, setTab] = useState('skupiny');
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="player-modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="player-modal">
        <div className="player-modal-header">
          <h3>{player.nickname}</h3>
          <button className="chat-close" onClick={onClose} aria-label="Zavrieť">✕</button>
        </div>
        <div className="player-modal-tabs tabs">
          <button className={tab === 'skupiny' ? 'active' : ''} onClick={() => setTab('skupiny')}>Skupiny</button>
          <button className={tab === 'playoff' ? 'active' : ''} onClick={() => setTab('playoff')}>Pavúk</button>
        </div>
        <div className="player-modal-body">
          {tab === 'skupiny' && <GroupsView userId={player.userId} />}
          {tab === 'playoff' && <PlayoffView userId={player.userId} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
