import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client.js';
import { useSelectedBatch } from '../hooks/useSelectedBatch.js';
import { todayIST } from '../utils/date.js';

function StatusToggle({ status, onChange }) {
  const isPresent = status === 'present';
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <span
        onClick={() => onChange('present')}
        className={`text-sm font-medium cursor-pointer select-none transition-colors ${
          isPresent ? 'text-forest' : 'text-ink/40'
        }`}
      >
        Present
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!isPresent}
        onClick={() => onChange(isPresent ? 'absent' : 'present')}
        className="relative inline-flex h-7 w-[52px] items-center rounded-full transition-all focus-visible:outline-forest"
        style={{
          background: isPresent
            ? 'linear-gradient(to right, #5DCAA5, #378ADD)'
            : 'linear-gradient(to right, #D85A30, #E24B4A)',
        }}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white transition-all duration-200 ${
            isPresent ? 'left-[-3px]' : 'left-[23px]'
          }`}
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
        />
      </button>
      <span
        onClick={() => onChange('absent')}
        className={`text-sm font-medium cursor-pointer select-none transition-colors ${
          !isPresent ? 'text-brick' : 'text-ink/40'
        }`}
      >
        Absent
      </span>
    </div>
  );
}
export default function EditAttendance() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useSelectedBatch();
  const [date, setDate] = useState(todayIST());
  const [rows, setRows] = useState([]); // [{ student_id, urn, first_name, last_name, status, method }]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    api.listBatches()
      .then((data) => {
        setBatches(data.batches);
        const stillValid = data.batches.some((b) => b.id === batchId);
        if (!stillValid) {
          setBatchId(data.batches.length > 0 ? data.batches[0].id : null);
        }
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAttendance = useCallback(async (bId, d) => {
    if (!bId || !d) return;
    setLoading(true);
    setError('');
    setSaveMessage('');
    try {
      const data = await api.getAttendanceForDate(bId, d);
      setRows(data.students.map((s) => ({ ...s })));
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batchId && date) loadAttendance(batchId, date);
  }, [batchId, date, loadAttendance]);

  function setStatus(studentId, status) {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
  }

  function markAll(status) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  const presentCount = useMemo(() => rows.filter((r) => r.status === 'present').length, [rows]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaveMessage('');
    try {
      const records = rows.map((r) => ({ studentId: r.student_id, status: r.status }));
      await api.saveAttendance(batchId, date, records);
      setSaveMessage('Attendance saved.');
      await loadAttendance(batchId, date);
    } catch (err) {
      setError(err.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="font-display text-2xl text-ink/70 mb-2">No batches yet</p>
        <p className="text-sm text-ink/50">Create a batch before editing attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-600">Edit Attendance</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={batchId ?? ''}
            onChange={(e) => setBatchId(Number(e.target.value))}
            className="border border-rule rounded px-3 py-2 bg-card font-medium"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-rule rounded px-3 py-2 bg-card font-medium"
          />
        </div>
      </div>

      {error && <p className="text-brick font-medium">{error}</p>}
      {!date ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">Pick a date above to view and edit attendance.</p>
        </div>
      ) : loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">No students in this batch yet.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-ink/60 font-mono">
              {presentCount} / {rows.length} marked present
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => markAll('present')}
                className="glass-btn px-3 py-1.5 text-sm font-medium rounded border border-forest text-forest hover:bg-forestGlass hover:text-white transition-colors"
              >
                Mark All Present
              </button>
              <button
                onClick={() => markAll('absent')}
                className="glass-btn px-3 py-1.5 text-sm font-medium rounded border border-brick text-brick hover:bg-brickGlass hover:text-white transition-colors"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
            {rows.map((r) => (
              <div key={r.student_id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.first_name} {r.last_name}</span>
                    <span className="font-mono text-xs text-ink/50">{r.urn}</span>
                    {r.method && (
                      <span className="text-xs font-mono uppercase tracking-wide text-ink/40 border border-rule rounded px-1.5 py-0.5">
                        {r.method}
                      </span>
                    )}
                  </div>
                </div>
                <StatusToggle
                  status={r.status}
                  onChange={(status) => setStatus(r.student_id, status)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="glass-btn bg-forestGlass text-white rounded px-6 py-2.5 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
            {saveMessage && <span className="text-sm text-forest font-medium">{saveMessage}</span>}
          </div>
        </>
      )}
    </div>
  );
}