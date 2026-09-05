const LeaderboardEntry = require('../models/LeaderboardEntry');
const { recomputeGlobalLeaderboard, recomputeCourseLeaderboard } = require('../utils/leaderboardEngine');

// @route GET /api/leaderboard/global?limit=50
const getGlobalLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const entries = await LeaderboardEntry.find({ scope: 'global' })
      .sort({ rank: 1 })
      .limit(limit)
      .populate('student', 'name');
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leaderboard', error: err.message });
  }
};

// @route GET /api/leaderboard/course/:courseId
const getCourseLeaderboard = async (req, res) => {
  try {
    const entries = await LeaderboardEntry.find({ scope: req.params.courseId })
      .sort({ rank: 1 })
      .populate('student', 'name');
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course leaderboard', error: err.message });
  }
};

// @route POST /api/leaderboard/recompute  (admin — manual trigger, normally runs on cron)
const forceRecompute = async (req, res) => {
  try {
    const count = await recomputeGlobalLeaderboard();
    res.json({ message: `Recomputed global leaderboard for ${count} students` });
  } catch (err) {
    res.status(500).json({ message: 'Recompute failed', error: err.message });
  }
};

module.exports = { getGlobalLeaderboard, getCourseLeaderboard, forceRecompute };
