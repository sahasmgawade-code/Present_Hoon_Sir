import React, { useState } from 'react';
import { api } from '../api/client.js';
export default function ContactModal({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await api.submitContact(form);
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center z-50 px-4 py-10 overflow-y-auto">
      <div className="bg-card rounded-lg border border-rule max-w-md w-full h-fit p-6 relative mt-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink/50 hover:text-ink text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
        {status === 'success' ? (
          <div className="text-center py-6">
            <h3 className="font-display text-xl font-600 text-forestDark mb-2">
              Thank you for contacting our team.
            </h3>
            <p className="text-ink/70 text-sm">
              Our team will contact you as soon as possible!!
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2 glass-btn bg-forestGlass text-white rounded font-medium hover:bg-forestGlass/70 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="font-display text-xl font-600 text-ink mb-4">Contact Us</h3>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full border border-rule rounded px-3 py-2 text-sm bg-transparent"
              />
              <input
                type="email"
                name="email"
                placeholder="Email ID"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full border border-rule rounded px-3 py-2 text-sm bg-transparent"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                required
                value={form.phone}
                onChange={handleChange}
                className="w-full border border-rule rounded px-3 py-2 text-sm bg-transparent"
              />
              <input
                type="text"
                name="organization"
                placeholder="Organization Name"
                value={form.organization}
                onChange={handleChange}
                className="w-full border border-rule rounded px-3 py-2 text-sm bg-transparent"
              />
              <textarea
                name="message"
                placeholder="Additional message"
                rows={4}
                value={form.message}
                onChange={handleChange}
                className="w-full border border-rule rounded px-3 py-2 text-sm bg-transparent resize-none"
              />
            </div>
            {status === 'error' && (
              <p className="text-red-600 text-sm mt-3">{error}</p>
            )}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full mt-4 px-5 py-2 glass-btn bg-forestGlass text-white rounded font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}