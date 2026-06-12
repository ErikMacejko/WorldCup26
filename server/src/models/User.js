import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    // Chosen display name in the pool. Unique when set.
    nickname: { type: String, default: null, trim: true },
    isAdmin: { type: Boolean, default: false },
    // Admin can block a user from logging in.
    blocked: { type: Boolean, default: false },
    // Admin can hide a user from the public leaderboard.
    hiddenFromLeaderboard: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    // Keep a capped history of login timestamps for the admin view.
    loginHistory: { type: [Date], default: [] },
  },
  { timestamps: true }
);

// Case-insensitive unique nickname (only enforced when nickname is a string).
userSchema.index(
  { nickname: 1 },
  {
    unique: true,
    partialFilterExpression: { nickname: { $type: 'string' } },
    collation: { locale: 'en', strength: 2 },
  }
);

export const User = mongoose.model('User', userSchema);
