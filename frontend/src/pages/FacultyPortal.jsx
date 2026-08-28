import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useFacultyAuth } from '../context/FacultyAuthContext.jsx';
const STATUS_LABEL = { pending: 'Pending', completed: 'Completed', incomplete: 'Incomplete' };
const STATUS_STYLE = {
  pending: 'bg-ink/10 text-ink/60',
  completed: 'bg-forestGlass/20 text-forestDark',
  incomplete: 'bg-brickGlass/20 text-brick',
};
function AssignmentForm({ batchId, onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!file) { setError('A PDF file is required.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      if (dueDate) fd.append('dueDate', dueDate);
      fd.append('file', file);
      await api.createAssignment(batchId, fd);
      onCreated();
    } catch (err) {
      setError(err.message || 'Could not post assignment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handleSubmit} className="bg-card border border-rule rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
        />
      </div>
      <div>
        <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Due Date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">PDF File</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>
      </div>
      {error && <p className="text-sm text-brick font-medium">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {busy ? 'Posting…' : 'Post Assignment'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
function SubmissionsPanel({ assignmentId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [remarks, setRemarks] = useState({});
  function load() {
    setLoading(true);
    api.listSubmissions(assignmentId)
      .then((d) => {
        setData(d);
        const initial = {};
        d.students.forEach((s) => { if (s.submission_id) initial[s.submission_id] = s.remark || ''; });
        setRemarks(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [assignmentId]);
  async function grade(submissionId, status) {
    setSavingId(submissionId);
    try {
      await api.gradeSubmission(submissionId, status, remarks[submissionId] || '');
      load();
    } catch (err) {
      alert(err.message || 'Could not save grade.');
    } finally {
      setSavingId(null);
    }
  }
  return (
    <div className="bg-paper border border-rule rounded-lg p-4 mt-2 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Submissions</h3>
        <button onClick={onClose} className="text-sm text-ink/50 hover:text-ink">Close</button>
      </div>
      {loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : error ? (
        <p className="text-sm text-brick font-medium">{error}</p>
      ) : (
        <div className="divide-y divide-rule">
          {data.students.map((s) => (
            <div key={s.student_id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                <p className="text-xs text-ink/50 font-mono">{s.urn}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {s.submission_id ? (
                  <>
                    <a href={s.drive_file_url} target="_blank" rel="noreferrer" className="text-xs underline text-forestDark">
                      {s.file_name}
                    </a>
                    <span className={`text-xs font-mono uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLE[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <input
                      type="text"
                      placeholder="Remark (optional)"
                      value={remarks[s.submission_id] || ''}
                      onChange={(e) => setRemarks((r) => ({ ...r, [s.submission_id]: e.target.value }))}
                      className="border border-rule rounded px-2 py-1 text-xs bg-card w-40"
                    />
                    <button
                      disabled={savingId === s.submission_id}
                      onClick={() => grade(s.submission_id, 'completed')}
                      className="text-xs px-2 py-1 rounded border border-forest text-forestDark hover:bg-forestGlass/20 disabled:opacity-60"
                    >
                      Completed
                    </button>
                    <button
                      disabled={savingId === s.submission_id}
                      onClick={() => grade(s.submission_id, 'incomplete')}
                      className="text-xs px-2 py-1 rounded border border-brick text-brick hover:bg-brickGlass/20 disabled:opacity-60"
                    >
                      Incomplete
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-ink/40 font-mono uppercase">No submission</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function AssignmentsTab({ batchId }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [openSubmissionsId, setOpenSubmissionsId] = useState(null);
  function load() {
    setLoading(true);
    api.listBatchAssignments(batchId)
      .then((d) => setAssignments(d.assignments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [batchId]);
  async function handleDelete(id) {
    if (!window.confirm('Delete this assignment? This also deletes all student submissions.')) return;
    try {
      await api.deleteAssignment(id);
      load();
    } catch (err) {
      alert(err.message || 'Could not delete assignment.');
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors"
        >
          {showForm ? 'Close' : '+ New Assignment'}
        </button>
      </div>
      {showForm && (
        <AssignmentForm batchId={batchId} onCreated={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
      )}
      {loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : error ? (
        <p className="text-sm text-brick font-medium">{error}</p>
      ) : assignments.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">No assignments posted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="bg-card border border-rule rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-ink/50 mt-1">
                    {a.due_date ? `Due ${a.due_date}` : 'No due date'} · {a.submission_count} submission{a.submission_count === '1' ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={a.drive_file_url} target="_blank" rel="noreferrer" className="text-xs underline text-forestDark">
                    View PDF
                  </a>
                  <button
                    onClick={() => setOpenSubmissionsId(openSubmissionsId === a.id ? null : a.id)}
                    className="text-xs px-3 py-1.5 rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
                  >
                    {openSubmissionsId === a.id ? 'Hide Submissions' : 'View Submissions'}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs px-3 py-1.5 rounded border border-brick text-brick hover:bg-brickGlass/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {openSubmissionsId === a.id && (
                <SubmissionsPanel assignmentId={a.id} onClose={() => setOpenSubmissionsId(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function StudentsTab({ batchId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true);
    api.getFacultyBatchStudents(batchId)
      .then((d) => setStudents(d.students))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [batchId]);
  if (loading) return <p className="text-ink/50 font-mono text-sm">Loading…</p>;
  if (error) return <p className="text-sm text-brick font-medium">{error}</p>;
  if (students.length === 0) {
    return (
      <div className="bg-card border border-rule rounded-lg p-10 text-center">
        <p className="text-sm text-ink/50">No students in this batch.</p>
      </div>
    );
  }
  return (
    <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
      {students.map((s) => (
        <div key={s.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-medium">{s.first_name} {s.last_name}</p>
            <p className="text-xs text-ink/50 font-mono mt-0.5">{s.urn}</p>
          </div>
          {s.is_blacklisted && (
            <span className="text-xs font-mono uppercase tracking-wide px-2 py-0.5 rounded bg-brickGlass/20 text-brick">
              Blacklisted
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
export default function FacultyPortal() {
  const { faculty, logout } = useFacultyAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [tab, setTab] = useState('students');
  useEffect(() => {
    api.getMyFacultyBatches()
      .then((d) => {
        setBatches(d.batches);
        if (d.batches.length > 0) setSelectedBatchId(d.batches[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  if (loading) {
    return <p className="text-ink/50 font-mono text-sm text-center mt-16">Loading…</p>;
  }
  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-6 px-4 pb-16">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-600">{faculty?.name}</h1>
          <p className="text-sm text-ink/50 mt-1">{faculty?.email}</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
        >
          Log Out
        </button>
      </div>
      {error && <p className="text-sm text-brick font-medium">{error}</p>}
      {batches.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">You haven't been assigned to any batches yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                  selectedBatchId === b.id
                    ? 'glass-btn border-forest bg-forestGlass text-white'
                    : 'border-rule text-ink/70 hover:bg-white/20'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 border-b border-rule">
            {['students', 'assignments'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-forest text-forestDark' : 'border-transparent text-ink/50 hover:text-ink'
                }`}
              >
                {t === 'students' ? 'Students' : 'Assignments'}
              </button>
            ))}
          </div>
          {selectedBatchId && (tab === 'students'
            ? <StudentsTab key={selectedBatchId} batchId={selectedBatchId} />
            : <AssignmentsTab key={selectedBatchId} batchId={selectedBatchId} />)}
        </>
      )}
    </div>
  );
}