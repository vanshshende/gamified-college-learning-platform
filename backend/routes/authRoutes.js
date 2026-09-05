const express = require('express');
const router = express.Router();
const { register, login, refresh, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// quick sanity-check route to confirm token + role middleware works
router.get('/me', protect, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role });
});

module.exports = router;
