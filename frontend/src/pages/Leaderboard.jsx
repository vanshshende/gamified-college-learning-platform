import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    api
      .get('/leaderboard/global?limit=50')
      .then((res) => setEntries(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load leaderboard'));
  }, []);

  const medalFor = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-bold mb-1">Global Leaderboard</h1>
      <p className="text-mist-500 text-sm mb-6">Recomputed periodically — recent XP may take a few minutes to reflect.</p>

      {error && <p className="text-coral-400">{error}</p>}

      <div className="card divide-y divide-ink-700">
        {entries.map((e) => {
          const isMe = e.student?._id === user?.id;
          return (
            <div
              key={e._id}
              className={`flex items-center justify-between px-5 py-3 ${isMe ? 'bg-gold-500/10' : ''}`}
            >
              <div className="flex items-center gap-4">
                <span className="font-display font-bold w-8 text-mist-500">{medalFor(e.rank) || `#${e.rank}`}</span>
                <span className={isMe ? 'text-gold-400 font-semibold' : ''}>{e.student?.name}{isMe ? ' (you)' : ''}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-mist-500">Lvl {e.level}</span>
                <span className="font-display font-semibold text-gold-400">{e.xp} XP</span>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && !error && (
          <p className="text-mist-500 text-sm p-5">No ranked students yet — be the first to earn XP!</p>
        )}
      </div>
    </div>
  );
}
