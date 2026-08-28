import React from 'react';
export default function AttendancePie({ percentage, size = 120 }) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const dash = (clamped / 100) * circumference;
  const color = clamped < 75 ? 'rgb(var(--color-brick))' : 'rgb(var(--color-forest))';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(var(--color-rule))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-display"
        fontSize={size * 0.2}
        fontWeight="600"
        fill="rgb(var(--color-ink))"
      >
        {clamped}%
      </text>
    </svg>
  );
}