import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [status, setStatus] = useState(null);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await register(form);
    if (res.success) {
      setStatus({ type: 'success', message: res.message });
      setTimeout(() => navigate('/login'), 1500);
    } else {
      setStatus({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-mist-500 text-sm mb-6">Start earning XP today.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-mist-300 mb-1 block">Full name</label>
            <input className="input" name="name" required value={form.name} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1 block">Email</label>
            <input className="input" type="email" name="email" required value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1 block">Password</label>
            <input className="input" type="password" name="password" required minLength={6} value={form.password} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1 block">I am a</label>
            <select className="input" name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="faculty">Faculty (requires admin approval)</option>
            </select>
          </div>

          {status && (
            <p className={`text-sm ${status.type === 'error' ? 'text-coral-400' : 'text-teal-400'}`}>
              {status.message}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm text-mist-500 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-gold-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
