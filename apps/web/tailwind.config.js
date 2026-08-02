/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#06080B',
        panel: '#0E1219',
        line: '#1B2430',
        ink: '#C6D2E0',
        muted: '#6B7A8D',
        phosphor: '#F0A831',
        safe: '#3FD0C9',
        threat: '#FF4155',
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'ui-sans-serif', 'system-ui'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'skull-pulse': {
          '0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        'skull-corrupt': {
          '0%, 100%': { opacity: '0.9' },
          '20%': { opacity: '0.4' },
          '40%': { opacity: '1' },
          '60%': { opacity: '0.3' },
          '80%': { opacity: '0.95' },
        },
      },
      animation: {
        shake: 'shake 180ms linear',
        'skull-pulse': 'skull-pulse 2.4s ease-in-out infinite',
        'skull-corrupt': 'skull-corrupt 0.4s steps(2, jump-none) infinite',
      },
    },
  },
  plugins: [],
};
