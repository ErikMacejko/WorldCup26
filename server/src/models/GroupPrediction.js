import mongoose from 'mongoose';

const groupPredictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    // { A: { order: [4 team names], thirdAdvances: bool }, ..., L: {...} }
    groups: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Points awarded once GroupResult is complete (null until then).
    points: { type: Number, default: null },
    perGroup: { type: mongoose.Schema.Types.Mixed, default: null },
    thirdsBonus: { type: Number, default: null },
  },
  { timestamps: true }
);

export const GroupPrediction = mongoose.model('GroupPrediction', groupPredictionSchema);
