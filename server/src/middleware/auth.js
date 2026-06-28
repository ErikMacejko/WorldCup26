import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';

export const COOKIE_NAME = 'wc26_token';

export function signToken(user) {
  return jwt.sign({ uid: user._id.toString() }, config.jwtSecret, {
    expiresIn: '30d',
  });
}

export function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    // Client and server live on different *.up.railway.app subdomains in
    // production, so the auth cookie must be sent cross-site.
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Loads the user from the JWT (cookie or Authorization header) and attaches
// it as req.user. The header is the primary mechanism: client and server run
// on different *.up.railway.app subdomains, which browsers treat as separate
// sites and partition cookies between (so the cookie often isn't sent).
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    // req.query.token is the fallback for EventSource (SSE) which cannot send headers.
    const token = bearer || req.cookies?.[COOKIE_NAME] || req.query?.token;
    if (!token) return res.status(401).json({ error: 'not_authenticated' });

    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.uid);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    if (user.blocked) return res.status(403).json({ error: 'blocked' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'not_authenticated' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'forbidden' });
  next();
}

// Many actions require a nickname to be set first.
export function requireNickname(req, res, next) {
  if (!req.user?.nickname) {
    return res.status(409).json({ error: 'nickname_required' });
  }
  next();
}
