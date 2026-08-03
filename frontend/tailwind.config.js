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
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
