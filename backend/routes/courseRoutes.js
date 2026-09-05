const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  addModule,
  addLesson,
  attachQuizToModule,
  enrollInCourse,
  completeLesson,
  getMyEnrollment,
  getMyEnrollments,
} = require('../controllers/courseController');

router.get('/', protect, listCourses);
router.post('/', protect, authorize('faculty', 'admin'), createCourse);
router.get('/enrollments/mine', protect, authorize('student'), getMyEnrollments);
router.get('/:id', protect, getCourse);
router.put('/:id', protect, authorize('faculty', 'admin'), updateCourse);
router.post('/:id/modules', protect, authorize('faculty', 'admin'), addModule);
router.post('/:id/modules/:moduleId/lessons', protect, authorize('faculty', 'admin'), addLesson);
router.put('/:id/modules/:moduleId/quiz', protect, authorize('faculty', 'admin'), attachQuizToModule);

router.post('/:id/enroll', protect, authorize('student'), enrollInCourse);
router.get('/:id/enrollment', protect, authorize('student'), getMyEnrollment);
router.post('/:id/lessons/:lessonId/complete', protect, authorize('student'), completeLesson);

module.exports = router;