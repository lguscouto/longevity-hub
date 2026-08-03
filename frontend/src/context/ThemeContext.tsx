import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'longevity-hub-theme';

export interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSanitizedInitialTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') {
      return 'light';
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemePreference>(getSanitizedInitialTheme);

  const applyThemeToDOM = (selectedTheme: ThemePreference) => {
    const root = document.documentElement;
    if (selectedTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemePreference) => {
    const validTheme: ThemePreference = newTheme === 'light' ? 'light' : 'dark';
    setThemeState(validTheme);
    applyThemeToDOM(validTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    } catch {
      // Ignore localStorage write errors
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
