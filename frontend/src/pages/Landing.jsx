import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFacultyAuth } from '../context/FacultyAuthContext.jsx';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';
import { getCsrfToken } from '../api/client.js';
import { LogoMark } from '../components/Logo.jsx';

const ROLES = {
  admin: {
    label: 'Admin',
    title: 'ADMIN LOGIN',
    idLabel: 'Email',
    idType: 'email',
    idPlaceholder: 'Email',
    redirect: '/dashboard',
    blurb: 'Manage batches, faculty, students, QR attendance and reports from one place.',
  },
  faculty: {
    label: 'Faculty',
    title: 'FACULTY LOGIN',
    idLabel: 'Email',
    idType: 'email',
    idPlaceholder: 'Email',
    redirect: '/faculty/portal',
    blurb: 'Manage your batches, share updates and review assignments.',
  },
  student: {
    label: 'Student',
    title: 'STUDENT LOGIN',
    idLabel: 'Login ID',
    idType: 'text',
    idPlaceholder: 'Login ID',
    redirect: '/student/portal',
    blurb: 'Check your batch, attendance status and submit assignments.',
  },
};

const TABS = ['admin', 'faculty', 'student'];

// Site palette
const FOREST = '#2F6F4F';
const FOREST_DARK = '#234F38';
const BRICK = '#A6432F';
const AMBER = '#B8842E';
const PAPER = '#EFEEE6';
const CARD = '#F8F7F1';
const RULE = '#C9CABB';

const BTN_BG = `linear-gradient(90deg, ${FOREST}, ${FOREST_DARK})`;

const PILLS = [
  { left: '-4%', bottom: '-6%', w: 190, h: 64, rot: -55, bg: `linear-gradient(90deg,${AMBER},#D9A552)` },
  { left: '14%', bottom: '2%', w: 230, h: 70, rot: -55, bg: `linear-gradient(90deg,#D9A552,${BRICK})` },
  { left: '40%', bottom: '-4%', w: 210, h: 66, rot: -55, bg: `linear-gradient(90deg,${AMBER},${BRICK})` },
  { left: '58%', bottom: '10%', w: 190, h: 58, rot: -55, bg: 'linear-gradient(90deg,#3A8DA8,#8FD3E8)' },
  { left: '2%', bottom: '28%', w: 120, h: 8, rot: -55, bg: 'rgba(217,165,82,0.85)' },
  { left: '30%', bottom: '38%', w: 150, h: 8, rot: -55, bg: 'rgba(143,211,232,0.75)' },
  { left: '52%', bottom: '32%', w: 110, h: 8, rot: -55, bg: 'rgba(217,165,82,0.75)' },
];

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const inputClass =
  'w-full rounded-full text-[#1E2A26] placeholder-[#1E2A26]/40 text-sm pl-10 pr-4 py-2.5 outline-none border focus:ring-2 focus:ring-[#2F6F4F]';
const inputStyle = { background: PAPER, borderColor: RULE };

export default function Login() {
  const adminAuth = useAuth();
  const facultyAuth = useFacultyAuth();
  const studentAuth = useStudentAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = TABS.includes(searchParams.get('role')) ? searchParams.get('role') : 'admin';
  const [role, setRole] = useState(initialRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cfg = ROLES[role];

  function switchRole(next) {
    if (next === role) return;
    setRole(next);
    setIdentifier('');
    setPassword('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError(`${cfg.idLabel} and password are required.`);
      return;
    }
    setBusy(true);
    try {
      const csrfToken = await getCsrfToken();
      const id = identifier.trim();
      if (role === 'admin') await adminAuth.login(id, password, csrfToken);
      else if (role === 'faculty') await facultyAuth.login(id, password, csrfToken);
      else await studentAuth.login(id, password, csrfToken);
      navigate(cfg.redirect);
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg,#8FD3E8 0%,#4A9CB8 40%,#1F5C73 100%)' }}
    >
      <div
        className="w-full max-w-4xl flex flex-col md:flex-row shadow-2xl overflow-hidden rounded-lg md:min-h-[400px]"
        style={{ background: CARD }}
      >
        {/* ---------- Left: welcome panel ---------- */}
        <div
          className="hidden md:block relative w-1/2 overflow-hidden"
          style={{ background: `linear-gradient(160deg,#3A8DA8 0%,${FOREST} 40%,${FOREST_DARK} 100%)` }}
        >
          <div
            className="absolute rounded-full"
            style={{ top: '18%', right: '-4%', width: 150, height: 150, background: 'rgba(143,211,232,0.25)' }}
          />
          <div className="relative z-10 px-10 pt-24">
            <div className="mb-4"><LogoMark size={40} /></div>
            <h1
              className="font-display text-white text-4xl font-semibold leading-tight"
              style={{ textShadow: 'none' }}
            >
              Welcome to Present Hoon Sir!
            </h1>
            <p className="text-white/90 text-sm mt-3 max-w-xs leading-relaxed">{cfg.blurb}</p>
          </div>
          {PILLS.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: p.left,
                bottom: p.bottom,
                width: p.w,
                height: p.h,
                background: p.bg,
                transform: `rotate(${p.rot}deg)`,
                opacity: 0.95,
              }}
            />
          ))}
        </div>

        {/* ---------- Right: tabs + form ---------- */}
        <div className="w-full md:w-1/2 px-6 sm:px-10 py-10 flex flex-col justify-center" style={{ background: CARD }}>
          <div className="md:hidden flex items-center justify-center gap-2 mb-5">
            <LogoMark size={32} />
            <span className="font-display font-semibold" style={{ color: FOREST_DARK }}>Present Hoon Sir!</span>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Login type"
            className="flex rounded-full p-1 max-w-xs w-full mx-auto border"
            style={{ background: PAPER, borderColor: RULE }}
          >
            {TABS.map((key) => {
              const active = key === role;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchRole(key)}
                  className={`flex-1 rounded-full py-1.5 text-xs font-semibold tracking-wide transition-all ${
                    active ? 'text-white shadow' : 'hover:bg-white/60'
                  }`}
                  style={active ? { background: BTN_BG } : { color: FOREST_DARK }}
                >
                  {ROLES[key].label}
                </button>
              );
            })}
          </div>

          <h2
            className="font-display text-center font-semibold tracking-wide text-lg mt-7 mb-5"
            style={{ color: FOREST_DARK, textShadow: 'none' }}
          >
            {cfg.title}
          </h2>

          <form onSubmit={handleSubmit} className="w-full max-w-[280px] mx-auto space-y-3.5">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: FOREST }}><UserIcon /></span>
              <input
                key={role}
                type={cfg.idType}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={cfg.idPlaceholder}
                aria-label={cfg.idLabel}
                autoFocus
                autoComplete="username"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: FOREST }}><LockIcon /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-center" style={{ color: BRICK }} role="alert">{error}</p>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full text-white text-xs font-semibold tracking-wider px-12 py-2.5 shadow-md hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: BTN_BG }}
              >
                {busy ? 'SIGNING IN…' : 'LOGIN'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Link to="/" className="mt-6 text-sm text-white/90 hover:text-white underline underline-offset-4">
        ← Back to home
      </Link>
    </div>
  );
}