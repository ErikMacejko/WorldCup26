import mongoose from 'mongoose';

const playoffPredictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    r32Winners: { type: [String], default: [] },
    r16Winners: { type: [String], default: [] },
    qfWinners: { type: [String], default: [] },
    sfWinners: { type: [String], default: [] },
    champion: { type: String, default: null },
    // Points awarded once GroupResult is complete (null until then).
    points: { type: Number, default: null },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const PlayoffPrediction = mongoose.model('PlayoffPrediction', playoffPredictionSchema);
