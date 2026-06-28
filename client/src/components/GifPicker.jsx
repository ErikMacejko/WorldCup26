import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const inputRef = useRef(null);
  const debounced = useDebounce(query, 400);

  useEffect(() => {
    inputRef.current?.focus();
    load('');
  }, []);

  useEffect(() => {
    load(debounced);
  }, [debounced]);

  async function load(q) {
    setLoading(true);
    try {
      const res = await api.gif.search(q);
      if (res.missing) { setMissing(true); setGifs([]); }
      else { setGifs(res.data || []); }
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gif-picker">
      <div className="gif-search-row">
        <input
          ref={inputRef}
          className="gif-search"
          placeholder="Hľadaj GIF…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="gif-close" onClick={onClose}>✕</button>
      </div>

      {missing ? (
        <p className="muted small" style={{ padding: '0.75rem', textAlign: 'center' }}>
          GIPHY API kľúč nie je nastavený.
        </p>
      ) : (
        <div className="gif-grid">
          {loading && (
            <span className="muted small" style={{ gridColumn: '1/-1', padding: '0.5rem', textAlign: 'center' }}>
              Načítavam…
            </span>
          )}
          {!loading && gifs.map((g) => (
            <button
              key={g.id}
              type="button"
              className="gif-item"
              onClick={() => { onSelect(g.url); onClose(); }}
              title={g.title}
            >
              <img src={g.preview} alt={g.title} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="gif-powered">Powered by GIPHY</div>
    </div>
  );
}
