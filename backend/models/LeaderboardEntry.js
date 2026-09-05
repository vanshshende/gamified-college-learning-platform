const mongoose = require('mongoose');

// One document per (scope, student). scope is either 'global' or a course ID string.
// Recomputed by utils/leaderboardEngine.js on a schedule + on quiz submission,
// so reads are O(1) sorted-index lookups instead of aggregating the whole User
// collection on every leaderboard page view.
const leaderboardEntrySchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, index: true }, // 'global' or courseId
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    xp: { type: Number, required: true },
    level: { type: Number, required: true },
    rank: { type: Number, required: true },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leaderboardEntrySchema.index({ scope: 1, student: 1 }, { unique: true });
leaderboardEntrySchema.index({ scope: 1, rank: 1 });

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
