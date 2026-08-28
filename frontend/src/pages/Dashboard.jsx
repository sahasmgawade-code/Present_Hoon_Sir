import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSelectedBatch } from '../hooks/useSelectedBatch.js';
import { todayIST } from '../utils/date.js';
export default function Dashboard() {
  const { admin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useSelectedBatch();
  const [showArchived, setShowArchived] = useState(false);
  const [today, setToday] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedBatch = batches.find((b) => b.id === batchId);
  const canDeleteBatch = isSuperAdmin || selectedBatch?.created_by === admin?.id;
  useEffect(() => {
    api.listBatches(showArchived)
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
  }, [showArchived]);
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
  async function handleArchiveBatch() {
    if (!batchId) return;
    if (!window.confirm('Archive this batch? It will be hidden from your active batches, but all data (students, attendance, QR history) will be preserved. You can restore it anytime.')) return;
    try {
      await api.archiveBatch(batchId);
      const data = await api.listBatches(showArchived);
      setBatches(data.batches);
      setBatchId(data.batches[0]?.id ?? null);
    } catch (err) {
      alert(err.message);
    }
  }
  async function handleRestoreBatch(id) {
    try {
      await api.restoreBatch(id);
      const data = await api.listBatches(showArchived);
      setBatches(data.batches);
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
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`px-3 py-2 text-sm font-medium rounded border transition-colors ${
              showArchived
                ? 'border-forest bg-forestGlass text-white'
                : 'border-rule text-ink/70 hover:bg-ink/5'
            }`}
          >
            {showArchived ? 'Showing All' : 'Show Archived'}
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
              {canDeleteBatch && selectedBatch && !selectedBatch.is_archived && (
                <button
                  onClick={handleArchiveBatch}
                  className="glass-btn px-4 py-2 text-sm font-medium rounded border border-brick text-brick hover:bg-brickGlass hover:text-white transition-colors"
                >
                  Archive Batch
                </button>
              )}
              {canDeleteBatch && selectedBatch && selectedBatch.is_archived && (
                <button
                  onClick={() => handleRestoreBatch(selectedBatch.id)}
                  className="glass-btn px-4 py-2 text-sm font-medium rounded border border-forest text-forest hover:bg-forestGlass hover:text-white transition-colors"
                >
                  Restore Batch
                </button>
              )}
              </div>
          </div>
        </>
      )}
    </div>
  );
}