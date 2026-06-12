import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

function Rules() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rules">
      <button className="btn-link" onClick={() => setOpen((o) => !o)}>
        {open ? '▾ Skryť pravidlá' : '▸ Pravidlá'}
      </button>
      {open && (
        <div className="rules-content muted">
          <p>Za každý zápas môžeš získať body za svoj tip:</p>
          <ul>
            <li><strong>3 body</strong> – presne uhádnutý výsledok</li>
            <li><strong>1 bod</strong> – uhádnutý víťaz zápasu (alebo remíza)</li>
            <li><strong>1 bod</strong> – trafený počet gólov jedného z tímov</li>
          </ul>
          <p>Body za víťaza a za počet gólov sa sčítavajú (max. 2 body, ak nejde o presný výsledok).</p>
          <p>Tip môžeš meniť až do výkopu zápasu, potom sa uzamkne.</p>
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.leaderboard().then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="center muted">Načítavam poradie…</div>;

  return (
    <div className="page">
      <h2>Poradie</h2>
      <Rules />
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Hráč</th>
            <th className="num">Body</th>
            <th className="num">Presné</th>
            <th className="num">Tipov</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.nickname}
              className={user?.nickname === r.nickname ? 'me' : ''}
            >
              <td>{r.rank}</td>
              <td>{r.nickname}</td>
              <td className="num strong">{r.totalPoints}</td>
              <td className="num">{r.exact}</td>
              <td className="num">{r.scored}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="5" className="muted center">
                Zatiaľ žiadne body.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
