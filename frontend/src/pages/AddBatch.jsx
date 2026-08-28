import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '—' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
function pick(row, ...keys) {
  const normalized = {};
  for (const k of Object.keys(row)) normalized[k.trim().toLowerCase()] = row[k];
  for (const key of keys) {
    const val = normalized[key.toLowerCase()];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  }
  return '';
}
function parseRows(rawRows) {
  return rawRows.map((row, idx) => {
    const urn = pick(row, 'urn').replace(/\s+/g, '').toUpperCase();
    const studentName = pick(row, 'student name', 'name');
    const { firstName, lastName } = splitName(studentName);
    const phone = pick(row, 'student phone', 'phone');
    const email = pick(row, 'student mail', 'student email', 'email');
    const parentPhone = pick(row, 'parent mobile', 'parent phone', "parent's phone");
    const valid = Boolean(urn && firstName && lastName);
    return { rowNum: idx + 2, urn, firstName, lastName, phone, email, parentPhone, valid };
  });
}
export default function AddBatch() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [name, setName] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);
  const [collaboratorsError, setCollaboratorsError] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [results, setResults] = useState(null);
  useEffect(() => {
    if (!isSuperAdmin) return; // only super admins can set up collaborators
    api.listAdminsBasic()
      .then((data) => setCollaborators(data.admins))
      .catch((err) => setCollaboratorsError(err.message));
  }, [isSuperAdmin]);
  function toggleCollaborator(id) {
    setSelectedCollaboratorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setFileName(file.name);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (rawRows.length === 0) {
          setParseError('No rows found in this file.');
          setParsedRows([]);
          return;
        }
        setParsedRows(parseRows(rawRows));
      } catch {
        setParseError('Could not read this file. Make sure it is a valid .xlsx, .xls, or .csv file.');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }
  const validRows = parsedRows.filter((r) => r.valid);
  const invalidRows = parsedRows.filter((r) => !r.valid);
  async function handleCreate() {
    setCreateError('');
    if (!name.trim()) {
      setCreateError('Batch name is required.');
      return;
    }
    setCreating(true);
    try {
      const batchData = await api.createBatch(name.trim(), selectedCollaboratorIds);
      const batchId = batchData.batch.id;
      const outcomes = await Promise.allSettled(
        validRows.map((r) =>
          api.createStudent(batchId, {
            urn: r.urn,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
            email: r.email,
            parentPhone: r.parentPhone,
            confirmed: true, // bulk import: auto-confirm cross-batch enrollment, flag it in results instead
          })
        )
      );
      const failed = [];
      const multiBatch = [];
      let created = 0;
      outcomes.forEach((outcome, i) => {
        if (outcome.status === 'fulfilled') {
          created += 1;
          if (outcome.value?.alreadyInOtherBatches?.length > 0) {
            multiBatch.push({ row: validRows[i], batches: outcome.value.alreadyInOtherBatches });
          }
        } else {
          failed.push({ row: validRows[i], reason: outcome.reason?.message || 'Failed' });
        }
      });
      setResults({ batchId, created, failed, multiBatch });
    } catch (err) {
      setCreateError(err.message || 'Could not create batch.');
    } finally {
      setCreating(false);
    }
  }
  if (results) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-3xl font-600">Batch Created</h1>
        <div className="bg-card border border-rule rounded-lg p-6 space-y-3">
          <p className="text-forest font-medium">{results.created} student(s) added successfully.</p>
          {results.failed.length > 0 && (
            <div>
              <p className="text-brick font-medium mb-2">{results.failed.length} row(s) failed:</p>
              <ul className="divide-y divide-rule text-sm">
                {results.failed.map((f, i) => (
                  <li key={i} className="py-1.5">
                    Row {f.row.rowNum} ({f.row.urn || '—'}): <span className="text-brick">{f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {results.multiBatch.length > 0 && (
            <div>
              <p className="text-amber font-medium mb-2">
                {results.multiBatch.length} student(s) were already enrolled in other batch(es):
              </p>
              <ul className="divide-y divide-rule text-sm">
                {results.multiBatch.map((m, i) => (
                  <li key={i} className="py-1.5">
                    Row {m.row.rowNum} ({m.row.urn}): also in{' '}
                    <span className="text-amber">{m.batches.map((b) => b.batchName).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="glass-btn bg-forestGlass text-white rounded px-6 py-2.5 font-medium hover:bg-forestGlass/70 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="font-display text-3xl font-600">Add Batch</h1>
      <div className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Batch Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CS 2026 - Section A"
            className="w-full border border-rule rounded px-3 py-2 bg-paper focus-visible:outline-forest"
          />
        </div>
        {isSuperAdmin && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
              Collaborate With Other Admins
            </label>
            {collaboratorsError && <p className="text-sm text-brick">{collaboratorsError}</p>}
            {collaborators.length === 0 ? (
              <p className="text-sm text-ink/50">No other admins to add yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {collaborators.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(a.id)
                        ? 'glass-btn border-forest bg-forestGlass text-white'
                        : 'border-rule text-ink/70 hover:bg-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedCollaboratorIds.includes(a.id)}
                      onChange={() => toggleCollaborator(a.id)}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-card border border-rule rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
            Student Enrollment List (.xlsx, .xls, or .csv)
          </label>
          <p className="text-xs text-ink/50 mb-2">
            Expected columns: URN, Student Name, Student Phone, Student Mail, Parent Mobile
          </p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="text-sm" />
          {fileName && <p className="text-xs text-ink/50 mt-1 font-mono">{fileName}</p>}
          {parseError && <p className="text-sm text-brick font-medium mt-2">{parseError}</p>}
        </div>
        {parsedRows.length > 0 && (
          <div>
            <p className="text-sm font-mono text-ink/60 mb-2">
              {validRows.length} valid row(s)
              {invalidRows.length > 0 ? `, ${invalidRows.length} row(s) missing required fields` : ''}
            </p>
            <div className="max-h-72 overflow-y-auto overflow-x-auto border border-rule rounded">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-paper sticky top-0">
                  <tr className="text-left text-xs font-mono uppercase tracking-wide text-ink/50">
                    <th className="p-2">Row</th>
                    <th className="p-2">URN</th>
                    <th className="p-2">First Name</th>
                    <th className="p-2">Last Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Parent Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {parsedRows.map((r) => (
                    <tr key={r.rowNum} className={r.valid ? '' : 'bg-brick/5'}>
                      <td className="p-2 font-mono text-ink/50">{r.rowNum}</td>
                      <td className="p-2">{r.urn || <span className="text-brick">missing</span>}</td>
                      <td className="p-2">{r.firstName || <span className="text-brick">missing</span>}</td>
                      <td className="p-2">{r.lastName || <span className="text-brick">missing</span>}</td>
                      <td className="p-2">{r.phone}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2">{r.parentPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {createError && <p className="text-brick font-medium">{createError}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="glass-btn bg-forestGlass text-white rounded px-6 py-2.5 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create Batch'}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}