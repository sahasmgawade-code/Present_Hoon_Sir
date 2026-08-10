/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        rule: 'rgb(var(--color-rule) / <alpha-value>)',
        forest: 'rgb(var(--color-forest) / <alpha-value>)',
        forestDark: 'rgb(var(--color-forest-dark) / <alpha-value>)',
        brick: 'rgb(var(--color-brick) / <alpha-value>)',
        brickDark: 'rgb(var(--color-brick-dark) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        forestGlass: 'rgba(35, 79, 56, 0.88)',
        brickGlass: 'rgba(126, 50, 34, 0.88)',
        amberGlass: 'rgba(140, 100, 35, 0.88)',
        aero: '#3A8DA8',
        aeroDark: '#02151c',
        tooltip: '#234F38',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'ruled': 'repeating-linear-gradient(transparent, transparent 27px, #bbc9ca 28px)',
      },
    },
  },
  plugins: [],
};