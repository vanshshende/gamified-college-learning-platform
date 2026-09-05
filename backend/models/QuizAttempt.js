const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedIndex: { type: Number, required: true },
        correct: { type: Boolean, required: true },
      },
    ],
    scorePercent: { type: Number, required: true },
    xpEarned: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, required: true },
    tabSwitchCount: { type: Number, default: 0 }, // anti-cheat: focus-loss events during attempt
    flaggedSuspicious: { type: Boolean, default: false }, // true if tabSwitchCount exceeds threshold
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ student: 1, quiz: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
