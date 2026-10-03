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
        },
        surface: {
          canvas: 'var(--surface-canvas)',
          panel: 'var(--surface-panel)',
          card: 'var(--surface-card)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
          danger: 'var(--border-danger)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
        },
        data: {
          observed: 'var(--data-observed)',
          derived: 'var(--data-derived)',
          model: 'var(--data-model)',
          inference: 'var(--data-inference)',
          reference: 'var(--data-reference)',
        },
      },
      fontSize: {
        metric: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      borderRadius: {
        'surface-xs': '0.5rem',    // 8px - Badges, chips, tags
        'surface-sm': '0.75rem',   // 12px - Inputs, botões, controles
        'surface-md': '1rem',      // 16px - Cards, painéis, widgets
        'surface-lg': '1rem',      // 16px - Diálogos, modais, drawers
        'dialog': '1rem',          // 16px - Diálogos, modais (Surface 4)
        'pill': '9999px',          // 9999px - Pílulas, avatares
        'radius-sm': '0.5rem',     // 8px - Alias semântico para surface-xs
        'radius-md': '0.75rem',    // 12px - Alias semântico para surface-sm
        'radius-lg': '1rem',       // 16px - Alias semântico para surface-md
        'radius-xl': '1rem',       // 16px - Alias semântico para surface-lg
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'dialog': '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'elevation-2': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'elevation-3': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      zIndex: {
        'base': '0',
        'sticky': '20',
        'dropdown': '30',
        'drawer': '40',
        'modal': '50',
        'confirm': '60',
        'toast': '70',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
