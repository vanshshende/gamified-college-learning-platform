import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import LevelRing from '../components/LevelRing';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/student')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  if (error) return <div className="max-w-6xl mx-auto px-6 py-10 text-coral-400">{error}</div>;
  if (!data) return <div className="max-w-6xl mx-auto px-6 py-10 text-mist-500">Loading your quest log…</div>;

  const { xp, streak, levelProgress, globalRank, enrollments, recentAttempts } = data;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* HUD header */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <LevelRing level={levelProgress.level} progressPercent={levelProgress.progressPercent} size={90} />
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-display text-2xl font-bold">{xp} XP</h1>
            {globalRank && (
              <span className="text-sm text-mist-500">
                Global rank <span className="text-gold-400 font-semibold">#{globalRank}</span>
              </span>
            )}
          </div>
          <div className="mt-2 h-2 rounded-full bg-ink-700 overflow-hidden">
            <div
              className="h-full bg-gold-500 transition-all duration-500"
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-mist-500 mt-1">
            {levelProgress.xpIntoLevel} / {levelProgress.xpNeededForLevel} XP to level {levelProgress.level + 1}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-ink-900 rounded-xl px-4 py-3 border border-ink-700">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-display font-bold leading-none">{streak}</p>
            <p className="text-xs text-mist-500">day streak</p>
          </div>
        </div>
      </div>

      {/* Enrolled courses — the "quest board" */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Your quests</h2>
          <Link to="/courses" className="text-sm text-gold-400 hover:underline">
            Browse all courses →
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="card p-6 text-mist-500 text-sm">
            No active quests yet. <Link to="/courses" className="text-gold-400 hover:underline">Enroll in a course</Link> to start earning XP.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((e) => (
              <Link
                to={`/courses/${e.course._id}`}
                key={e._id}
                className="card p-5 hover:border-gold-500/50 transition-colors"
              >
                <p className="text-xs uppercase tracking-wider text-teal-400 mb-1">{e.course.category}</p>
                <h3 className="font-display font-semibold mb-3">{e.course.title}</h3>
                <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${e.progressPercent}%` }} />
                </div>
                <p className="text-xs text-mist-500 mt-1">{e.progressPercent}% complete</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent attempts */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Recent quiz attempts</h2>
        {recentAttempts.length === 0 ? (
          <div className="card p-6 text-mist-500 text-sm">No quiz attempts yet.</div>
        ) : (
          <div className="card divide-y divide-ink-700">
            {recentAttempts.map((a) => (
              <div key={a._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.quiz?.title || 'Quiz'}</p>
                  <p className="text-xs text-mist-500">{a.scorePercent}% score</p>
                </div>
                <span className="text-gold-400 font-display font-semibold">+{a.xpEarned} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
