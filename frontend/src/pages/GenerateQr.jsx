import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client.js';
import { useSelectedBatch } from '../hooks/useSelectedBatch.js';
function useCountdown(expiresAt) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(diff, 0));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return secondsLeft;
}

function formatCountdown(seconds) {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function GenerateQr() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useSelectedBatch();
  const [batchesError, setBatchesError] = useState('');
  const [session, setSession] = useState(null); // { id, token, expiresAt, qrDataUrl }
  const [submissions, setSubmissions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const [validityMinutes, setValidityMinutes] = useState('');
  const [savingValidity, setSavingValidity] = useState(false);
  const [validityError, setValidityError] = useState('');
  const [validitySaved, setValiditySaved] = useState(false);

  const secondsLeft = useCountdown(session?.expiresAt);
  const expired = session && secondsLeft === 0;
  const pollRef = useRef(null);
  const downloadedRef = useRef(false);

  useEffect(() => {
    api.listBatches()
      .then((data) => {
        setBatches(data.batches);
        const stillValid = data.batches.some((b) => b.id === batchId);
        if (!stillValid) {
          setBatchId(data.batches.length > 0 ? data.batches[0].id : null);
        }
      })
      .catch((err) => setBatchesError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pollSubmissions = useCallback(async (sessionId) => {
    try {
      const data = await api.getQrSessionReport(sessionId);
      setSubmissions(data.submissions);
    } catch {
      // transient poll failures aren't worth surfacing — next tick will retry
    }
  }, []);

  async function handleGenerate() {
    if (!batchId) return;
    setGenerateError('');
    setGenerating(true);
    setDownloaded(false);
    downloadedRef.current = false;
    setSubmissions([]);
    try {
      const data = await api.generateQrSession(batchId);
      setSession({
        id: data.session.id,
        token: data.session.session_token,
        expiresAt: data.session.expires_at,
        qrDataUrl: data.qrDataUrl,
      });
    } catch (err) {
      setGenerateError(err.message || 'Could not generate a QR code.');
    } finally {
      setGenerating(false);
    }
  }

  // poll live responses while the session is active
  useEffect(() => {
    if (!session || expired) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollSubmissions(session.id);
    pollRef.current = setInterval(() => pollSubmissions(session.id), 3000);
    return () => clearInterval(pollRef.current);
  }, [session, expired, pollSubmissions]);

  // auto-download the response sheet the moment the timer hits zero, once
  useEffect(() => {
    if (expired && session && !downloadedRef.current) {
      downloadedRef.current = true;
      pollSubmissions(session.id).finally(() => {
        api.downloadAndSaveQrSessionCsv(session.id)
          .then(() => setDownloaded(true))
          .catch(() => setDownloaded(false));
      });
    }
  }, [expired, session, pollSubmissions]);

  const selectedBatch = batches.find((b) => b.id === batchId);

  // keep the editable field in sync whenever the selected batch changes
  useEffect(() => {
    if (selectedBatch) {
      setValidityMinutes(String(selectedBatch.qr_validity_minutes ?? 5));
      setValidityError('');
      setValiditySaved(false);
    }
  }, [selectedBatch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveValidity() {
    const minutes = Number(validityMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      setValidityError('Enter a whole number between 1 and 180.');
      return;
    }
    setValidityError('');
    setSavingValidity(true);
    setValiditySaved(false);
    try {
      const data = await api.updateBatchSettings(batchId, minutes);
      setBatches((prev) => prev.map((b) => (b.id === batchId ? data.batch : b)));
      setValiditySaved(true);
    } catch (err) {
      setValidityError(err.message || 'Could not save.');
    } finally {
      setSavingValidity(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-600">Generate QR</h1>
        {!session && (
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
        {session && selectedBatch && (
          <span className="font-mono text-xs text-ink/50 uppercase tracking-wide">
            {selectedBatch.name}
          </span>
        )}
      </div>

      {batchesError && <p className="text-brick font-medium">{batchesError}</p>}

      {!session && !batchesError && selectedBatch && (
        <div className="bg-card border border-rule rounded-lg p-4 flex items-center gap-3">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/60">
            QR Validity (minutes) for {selectedBatch.name}
          </label>
          <input
            type="number"
            min="1"
            max="180"
            value={validityMinutes}
            onChange={(e) => setValidityMinutes(e.target.value)}
            className="w-20 border border-rule rounded px-2 py-1 bg-paper focus-visible:outline-forest"
          />
          <button
            onClick={handleSaveValidity}
            disabled={savingValidity}
            className="glass-btn bg-forestGlass text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
          >
            {savingValidity ? 'Saving…' : 'Save'}
          </button>
          {validitySaved && <span className="text-forest text-sm">Saved ✓</span>}
          {validityError && <span className="text-brick text-sm">{validityError}</span>}
        </div>
      )}

      {!session && !batchesError && (
        <div className="bg-card border border-rule rounded-lg p-10 text-center space-y-4">
          <p className="text-sm text-ink/60">
            Generate a QR code valid for {selectedBatch?.qr_validity_minutes ?? 5} minutes. Students scan it to mark themselves present.
          </p>
          {generateError && <p className="text-sm text-brick font-medium">{generateError}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating || !batchId}
            className="glass-btn bg-forestGlass text-white rounded px-6 py-2.5 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate QR'}
          </button>
        </div>
      )}

      {session && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-rule rounded-lg p-8 text-center">
            {!expired ? (
              <>
                <img
                  src={session.qrDataUrl}
                  alt="Scan to mark attendance"
                  className="mx-auto w-56 h-56 rounded"
                />
                <p className="mt-4 text-xs font-mono uppercase tracking-wide text-ink/50">
                  Time remaining
                </p>
                <p className="font-display text-4xl font-600 text-forestDark">
                  {formatCountdown(secondsLeft)}
                </p>
              </>
            ) : (
              <div className="perforated pt-6 space-y-2">
                <p className="font-display text-xl text-brick">QR expired</p>
                <p className="text-sm text-ink/60">
                  {downloaded
                    ? 'Response sheet downloaded automatically.'
                    : 'Preparing the response sheet…'}
                </p>
                <button
                  onClick={handleGenerate}
                  className="mt-4 glass-btn bg-forestGlass text-white rounded px-6 py-2.5 font-medium hover:bg-forestGlass/70 transition-colors"
                >
                  Generate New QR
                </button>
              </div>
            )}
          </div>

          <div className="bg-card border border-rule rounded-lg p-6">
            <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-3">
              Live Responses ({submissions.length})
            </p>
            {submissions.length === 0 ? (
              <p className="text-sm text-ink/50">No submissions yet.</p>
            ) : (
              <ul className="divide-y divide-rule max-h-96 overflow-y-auto">
                {submissions.map((s) => (
                  <li key={s.urn} className="py-2 flex items-center justify-between">
                    <span className="font-medium">{s.first_name} {s.last_name}</span>
                    <span className="font-mono text-xs text-ink/50">{s.urn}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}