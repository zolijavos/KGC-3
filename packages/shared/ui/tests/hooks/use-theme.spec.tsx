import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, initializeTheme } from '../../src/hooks/use-theme';

describe('useTheme hook', () => {
  const originalLocalStorage = window.localStorage;
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    // Reset document state
    document.documentElement.classList.remove('dark');

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
        }),
      },
      writable: true,
    });

    // Clear mock storage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    // Reset matchMedia mock to light mode
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should default to system theme', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
    });

    it('should use stored theme from localStorage', () => {
      mockLocalStorage['kgc-ui-theme'] = 'dark';

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
    });

    it('should use defaultTheme when no stored preference', () => {
      const { result } = renderHook(() => useTheme('light'));

      expect(result.current.theme).toBe('light');
    });

    it('should detect system dark mode preference', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })));

      const { result } = renderHook(() => useTheme());

      expect(result.current.systemTheme).toBe('dark');
    });
  });

  describe('resolvedTheme', () => {
    it('should resolve system theme to light when system prefers light', () => {
      const { result } = renderHook(() => useTheme('system'));

      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should resolve system theme to dark when system prefers dark', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })));

      const { result } = renderHook(() => useTheme('system'));

      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should resolve explicit light theme', () => {
      mockLocalStorage['kgc-ui-theme'] = 'light';

      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should resolve explicit dark theme', () => {
      mockLocalStorage['kgc-ui-theme'] = 'dark';

      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should set theme to light', () => {
      mockLocalStorage['kgc-ui-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should set theme to system', () => {
      mockLocalStorage['kgc-ui-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
    });

    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith('kgc-ui-theme', 'dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      mockLocalStorage['kgc-ui-theme'] = 'light';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      mockLocalStorage['kgc-ui-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('DOM class application', () => {
    it('should add dark class when theme is dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is light', () => {
      document.documentElement.classList.add('dark');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});

describe('initializeTheme', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    document.documentElement.classList.remove('dark');

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('should apply stored dark theme', () => {
    mockLocalStorage['kgc-ui-theme'] = 'dark';

    const result = initializeTheme();

    expect(result).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should apply stored light theme', () => {
    mockLocalStorage['kgc-ui-theme'] = 'light';

    const result = initializeTheme();

    expect(result).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should apply system theme when no stored preference', () => {
    const result = initializeTheme();

    expect(result).toBe('light'); // system is light in mock
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should apply system dark theme when system prefers dark', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const result = initializeTheme();

    expect(result).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
