require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const quizRoutes = require('./routes/quizRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { recomputeGlobalLeaderboard } = require('./utils/leaderboardEngine');

connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Gamified Learning Platform API running' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Recompute the global leaderboard every 15 minutes. Submissions also trigger
// an immediate (async, non-blocking) recompute in quizController — this cron
// job is the safety net that keeps things consistent even if that fire-and-
// forget call fails silently.
cron.schedule('*/15 * * * *', () => {
  recomputeGlobalLeaderboard()
    .then((count) => console.log(`[cron] Global leaderboard recomputed for ${count} students`))
    .catch((err) => console.error('[cron] Leaderboard recompute failed:', err.message));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
