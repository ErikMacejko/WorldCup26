import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/worldcup26',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:4000/api/auth/google/callback',
  },
  // Where the browser-facing frontend lives (used for OAuth redirects + CORS).
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Comma-separated list of emails that are admins.
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  // Minutes before kickoff when betting locks and others' tips become visible.
  lockMinutes: parseInt(process.env.LOCK_MINUTES || '30', 10),
  // football-data.org API token used to auto-sync real World Cup results.
  footballDataToken: process.env.FOOTBALL_DATA_TOKEN || '',
};

export const LOCK_MS = config.lockMinutes * 60 * 1000;
