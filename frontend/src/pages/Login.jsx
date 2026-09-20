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
    eyebrow: 'Administrator',
    heading: 'Welcome, Admin',
    blurb: 'Run your institution from one place, with full control over batches, people and reports.',
    points: [
      'Create batches & generate QR codes',
      'Manage faculty and students',
      'Export Excel & PDF reports',
    ],
    bg: 'linear-gradient(160deg,#3A8DA8 0%,#2F6F4F 40%,#234F38 100%)',
  },
  faculty: {
    label: 'Faculty',
    title: 'FACULTY LOGIN',
    idLabel: 'Email',
    idType: 'email',
    idPlaceholder: 'Email',
    redirect: '/faculty/portal',
    eyebrow: 'Faculty',
    heading: 'Welcome, Faculty',
    blurb: 'Take attendance, keep your students informed and stay on top of every batch you teach.',
    points: [
      'Track attendance for your batches',
      'Post updates & assignments',
      'Review student submissions',
    ],
    bg: 'linear-gradient(160deg,#234F38 0%,#2F6F4F 45%,#3A8DA8 100%)',
  },
  student: {
    label: 'Student',
    title: 'STUDENT LOGIN',
    idLabel: 'Login ID',
    idType: 'text',
    idPlaceholder: 'Login ID',
    redirect: '/student/portal',
    eyebrow: 'Student',
    heading: 'Welcome, Student',
    blurb: 'See where you stand, never miss an update and hand in your work without the hassle.',
    points: [
      'View your batch & attendance status',
      'Get updates from your faculty',
      'Submit assignments online',
    ],
    bg: 'linear-gradient(160deg,#1F5C73 0%,#2F6F4F 50%,#234F38 100%)',
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
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

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
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

// Fade + slide for the left-panel text. Staggered when a slide becomes active.
function reveal(active, delay) {
  return {
    opacity: active ? 1 : 0,
    transform: active ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 500ms ${EASE} ${active ? delay : 0}ms, transform 500ms ${EASE} ${active ? delay : 0}ms`,
  };
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
  const activeIndex = TABS.indexOf(role);

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
      <style>{`
        @keyframes phsFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .phs-fade-up { animation: phsFadeUp 450ms cubic-bezier(0.4, 0, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .phs-fade-up { animation: none; }
          .phs-anim, .phs-anim * { transition: none !important; }
        }
      `}</style>

      <div
        className="w-full max-w-4xl flex flex-col md:flex-row shadow-2xl overflow-hidden rounded-lg md:min-h-[420px]"
        style={{ background: CARD }}
      >
        {/* ---------- Left: welcome panel ---------- */}
        <div className="phs-anim hidden md:block relative w-1/2 overflow-hidden" style={{ background: FOREST_DARK }}>
          {/* Cross-fading background layers (one per role) */}
          {TABS.map((key) => (
            <div
              key={key}
              className="absolute inset-0"
              style={{
                background: ROLES[key].bg,
                opacity: key === role ? 1 : 0,
                transition: `opacity 700ms ${EASE}`,
              }}
            />
          ))}

          <div
            className="absolute rounded-full"
            style={{ top: '14%', right: '-4%', width: 150, height: 150, background: 'rgba(143,211,232,0.25)' }}
          />

          {/* Text slides (stacked, cross-fading) */}
          <div className="relative z-10 px-10 pt-16">
            <div className="mb-4"><LogoMark size={40} /></div>
            <div className="relative" style={{ height: 250 }}>
              {TABS.map((key) => {
                const r = ROLES[key];
                const active = key === role;
                return (
                  <div
                    key={key}
                    className="absolute inset-0"
                    style={{ pointerEvents: active ? 'auto' : 'none' }}
                    aria-hidden={!active}
                  >
                    <p
                      className="font-mono text-[11px] tracking-widest uppercase mb-2"
                      style={{ color: '#F0D9A8', ...reveal(active, 100) }}
                    >
                      {r.eyebrow}
                    </p>
                    <h1
                      className="font-display text-white text-4xl font-semibold leading-tight"
                      style={{ textShadow: 'none', ...reveal(active, 160) }}
                    >
                      {r.heading}
                    </h1>
                    <p
                      className="text-white/90 text-sm mt-3 max-w-xs leading-relaxed"
                      style={reveal(active, 240)}
                    >
                      {r.blurb}
                    </p>
                    <ul className="mt-4 space-y-2 max-w-xs">
                      {r.points.map((pt, i) => (
                        <li
                          key={pt}
                          className="flex items-start gap-2 text-sm text-white/95"
                          style={reveal(active, 320 + i * 80)}
                        >
                          <span
                            className="mt-0.5 flex-shrink-0 rounded-full flex items-center justify-center text-white"
                            style={{ width: 18, height: 18, background: 'rgba(255,255,255,0.22)' }}
                          >
                            <CheckIcon />
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
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

          {/* Tabs with sliding indicator */}
          <div
            role="tablist"
            aria-label="Login type"
            className="phs-anim relative flex rounded-full p-1 max-w-xs w-full mx-auto border"
            style={{ background: PAPER, borderColor: RULE }}
          >
            <span
              aria-hidden="true"
              className="absolute rounded-full shadow"
              style={{
                top: 4,
                bottom: 4,
                left: 4,
                width: 'calc((100% - 8px) / 3)',
                background: BTN_BG,
                transform: `translateX(${activeIndex * 100}%)`,
                transition: `transform 450ms ${EASE}`,
              }}
            />
            {TABS.map((key) => {
              const active = key === role;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchRole(key)}
                  className="relative z-10 flex-1 rounded-full py-1.5 text-xs font-semibold tracking-wide"
                  style={{
                    color: active ? '#fff' : FOREST_DARK,
                    transition: `color 350ms ${EASE}`,
                  }}
                >
                  {ROLES[key].label}
                </button>
              );
            })}
          </div>

          {/* Heading + form fade up on every tab change */}
          <div key={role} className="phs-fade-up">
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
      </div>

      <Link to="/" className="mt-6 text-sm text-white/90 hover:text-white underline underline-offset-4">
        ← Back to home
      </Link>
    </div>
  );
}