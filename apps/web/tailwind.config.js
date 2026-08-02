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
      },
      animation: { shake: 'shake 180ms linear' },
    },
  },
  plugins: [],
};
