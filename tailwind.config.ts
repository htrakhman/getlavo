import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0B0D',
          900: '#0F1115',
          800: '#15181D',
          700: '#1C2027',
          600: '#262B34',
          500: '#3A4150',
          400: '#5A6478',
          300: '#8A93A6',
          200: '#B8C0D0',
          100: '#E4E8F0',
        },
        gleam: {
          DEFAULT: '#19F0D8',
          50: '#E6FFFD',
          100: '#B8FFF7',
          300: '#5BF6E2',
          500: '#19F0D8',
          600: '#0FCDB8',
          700: '#0AA396',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(25,240,216,0.25), 0 8px 40px -8px rgba(25,240,216,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 48px -24px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'glass': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        'gleam-fade': 'radial-gradient(60% 50% at 50% 0%, rgba(25,240,216,0.18) 0%, rgba(25,240,216,0) 70%)',
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
