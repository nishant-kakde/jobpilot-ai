/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#635BFF',
          700: '#5248E2',
          800: '#4338ca',
          900: '#3730a3',
          DEFAULT: '#635BFF',
          dark: '#8B7CFF',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8B7CFF',
          600: '#635BFF',
          700: '#5248E2',
          800: '#4338ca',
          900: '#3730a3',
          950: '#1e1b4b',
        },
        saas: {
          bg: '#F8FAFC',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E5E7EB',
          text: '#111827',
          muted: '#64748B',
          darkBg: '#0B1020',
          darkSidebar: '#111827',
          darkCard: '#151E30',
          darkCardHover: '#1B263D',
          darkBorder: '#1E293B',
          darkText: '#F9FAFB',
          darkMuted: '#94A3B8',
        },
        slate: {
          850: '#151E30',
          900: '#111827',
          950: '#0B1020',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -3px rgba(99, 91, 255, 0.25)',
        'glow-subtle': '0 0 15px -3px rgba(139, 124, 255, 0.15)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
