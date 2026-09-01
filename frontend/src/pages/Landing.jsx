import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import Footer from '../components/Footer.jsx';
import ContactModal from '../components/ContactModal.jsx';

const navLinks = [
  { label: 'Overview', href: '#overview' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

const coreFeatures = [
  {
    tag: '01',
    title: 'QR Attendance',
    desc: 'Generate a unique, time-bound QR code per batch or lecture. Students scan with any phone camera — attendance logs instantly, no app install needed.',
  },
  {
    tag: '02',
    title: 'Reports (Excel & PDF)',
    desc: 'Pull attendance and performance reports by batch, date range, or student, and export to Excel or PDF in one click for records and audits.',
  },
  {
    tag: '03',
    title: 'Email & SMS Updates',
    desc: 'Automatically notify parents and students about attendance, assignments, and announcements via email and SMS — no manual follow-up required.',
  },
  {
    tag: '04',
    title: 'Admin / Faculty / Student Portals',
    desc: 'Separate, role-based dashboards for admins, faculty, and students, each with the exact tools and visibility they need — nothing more, nothing less.',
  },
  {
    tag: '05',
    title: 'Assignment Submission',
    desc: 'Faculty post assignments with deadlines, students submit directly through their portal, and submissions are tracked and graded in one place.',
  },
];

const audience = [
  {
    title: 'College & university admins',
    desc: 'Manage multiple batches, admins, and departments from a single dashboard.',
  },
  {
    title: 'Faculty & lecturers',
    desc: 'Take attendance, post assignments, and message parents — all from one portal.',
  },
  {
    title: 'Students',
    desc: 'Scan to mark attendance, submit assignments, and stay updated automatically.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Create a batch, generate a QR',
    desc: 'Set up a batch for the class or lecture and generate a fresh, time-bound QR code.',
  },
  {
    n: '02',
    title: 'Students scan & submit',
    desc: 'Students scan to check in, submit assignments, and receive email/SMS updates automatically.',
  },
  {
    n: '03',
    title: 'Review, edit & export',
    desc: 'Admins and faculty review records and export attendance/performance reports to Excel or PDF.',
  },
];

// ---- Pricing plans ----
const plans = [
  {
    name: 'Basic',
    price: 1000,
    highlight: false,
    features: {
      qr: true,
      reports: true,
      email: false,
      sms: false,
      portals: true,
      assignments: true,
    },
  },
  {
    name: 'Email Updates',
    price: 1250,
    highlight: false,
    features: {
      qr: true,
      reports: true,
      email: true,
      sms: false,
      portals: true,
      assignments: true,
    },
  },
  {
    name: 'SMS Updates',
    price: 1250,
    highlight: false,
    features: {
      qr: true,
      reports: true,
      email: false,
      sms: true,
      portals: true,
      assignments: true,
    },
  },
  {
    name: 'Email & SMS',
    price: 1500,
    highlight: true,
    features: {
      qr: true,
      reports: true,
      email: true,
      sms: true,
      portals: true,
      assignments: true,
    },
  },
];

const pricingRows = [
  { key: 'qr', label: 'QR Attendance' },
  { key: 'reports', label: 'Reports (Excel & PDF)' },
  { key: 'email', label: 'Email Updates' },
  { key: 'sms', label: 'SMS Updates' },
  { key: 'portals', label: 'Admin / Faculty / Student Portals' },
  { key: 'assignments', label: 'Assignment Submission' },
];

const testimonials = [
  {
    quote: 'Roll call used to eat the first ten minutes of every lecture. Now it takes ten seconds.',
    name: 'Priya S.',
    role: 'Assistant Professor, Computer Science',
  },
  {
    quote: 'End-of-semester attendance reports used to take me a full afternoon. Now it is one export.',
    name: 'Rahul M.',
    role: 'Department Admin',
  },
  {
    quote: 'I scan to check in and submit assignments from the same portal. Everything is in one place.',
    name: 'Ananya K.',
    role: 'Final-year Student',
  },
];

const securityPoints = [
  {
    title: 'Encrypted in transit',
    desc: 'All data between the app and our servers travels over HTTPS/TLS, the same standard banks use.',
  },
  {
    title: 'Role-based access',
    desc: 'Students only see their own records. Faculty only see their batches. Admins control who sees what.',
  },
  {
    title: 'We never sell your data',
    desc: 'Attendance and student records are never shared with or sold to third parties, ever.',
  },
  {
    title: 'You own your data',
    desc: 'Export everything to Excel/PDF anytime, and request full deletion if you ever choose to leave.',
  },
];

const screenshots = [
  {
    src: '/screenshots/qr-scan.png',
    alt: 'Student scanning QR code to mark attendance',
    caption: 'Scan to check in',
  },
  {
    src: '/screenshots/admin-dashboard.png',
    alt: 'Admin dashboard showing batches and attendance overview',
    caption: 'Admin dashboard',
  },
  {
    src: '/screenshots/report-export.png',
    alt: 'Attendance report being exported to Excel and PDF',
    caption: 'One-click report export',
  },
];

const faqs = [
  {
    q: 'Does it work without internet?',
    a: 'Students need a brief internet connection only at the moment of scanning to log attendance. If connectivity drops mid-class, faculty can still mark attendance manually and it syncs once the connection is back.',
  },
  {
    q: "What if a student doesn't have a smartphone?",
    a: 'Faculty can mark that student present or absent manually from their portal — the QR flow is a convenience, not a requirement, so no one is excluded from the attendance record.',
  },
  {
    q: 'Is our data secure?',
    a: 'Yes. All traffic is encrypted in transit, access is role-based by Admin/Faculty/Student, and we never sell or share student data with third parties. See the "Your data stays yours" section above for details.',
  },
  {
    q: 'Can we cancel anytime?',
    a: 'Yes, there is no lock-in contract. You can cancel your plan anytime, and you can export all your attendance, report, and assignment data before you go.',
  },
];

function Check() {
  return <span className="text-forestDark font-600">✓</span>;
}
function Dash() {
  return <span className="text-ink/30">—</span>;
}

export default function Landing() {
  const { admin } = useAuth();
  const [showContact, setShowContact] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  if (admin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-transparent">
      {/* ---- Nav bar ---- */}
      <header className="border-b border-rule bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo iconSize={32} textSize="text-base" showSubtitle={false} />
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              
               <a key={l.label}
                href={l.href}
                className="text-sm font-medium text-ink/70 hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
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

      {/* ---- Hero / Overview ---- */}
      <section id="overview" className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-brick mb-4">
          Built for colleges &amp; universities
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-700 text-ink leading-tight mb-6">
          One platform for attendance,<br className="hidden sm:block" /> reports, updates & assignments.
        </h1>
        <p className="text-lg text-ink/70 max-w-2xl mx-auto mb-10">
          Present Hoon Sir! (PHS-AMS) replaces manual roll calls and scattered spreadsheets with a
          single system — QR attendance, Excel/PDF reports, automated email & SMS updates, separate
          Admin/Faculty/Student portals, and assignment submission, all in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <Link
            to="/login"
            className="px-6 py-3 glass-btn bg-forestGlass text-white rounded font-medium hover:bg-forestGlass/70 transition-colors"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="px-6 py-3 glass-btn border border-forest rounded font-medium text-forestDark hover:bg-forestGlass hover:text-white transition-colors"
          >
            Book a Demo
          </button>
          
            <a href="#how-it-works"
            className="px-6 py-3 rounded font-medium text-ink/70 hover:text-ink transition-colors"
          >
            See how it works
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['QR Attendance', 'Excel & PDF Reports', 'Email & SMS Updates', 'Separate Portals', 'Assignment Submission'].map(
            (chip) => (
              <span key={chip}
                className="font-mono text-xs px-3 py-1.5 rounded-full border border-rule bg-card text-ink/70"
              >
                {chip}
              </span>
            )
          )}
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          From empty classroom to logged, reported & updated
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">three steps, zero guesswork</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="bg-card border border-rule rounded-lg p-6">
              <p className="font-mono text-xs text-brick tracking-widest mb-3">STEP {s.n}</p>
              <h3 className="font-display text-lg font-600 text-forestDark mb-2">{s.title}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          Everything your institution needs
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          five core features, built for higher education
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((f) => (
            <div key={f.title} className="bg-card border border-rule rounded-lg p-6">
              <p className="font-mono text-xs text-brick tracking-widest mb-3">{f.tag}</p>
              <h3 className="font-display text-lg font-600 text-forestDark mb-2">{f.title}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Screenshots ---- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          See it in action
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          a quick look at the actual product
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {screenshots.map((s) => (
            <div key={s.src} className="bg-card border border-rule rounded-lg overflow-hidden">
              <img src={s.src} alt={s.alt} className="w-full h-48 object-cover object-top" />
              <p className="font-mono text-xs text-ink/60 text-center py-3">{s.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Audience ---- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-12">
          Made for higher education
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {audience.map((a) => (
            <div key={a.title} className="text-center px-4">
              <h3 className="font-display text-lg font-600 text-forestDark mb-2">{a.title}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Security / Data Privacy ---- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          Your data stays yours
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          built with student data privacy as a first-class concern
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityPoints.map((s) => (
            <div key={s.title} className="bg-card border border-rule rounded-lg p-6">
              <h3 className="font-display text-base font-600 text-forestDark mb-2">{s.title}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          Simple, transparent pricing
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          choose the plan that fits your institution
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left p-4 border border-rule bg-card font-display text-sm font-600 text-ink/70">
                  Plan
                </th>
                {plans.map((p) => (
                  <th
                    key={p.name}
                    className={`p-4 border border-rule text-center font-display ${
                      p.highlight ? 'bg-forestGlass text-white' : 'bg-card text-ink'
                    }`}
                  >
                    <div className="text-base font-600">{p.name}</div>
                    <div className={`text-2xl font-700 mt-1 ${p.highlight ? 'text-white' : 'text-forestDark'}`}>
                      ₹{p.price.toLocaleString('en-IN')}
                    </div>
                    <div className={`font-mono text-[11px] mt-1 ${p.highlight ? 'text-white/70' : 'text-ink/50'}`}>
                      per month
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? 'bg-card' : 'bg-transparent'}>
                  <td className="p-4 border border-rule text-sm font-medium text-ink/80">{row.label}</td>
                  {plans.map((p) => (
                    <td key={p.name + row.key} className="p-4 border border-rule text-center">
                      {p.features[row.key] ? <Check /> : <Dash />}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-4 border border-rule"></td>
                {plans.map((p) => (
                  <td key={p.name + '-cta'} className="p-4 border border-rule text-center">
                    <button
                      type="button"
                      onClick={() => setShowContact(true)}
                      className={`inline-block px-4 py-2 rounded text-sm font-medium glass-btn transition-colors ${
                        p.highlight
                          ? 'bg-forestGlass text-white hover:bg-forestGlass/70'
                          : 'border border-forest text-forestDark hover:bg-forestGlass hover:text-white'
                      }`}
                    >
                      Choose {p.name}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Testimonials ---- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          What faculty and students say
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          real feedback from PHS-AMS classrooms
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-card border border-rule rounded-lg p-6 flex flex-col">
              <p className="text-sm text-ink/80 leading-relaxed italic mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-auto pt-4 border-t border-rule">
                <p className="font-display text-sm font-600 text-ink">{t.name}</p>
                <p className="font-mono text-xs text-ink/60">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink text-center mb-2">
          Frequently asked questions
        </h2>
        <p className="text-center text-ink/60 mb-12 font-mono text-sm">
          still deciding? here&apos;s what most admins ask first
        </p>
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={f.q} className="bg-card border border-rule rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="font-display text-base font-600 text-ink">{f.q}</span>
                  <span className="text-forestDark text-lg leading-none shrink-0">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-ink/70 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center border-t border-rule">
        <h2 className="font-display text-3xl font-600 text-ink mb-4">
          Ready to digitize your institution?
        </h2>
        <p className="text-ink/70 mb-8">
          Sign in as an admin to create your first batch and generate a QR code.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/login"
            className="inline-block px-6 py-3 glass-btn bg-forestGlass text-white rounded font-medium hover:bg-forestGlass/70 transition-colors"
          >
            Admin Login
          </Link>
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="inline-block px-6 py-3 glass-btn border border-forest rounded font-medium text-forestDark hover:bg-forestGlass hover:text-white transition-colors"
          >
            Book a Demo
          </button>
        </div>
      </section>

      <Footer />
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </div>
  );
}