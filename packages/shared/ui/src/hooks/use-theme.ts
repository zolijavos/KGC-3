import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'kgc-ui-theme';

/**
 * Get the system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document
 */
function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Get stored theme preference from localStorage
 */
function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Store theme preference to localStorage
 */
function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage not available
  }
}

export interface UseThemeReturn {
  /** Current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** Resolved theme after applying system preference ('light' or 'dark') */
  resolvedTheme: ResolvedTheme;
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** System preference value */
  systemTheme: ResolvedTheme;
}

/**
 * React hook for managing light/dark theme with system preference detection.
 *
 * @example
 * ```tsx
 * import { useTheme } from '@kgc/ui';
 *
 * function ThemeToggle() {
 *   const { theme, setTheme, resolvedTheme } = useTheme();
 *
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *       <option value="system">System</option>
 *     </select>
 *   );
 * }
 * ```
 *
 * Features:
 * - Detects system preference via `prefers-color-scheme` media query
 * - Persists user preference to localStorage
 * - Listens for system preference changes
 * - Applies 'dark' class to `<html>` element
 *
 * @param defaultTheme - Default theme if no stored preference (default: 'system')
 */
export function useTheme(defaultTheme: Theme = 'system'): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() ?? defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    return getSystemTheme();
  });

  // Resolve the actual theme to apply
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  // Apply theme to document when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemTheme,
  };
}

/**
 * Initialize theme on page load (for SSR/non-React usage).
 * Call this in your app's entry point before React hydration
 * to prevent flash of incorrect theme.
 *
 * @example
 * ```html
 * <script>
 *   // In your HTML head or before React
 *   (function() {
 *     const stored = localStorage.getItem('kgc-ui-theme');
 *     const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
 *     const isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
 *     if (isDark) document.documentElement.classList.add('dark');
 *   })();
 * </script>
 * ```
 */
export function initializeTheme(): ResolvedTheme {
  const stored = getStoredTheme();
  const systemTheme = getSystemTheme();

  let resolvedTheme: ResolvedTheme;
  if (stored === 'light' || stored === 'dark') {
    resolvedTheme = stored;
  } else {
    // stored is null or 'system'
    resolvedTheme = systemTheme;
  }

  applyTheme(resolvedTheme);
  return resolvedTheme;
}
