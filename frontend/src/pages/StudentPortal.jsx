import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

export default function StudentPortal() {
  const { logout } = useStudentAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    </div>
  );
}