import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const emptyForm = { urn: '', firstName: '', lastName: '', phone: '', email: '', parentPhone: '', batchId: '' };

function GearIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StudentForm({ initial, batches, onCancel, onSubmit, submitLabel, error }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    ['urn', 'URN', true],
    ['firstName', 'First Name', true],
    ['lastName', 'Last Name', true],
    ['phone', 'Phone', false],
    ['email', 'Email', false],
    ['parentPhone', "Parent's Phone", false],
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-rule rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(([key, label, required]) => (
          <div key={key}>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
              {label}
            </label>
            <input
              type={key === 'email' ? 'email' : 'text'}
              required={required}
              value={form[key]}
              onChange={update(key)}
              className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Assign to Batch
          </label>
          <select
            value={form.batchId}
            onChange={update('batchId')}
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          >
            <option value="">Not assigned</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-brick font-medium">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
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

export default function Students() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    api.listBatches().then((data) => setBatches(data.batches)).catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listMyStudents();
      setStudents(data.students);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.first_name} ${s.last_name} ${s.urn}`.toLowerCase().includes(q)
    );
  }, [students, search]);

  async function handleAdd(form) {
    setAddError('');
    try {
      const payload = {
        urn: form.urn,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        parentPhone: form.parentPhone,
        ...(form.batchId ? { batchId: Number(form.batchId) } : {}),
      };

      const result = await api.addStudentGeneral(payload);

      if (result?.requiresConfirmation) {
        const batchNames = result.existingBatches.map((b) => b.batchName).join(', ');
        const proceed = window.confirm(
          `${result.message}\nExisting batch(es): ${batchNames}\n\nAdd this student to the selected batch as well?`
        );
        if (!proceed) return;
        await api.addStudentGeneral({ ...payload, confirmed: true });
      }

      setShowAddForm(false);
      await loadStudents();
    } catch (err) {
      setAddError(err.message || 'Could not add student.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-600">View Students</h1>
      </div>

      {error && <p className="text-brick font-medium">{error}</p>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or URN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-rule rounded px-3 py-2 bg-card w-full sm:w-72 focus-visible:outline-forest"
        />
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
            setAddError('');
          }}
          className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors"
        >
          {showAddForm ? 'Close' : '+ Add Student'}
        </button>
      </div>

      {showAddForm && (
        <StudentForm
          initial={emptyForm}
          batches={batches}
          onCancel={() => setShowAddForm(false)}
          onSubmit={handleAdd}
          submitLabel="Add Student"
          error={addError}
        />
      )}

      {loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-10 text-center">
          <p className="text-sm text-ink/50">
            {students.length === 0 ? 'No students yet.' : 'No students match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
          {filtered.map((s) => (
            <div key={s.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{s.first_name} {s.last_name}</span>
                  <span className="font-mono text-xs text-ink/50">{s.urn}</span>
                  <span
                    className={`text-xs font-mono uppercase tracking-wide rounded px-1.5 py-0.5 border ${
                      s.batch_name ? 'text-ink/50 border-rule' : 'text-amber border-amber'
                    }`}
                  >
                    {s.batch_name || 'NOT ASSIGNED'}
                  </span>
                  {s.is_blacklisted && (
                    <span className="text-xs font-mono uppercase tracking-wide text-brick border border-brick rounded px-1.5 py-0.5">
                      Blacklisted
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink/50 mt-1 space-x-3">
                  {s.phone && <span>{s.phone}</span>}
                  {s.email && <span>{s.email}</span>}
                  {s.parent_phone && <span>Parent: {s.parent_phone}</span>}
                </div>
              </div>
              <Link
                to={`/students/${s.id}/settings`}
                className="p-2 rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors shrink-0"
                aria-label={`Settings for ${s.first_name} ${s.last_name}`}
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