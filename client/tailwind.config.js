/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'brand-primary': {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
        },
        'status-success': '#10B981',
        'status-warning': '#F59E0B',
        'status-failed': '#EF4444',
        'status-duplicate': '#8B5CF6',
        surface: '#FFFFFF',
        'surface-dark': '#1A1A22',
        'app-bg': '#FAFAFA',
        'app-bg-dark': '#0F0F14',
        muted: '#6B7280',
      },
      keyframes: {
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'page-in': 'page-in 240ms ease-out',
      },
    },
  },
  plugins: [],
}
