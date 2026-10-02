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
        longevity: {
          bg: "#0B0F17",
          card: "#131B29",
          border: "#1F2B3E",
          emerald: "#10B981",
          cyan: "#06B6D4",
          violet: "#8B5CF6",
          rose: "#F43F5E",
          amber: "#F59E0B",
        }
      },
      fontSize: {
        metric: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      borderRadius: {
        'radius-sm': '0.5rem',     // 8px - Badges, chips, tags
        'radius-md': '0.75rem',    // 12px - Inputs, buttons, controls
        'radius-lg': '1.25rem',    // 20px - Cards, panels, widgets
        'radius-xl': '1.5rem',     // 24px - Sections, modals, dialogs
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'dialog': '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'elevation-2': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'elevation-3': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
