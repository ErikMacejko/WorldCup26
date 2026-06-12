// Seed all 104 World Cup 2026 matches into MongoDB.
// Run with: npm run seed   (or: node src/seed/seed.js)
//
// It upserts by matchNumber, so re-running updates kickoff/teams/venue without
// creating duplicates and without wiping any predictions or results.
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Match } from '../models/Match.js';
import { buildMatches } from './matchData.js';

async function run() {
  await connectDb();
  const matches = buildMatches();

  let created = 0;
  let updated = 0;
  for (const m of matches) {
    const existing = await Match.findOne({ matchNumber: m.matchNumber });
    if (existing) {
      // Update schedule fields but keep status/result intact.
      existing.stage = m.stage;
      existing.group = m.group;
      existing.label = m.label ?? null;
      existing.homeTeam = m.homeTeam;
      existing.awayTeam = m.awayTeam;
      existing.kickoff = m.kickoff;
      existing.venue = m.venue;
      existing.city = m.city;
      await existing.save();
      updated += 1;
    } else {
      await Match.create(m);
      created += 1;
    }
  }

  console.log(`[seed] done — ${created} created, ${updated} updated (${matches.length} total).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
