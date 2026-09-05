const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  createQuiz,
  generateQuizWithAI,
  getQuiz,
  getQuizzesForCourse,
  submitQuizAttempt,
  getQuizAttempts,
} = require('../controllers/quizController');

router.post('/', protect, authorize('faculty', 'admin'), createQuiz);
router.post('/generate', protect, authorize('faculty', 'admin'), generateQuizWithAI);
router.get('/course/:courseId', protect, authorize('faculty', 'admin'), getQuizzesForCourse);
router.get('/:id', protect, getQuiz);
router.post('/:id/submit', protect, authorize('student'), submitQuizAttempt);
router.get('/:id/attempts', protect, authorize('faculty', 'admin'), getQuizAttempts);

module.exports = router;