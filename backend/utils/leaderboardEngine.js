const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const LeaderboardEntry = require('../models/LeaderboardEntry');

/**
 * Recomputes the GLOBAL leaderboard from User.xp / User.level.
 * Runs on a cron schedule (see server.js) and immediately after each
 * quiz submission for the submitting student's own rank to feel responsive,
 * without recomputing (and re-sorting) the entire collection on every page view.
 */
async function recomputeGlobalLeaderboard() {
  const students = await User.find({ role: 'student' })
    .select('_id xp level')
    .sort({ xp: -1 })
    .lean();

  const ops = students.map((s, index) => ({
    updateOne: {
      filter: { scope: 'global', student: s._id },
      update: {
        $set: { xp: s.xp, level: s.level, rank: index + 1, computedAt: new Date() },
      },
      upsert: true,
    },
  }));

  if (ops.length) await LeaderboardEntry.bulkWrite(ops);

  // Remove stale entries for anyone no longer a student (e.g. promoted to
  // faculty/admin, or deleted) so they don't linger on the leaderboard.
  const currentStudentIds = students.map((s) => s._id);
  await LeaderboardEntry.deleteMany({ scope: 'global', student: { $nin: currentStudentIds } });

  return students.length;
}

/**
 * Recomputes a per-course leaderboard by summing each enrolled student's XP
 * earned from quiz attempts that belong to that specific course (not their
 * global XP), so a student who's strong in one course but new to another
 * still gets a fair per-course ranking.
 */
async function recomputeCourseLeaderboard(courseId) {
  const enrollments = await Enrollment.find({ course: courseId }).select('student').lean();
  const studentIds = enrollments.map((e) => e.student);
  if (!studentIds.length) return 0;

  const xpAgg = await QuizAttempt.aggregate([
    { $match: { course: courseId } },
    { $group: { _id: '$student', courseXP: { $sum: '$xpEarned' } } },
  ]);
  const xpMap = new Map(xpAgg.map((r) => [String(r._id), r.courseXP]));

  const users = await User.find({ _id: { $in: studentIds } }).select('_id level').lean();
  const levelMap = new Map(users.map((u) => [String(u._id), u.level]));

  const ranked = studentIds
    .map((id) => ({ student: id, xp: xpMap.get(String(id)) || 0, level: levelMap.get(String(id)) || 1 }))
    .sort((a, b) => b.xp - a.xp);

  const ops = ranked.map((r, index) => ({
    updateOne: {
      filter: { scope: String(courseId), student: r.student },
      update: {
        $set: { xp: r.xp, level: r.level, rank: index + 1, computedAt: new Date() },
      },
      upsert: true,
    },
  }));

  if (ops.length) await LeaderboardEntry.bulkWrite(ops);
  return ranked.length;
}

module.exports = { recomputeGlobalLeaderboard, recomputeCourseLeaderboard };
