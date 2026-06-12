const API = import.meta.env.VITE_API_URL || '/api';

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    let body = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const err = new Error(body.error || `http_${res.status}`);
    err.status = res.status;
    err.code = body.error;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// Full-page redirect to start Google OAuth.
export const googleLoginUrl = `${API}/auth/google`;

export const api = {
  me: () => req('/auth/me'),
  setNickname: (nickname) =>
    req('/auth/nickname', { method: 'POST', body: JSON.stringify({ nickname }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  matches: () => req('/matches'),
  myPredictions: () => req('/predictions/mine'),
  savePrediction: (matchId, homeScore, awayScore) =>
    req(`/predictions/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify({ homeScore, awayScore }),
    }),
  matchTips: (matchId) => req(`/predictions/match/${matchId}`),
  leaderboard: () => req('/leaderboard'),

  admin: {
    users: () => req('/admin/users'),
    user: (id) => req(`/admin/users/${id}`),
    toggleHide: (id) => req(`/admin/users/${id}/toggle-hide`, { method: 'POST' }),
    toggleBlock: (id) => req(`/admin/users/${id}/toggle-block`, { method: 'POST' }),
    matches: () => req('/admin/matches'),
    setResult: (id, home, away) =>
      req(`/admin/matches/${id}/result`, {
        method: 'PUT',
        body: JSON.stringify({ home, away }),
      }),
    clearResult: (id) => req(`/admin/matches/${id}/result`, { method: 'DELETE' }),
    deletePrediction: (userId, matchId) =>
      req(`/admin/users/${userId}/predictions/${matchId}`, { method: 'DELETE' }),
  },
};
