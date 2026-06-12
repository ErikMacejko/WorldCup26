import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config.js';
import { User } from '../models/User.js';

export function configurePassport() {
  if (!config.google.clientId || !config.google.clientSecret) {
    console.warn(
      '[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google login will not work until you fill them in .env'
    );
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || '').toLowerCase();
          const isAdmin = config.adminEmails.includes(email);

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              email,
              name: profile.displayName || '',
              avatar: profile.photos?.[0]?.value || '',
              isAdmin,
            });
          } else {
            // Keep admin flag and profile in sync on each login.
            user.email = email || user.email;
            user.name = profile.displayName || user.name;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            if (isAdmin) user.isAdmin = true;
          }

          if (user.blocked) {
            return done(null, false, { message: 'blocked' });
          }

          user.lastLoginAt = new Date();
          user.loginHistory.push(user.lastLoginAt);
          // Keep only the most recent 50 logins.
          if (user.loginHistory.length > 50) {
            user.loginHistory = user.loginHistory.slice(-50);
          }
          await user.save();

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  return passport;
}
