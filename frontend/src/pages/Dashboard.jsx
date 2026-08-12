import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSelectedBatch } from '../hooks/useSelectedBatch.js';
import { todayIST } from '../utils/date.js';
export default function Dashboard() {
  const { logout, admin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

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
      setTimeout(() => setShowPwForm(false), 1500);
    } catch (err) {
      setPwError(err.message || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  }
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useSelectedBatch();
  const [today, setToday] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedBatch = batches.find((b) => b.id === batchId);
  const canDeleteBatch = isSuperAdmin || selectedBatch?.created_by === admin?.id;
  useEffect(() => {
    api.listBatches()
      .then((data) => {
        setBatches(data.batches);
        const stillValid = data.batches.some((b) => b.id === batchId);
        if (!stillValid) {
          setBatchId(data.batches.length > 0 ? data.batches[0].id : null);
        }
        if (data.batches.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBatchData = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      const [todayData, reportData] = await Promise.all([
        api.getAttendanceForDate(id, todayIST()),
        api.getBatchReport(id),
      ]);
      setToday(todayData);
      setReport(reportData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batchId) loadBatchData(batchId);
  }, [batchId, loadBatchData]);

  async function handleDeleteBatch() {
    if (!batchId) return;
    if (!window.confirm('Delete this batch permanently? This cannot be undone.')) return;
    try {
      await api.deleteBatch(batchId);
      const data = await api.listBatches();
      setBatches(data.batches);
      setBatchId(data.batches[0]?.id ?? null);
    } catch (err) {
      alert(err.message);
    }
  }

  const presentCount = today?.students.filter((s) => s.status === 'present').length ?? 0;
  const absentStudents = today?.students.filter((s) => s.status === 'absent') ?? [];
  const totalStudents = today?.students.length ?? 0;
  const attendanceMarkedToday = today?.students.some((s) => s.method) ?? false;
  const overallStats = report ? [...report.goodStanding, ...report.defaulters] : [];
  const overallAvg =
    overallStats.length > 0
      ? Math.round((overallStats.reduce((sum, s) => sum + s.percentage, 0) / overallStats.length) * 10) / 10
      : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-600">Dashboard</h1>
        <div className="flex items-center gap-3">
          {batches.length > 0 && (
            <select
              value={batchId ?? ''}
              onChange={(e) => setBatchId(Number(e.target.value))}
              className="border border-rule rounded px-3 py-2 bg-card font-medium"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => navigate('/batches/new')}
            className="px-3 py-2 text-sm font-medium rounded glass-btn bg-forestGlass text-white hover:bg-forestGlass/70 transition-colors"
          >
            + Add Batch
          </button>
        </div>
      </div>

      {batches.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="font-display text-2xl text-ink/70 mb-2">No batches yet</p>
          <p className="text-sm text-ink/50">Click "+ Add Batch" above to create your first one.</p>
        </div>
      )}

      {error && <p className="text-brick font-medium">{error}</p>}

      {loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : (
        <>
          {today && totalStudents > 0 && !attendanceMarkedToday && (
            <div className="bg-brick/10 border border-brick rounded-lg p-5 flex items-center justify-between flex-wrap gap-3">
              <p className="font-display text-lg font-600 text-brick">
                Attendance Not Marked for Today
              </p>
              <button
                onClick={() => navigate('/generate-qr')}
                className="px-4 py-2 text-sm font-medium rounded glass-btn bg-brickGlass text-white hover:bg-brickGlass/90 transition-colors"
              >
                Mark Attendance →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Present Today</p>
              <p className="font-display text-4xl font-600 text-forestDark">
                {presentCount}<span className="text-lg text-ink/40"> / {totalStudents}</span>
              </p>
            </div>
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Absent Today</p>
              <p className="font-display text-4xl font-600 text-brick">{absentStudents.length}</p>
            </div>
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Overall Attendance</p>
              <p className="font-display text-4xl font-600 text-ink">
                {overallAvg !== null ? `${overallAvg}%` : '—'}
              </p>
            </div>
          </div>

          {attendanceMarkedToday && (
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-3">Absent Students</p>
              {absentStudents.length === 0 ? (
                <p className="text-sm text-ink/50">Nobody absent today — full house.</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {absentStudents.map((s) => (
                    <li key={s.student_id} className="py-2 flex items-center justify-between">
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="font-mono text-xs text-ink/50">{s.urn}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="perforated pt-6 mt-10">
            <p className="text-xs font-mono uppercase tracking-wide text-brick mb-3">Danger Zone</p>
            <div className="flex flex-wrap gap-3">
              {canDeleteBatch && (
                <button
                  onClick={handleDeleteBatch}
                  className="glass-btn px-4 py-2 text-sm font-medium rounded border border-brick text-brick hover:bg-brickGlass hover:text-white transition-colors"
                >
                  Delete Batch
                </button>
              )}
              <button
                onClick={() => {
                  setShowPwForm((v) => !v);
                  setPwError('');
                  setPwSuccess('');
                }}
                className="px-4 py-2 text-sm font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
              >
                {showPwForm ? 'Close' : 'Change Password'}
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
              >
                Log Out
              </button>
            </div>

            {showPwForm && (
              <form onSubmit={handleChangePassword} className="mt-4 bg-card border border-rule rounded-lg p-5 max-w-sm space-y-3">
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
        </>
      )}
    </div>
  );
}