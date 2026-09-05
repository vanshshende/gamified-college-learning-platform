import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api
      .get('/dashboard/admin')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  };

  useEffect(load, []);

  const handleApprove = async (userId) => {
    try {
      await api.put(`/dashboard/admin/approve-faculty/${userId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  };

  if (error) return <div className="max-w-4xl mx-auto px-6 py-10 text-coral-400">{error}</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-6 py-10 text-mist-500">Loading…</div>;

  const stats = [
    { label: 'Students', value: data.studentCount },
    { label: 'Faculty', value: data.facultyCount },
    { label: 'Courses', value: data.courseCount },
    { label: 'Quiz attempts', value: data.quizAttemptCount },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5 text-center">
            <p className="font-display text-2xl font-bold text-gold-400">{s.value}</p>
            <p className="text-xs text-mist-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Pending faculty approvals</h2>
        <div className="card divide-y divide-ink-700">
          {data.pendingFacultyApprovals.map((f) => (
            <div key={f._id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-mist-500">{f.email}</p>
              </div>
              <button onClick={() => handleApprove(f._id)} className="btn-primary text-sm">
                Approve
              </button>
            </div>
          ))}
          {data.pendingFacultyApprovals.length === 0 && (
            <p className="text-mist-500 text-sm p-5">No pending approvals.</p>
          )}
        </div>
      </div>
    </div>
  );
}
