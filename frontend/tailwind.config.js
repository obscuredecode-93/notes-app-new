/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens — dark palette
        'bg-base':    '#0F0F0F',
        'bg-surface': '#1A1A1A',
        'bg-hover':   '#222222',
        'border-col': '#2A2A2A',
        'text-pri':   '#F5F5F5',
        'text-sec':   '#888888',
        'text-faint': '#555555',
        accent:       '#6366F1',
        'accent-dim': '#4F52D4',
        success:      '#22C55E',
        danger:       '#EF4444',
        warning:      '#F59E0B',
      },
      fontFamily: {
        sans:  ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateY(-4px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
