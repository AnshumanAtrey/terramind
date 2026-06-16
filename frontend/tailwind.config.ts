import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Command-center palette
        void: '#070a0f',
        panel: '#0d131c',
        'panel-2': '#111a26',
        edge: '#1c2836',
        'edge-2': '#27384b',
        ink: '#e6f0f5',
        'ink-dim': '#8aa0b2',
        'ink-faint': '#52647a',
        cyan: {
          DEFAULT: '#22d3ee',
          glow: '#67e8f9',
        },
        signal: '#34d399', // ok / online
        warn: '#fbbf24', // caution
        threat: '#f43f5e', // hostile / alert
        intercept: '#a78bfa', // interceptor purple
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 12px rgba(34, 211, 238, 0.35)',
        'glow-threat': '0 0 14px rgba(244, 63, 94, 0.45)',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.6)', opacity: '0.9' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        scrollIn: {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 1.8s ease-out infinite',
        sweep: 'sweep 4s linear infinite',
        flicker: 'flicker 1.4s ease-in-out infinite',
        scrollIn: 'scrollIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
