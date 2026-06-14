import { useState } from 'react';
import { createPortal } from 'react-dom';
import { flag, teamCode } from '../lib/format.js';

// Modal for picking exactly 8 of the 12 group-stage 3rd-placed teams that
// advance to the R32 wildcard slots. Shared by the player's Skupiny tab and
// the admin's Skupiny tab.
export default function ThirdsModal({ candidates, initialSelected, onClose, onSave }) {
  const [selected, setSelected] = useState(new Set(initialSelected));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(letter) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) {
        next.delete(letter);
      } else {
        if (next.size >= 8) return prev;
        next.add(letter);
      }
      return next;
    });
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      await onSave([...selected]);
    } catch {
      setError('Uloženie zlyhalo.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Postupujúce tímy z 3. miest</h3>
          <button className="modal-close" onClick={onClose} aria-label="Zavrieť">
            ✕
          </button>
        </div>
        <p className="muted">
          Vyber presne 8 z 12 tímov na 3. mieste, ktoré postúpia do play-off (R32).
        </p>
        <div className="thirds-modal-list">
          {candidates.map(({ letter, team }) => {
            const checked = selected.has(letter);
            const disabled = !checked && selected.size >= 8;
            return (
              <label key={letter} className={`group-third-toggle ${disabled ? 'disabled' : ''}`}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(letter)} />
                <span className="flag">{flag(team)}</span>
                {teamCode(team)}
                <span className="muted">(skupina {letter})</span>
              </label>
            );
          })}
        </div>
        <div className="save-row">
          <span className="muted">Vybraných: {selected.size} / 8</span>
          <button className="btn" onClick={handleSave} disabled={selected.size !== 8 || saving}>
            {saving ? 'Ukladám…' : 'Uložiť'}
          </button>
          {error && <span className="error small">{error}</span>}
        </div>
      </div>
    </div>,
    document.body
  );
}
