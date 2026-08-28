import React from 'react';
export default function Footer() {
  return (
    <footer className="border-t border-rule bg-card mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 text-center space-y-1">
        <p className="font-mono text-xs text-ink/60">Created By: Sahas Maruti Gawade</p>
        <p className="font-mono text-xs text-ink/60">
          LinkedIn Profile: <a href="https://linkedin.com/in/sahasmarutigawade" target="_blank" rel="noopener noreferrer" className="text-forestDark hover:underline">Click Here</a>
        </p>
        <p className="font-mono text-xs text-ink/60">Present Hoon Sir</p>
      </div>
    </footer>
  );
}