/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paynex: {
          gold: '#f59e0b',
          amber: '#fbbf24',
          darkGold: '#d97706',
          cyan: '#06b6d4',
          sky: '#38bdf8',
          emerald: '#10b981',
          crimson: '#ef4444',
          bg: '#0b0e14',
          sidebar: '#0d111a',
          surface: '#121722',
          surfaceHover: '#171d2b',
          border: '#1a2233',
          borderSubtle: '#1e2638',
        },
      },
      borderRadius: {
        none: '0px',
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
