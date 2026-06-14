import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { connectDb } from './db.js';
import { configurePassport } from './auth/passport.js';

import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import predictionRoutes from './routes/predictions.js';
import groupsRoutes from './routes/groups.js';
import playoffRoutes from './routes/playoff.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';

async function main() {
  await connectDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );

  const passport = configurePassport();
  app.use(passport.initialize());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/predictions', predictionRoutes);
  app.use('/api/groups', groupsRoutes);
  app.use('/api/playoff', playoffRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/admin', adminRoutes);

  // Centralised error handler.
  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'server_error' });
  });

  app.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
