import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Dark mode support', () => {
  beforeEach(() => {
    // Reset document state before each test
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  describe('class-based dark mode toggle', () => {
    it('should allow adding dark class to html element', () => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      document.documentElement.classList.add('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should allow removing dark class from html element', () => {
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      document.documentElement.classList.remove('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should toggle dark class on html element', () => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      document.documentElement.classList.toggle('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      document.documentElement.classList.toggle('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('system preference detection (prefers-color-scheme)', () => {
    it('should detect light mode preference', () => {
      // Mock matchMedia for light mode
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      vi.stubGlobal('matchMedia', mockMatchMedia);

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

      expect(prefersDark).toBe(false);
      expect(prefersLight).toBe(true);
    });

    it('should detect dark mode preference', () => {
      // Mock matchMedia for dark mode
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      vi.stubGlobal('matchMedia', mockMatchMedia);

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      expect(prefersDark).toBe(true);
    });

    it('should apply dark class based on system preference', () => {
      // Mock matchMedia for dark mode preference
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      vi.stubGlobal('matchMedia', mockMatchMedia);

      // Simulate applying system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should support change event listener for preference changes', () => {
      const changeHandler = vi.fn();
      let storedCallback: ((e: MediaQueryListEvent) => void) | null = null;

      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            storedCallback = callback;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      vi.stubGlobal('matchMedia', mockMatchMedia);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', changeHandler);

      // Simulate preference change
      if (storedCallback) {
        storedCallback({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
      }

      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('theme utility helper (usage documentation)', () => {
    it('should demonstrate correct dark mode toggle pattern', () => {
      // This test documents the correct usage pattern for consumers

      // 1. Check current state
      const isDark = document.documentElement.classList.contains('dark');
      expect(isDark).toBe(false);

      // 2. Enable dark mode
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // 3. Disable dark mode
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should demonstrate system preference initialization pattern', () => {
      // Mock system preference for dark mode
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      vi.stubGlobal('matchMedia', mockMatchMedia);

      // Pattern: Initialize theme based on system preference
      const initializeTheme = () => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return prefersDark;
      };

      const result = initializeTheme();

      expect(result).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
