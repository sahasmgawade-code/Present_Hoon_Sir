import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogoMark } from '../components/Logo.jsx';

const FOREST = '#2F6F4F';
const FOREST_DARK = '#234F38';
const AMBER = '#B8842E';
const PAPER = '#EFEEE6';
const CARD = '#F8F7F1';
const RULE = '#C9CABB';

const BTN_BG = `linear-gradient(90deg, ${FOREST}, ${FOREST_DARK})`;

export default function NotFound() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg,#8FD3E8 0%,#4A9CB8 40%,#1F5C73 100%)' }}
    >
      <style>{`
        @keyframes phsNfFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes phsNfFloat {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-10px) rotate(4deg); }
        }
        .phs-nf-card  { animation: phsNfFadeUp 550ms cubic-bezier(0.4, 0, 0.2, 1) both; }
        .phs-nf-item  { animation: phsNfFadeUp 550ms cubic-bezier(0.4, 0, 0.2, 1) both; }
        .phs-nf-float { animation: phsNfFloat 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .phs-nf-card, .phs-nf-item, .phs-nf-float { animation: none; }
        }
      `}</style>

      <div
        className="phs-nf-card w-full max-w-lg rounded-lg shadow-2xl px-6 sm:px-10 py-12 text-center"
        style={{ background: CARD }}
      >
        {/* 4 [logo] 4 */}
        <div className="phs-nf-item flex items-center justify-center gap-2 sm:gap-4" style={{ animationDelay: '100ms' }}>
          <span
            className="font-display font-bold leading-none select-none"
            style={{ fontSize: 'clamp(72px, 18vw, 120px)', color: FOREST_DARK, textShadow: 'none' }}
          >
            4
          </span>
          <span className="phs-nf-float inline-block" aria-hidden="true">
            <LogoMark size={96} />
          </span>
          <span
            className="font-display font-bold leading-none select-none"
            style={{ fontSize: 'clamp(72px, 18vw, 120px)', color: FOREST_DARK, textShadow: 'none' }}
          >
            4
          </span>
        </div>

        <p
          className="phs-nf-item font-mono text-[11px] tracking-widest uppercase mt-6"
          style={{ color: AMBER, animationDelay: '200ms' }}
        >
          Page not found
        </p>

        <h1
          className="phs-nf-item font-display text-2xl sm:text-3xl font-semibold mt-2"
          style={{ color: FOREST_DARK, textShadow: 'none', animationDelay: '260ms' }}
        >
          Looks like you&apos;re marked absent from this page
        </h1>

        <p
          className="phs-nf-item text-sm mt-3 max-w-sm mx-auto leading-relaxed"
          style={{ color: 'rgba(30,42,38,0.7)', animationDelay: '320ms' }}
        >
          The page you&apos;re looking for doesn&apos;t exist, was moved, or the link is incorrect.
        </p>

        <p
          className="phs-nf-item font-mono text-xs mt-4 mx-auto max-w-xs break-all rounded-full px-4 py-1.5 border"
          style={{ background: PAPER, borderColor: RULE, color: 'rgba(30,42,38,0.6)', animationDelay: '380ms' }}
        >
          {pathname}
        </p>

        <div
          className="phs-nf-item flex flex-wrap items-center justify-center gap-3 mt-8"
          style={{ animationDelay: '440ms' }}
        >
          <Link
            to="/"
            className="rounded-full text-white text-xs font-semibold tracking-wider px-8 py-2.5 shadow-md hover:opacity-90 transition-opacity"
            style={{ background: BTN_BG }}
          >
            GO TO HOME
          </Link>
          <Link
            to="/login"
            className="rounded-full text-xs font-semibold tracking-wider px-8 py-2.5 border hover:bg-white/70 transition-colors"
            style={{ color: FOREST_DARK, borderColor: FOREST }}
          >
            LOGIN
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs font-semibold tracking-wider px-4 py-2.5 underline underline-offset-4 hover:opacity-70 transition-opacity"
            style={{ color: FOREST_DARK }}
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}