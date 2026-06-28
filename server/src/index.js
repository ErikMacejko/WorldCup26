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
import resultsRoutes from './routes/results.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chat.js';
import gifRoutes from './routes/gif.js';
import { syncResults } from './lib/sync.js';

const SYNC_INTERVAL_MS = 10 * 60 * 1000;

async function main() {
  await connectDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
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
  app.use('/api/results', resultsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/gif', gifRoutes);

  // Centralised error handler.
  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'server_error' });
  });

  app.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
  });

  // Auto-sync real World Cup results from football-data.org on startup and
  // periodically (well within the free tier's 10 req/min limit).
  syncResults()
    .then((status) => console.log('[sync] startup sync done:', status))
    .catch((err) => console.error('[sync] startup sync failed:', err));
  setInterval(() => {
    syncResults().catch((err) => console.error('[sync] periodic sync failed:', err));
  }, SYNC_INTERVAL_MS);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
