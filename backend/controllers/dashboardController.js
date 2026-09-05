const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const { getLevelProgress } = require('../utils/xpEngine');

// @route GET /api/dashboard/student
const studentDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const enrollments = await Enrollment.find({ student: req.user.id }).populate('course', 'title category');
    const recentAttempts = await QuizAttempt.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('quiz', 'title');
    const globalEntry = await LeaderboardEntry.findOne({ scope: 'global', student: req.user.id });

    res.json({
      xp: user.xp,
      streak: user.streakCount,
      levelProgress: getLevelProgress(user.xp),
      globalRank: globalEntry?.rank || null,
      enrollments,
      recentAttempts,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load dashboard', error: err.message });
  }
};

// @route GET /api/dashboard/faculty
const facultyDashboard = async (req, res) => {
  try {
    const courses = await Course.find({ faculty: req.user.id });
    const courseIds = courses.map((c) => c._id);

    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

    // Weak-topic analytics: which questions get missed most, grouped by quiz
    const attemptStats = await QuizAttempt.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $unwind: '$answers' },
      {
        $group: {
          _id: { quiz: '$quiz', questionId: '$answers.questionId' },
          totalAnswered: { $sum: 1 },
          totalCorrect: { $sum: { $cond: ['$answers.correct', 1, 0] } },
        },
      },
      {
        $project: {
          missRate: { $subtract: [1, { $divide: ['$totalCorrect', '$totalAnswered'] }] },
          totalAnswered: 1,
        },
      },
      { $sort: { missRate: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      courses: courses.map((c) => ({
        _id: c._id,
        title: c.title,
        published: c.published,
        enrolledCount: countMap.get(String(c._id)) || 0,
        moduleCount: c.modules.length,
      })),
      weakestQuestions: attemptStats,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load faculty dashboard', error: err.message });
  }
};

// @route GET /api/dashboard/admin
const adminDashboard = async (req, res) => {
  try {
    const [studentCount, facultyCount, pendingFaculty, courseCount, quizAttemptCount] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      User.find({ role: 'faculty', isApproved: false }).select('name email createdAt'),
      Course.countDocuments(),
      QuizAttempt.countDocuments(),
    ]);

    res.json({
      studentCount,
      facultyCount,
      pendingFacultyApprovals: pendingFaculty,
      courseCount,
      quizAttemptCount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load admin dashboard', error: err.message });
  }
};

// @route PUT /api/dashboard/admin/approve-faculty/:userId
const approveFaculty = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'faculty') return res.status(404).json({ message: 'Faculty account not found' });
    user.isApproved = true;
    await user.save();
    res.json({ message: `${user.name} approved` });
  } catch (err) {
    res.status(500).json({ message: 'Approval failed', error: err.message });
  }
};

module.exports = { studentDashboard, facultyDashboard, adminDashboard, approveFaculty };
