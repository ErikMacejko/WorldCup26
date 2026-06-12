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
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Loads the user from the JWT cookie and attaches it as req.user.
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
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
