/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        // Enhanced Discord-inspired palette
        'discord': {
          'blurple': '#5865F2',
          'green': '#57F287',
          'yellow': '#FEE75C',
          'fuchsia': '#EB459E',
          'red': '#ED4245',
          'dark': '#2C2F33',
          'darker': '#23272A',
          'light': '#99AAB5',
          'lighter': '#FFFFFF'
        },
        // Modern theme colors
        'primary': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Light theme colors
        'light': {
          'bg': '#ffffff',
          'bg-secondary': '#f8fafc',
          'bg-tertiary': '#f1f5f9',
          'text': '#0f172a',
          'text-secondary': '#475569',
          'text-muted': '#64748b',
          'border': '#e2e8f0',
          'border-light': '#f1f5f9',
        },
        // Dark theme colors
        'dark': {
          'bg': '#0f172a',
          'bg-secondary': '#1e293b',
          'bg-tertiary': '#334155',
          'text': '#f8fafc',
          'text-secondary': '#cbd5e1',
          'text-muted': '#94a3b8',
          'border': '#334155',
          'border-light': '#475569',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      },
      boxShadow: {
        'soft': '0 2px 15px 0 rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 10px 30px 0 rgba(0, 0, 0, 0.1)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
} 