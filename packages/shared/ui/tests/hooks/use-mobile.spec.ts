import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile, MOBILE_BREAKPOINT } from '../../src/hooks/use-mobile';

describe('useMobile hook', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let changeHandlers: Array<(e: MediaQueryListEvent) => void> = [];

  const createMockMatchMedia = (matches: boolean) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          changeHandlers.push(handler);
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    changeHandlers = [];
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe('MOBILE_BREAKPOINT constant', () => {
    it('should export MOBILE_BREAKPOINT as 768', () => {
      expect(MOBILE_BREAKPOINT).toBe(768);
    });
  });

  describe('initial value', () => {
    it('should return true when viewport is below mobile breakpoint', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useMobile());

      expect(result.current).toBe(true);
    });

    it('should return false when viewport is above mobile breakpoint', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useMobile());

      expect(result.current).toBe(false);
    });
  });

  describe('media query', () => {
    it('should use correct media query with mobile breakpoint', () => {
      const mockMatchMedia = createMockMatchMedia(false);
      window.matchMedia = mockMatchMedia;

      renderHook(() => useMobile());

      expect(mockMatchMedia).toHaveBeenCalledWith(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    });
  });

  describe('change detection', () => {
    it('should update when viewport changes from desktop to mobile', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useMobile());
      expect(result.current).toBe(false);

      // Simulate viewport change to mobile
      act(() => {
        changeHandlers.forEach((handler) => {
          handler({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current).toBe(true);
    });

    it('should update when viewport changes from mobile to desktop', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useMobile());
      expect(result.current).toBe(true);

      // Simulate viewport change to desktop
      act(() => {
        changeHandlers.forEach((handler) => {
          handler({ matches: false } as MediaQueryListEvent);
        });
      });

      expect(result.current).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListener = vi.fn();
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener,
        dispatchEvent: vi.fn(),
      }));

      const { unmount } = renderHook(() => useMobile());

      unmount();

      expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
