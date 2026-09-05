import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ensureDeviceToken } from '../api/client.js';
function useCountdown(expiresAt) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(diff, 0));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return secondsLeft;
}
function formatCountdown(seconds) {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
export default function ScanAttendance() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | open | expired | error
  const [expiresAt, setExpiresAt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [urn, setUrn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirmedName, setConfirmedName] = useState('');
  const secondsLeft = useCountdown(status === 'open' ? expiresAt : null);
  const checkStatus = useCallback(async () => {
    try {
      await ensureDeviceToken();
      const data = await api.getQrSessionStatus(token);
      setExpiresAt(data.expiresAt);
      setStatus(data.expired ? 'expired' : 'open');
    } catch (err) {
      setErrorMessage(err.message || 'This QR code is not valid.');
      setStatus('error');
    }
  }, [token]);
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);
  useEffect(() => {
    if (secondsLeft === 0 && status === 'open') {
      setStatus('expired');
    }
  }, [secondsLeft, status]);
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const data = await api.submitQrAttendance(token, {
        urn: urn.replace(/\s+/g, ''),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setConfirmedName(data.message || 'Attendance marked.');
      setSubmitted(true);
    } catch (err) {
      if (err.status === 410) {
        setStatus('expired');
      } else if (err.status === 429) {
        setSubmitError('This device has marked attendance too many times recently. Please wait a few minutes and try again, or ask your instructor for help.');
      } else {
        setSubmitError(err.message || 'Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="font-display text-4xl font-600 text-forestDark">Attend</span>
            <span className="font-mono text-sm tracking-widest text-brick uppercase">QR</span>
          </div>
          <p className="text-sm text-ink/50 font-mono">mark yourself present</p>
        </div>
        <div className="bg-card border border-rule rounded-lg p-8">
          {status === 'loading' && (
            <p className="text-sm text-ink/50 font-mono text-center">Checking this code…</p>
          )}
          {status === 'error' && (
            <div className="text-center space-y-2">
              <p className="font-display text-xl text-brick">Invalid code</p>
              <p className="text-sm text-ink/60">{errorMessage}</p>
            </div>
          )}
          {status === 'expired' && !submitted && (
            <div className="text-center space-y-2">
              <p className="font-display text-xl text-brick">This code has expired</p>
              <p className="text-sm text-ink/60">
                This QR code's time window has passed. Ask your instructor to generate a new one.
              </p>
            </div>
          )}
          {status === 'open' && !submitted && (
            <>
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-mono uppercase tracking-wide text-ink/50">
                  Time remaining
                </span>
                <span className="font-mono text-sm font-medium text-forestDark">
                  {formatCountdown(secondsLeft)}
                </span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    URN
                  </label>
                  <input
                    type="text"
                    required
                    value={urn}
                    onChange={(e) => setUrn(e.target.value)}
                    className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
                    placeholder="CS2026-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
                  />
                </div>
                {submitError && (
                  <p className="text-sm text-brick font-medium" role="alert">
                    {submitError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full glass-btn bg-forestGlass text-white rounded py-2.5 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Marking…' : 'Mark Present'}
                </button>
              </form>
            </>
          )}
          {submitted && (
            <div className="text-center space-y-2 perforated pt-6">
              <p className="font-display text-xl text-forestDark">You're marked present</p>
              <p className="text-sm text-ink/60">{confirmedName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}