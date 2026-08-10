import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const emptyForm = { name: '', email: '', password: '' };

function GearIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addError, setAddError] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function loadAdmins() {
    setLoading(true);
    setError('');
    api.listAdmins()
      .then((data) => setAdmins(data.admins))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setAddError('');

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setAddError('Password must be at least 8 characters.');
      return;
    }

    setCreating(true);
    try {
      await api.createAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setForm(emptyForm);
      setShowAddForm(false);
      loadAdmins();
    } catch (err) {
      setAddError(err.message || 'Could not create admin.');
    } finally {
      setCreating(false);
    }
  }

  const filteredAdmins = admins.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-600">Manage Admins</h1>
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
            setAddError('');
            setForm(emptyForm);
          }}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors"
        >
          {showAddForm ? 'Close' : '+ Create Admin'}
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
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={update('name')}
                className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                Email ID
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
              />
            </div>
          </div>

          {addError && <p className="text-sm text-brick font-medium">{addError}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Admin'}
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
      ) : admins.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">No admins yet.</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">No matching admins.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
          {filteredAdmins.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-xs font-mono uppercase tracking-wide text-ink/50 border border-rule rounded px-1.5 py-0.5">
                    {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
                <div className="text-xs text-ink/50 mt-1">{a.email}</div>
              </div>
              <Link
                to={`/admins/${a.id}/settings`}
                className="p-2 rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors shrink-0"
                aria-label={`Settings for ${a.name}`}
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