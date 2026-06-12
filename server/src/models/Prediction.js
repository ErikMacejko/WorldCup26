import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    homeScore: { type: Number, required: true, min: 0 },
    awayScore: { type: Number, required: true, min: 0 },
    // Points awarded once the match is finished (null while not yet scored).
    points: { type: Number, default: null },
  },
  { timestamps: true }
);

// One prediction per user per match.
predictionSchema.index({ user: 1, match: 1 }, { unique: true });

export const Prediction = mongoose.model('Prediction', predictionSchema);
