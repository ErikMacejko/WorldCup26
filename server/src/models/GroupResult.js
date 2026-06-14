import mongoose from 'mongoose';

const groupResultSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'singleton' },
    // { A: { order: [4 team names] }, ..., L: {...} } - filled progressively.
    groups: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Up to 8 group letters whose 3rd-placed team advances.
    advancingThirds: { type: [String], default: [] },
    // Global toggle: when true, players can no longer edit Skupiny/Playoff predictions.
    predictionsLocked: { type: Boolean, default: false },
    // Set by lib/sync.js after each auto-sync run against football-data.org.
    lastSyncAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null },
  },
  { timestamps: true }
);

groupResultSchema.statics.getSingleton = async function () {
  let doc = await this.findById('singleton');
  if (!doc) doc = await this.create({ _id: 'singleton' });
  return doc;
};

export const GroupResult = mongoose.model('GroupResult', groupResultSchema);
