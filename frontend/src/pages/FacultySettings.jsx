import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
export default function FacultySettings() {
  const { id } = useParams();
  const facultyId = Number(id);
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [batchAccess, setBatchAccess] = useState([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [togglingBatchId, setTogglingBatchId] = useState(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [busy, setBusy] = useState(false);
  function loadFaculty() {
    setLoading(true);
    setError('');
    api.listFaculties()
      .then((data) => {
        const found = data.faculties.find((f) => f.id === facultyId);
        if (!found) {
          setError('Faculty not found.');
        } else {
          setFaculty(found);
          setEditName(found.name);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  function loadBatchAccess() {
    setAccessLoading(true);
    setAccessError('');
    api.getFacultyBatchAccess(facultyId)
      .then((data) => setBatchAccess(data.batches))
      .catch((err) => setAccessError(err.message))
      .finally(() => setAccessLoading(false));
  }
  useEffect(() => {
    loadFaculty();
    loadBatchAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facultyId]);
  async function handleSaveEdit(e) {
    e.preventDefault();
    setEditError('');
    if (!editName.trim()) {
      setEditError('Name is required.');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateFaculty(facultyId, editName.trim());
      setFaculty((prev) => ({ ...prev, name: editName.trim() }));
    } catch (err) {
      setEditError(err.message || 'Could not update name.');
    } finally {
      setSavingEdit(false);
    }
  }
  async function toggleBatchAccess(batch) {
    setTogglingBatchId(batch.id);
    setAccessError('');
    try {
      if (batch.hasAccess) {
        await api.revokeBatchFromFaculty(facultyId, batch.id);
      } else {
        await api.assignBatchToFaculty(facultyId, batch.id);
      }
      setBatchAccess((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, hasAccess: !b.hasAccess } : b))
      );
    } catch (err) {
      setAccessError(err.message || 'Could not update batch access.');
    } finally {
      setTogglingBatchId(null);
    }
  }
  async function toggleActive() {
    if (!faculty) return;
    setTogglingActive(true);
    try {
      await api.toggleFacultyActive(facultyId, !faculty.is_active);
      setFaculty((prev) => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      alert(err.message || 'Could not update status.');
    } finally {
      setTogglingActive(false);
    }
  }
  async function handleDelete() {
    if (!faculty) return;
    if (!window.confirm(`Remove faculty ${faculty.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteFaculty(facultyId);
      navigate('/faculties');
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }
  if (loading) {
    return <p className="text-ink/50 font-mono text-sm">Loading…</p>;
  }
  if (error || !faculty) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-brick font-medium">{error || 'Faculty not found.'}</p>
        <Link to="/faculties" className="text-forestDark underline text-sm">
          ← Back to Manage Faculty
        </Link>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/faculties" className="text-sm text-ink/60 hover:text-ink transition-colors">
          ← Back to Manage Faculty
        </Link>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <h1 className="font-display text-3xl font-600">{faculty.name}</h1>
          {!faculty.is_active && (
            <span className="text-xs font-mono uppercase tracking-wide text-brick border border-brick/40 rounded px-1.5 py-0.5">
              Inactive
            </span>
          )}
        </div>
        <p className="text-sm text-ink/50 mt-1">{faculty.email}</p>
      </div>
      <form onSubmit={handleSaveEdit} className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <h2 className="font-display text-xl">Name</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-[200px] border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
          <button
            type="submit"
            disabled={savingEdit}
            className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
          >
            {savingEdit ? 'Saving…' : 'Save'}
          </button>
        </div>
        {editError && <p className="text-sm text-brick font-medium">{editError}</p>}
      </form>
      <div className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <h2 className="font-display text-xl">Batches</h2>
        {accessLoading ? (
          <p className="text-ink/50 font-mono text-sm">Loading batches…</p>
        ) : batchAccess.length === 0 ? (
          <p className="text-sm text-ink/50">No batches exist yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {batchAccess.map((b) => (
              <label
                key={b.id}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                  b.hasAccess
                    ? 'glass-btn border-forest bg-forestGlass text-white'
                    : 'border-rule text-ink/70 hover:bg-white/20'
                } ${togglingBatchId === b.id ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input type="checkbox" className="hidden" checked={b.hasAccess} onChange={() => toggleBatchAccess(b)} />
                {b.name}
              </label>
            ))}
          </div>
        )}
        {accessError && <p className="text-sm text-brick font-medium">{accessError}</p>}
      </div>
      <div className="bg-card border border-rule rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl">Account Status</h2>
          <p className="text-sm text-ink/50 mt-1">
            {faculty.is_active ? 'This faculty can log in to the faculty portal.' : 'This faculty cannot log in.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={faculty.is_active}
          onClick={toggleActive}
          disabled={togglingActive}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-all disabled:opacity-60 shrink-0"
          style={{
            background: faculty.is_active
              ? 'linear-gradient(to right, #5DCAA5, #378ADD)'
              : 'linear-gradient(to right, #D85A30, #E24B4A)',
          }}
        >
          <span
            className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white transition-all duration-200 ${
              faculty.is_active ? 'left-[calc(100%-22px)]' : 'left-[2px]'
            }`}
            style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
          />
        </button>
      </div>
      <div className="bg-card border border-brick/40 rounded-lg p-6 flex items-center justify-between gap-4 flex-wrap perforated">
        <div>
          <h2 className="font-display text-xl text-brick">Danger Zone</h2>
          <p className="text-sm text-ink/50 mt-1">Permanently remove this faculty.</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="glass-btn px-5 py-2 text-sm font-medium rounded border border-brick text-brick hover:bg-brickGlass hover:text-white transition-colors disabled:opacity-60"
        >
          {busy ? 'Removing…' : 'Delete Faculty'}
        </button>
      </div>
    </div>
  );
}