import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import Footer from '../components/Footer.jsx';
import ContactModal from '../components/ContactModal.jsx';
const features = [
  {
    title: 'Generate QR codes per batch',
    desc: 'Create a batch for each class, section, or lecture and generate a unique, time-bound QR code in seconds.',
  },
  {
    title: 'Students scan to check in',
    desc: 'No app install needed — students scan with any phone camera and their attendance is logged instantly.',
  },
  {
    title: 'Edit & correct attendance',
    desc: 'Admins can review and edit attendance records after the fact, so a missed scan never becomes a missed mark.',
  },
  {
    title: 'Instant reports & export',
    desc: 'Pull attendance reports by batch or date range and export to CSV/Excel for university records in one click.',
  },
];
const audience = [
  {
    title: 'College & university admins',
    desc: 'Manage multiple batches, admins, and departments from a single dashboard.',
  },
  {
    title: 'Faculty & lecturers',
    desc: 'Take attendance for large lecture halls in under a minute — no roll call needed.',
  },
  {
    title: 'Students',
    desc: 'Mark your own attendance by scanning a QR code at the start of class, from your own phone.',
  },
];
export default function Landing() {
  const { admin } = useAuth();
  const [showContact, setShowContact] = useState(false);
  if (admin) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="border-b border-rule bg-card">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo iconSize={32} textSize="text-base" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowContact(true)}
              className="glass-btn px-4 py-1.5 text-sm font-medium rounded border border-rule text-ink/70 hover:text-ink transition-colors"
            >
              Contact Us
            </button>
            <Link
              to="/login"
              className="glass-btn px-4 py-1.5 text-sm font-medium rounded border border-forest text-forestDark hover:bg-forestGlass hover:text-white transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-brick mb-4">
          Built for colleges &amp; universities
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-700 text-ink leading-tight mb-6">
          QR code attendance,<br className="hidden sm:block" /> without the paper register
        </h1>
        <p className="text-lg text-ink/70 max-w-2xl mx-auto mb-10">
          Present Hoon Sir! (PHS-AMS) replaces manual roll calls with a simple scan. Generate a QR
          code for any class or lecture, let students scan it with their
          phone, and get attendance reports instantly — built specifically
          for higher-education institutions.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 glass-btn bg-forestGlass text-white rounded font-medium hover:bg-forestGlass/70 transition-colors"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="px-6 py-3 rounded font-medium text-ink/70 hover:text-ink transition-colors"
          >
            See how it works
          </a>
        </div>
      </section>
      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          Everything a class needs to take attendance
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          from batch creation to exportable reports
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card border border-rule rounded-lg p-6">
              <h3 className="font-display text-xl font-600 text-forestDark mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-ink/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* Who it's for */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-12">
          Made for higher education
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {audience.map((a) => (
            <div key={a.title} className="text-center px-4">
              <h3 className="font-display text-lg font-600 text-forestDark mb-2">
                {a.title}
              </h3>
              <p className="text-sm text-ink/70 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink mb-4">
          Ready to digitize your attendance register?
        </h2>
        <p className="text-ink/70 mb-8">
          Sign in as an admin to create your first batch and generate a QR code.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 glass-btn bg-forestGlass text-white rounded font-medium hover:bg-forestGlass/70 transition-colors"
        >
          Admin Login
        </Link>
      </section>
      <Footer />
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </div>
  );
}
