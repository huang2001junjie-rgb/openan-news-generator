import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2450B4', deep: '#1A3A8F', bright: '#3568D4' },
        paper: { DEFAULT: '#F7F6F2', warm: '#F0EEE8' },
        ink: { DEFAULT: '#1C1B1A', muted: '#6B675F' },
        ok: '#1E9E62',
        danger: '#D64545',
        amber: '#E8A13A',
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,27,26,0.04), 0 4px 16px rgba(28,27,26,0.06)',
        lift: '0 4px 8px rgba(28,27,26,0.06), 0 12px 32px rgba(28,27,26,0.12)',
      },
    },
  },
  plugins: [animate],
}
