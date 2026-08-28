import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';
const STATUS_LABEL = { pending: 'Pending Review', completed: 'Completed', incomplete: 'Incomplete' };
const STATUS_STYLE = {
  pending: 'bg-ink/10 text-ink/60',
  completed: 'bg-forestGlass/20 text-forestDark',
  incomplete: 'bg-brickGlass/20 text-brick',
};
function AssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [files, setFiles] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [submitError, setSubmitError] = useState({});
  function load() {
    setLoading(true);
    api.getMyAssignments()
      .then((d) => setAssignments(d.assignments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function handleSubmit(assignmentId) {
    const file = files[assignmentId];
    if (!file) {
      setSubmitError((e) => ({ ...e, [assignmentId]: 'Choose a file first.' }));
      return;
    }
    setSubmittingId(assignmentId);
    setSubmitError((e) => ({ ...e, [assignmentId]: '' }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.submitAssignment(assignmentId, fd);
      load();
    } catch (err) {
      setSubmitError((e) => ({ ...e, [assignmentId]: err.message || 'Could not submit.' }));
    } finally {
      setSubmittingId(null);
    }
  }
  if (loading) return <p className="text-ink/50 font-mono text-sm">Loading…</p>;
  if (error) return <p className="text-sm text-brick font-medium">{error}</p>;
  if (assignments.length === 0) {
    return (
      <div className="bg-card border border-rule rounded-lg p-10 text-center">
        <p className="text-sm text-ink/50">No assignments posted yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {assignments.map((a) => (
        <div key={a.id} className="bg-card border border-rule rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-ink/50 mt-1">
                {a.faculty_name ? `Posted by ${a.faculty_name}` : 'Posted'}
                {a.due_date ? ` · Due ${a.due_date}` : ''}
              </p>
              {a.description && <p className="text-sm text-ink/70 mt-2">{a.description}</p>}
            </div>
            <a href={a.drive_file_url} target="_blank" rel="noreferrer" className="text-xs underline text-forestDark shrink-0">
              View PDF
            </a>
          </div>
          {a.submission_id ? (
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className={`text-xs font-mono uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLE[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
              <a href={a.submission_url} target="_blank" rel="noreferrer" className="underline text-forestDark">
                {a.submission_file_name}
              </a>
              {a.remark && <span className="text-ink/60">— {a.remark}</span>}
            </div>
          ) : (
            <p className="text-xs text-ink/40 font-mono uppercase">Not submitted yet</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              onChange={(e) => setFiles((f) => ({ ...f, [a.id]: e.target.files?.[0] || null }))}
              className="text-xs flex-1 min-w-[180px]"
            />
            <button
              onClick={() => handleSubmit(a.id)}
              disabled={submittingId === a.id}
              className="glass-btn bg-forestGlass text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
            >
              {submittingId === a.id ? 'Uploading…' : a.submission_id ? 'Resubmit' : 'Submit'}
            </button>
          </div>
          {submitError[a.id] && <p className="text-xs text-brick font-medium">{submitError[a.id]}</p>}
        </div>
      ))}
    </div>
  );
}
export default function StudentPortal() {
  const { logout } = useStudentAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('attendance');
  useEffect(() => {
    api.getMyAttendance()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  if (loading) {
    return <p className="text-ink/50 font-mono text-sm text-center mt-16">Loading…</p>;
  }
  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <p className="text-brick font-medium">{error || 'Could not load your attendance.'}</p>
        <button onClick={logout} className="text-sm underline text-forestDark">Log out</button>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 px-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-600">
            {data.student.firstName} {data.student.lastName}
          </h1>
          <p className="text-sm text-ink/50 mt-1 font-mono">{data.student.urn}</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
        >
          Log Out
        </button>
      </div>
      {data.student.isBlacklisted && (
        <div className="bg-brickGlass/10 border border-brick/40 rounded-lg p-4 text-sm text-brick font-medium">
          Your account is currently blacklisted. Contact your batch admin for details.
        </div>
      )}
      <div className="flex gap-2 border-b border-rule">
        {['attendance', 'assignments'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-forest text-forestDark' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t === 'attendance' ? 'Attendance' : 'Assignments'}
          </button>
        ))}
      </div>
      {tab === 'attendance' ? (
        <>
          <div className="bg-card border border-rule rounded-lg p-6">
            <h2 className="font-display text-xl mb-1">Enrolled Batch</h2>
            <p className="text-ink/70">{data.batch.name}</p>
          </div>
          <div className="bg-card border border-rule rounded-lg p-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-600">{data.percentage}%</p>
              <p className="text-xs text-ink/50 mt-1 font-mono uppercase">Attendance</p>
            </div>
            <div>
              <p className="text-2xl font-display font-600">{data.presentCount}</p>
              <p className="text-xs text-ink/50 mt-1 font-mono uppercase">Present</p>
            </div>
            <div>
              <p className="text-2xl font-display font-600">{data.totalWorkingDays}</p>
              <p className="text-xs text-ink/50 mt-1 font-mono uppercase">Working Days</p>
            </div>
          </div>
          <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
            <div className="p-4 font-display text-xl">Attendance History</div>
            {data.history.length === 0 ? (
              <p className="p-6 text-sm text-ink/50 text-center">No attendance recorded yet.</p>
            ) : (
              data.history.map((r) => (
                <div key={r.date} className="p-4 flex items-center justify-between">
                  <span className="text-sm">{r.date}</span>
                  <span
                    className={`text-xs font-mono uppercase tracking-wide px-2 py-0.5 rounded ${
                      r.status === 'present'
                        ? 'bg-forestGlass/20 text-forestDark'
                        : 'bg-brickGlass/20 text-brick'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <AssignmentsTab />
      )}
    </div>
  );
}