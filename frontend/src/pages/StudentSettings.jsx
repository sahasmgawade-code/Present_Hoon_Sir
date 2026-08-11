import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';

const fields = [
  ['urn', 'URN', true],
  ['firstName', 'First Name', true],
  ['lastName', 'Last Name', true],
  ['phone', 'Phone', false],
  ['email', 'Email', false],
  ['parentPhone', "Parent's Phone", false],
];

export default function StudentSettings() {
  const { id } = useParams();
  const studentId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const batchId = location.state?.batchId;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [togglingBlacklist, setTogglingBlacklist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [credLoginId, setCredLoginId] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  const [savingCred, setSavingCred] = useState(false);

  useEffect(() => {
    if (!batchId) {
      setError('Missing batch context.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.listStudents(batchId)
      .then((data) => {
        const found = data.students.find((s) => s.id === studentId);
        if (!found) {
          setError('Student not found.');
        } else {
          setStudent(found);
          setCredLoginId(found.login_id || '');
          setForm({
            urn: found.urn,
            firstName: found.first_name,
            lastName: found.last_name,
            phone: found.phone || '',
            email: found.email || '',
            parentPhone: found.parent_phone || '',
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [batchId, studentId]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);
    try {
      await api.updateStudent(studentId, form);
      setStudent((prev) => ({
        ...prev,
        urn: form.urn,
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        parent_phone: form.parentPhone,
      }));
    } catch (err) {
      setEditError(err.message || 'Could not update student.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleBlacklist() {
    if (!student) return;
    setTogglingBlacklist(true);
    try {
      await api.blacklistStudent(studentId, !student.is_blacklisted);
      setStudent((prev) => ({ ...prev, is_blacklisted: !prev.is_blacklisted }));
    } catch (err) {
      alert(err.message);
    } finally {
      setTogglingBlacklist(false);
    }
  }

  async function handleSaveCredentials(e) {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');
    if (!credLoginId.trim() || !credPassword) {
      setCredError('Login ID and password are required.');
      return;
    }
    if (credPassword.length < 6) {
      setCredError('Password must be at least 6 characters.');
      return;
    }
    setSavingCred(true);
    try {
      await api.setStudentCredentials(studentId, credLoginId.trim(), credPassword);
      setStudent((prev) => ({ ...prev, login_id: credLoginId.trim() }));
      setCredPassword('');
      setCredSuccess('Login credentials saved.');
    } catch (err) {
      setCredError(err.message || 'Could not save credentials.');
    } finally {
      setSavingCred(false);
    }
  }

  async function handleDelete() {
    if (!student) return;
    if (!window.confirm(`Remove ${student.first_name} ${student.last_name} from this batch? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteStudent(studentId);
      navigate('/students');
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-ink/50 font-mono text-sm">Loading…</p>;
  }

  if (error || !student || !form) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-brick font-medium">{error || 'Student not found.'}</p>
        <Link to="/students" className="text-forestDark underline text-sm">
          ← Back to View Students
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/students" className="text-sm text-ink/60 hover:text-ink transition-colors">
          ← Back to View Students
        </Link>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <h1 className="font-display text-3xl font-600">
            {student.first_name} {student.last_name}
          </h1>
          {student.is_blacklisted && (
            <span className="text-xs font-mono uppercase tracking-wide text-brick border border-brick rounded px-1.5 py-0.5">
              Blacklisted
            </span>
          )}
        </div>
        <p className="text-sm text-ink/50 mt-1 font-mono">{student.urn}</p>
      </div>

      {/* Edit Student */}
      <form onSubmit={handleSaveEdit} className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <h2 className="font-display text-xl">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(([key, label, required]) => (
            <div key={key}>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                {label}
              </label>
              <input
                type={key === 'email' ? 'email' : 'text'}
                required={required}
                readOnly={key === 'urn'}
                value={form[key]}
                onChange={update(key)}
                className={`w-full border border-rule rounded px-3 py-2 focus-visible:outline-forest ${
                  key === 'urn' ? 'bg-ink/5 text-ink/50 cursor-not-allowed' : 'bg-paper'
                }`}
              />
            </div>
          ))}
        </div>

        {editError && <p className="text-sm text-brick font-medium">{editError}</p>}

        <button
          type="submit"
          disabled={savingEdit}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {savingEdit ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Student Portal Login */}
      <form onSubmit={handleSaveCredentials} className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Student Portal Login</h2>
          <p className="text-sm text-ink/50 mt-1">
            Set or reset the Login ID and password this student uses to check their own attendance.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
              Login ID
            </label>
            <input
              type="text"
              value={credLoginId}
              onChange={(e) => setCredLoginId(e.target.value)}
              className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
              {student.login_id ? 'New Password' : 'Password'}
            </label>
            <input
              type="password"
              value={credPassword}
              onChange={(e) => setCredPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
            />
          </div>
        </div>

        {credError && <p className="text-sm text-brick font-medium">{credError}</p>}
        {credSuccess && <p className="text-sm text-forestDark font-medium">{credSuccess}</p>}

        <button
          type="submit"
          disabled={savingCred}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {savingCred ? 'Saving…' : student.login_id ? 'Update Credentials' : 'Set Credentials'}
        </button>
      </form>


      {/* Blacklist */}
      <div className="bg-card border border-rule rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl">Blacklist</h2>
          <p className="text-sm text-ink/50 mt-1">
            {student.is_blacklisted
              ? 'This student is currently blacklisted.'
              : 'This student is in good standing.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={student.is_blacklisted}
          onClick={toggleBlacklist}
          disabled={togglingBlacklist}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-all disabled:opacity-60 shrink-0"
          style={{
            background: student.is_blacklisted
              ? 'linear-gradient(to right, #D8935A, #E2734B)'
              : 'linear-gradient(to right, #5DCAA5, #378ADD)',
          }}
        >
          <span
            className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white transition-all duration-200 ${
              student.is_blacklisted ? 'left-[calc(100%-22px)]' : 'left-[2px]'
            }`}
            style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
          />
        </button>
      </div>

      {/* Delete */}
      <div className="bg-card border border-brick/40 rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap perforated">
        <div>
          <h2 className="font-display text-xl text-brick">Danger Zone</h2>
          <p className="text-sm text-ink/50 mt-1">Permanently remove this student from the batch.</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="glass-btn px-5 py-2 text-sm font-medium rounded border border-brick text-brick hover:bg-brickGlass hover:text-white transition-colors disabled:opacity-60"
        >
          {busy ? 'Removing…' : 'Delete Student'}
        </button>
      </div>
    </div>
  );
}