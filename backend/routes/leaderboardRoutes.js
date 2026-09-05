const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { getGlobalLeaderboard, getCourseLeaderboard, forceRecompute } = require('../controllers/leaderboardController');

router.get('/global', protect, getGlobalLeaderboard);
router.get('/course/:courseId', protect, getCourseLeaderboard);
router.post('/recompute', protect, authorize('admin'), forceRecompute);

module.exports = router;
