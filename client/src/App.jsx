import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Nickname from './pages/Nickname.jsx';
import Tipovacka from './pages/Tipovacka.jsx';
import Vysledky from './pages/Vysledky.jsx';
import MyTips from './pages/MyTips.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Admin from './pages/Admin.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);

  if (!user) return null;
  return (
    <header className="nav">
      <div className="nav-brand">
        <span className="brand-mark">26</span>
        <span className="brand-text">MS 2026 Tipovačka</span>
      </div>
      <button
        className="nav-toggle"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        ☰
      </button>
      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" end>Tipovačka</NavLink>
        <NavLink to="/vysledky">Výsledky MS</NavLink>
        <NavLink to="/moje-tipy">Moje tipy</NavLink>
        <NavLink to="/leaderboard">Poradie</NavLink>
        {user.isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="nav-user">
        <span className="nick">{user.nickname || user.name}</span>
        <button className="btn-ghost" onClick={logout}>Odhlásiť</button>
      </div>
    </header>
  );
}

function Protected({ children, adminOnly }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="center muted">Načítavam…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.nickname && loc.pathname !== '/nickname') {
    return <Navigate to="/nickname" replace />;
  }
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <div className="app">
      <Nav />
      <main className="content">
        <Routes>
          <Route
            path="/login"
            element={user && !loading ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/nickname"
            element={
              <Protected>
                <Nickname />
              </Protected>
            }
          />
          <Route
            path="/"
            element={
              <Protected>
                <Tipovacka />
              </Protected>
            }
          />
          <Route
            path="/vysledky"
            element={
              <Protected>
                <Vysledky />
              </Protected>
            }
          />
          <Route
            path="/moje-tipy"
            element={
              <Protected>
                <MyTips />
              </Protected>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <Protected>
                <Leaderboard />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected adminOnly>
                <Admin />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer muted">
        Bodovanie: presný výsledok 3 b · víťaz zápasu 1 b · trafený počet gólov
        jedného tímu 1 b
      </footer>
    </div>
  );
}
