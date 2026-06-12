import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Nickname() {
  const { user, setUser } = useAuth();
  const [value, setValue] = useState(user?.nickname || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await api.setNickname(value.trim());
      setUser(updated);
      navigate('/');
    } catch (err) {
      if (err.code === 'nickname_taken') setError('Túto prezývku už niekto má.');
      else if (err.code === 'invalid_nickname')
        setError('Prezývka musí mať 2–24 znakov.');
      else setError('Niečo sa pokazilo, skús znova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="center">
      <form className="card login-card" onSubmit={submit}>
        <h1>Zvoľ si prezývku</h1>
        <p className="muted">Pod týmto menom ťa uvidia ostatní v poradí.</p>
        <input
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="napr. GoalMaster"
          maxLength={24}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={saving || value.trim().length < 2}>
          {saving ? 'Ukladám…' : 'Pokračovať'}
        </button>
      </form>
    </div>
  );
}
