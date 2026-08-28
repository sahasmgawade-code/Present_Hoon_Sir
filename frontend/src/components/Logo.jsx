import React from 'react';
export function LogoMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Present Hoon Sir! logo"
    >
      <rect x="0" y="0" width="140" height="140" rx="28" fill="#234F38" />
      <rect x="16" y="16" width="9" height="9" rx="1.5" fill="#B8842E" />
      <rect x="30" y="16" width="9" height="9" rx="1.5" fill="#B8842E" />
      <rect x="16" y="30" width="9" height="9" rx="1.5" fill="#B8842E" />
      <path
        d="M24 80 L52 108 L118 34"
        fill="none"
        stroke="#EFEEE6"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export default function Logo({ iconSize = 40, textSize = 'text-2xl', showTagline = false, showSubtitle = true }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={iconSize} />
      {showSubtitle ? (
        <div className="flex flex-col leading-none whitespace-nowrap">
          <span className={`font-display font-600 text-forestDark ${textSize} whitespace-nowrap leading-none`}>
            Present Hoon Sir!
          </span>
          <span className="font-mono text-[10px] tracking-widest text-brick uppercase mt-1 whitespace-nowrap">
            PHS-AMS
          </span>
          {showTagline && (
            <span className="font-mono text-[10px] text-ink/40 mt-1">sign the register</span>
          )}
        </div>
      ) : (
        <span className={`font-display font-600 text-forestDark ${textSize} whitespace-nowrap leading-none`}>
          Present Hoon Sir!
        </span>
      )}
    </div>
  );
}