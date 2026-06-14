import mongoose from 'mongoose';

const playoffPredictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    // Player-assigned group letters for the 8 "best 3rd place" R32 slots
    // (see lib/bracket.js R32_SLOTS); null entries for slots not yet picked
    // or not applicable (fixed pairs).
    thirdPicks: { type: [String], default: () => Array(16).fill(null) },
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
