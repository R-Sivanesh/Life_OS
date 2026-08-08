/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#040914',
        surface: '#0B132B',
        surfaceHighlight: '#1A2A50',
        border: '#1E3A8A',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          hover: '#0891B2',
        },
        accent: {
          DEFAULT: '#10b981',
          hover: '#059669',
        },
        danger: {
          DEFAULT: '#f43f5e',
          hover: '#e11d48',
        },
        warning: {
          DEFAULT: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(59, 130, 246, 0.35)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
