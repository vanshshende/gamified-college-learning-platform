const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  studentDashboard,
  facultyDashboard,
  adminDashboard,
  approveFaculty,
} = require('../controllers/dashboardController');

router.get('/student', protect, authorize('student'), studentDashboard);
router.get('/faculty', protect, authorize('faculty', 'admin'), facultyDashboard);
router.get('/admin', protect, authorize('admin'), adminDashboard);
router.put('/admin/approve-faculty/:userId', protect, authorize('admin'), approveFaculty);

module.exports = router;
