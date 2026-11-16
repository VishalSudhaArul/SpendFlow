import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme.js';

const STORAGE_KEY = 'spendflow-theme';

function readInitialTheme() {
  // index.html already applied the theme before paint; read it back from the DOM.
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Applies the theme to <html> synchronously. This must happen before React
 * re-renders, because charts read the CSS color variables during render.
 */
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#060912' : '#f4f6fb');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  const setTheme = useCallback((next) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  }, [setTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode); the theme still works for this visit.
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
