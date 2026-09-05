import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();

  if (user?.role === 'student') return <Navigate to="/dashboard" replace />;
  if (user?.role === 'faculty') return <Navigate to="/faculty" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-display text-4xl font-bold mb-3">
        Learn. Level up. <span className="text-gold-500">Lead the board.</span>
      </h1>
      <p className="text-mist-500 max-w-md mb-8">
        A gamified learning platform where every quiz earns XP, every streak counts, and every course is a quest.
      </p>
      <div className="flex gap-3">
        <Link to="/register" className="btn-primary">Get started</Link>
        <Link to="/login" className="btn-secondary">Log in</Link>
      </div>
    </div>
  );
}
