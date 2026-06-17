import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter','system-ui','sans-serif'],
        display: ['Syne','sans-serif']
      },
      colors: {
        bg: '#0b0b12',
        surface: '#13131f',
        muted: '#1e1e2a',
        border: '#2a2a3a',
        neon: '#00F5FF',
        fuchsia: '#FF007F',
        violet: '#7c3aed',
        fore: '#f8fafc'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        glow: { '0%,100%': { boxShadow: '0 0 8px #00F5FF' }, '50%': { boxShadow: '0 0 24px #00F5FF' } },
        chain: { '0%': { strokeDashoffset: '1000' }, '100%': { strokeDashoffset: '0' } }
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease forwards',
        slideUp: 'slideUp 0.5s ease forwards',
        pulse2: 'pulse2 2s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        chain: 'chain 2s linear infinite'
      }
    }
  },
  plugins: []
};
export default config;
