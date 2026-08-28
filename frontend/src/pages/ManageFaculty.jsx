import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
const emptyForm = { name: '', email: '' };
function GearIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export default function ManageFaculty() {
  const { isSuperAdmin } = useAuth();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [collaborators, setCollaborators] = useState([]);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);
  const [addError, setAddError] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  function loadFaculties() {
    setLoading(true);
    setError('');
    api.listFaculties()
      .then((data) => setFaculties(data.faculties))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    loadFaculties();
    if (isSuperAdmin) {
      api.listAdminsBasic().then((d) => setCollaborators(d.admins)).catch(() => {});
    }
  }, [isSuperAdmin]);
  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }
  function toggleCollaborator(id) {
    setSelectedCollaboratorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  async function handleCreate(e) {
    e.preventDefault();
    setAddError('');
    if (!form.name.trim() || !form.email.trim()) {
      setAddError('Name and email are required.');
      return;
    }
    setCreating(true);
    try {
      await api.createFaculty({
        name: form.name.trim(),
        email: form.email.trim(),
        collaboratorIds: selectedCollaboratorIds,
      });
      setForm(emptyForm);
      setSelectedCollaboratorIds([]);
      setShowAddForm(false);
      loadFaculties();
    } catch (err) {
      setAddError(err.message || 'Could not create faculty.');
    } finally {
      setCreating(false);
    }
  }
  const filtered = faculties.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q);
  });
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-600">Manage Faculty</h1>
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
            setAddError('');
            setForm(emptyForm);
            setSelectedCollaboratorIds([]);
          }}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors"
        >
          {showAddForm ? 'Close' : '+ Create Faculty'}
        </button>
      </div>
      <div className="bg-card border border-rule rounded-lg p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full border border-rule rounded px-3 py-2 bg-paper font-medium focus:outline-none focus:ring-1 focus:ring-forest"
        />
      </div>
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={update('name')}
                className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">Email ID</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              />
            </div>
          </div>
          {isSuperAdmin && collaborators.length > 0 && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                Collaborating Admins (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {collaborators.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(c.id)
                        ? 'glass-btn border-forest bg-forestGlass text-white'
                        : 'border-rule text-ink/70 hover:bg-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedCollaboratorIds.includes(c.id)}
                      onChange={() => toggleCollaborator(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {addError && <p className="text-sm text-brick font-medium">{addError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Faculty'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2 font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-brick font-medium">{error}</p>}
      {loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : faculties.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">No faculty yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">No matching faculty.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
          {filtered.map((f) => (
            <div key={f.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{f.name}</span>
                  {!f.is_active && (
                    <span className="text-xs font-mono uppercase tracking-wide text-brick border border-brick/40 rounded px-1.5 py-0.5">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink/50 mt-1">{f.email}</div>
              </div>
              <Link
                to={`/faculties/${f.id}/settings`}
                className="p-2 rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors shrink-0"
                aria-label={`Settings for ${f.name}`}
              >
                <GearIcon className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}