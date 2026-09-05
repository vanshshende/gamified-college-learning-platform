import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: '' });
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const { user } = useAuth();

  const loadCourses = () => {
    api
      .get('/courses')
      .then((res) => setCourses(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load courses'));
  };

  const loadEnrollments = () => {
    api
      .get('/courses/enrollments/mine')
      .then((res) => setEnrolledIds(new Set(res.data)))
      .catch(() => setEnrolledIds(new Set()));
  };

  useEffect(() => {
    loadCourses();
    if (user?.role === 'student') loadEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleEnroll = async (courseId) => {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    } catch (err) {
      alert(err.response?.data?.message || 'Enrollment failed');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', newCourse);
      setNewCourse({ title: '', description: '', category: '' });
      setShowCreate(false);
      loadCourses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create course');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">
          {user?.role === 'faculty' ? 'Your courses' : 'Explore courses'}
        </h1>
        {user?.role === 'faculty' && (
          <button className="btn-primary" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? 'Cancel' : '+ New course'}
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-3">
          <input
            className="input"
            placeholder="Course title"
            required
            value={newCourse.title}
            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
          />
          <input
            className="input"
            placeholder="Category (e.g. Computer Science)"
            value={newCourse.category}
            onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
          />
          <textarea
            className="input"
            placeholder="Description"
            rows={3}
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
          />
          <button type="submit" className="btn-primary">Create course</button>
        </form>
      )}

      {error && <p className="text-coral-400">{error}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div key={c._id} className="card p-5 flex flex-col">
            <p className="text-xs uppercase tracking-wider text-teal-400 mb-1">{c.category || 'General'}</p>
            <h3 className="font-display font-semibold mb-1">{c.title}</h3>
            <p className="text-sm text-mist-500 mb-4 flex-1 line-clamp-3">{c.description}</p>
            <p className="text-xs text-mist-500 mb-3">By {c.faculty?.name}</p>
            <div className="flex gap-2">
              <Link to={`/courses/${c._id}`} className="btn-secondary text-sm flex-1 text-center">
                View
              </Link>
              {user?.role === 'student' &&
                (enrolledIds.has(c._id) ? (
                  <span className="btn-secondary text-sm flex-1 text-center text-teal-400 cursor-default">
                    Enrolled ✓
                  </span>
                ) : (
                  <button onClick={() => handleEnroll(c._id)} className="btn-primary text-sm flex-1">
                    Enroll
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && !error && (
        <p className="text-mist-500 text-sm mt-6">No courses yet.</p>
      )}
    </div>
  );
}