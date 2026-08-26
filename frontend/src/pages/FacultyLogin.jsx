import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFacultyAuth } from '../context/FacultyAuthContext.jsx';

export default function FacultyLogin() {
  const { login } = useFacultyAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/faculty/portal');
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 px-4">
      <div className="text-center">
        <h1 className="font-display text-3xl font-600">Faculty Login</h1>
        <p className="text-sm text-ink/50 mt-1">Manage your batches & assignments.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
        </div>

        {error && <p className="text-sm text-brick font-medium">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="glass-btn w-full bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <p className="text-center text-xs text-ink/40">
        Admin? <Link to="/login" className="underline">Log in here</Link>
      </p>
    </div>
  );
}