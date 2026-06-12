import { Router } from 'express';
import passport from 'passport';
import { config } from '../config.js';
import { User } from '../models/User.js';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} from '../middleware/auth.js';

const router = Router();

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    nickname: user.nickname,
    isAdmin: user.isAdmin,
    needsNickname: !user.nickname,
  };
}

// Step 1: kick off Google OAuth.
router.get(
  '/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

// Step 2: Google redirects back here.
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.clientUrl}/login?error=auth`,
  }),
  (req, res) => {
    // Blocked users come back as `false` -> handled by failureRedirect above,
    // but double-check here.
    if (!req.user) {
      return res.redirect(`${config.clientUrl}/login?error=blocked`);
    }
    const token = signToken(req.user);
    setAuthCookie(res, token);
    const dest = req.user.nickname ? '/' : '/nickname';
    res.redirect(`${config.clientUrl}${dest}`);
  }
);

// Current user.
router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// Set / change nickname.
router.post('/nickname', requireAuth, async (req, res) => {
  const raw = (req.body?.nickname || '').trim();
  if (raw.length < 2 || raw.length > 24) {
    return res.status(400).json({ error: 'invalid_nickname' });
  }
  // Case-insensitive uniqueness check (excluding self).
  const existing = await User.findOne({
    _id: { $ne: req.user._id },
    nickname: raw,
  }).collation({ locale: 'en', strength: 2 });
  if (existing) {
    return res.status(409).json({ error: 'nickname_taken' });
  }
  req.user.nickname = raw;
  try {
    await req.user.save();
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'nickname_taken' });
    }
    throw err;
  }
  res.json(publicUser(req.user));
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
