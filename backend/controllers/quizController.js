const axios = require('axios');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const { calculateQuizXP, getLevelProgress, computeUpdatedStreak } = require('../utils/xpEngine');
const { recomputeGlobalLeaderboard, recomputeCourseLeaderboard } = require('../utils/leaderboardEngine');

// @route POST /api/quizzes  (faculty, manual creation)
const createQuiz = async (req, res) => {
  try {
    const { title, courseId, questions, timeLimitSeconds, basePoints } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (String(course.faculty) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }
    if (!questions || questions.length < 1) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    const quiz = await Quiz.create({
      title,
      course: courseId,
      createdBy: req.user.id,
      source: 'manual',
      questions,
      timeLimitSeconds: timeLimitSeconds || 600,
      basePoints: basePoints || 10,
    });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create quiz', error: err.message });
  }
};

// @route POST /api/quizzes/generate  (faculty, calls the Python AI microservice)
// Body: { courseId, title, topicOrText, numQuestions, difficulty }
const generateQuizWithAI = async (req, res) => {
  try {
    const { courseId, title, topicOrText, numQuestions, difficulty } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (String(course.faculty) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const { data } = await axios.post(`${aiServiceUrl}/generate-quiz`, {
      topic_or_text: topicOrText,
      num_questions: numQuestions || 5,
      difficulty: difficulty || 'medium',
    });

    // data.questions: [{ questionText, options, correctIndex, difficulty }]
    const quiz = await Quiz.create({
      title: title || `AI Quiz: ${topicOrText.slice(0, 40)}`,
      course: courseId,
      createdBy: req.user.id,
      source: 'ai',
      questions: data.questions,
      timeLimitSeconds: (numQuestions || 5) * 60, // 1 min/question default
      basePoints: 10,
    });
    res.status(201).json(quiz);
  } catch (err) {
    const upstream = err.response?.data;
    res.status(502).json({
      message: 'AI quiz generation failed. Is the ai-service running?',
      error: upstream || err.message,
    });
  }
};

// @route GET /api/quizzes/:id  (student-safe: strips correctIndex before sending)
const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (req.user.role === 'student') {
      const safe = quiz.toObject();
      safe.questions = safe.questions.map(({ correctIndex, ...q }) => q);
      return res.json(safe);
    }
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch quiz', error: err.message });
  }
};

// @route POST /api/quizzes/:id/submit  (student)
// Body: { answers: [{questionId, selectedIndex}], timeTakenSeconds, tabSwitchCount }
const submitQuizAttempt = async (req, res) => {
  try {
    const { answers, timeTakenSeconds, tabSwitchCount } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const user = await User.findById(req.user.id);

    const result = calculateQuizXP({
      questions: quiz.questions,
      answers: answers || [],
      basePoints: quiz.basePoints,
      streakCount: user.streakCount,
      timeTakenSeconds: timeTakenSeconds || quiz.timeLimitSeconds,
      timeLimitSeconds: quiz.timeLimitSeconds,
      tabSwitchCount: tabSwitchCount || 0,
    });

    const attempt = await QuizAttempt.create({
      student: user._id,
      quiz: quiz._id,
      course: quiz.course,
      answers: result.gradedAnswers,
      scorePercent: result.scorePercent,
      xpEarned: result.xpEarned,
      timeTakenSeconds: timeTakenSeconds || quiz.timeLimitSeconds,
      tabSwitchCount: tabSwitchCount || 0,
      flaggedSuspicious: result.flaggedSuspicious,
    });

    // Update streak, XP, level
    const streakUpdate = computeUpdatedStreak(user.lastActiveDate, user.streakCount);
    user.streakCount = streakUpdate.streakCount;
    user.lastActiveDate = streakUpdate.lastActiveDate;
    user.xp += result.xpEarned;
    user.level = getLevelProgress(user.xp).level;
    await user.save();

    // Recompute leaderboards asynchronously (don't block the response on this)
    recomputeGlobalLeaderboard().catch((e) => console.error('Global leaderboard recompute failed:', e.message));
    recomputeCourseLeaderboard(quiz.course).catch((e) => console.error('Course leaderboard recompute failed:', e.message));

    res.status(201).json({
      attempt,
      xpEarned: result.xpEarned,
      breakdown: result.breakdown,
      newXP: user.xp,
      levelProgress: getLevelProgress(user.xp),
      streak: user.streakCount,
      flaggedSuspicious: result.flaggedSuspicious,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit quiz', error: err.message });
  }
};

// @route GET /api/quizzes/:id/attempts  (faculty — see all attempts + flagged ones)
const getQuizAttempts = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ quiz: req.params.id }).populate('student', 'name email');
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attempts', error: err.message });
  }
};

// @route GET /api/quizzes/course/:courseId  (faculty — list quizzes belonging to a course, for module attachment)
const getQuizzesForCourse = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId }).select('title source questions createdAt');
    res.json(
      quizzes.map((q) => ({
        _id: q._id,
        title: q.title,
        source: q.source,
        questionCount: q.questions.length,
        createdAt: q.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch quizzes for course', error: err.message });
  }
};

module.exports = {
  createQuiz,
  generateQuizWithAI,
  getQuiz,
  getQuizzesForCourse,
  submitQuizAttempt,
  getQuizAttempts,
};