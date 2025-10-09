/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Node-RED inspired color scheme
        nodered: {
          // Primary reds (Node-RED signature colors)
          red: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#f87171',
            500: '#c22e2e', // Main Node-RED red
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
          },
          // Grays (Node-RED UI backgrounds)
          gray: {
            50: '#f9fafb',
            100: '#f3f4f6', // Light panel background
            150: '#eeeff1', // Slightly darker for contrast
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827', // Dark header
            950: '#0d1117', // Darkest
          },
          // Blue accents
          blue: {
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
          },
          // Success/active states
          green: {
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
          },
          // Warning states
          yellow: {
            400: '#facc15',
            500: '#eab308',
          }
        }
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      spacing: {
        '1': '4px',    // Node-RED base spacing
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '88': '22rem',
        '112': '28rem', // Sidebar width
      },
      borderRadius: {
        'nr': '3px',      // Node-RED standard radius
        'nr-lg': '5px',   // Larger elements
      },
      boxShadow: {
        'nr': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'nr-lg': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        'nr-xl': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
      },
      fontSize: {
        'nr-xs': ['11px', '14px'],
        'nr-sm': ['12px', '16px'],
        'nr-base': ['13px', '18px'],
        'nr-lg': ['14px', '20px'],
      },
      maxWidth: {
        'dashboard': '1400px',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backgroundImage: {
        'nr-grid': 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '20px 20px',
      }
    },
  },
  plugins: [],
}