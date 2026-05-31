/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Themed tokens — resolved from CSS custom properties so a single
        // .light class on <html> swaps the entire palette without touching components.
        // None of these are used with Tailwind opacity modifiers (bg-bg-base/50),
        // so plain CSS variables work fine here.
        'bg-base':    'var(--color-bg-base)',
        'bg-surface': 'var(--color-bg-surface)',
        'bg-hover':   'var(--color-bg-hover)',
        'border-col': 'var(--color-border-col)',
        'text-pri':   'var(--color-text-pri)',
        'text-sec':   'var(--color-text-sec)',
        'text-faint': 'var(--color-text-faint)',
        // Semantic colours — same in both themes, kept as static hex values so
        // opacity modifiers (bg-accent/10, bg-danger/5, etc.) keep working.
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
        fadeIn:  { from: { opacity: '0' },                                to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateY(-4px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
