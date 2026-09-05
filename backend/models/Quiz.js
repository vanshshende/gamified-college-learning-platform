const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: {
      type: [String],
      validate: (v) => v.length >= 2 && v.length <= 6,
    },
    correctIndex: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    questions: [questionSchema],
    timeLimitSeconds: { type: Number, default: 600 }, // 10 min default
    // XP awarded scales with difficulty mix and streak — see utils/xpEngine.js
    basePoints: { type: Number, default: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
