/**
 * XP + Leveling engine.
 *
 * Design (explain this in the viva):
 *  - Each question's XP contribution scales with its difficulty, not a flat
 *    "10 XP per correct answer" — so a quiz mixing easy/hard questions
 *    rewards mastery of harder material more than guessing on easy ones.
 *  - A streak bonus rewards daily consistency (capped, so it can't dominate).
 *  - A speed bonus rewards finishing well under the time limit without
 *    encouraging reckless guessing (only kicks in above a minimum score).
 *  - Suspicious attempts (excessive tab-switching -> see anti-cheat middleware
 *    in quizController) have XP halved rather than zeroed, since false
 *    positives (e.g. a real tab switch to check the clock) shouldn't
 *    fully wipe out a genuine attempt.
 *  - Levels grow exponentially (threshold_n = 100 * 1.5^(n-1)) so early
 *    levels come quickly (motivation hook) and later levels require
 *    sustained engagement (prevents runaway leaderboard inflation).
 */

const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2 };
const STREAK_BONUS_PER_DAY = 2;
const STREAK_BONUS_CAP = 20; // caps at a 10-day streak worth of bonus
const SPEED_BONUS_THRESHOLD = 0.5; // finished in under 50% of allotted time
const SPEED_BONUS_MIN_SCORE = 0.7; // only rewarded if scorePercent >= 70%
const SPEED_BONUS_MULTIPLIER = 0.1; // +10% XP
const SUSPICIOUS_TAB_SWITCH_THRESHOLD = 3;
const SUSPICIOUS_XP_PENALTY = 0.5;

/**
 * @param {Array} questions - quiz.questions (each has _id, correctIndex, difficulty)
 * @param {Array} answers - [{ questionId, selectedIndex }]
 * @param {Number} basePoints - quiz.basePoints
 * @param {Number} streakCount - user's current daily streak (before this attempt)
 * @param {Number} timeTakenSeconds
 * @param {Number} timeLimitSeconds
 * @param {Number} tabSwitchCount
 */
function calculateQuizXP({
  questions,
  answers,
  basePoints,
  streakCount,
  timeTakenSeconds,
  timeLimitSeconds,
  tabSwitchCount,
}) {
  const answerMap = new Map(answers.map((a) => [String(a.questionId), a.selectedIndex]));

  let correctCount = 0;
  let rawXP = 0;
  const gradedAnswers = questions.map((q) => {
    const selectedIndex = answerMap.has(String(q._id)) ? answerMap.get(String(q._id)) : -1;
    const correct = selectedIndex === q.correctIndex;
    if (correct) {
      correctCount += 1;
      rawXP += basePoints * (DIFFICULTY_MULTIPLIER[q.difficulty] || 1);
    }
    return { questionId: q._id, selectedIndex, correct };
  });

  const scorePercent = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  const streakBonus = Math.min(streakCount * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);

  let speedBonus = 0;
  const usedFraction = timeLimitSeconds > 0 ? timeTakenSeconds / timeLimitSeconds : 1;
  if (usedFraction <= SPEED_BONUS_THRESHOLD && scorePercent / 100 >= SPEED_BONUS_MIN_SCORE) {
    speedBonus = Math.round(rawXP * SPEED_BONUS_MULTIPLIER);
  }

  let totalXP = Math.round(rawXP + streakBonus + speedBonus);

  const flaggedSuspicious = tabSwitchCount >= SUSPICIOUS_TAB_SWITCH_THRESHOLD;
  if (flaggedSuspicious) {
    totalXP = Math.round(totalXP * SUSPICIOUS_XP_PENALTY);
  }

  return {
    gradedAnswers,
    scorePercent,
    xpEarned: Math.max(totalXP, 0),
    flaggedSuspicious,
    breakdown: { rawXP, streakBonus, speedBonus },
  };
}

// Exponential level curve: XP required to REACH level n (from level 1)
function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(1.5, level - 2));
}

// Given total lifetime XP, derive current level + progress toward next level
function getLevelProgress(totalXP) {
  let level = 1;
  while (totalXP >= xpForLevel(level + 1)) {
    level += 1;
    if (level > 200) break; // safety guard
  }
  const currentLevelFloor = xpForLevel(level);
  const nextLevelCeiling = xpForLevel(level + 1);
  const xpIntoLevel = totalXP - currentLevelFloor;
  const xpNeededForLevel = nextLevelCeiling - currentLevelFloor;
  return {
    level,
    xpIntoLevel,
    xpNeededForLevel,
    progressPercent: xpNeededForLevel > 0 ? Math.round((xpIntoLevel / xpNeededForLevel) * 100) : 100,
  };
}

// Streak update: call when a student submits a quiz. Compares lastActiveDate to today.
function computeUpdatedStreak(lastActiveDate, currentStreak) {
  const today = new Date();
  const todayStr = today.toDateString();

  if (!lastActiveDate) return { streakCount: 1, lastActiveDate: today };

  const lastStr = new Date(lastActiveDate).toDateString();
  if (lastStr === todayStr) {
    // already active today, streak unchanged
    return { streakCount: currentStreak, lastActiveDate: today };
  }

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const wasYesterday = lastStr === yesterday.toDateString();

  return {
    streakCount: wasYesterday ? currentStreak + 1 : 1, // reset if the streak was broken
    lastActiveDate: today,
  };
}

module.exports = { calculateQuizXP, xpForLevel, getLevelProgress, computeUpdatedStreak };
