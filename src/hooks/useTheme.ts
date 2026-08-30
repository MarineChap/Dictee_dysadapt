import { useCallback, useEffect, useState } from 'react';
import { THEME_KEY } from '@/lib/storage';

type Theme = 'light' | 'dark';

function prefersDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* private mode */
  }
  return prefersDark() ? 'dark' : 'light';
}

/**
 * Replaces next-themes (DysAdapt) with the ~30 lines we actually need: the
 * `.dark` class strategy, a localStorage memory, and no hydration flash — the
 * class is already set by the inline script in index.html.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme: setThemeState, toggleTheme };
}
