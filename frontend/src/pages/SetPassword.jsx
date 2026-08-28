import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import Logo from '../components/Logo.jsx';
import Footer from '../components/Footer.jsx';
export default function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    api.verifyResetToken(token)
      .then((data) => {
        setAdminInfo(data);
        setTokenValid(true);
      })
      .catch((err) => setTokenError(err.message || 'This link is invalid or has expired.'))
      .finally(() => setChecking(false));
  }, [token]);
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.setPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Could not set password.');
    } finally {
      setSubmitting(false);
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
          <div className="bg-card border border-rule rounded-lg p-8 space-y-5">
            {checking ? (
              <p className="text-sm text-ink/60 text-center">Checking link…</p>
            ) : !tokenValid ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-brick font-medium">{tokenError}</p>
                <Link to="/login" className="text-sm text-forest underline">
                  Back to login
                </Link>
              </div>
            ) : done ? (
              <p className="text-sm text-forest font-medium text-center">
                Password set! Redirecting to login…
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-ink/70">
                  Hi {adminInfo?.name}, create a password for <strong>{adminInfo?.email}</strong>.
                </p>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
                  />
                </div>
                {error && (
                  <p className="text-sm text-brick font-medium" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full glass-btn bg-forestGlass text-white rounded py-2.5 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Set Password & Continue'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}