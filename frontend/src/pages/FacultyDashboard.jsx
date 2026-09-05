import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/faculty')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  if (error) return <div className="max-w-5xl mx-auto px-6 py-10 text-coral-400">{error}</div>;
  if (!data) return <div className="max-w-5xl mx-auto px-6 py-10 text-mist-500">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Faculty Dashboard</h1>
        <Link to="/courses" className="btn-primary">Manage courses</Link>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Your courses</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.courses.map((c) => (
            <Link to={`/courses/${c._id}`} key={c._id} className="card p-5 hover:border-gold-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-semibold">{c.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.published ? 'bg-teal-500/20 text-teal-400' : 'bg-mist-500/20 text-mist-300'}`}>
                  {c.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-sm text-mist-500">{c.enrolledCount} enrolled · {c.moduleCount} modules</p>
            </Link>
          ))}
          {data.courses.length === 0 && <p className="text-mist-500 text-sm">No courses created yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-1">Weakest questions</h2>
        <p className="text-xs text-mist-500 mb-3">Highest miss-rate across your courses — candidates for review in class.</p>
        <div className="card divide-y divide-ink-700">
          {data.weakestQuestions.map((q, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between text-sm">
              <span className="text-mist-300">Question ID: {q._id.questionId}</span>
              <span className="text-coral-400 font-semibold">{Math.round(q.missRate * 100)}% miss rate ({q.totalAnswered} attempts)</span>
            </div>
          ))}
          {data.weakestQuestions.length === 0 && (
            <p className="text-mist-500 text-sm p-5">No quiz attempts recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
