import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  useEffect(() => {
    if (isSuperAdmin) {
      setProfileLoading(false);
      return;
    }
    api.getOwnProfile()
      .then((data) => setProfile(data.admin))
      .catch((err) => setProfileError(err.message || 'Could not load profile.'))
      .finally(() => setProfileLoading(false));
  }, [isSuperAdmin]);
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess('Password updated.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwForm(false);
    } catch (err) {
      setPwError(err.message || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-600">Settings</h1>
      {/* Appearance */}
      <div className="bg-card border border-rule rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl">Appearance</h2>
          <p className="text-sm text-ink/50 mt-1">
            Currently using {theme === 'dark' ? 'dark' : 'light'} mode.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="glass-btn px-5 py-2 text-sm font-medium rounded border border-rule text-ink/80 hover:bg-white/20 transition-colors"
        >
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
      </div>
      {/* Change Password */}
      <div className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl">Change Password</h2>
            <p className="text-sm text-ink/50 mt-1">
              {showPwForm ? 'Fill in the fields below to update your password.' : 'Update your account password.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPwForm((v) => !v);
              setPwError('');
              setPwSuccess('');
            }}
            className="glass-btn px-5 py-2 text-sm font-medium rounded border border-rule text-ink/80 hover:bg-white/20 transition-colors"
          >
            {showPwForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {showPwForm && (
        <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            required
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
        </div>
        {pwError && <p className="text-sm text-brick font-medium">{pwError}</p>}
        {pwSuccess && <p className="text-sm text-forest font-medium">{pwSuccess}</p>}
        <button
          type="submit"
          disabled={pwSaving}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {pwSaving ? 'Saving…' : 'Update Password'}
        </button>
        </form>
        )}
      </div>
      {/* Notification status (read-only) — not shown for super admins, who
          manage this from the Manage Admins page instead */}
      {isSuperAdmin ? null : profileLoading ? (
        <p className="text-ink/50 font-mono text-sm">Loading notification settings…</p>
      ) : profileError ? (
        <p className="text-sm text-brick font-medium">{profileError}</p>
      ) : (
        <>
          <div className="bg-card border border-rule rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-xl">Email Updates</h2>
              <p className="text-sm text-ink/50 mt-1">
                {profile.email_notifications_enabled
                  ? 'You are receiving absentee email alerts.'
                  : 'You are not receiving absentee email alerts.'}
              </p>
            </div>
            <span
              className={`text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-full ${
                profile.email_notifications_enabled
                  ? 'bg-forest/15 text-forestDark'
                  : 'bg-brick/15 text-brick'
              }`}
            >
              {profile.email_notifications_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="bg-card border border-rule rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-xl">SMS Updates</h2>
              <p className="text-sm text-ink/50 mt-1">
                {profile.sms_notifications_enabled
                  ? 'Attendance you save will SMS parents of absentees.'
                  : 'Attendance you save will NOT SMS parents of absentees.'}
              </p>
            </div>
            <span
              className={`text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-full ${
                profile.sms_notifications_enabled
                  ? 'bg-forest/15 text-forestDark'
                  : 'bg-brick/15 text-brick'
              }`}
            >
              {profile.sms_notifications_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-ink/40">
            Email &amp; SMS notification settings can only be changed by a super admin.
          </p>
        </>
      )}
    </div>
  );
}