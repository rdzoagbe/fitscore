import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './types/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        accent: 'var(--accent)',
        violet: 'var(--accent-violet)',
        emerald: 'var(--accent-emerald)',
        amber: 'var(--accent-amber)',
        danger: 'var(--accent-red)',
        border: 'var(--border)'
      },
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)']
      }
    }
  },
  plugins: []
}

export default config
