import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LevelRing from './LevelRing';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLinks = {
    student: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/courses', label: 'Courses' },
      { to: '/leaderboard', label: 'Leaderboard' },
    ],
    faculty: [
      { to: '/faculty', label: 'Dashboard' },
      { to: '/courses', label: 'Courses' },
    ],
    admin: [{ to: '/admin', label: 'Admin' }],
  };

  return (
    <nav className="border-b border-ink-700 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-lg text-mist-100">
          Quest<span className="text-gold-500">.</span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-6">
            {(roleLinks[user.role] || []).map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-mist-300 hover:text-mist-100 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {user?.role === 'student' && (
            <div className="flex items-center gap-2 text-sm text-mist-300">
              <span className="text-coral-400">🔥</span>
              <span>{user.streakCount ?? 0}</span>
            </div>
          )}
          {user ? (
            <>
              {user.role === 'student' && (
                <LevelRing level={user.level || 1} progressPercent={user.progressPercent ?? 50} size={40} />
              )}
              <span className="text-sm text-mist-300 hidden sm:inline">{user.name}</span>
              <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1.5">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm px-3 py-1.5">Log in</Link>
              <Link to="/register" className="btn-primary text-sm px-3 py-1.5">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
