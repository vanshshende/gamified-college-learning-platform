import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function QuizAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshUserFields } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({}); // questionId -> selectedIndex
  const [timeLeft, setTimeLeft] = useState(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api
      .get(`/quizzes/${id}`)
      .then((res) => {
        setQuiz(res.data);
        setTimeLeft(res.data.timeLimitSeconds);
        startTimeRef.current = Date.now();
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load quiz'));
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result]);

  // Anti-cheat: count focus-loss / tab-switch events during the attempt
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !result) {
        setTabSwitchCount((c) => c + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [result]);

  const handleSelect = (questionId, index) => {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  };

  const handleSubmit = async () => {
    if (submitting || result) return;
    setSubmitting(true);
    clearTimeout(timerRef.current);

    const timeTakenSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const payload = {
      answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })),
      timeTakenSeconds,
      tabSwitchCount,
    };

    try {
      const { data } = await api.post(`/quizzes/${id}/submit`, payload);
      setResult(data);
      refreshUserFields({ xp: data.newXP, level: data.levelProgress.level, streakCount: data.streak });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="max-w-2xl mx-auto px-6 py-10 text-coral-400">{error}</div>;
  if (!quiz) return <div className="max-w-2xl mx-auto px-6 py-10 text-mist-500">Loading quiz…</div>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="card p-8 text-center">
          <p className="text-xs uppercase tracking-wider text-teal-400 mb-2">Quest complete</p>
          <h1 className="font-display text-3xl font-bold mb-2">{result.attempt.scorePercent}% score</h1>
          <p className="text-gold-400 font-display text-xl font-semibold mb-4">+{result.xpEarned} XP</p>

          <div className="text-sm text-mist-500 space-y-1 mb-6">
            <p>Base XP: {result.breakdown.rawXP}</p>
            <p>Streak bonus: +{result.breakdown.streakBonus}</p>
            <p>Speed bonus: +{result.breakdown.speedBonus}</p>
          </div>

          {result.flaggedSuspicious && (
            <p className="text-coral-400 text-sm mb-4">
              ⚠ This attempt was flagged for excessive tab switching — XP was reduced.
            </p>
          )}

          <button className="btn-primary" onClick={() => navigate(-1)}>
            Back to course
          </button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold">{quiz.title}</h1>
        <div className={`font-display font-bold px-3 py-1 rounded-lg ${timeLeft < 30 ? 'bg-coral-500/20 text-coral-400' : 'bg-ink-800 text-mist-100'}`}>
          {minutes}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {tabSwitchCount > 0 && (
        <p className="text-xs text-coral-400 mb-4">
          Tab switch detected ({tabSwitchCount}). Repeated switching may flag this attempt.
        </p>
      )}

      <div className="space-y-5">
        {quiz.questions.map((q, i) => (
          <div key={q._id} className="card p-5">
            <p className="font-medium mb-3">
              {i + 1}. {q.questionText}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    answers[q._id] === idx ? 'border-gold-500 bg-gold-500/10' : 'border-ink-700 hover:border-ink-700/70'
                  }`}
                >
                  <input
                    type="radio"
                    name={q._id}
                    checked={answers[q._id] === idx}
                    onChange={() => handleSelect(q._id, idx)}
                    className="accent-[#F5B700]"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full mt-6">
        {submitting ? 'Submitting…' : 'Submit quiz'}
      </button>
    </div>
  );
}
