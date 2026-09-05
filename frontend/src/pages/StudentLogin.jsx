import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';
import { getCsrfToken } from '../api/client.js';
export default function StudentLogin() {
  const { login } = useStudentAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  useEffect(() => {
    getCsrfToken().then(setCsrfToken).catch(() => setCsrfToken(''));
  }, []);
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!loginId.trim() || !password) {
      setError('Login ID and password are required.');
      return;
    }
    setBusy(true);
    try {
      await login(loginId.trim(), password, csrfToken);
      navigate('/student/portal');
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 px-4">
      <div className="text-center">
        <h1 className="font-display text-3xl font-600">Student Login</h1>
        <p className="text-sm text-ink/50 mt-1">Check your batch & attendance status.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Login ID
          </label>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Password
          </label>
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