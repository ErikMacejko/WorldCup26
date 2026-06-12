import mongoose from 'mongoose';
import { LOCK_MS } from '../config.js';

const matchSchema = new mongoose.Schema(
  {
    matchNumber: { type: Number, required: true, unique: true, index: true },
    stage: {
      type: String,
      enum: ['group', 'round32', 'round16', 'quarter', 'semi', 'third', 'final'],
      required: true,
    },
    group: { type: String, default: null }, // 'A'..'L' for group stage
    // Human label for knockout matches (e.g. "Round of 16 #89").
    label: { type: String, default: null },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    kickoff: { type: Date, required: true, index: true },
    venue: { type: String, default: '' },
    city: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'finished'],
      default: 'scheduled',
    },
    // Actual result, set by an admin once the match is over.
    result: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },
    // Admin override that re-opens predictions past the normal time-based
    // lock (e.g. to let someone back-fill a missed tip). Toggled off again
    // to re-lock.
    adminUnlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// True once betting is locked (30 min before kickoff by default) — at this point
// other players' tips also become visible. An admin can temporarily lift this.
matchSchema.methods.isLocked = function (now = new Date()) {
  if (this.adminUnlocked) return false;
  return now.getTime() >= this.kickoff.getTime() - LOCK_MS;
};

matchSchema.methods.toClient = function (now = new Date()) {
  return {
    id: this._id.toString(),
    matchNumber: this.matchNumber,
    stage: this.stage,
    group: this.group,
    label: this.label,
    homeTeam: this.homeTeam,
    awayTeam: this.awayTeam,
    kickoff: this.kickoff,
    venue: this.venue,
    city: this.city,
    status: this.status,
    result:
      this.result && this.result.home != null && this.result.away != null
        ? { home: this.result.home, away: this.result.away }
        : null,
    locked: this.isLocked(now),
    adminUnlocked: this.adminUnlocked,
  };
};

export const Match = mongoose.model('Match', matchSchema);
