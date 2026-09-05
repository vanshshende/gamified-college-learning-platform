const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    contentType: { type: String, enum: ['text', 'video', 'pdf'], default: 'text' },
    contentUrl: { type: String }, // link to video/pdf, or the text body itself if contentType === 'text'
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    lessons: [lessonSchema],
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, default: 'General' },
    modules: [moduleSchema],
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Total lesson count is used by the Enrollment progress calculator
courseSchema.methods.totalLessonCount = function () {
  return this.modules.reduce((sum, m) => sum + m.lessons.length, 0);
};

module.exports = mongoose.model('Course', courseSchema);
