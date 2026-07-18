import type { Config } from 'tailwindcss';

// All theme colors resolve through CSS variables defined in globals.css.
// The default (:root) palette is the light marketing theme; the logged-in
// portals opt back into the original dark palette via the `.theme-dark` class.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--contrast-rgb) / <alpha-value>)',
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
        },
        gleam: {
          DEFAULT: 'rgb(var(--gleam) / <alpha-value>)',
          50: 'rgb(var(--gleam-50) / <alpha-value>)',
          100: 'rgb(var(--gleam-100) / <alpha-value>)',
          300: 'rgb(var(--gleam-300) / <alpha-value>)',
          500: 'rgb(var(--gleam) / <alpha-value>)',
          600: 'rgb(var(--gleam-600) / <alpha-value>)',
          700: 'rgb(var(--gleam-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
      },
      backgroundImage: {
        'glass': 'var(--glass-gradient)',
        'gleam-fade': 'var(--gleam-fade)',
      },
      animation: {
        'shine': 'shine 2.4s linear infinite',
        'fade-up': 'fadeUp .5s cubic-bezier(.2,.8,.2,1) both',
      },
      keyframes: {
        shine: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
