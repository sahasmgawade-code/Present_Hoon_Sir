import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCsrfToken } from '../api/client.js';
import Logo from '../components/Logo.jsx';
import Footer from '../components/Footer.jsx';
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e) {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const freshCsrfToken = await getCsrfToken();
    await login(email, password, freshCsrfToken);
    navigate('/dashboard');
  } catch (err) {
    setError(err.message || 'Login failed');
  } finally {
    setLoading(false);
  }
}
  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Logo iconSize={56} textSize="text-3xl" />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-card border border-rule rounded-lg p-8 space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              placeholder="admin@presenthoonsir.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-brick font-medium" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn bg-forestGlass text-white rounded py-2.5 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      </div>
      <Footer />
    </div>
  );
}