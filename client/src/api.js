const API = import.meta.env.VITE_API_URL || '/api';

export const TOKEN_KEY = 'wc26_token';

async function req(path, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
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
  logout: async () => {
    try {
      await req('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  matches: () => req('/matches'),
  myPredictions: () => req('/predictions/mine'),
  savePrediction: (matchId, homeScore, awayScore) =>
    req(`/predictions/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify({ homeScore, awayScore }),
    }),
  matchTips: (matchId) => req(`/predictions/match/${matchId}`),
  leaderboard: () => req('/leaderboard'),

  groups: () => req('/groups'),
  myGroupPrediction: () => req('/groups/mine'),
  saveGroupPrediction: (groups) =>
    req('/groups/mine', { method: 'PUT', body: JSON.stringify({ groups }) }),
  myPlayoffPrediction: () => req('/playoff/mine'),
  savePlayoffPrediction: (picks) =>
    req('/playoff/mine', { method: 'PUT', body: JSON.stringify(picks) }),

  results: {
    tables: () => req('/results/tables'),
    playoff: () => req('/results/playoff'),
  },

  admin: {
    users: () => req('/admin/users'),
    user: (id) => req(`/admin/users/${id}`),
    playoff: (id) => req(`/admin/users/${id}/playoff`),
    toggleHide: (id) => req(`/admin/users/${id}/toggle-hide`, { method: 'POST' }),
    toggleBlock: (id) => req(`/admin/users/${id}/toggle-block`, { method: 'POST' }),
    matches: () => req('/admin/matches'),
    setBackfill: (id, userIds) =>
      req(`/admin/matches/${id}/backfill`, {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      }),
    deletePrediction: (userId, matchId) =>
      req(`/admin/users/${userId}/predictions/${matchId}`, { method: 'DELETE' }),

    groupResult: () => req('/admin/group-result'),
    toggleGroupLock: () => req('/admin/group-result/toggle-lock', { method: 'POST' }),
    syncNow: () => req('/admin/sync-results', { method: 'POST' }),
  },
};
