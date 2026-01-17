import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt, type BeforeInstallPromptEvent } from '../../src/hooks/use-install-prompt';

describe('useInstallPrompt hook', () => {
  let eventListeners: Record<string, Array<(e: Event) => void>>;
  let mockPromptEvent: BeforeInstallPromptEvent;

  beforeEach(() => {
    eventListeners = { beforeinstallprompt: [], appinstalled: [] };

    // Create mock BeforeInstallPromptEvent
    mockPromptEvent = {
      preventDefault: vi.fn(),
      platforms: ['web', 'android'],
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
      prompt: vi.fn().mockResolvedValue(undefined),
    } as unknown as BeforeInstallPromptEvent;

    // Mock matchMedia for standalone detection
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)' ? false : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      writable: true,
      configurable: true,
    });

    // Mock navigator.standalone (iOS)
    Object.defineProperty(navigator, 'standalone', {
      value: false,
      writable: true,
      configurable: true,
    });

    // Mock addEventListener/removeEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event in eventListeners) {
        eventListeners[event].push(handler as (e: Event) => void);
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event in eventListeners) {
        eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have canInstall false initially', () => {
      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.canInstall).toBe(false);
    });

    it('should have isInstalled false when not in standalone mode', () => {
      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isInstalled).toBe(false);
    });

    it('should have isInstalled true when in standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
        })),
        writable: true,
      });

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isInstalled).toBe(true);
    });

    it('should have isInstalled true on iOS standalone', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isInstalled).toBe(true);
    });

    it('should have empty platforms array', () => {
      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.platforms).toEqual([]);
    });
  });

  describe('event listeners', () => {
    it('should add beforeinstallprompt listener on mount', () => {
      renderHook(() => useInstallPrompt());

      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
    });

    it('should add appinstalled listener on mount', () => {
      renderHook(() => useInstallPrompt());

      expect(window.addEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    });

    it('should remove listeners on unmount', () => {
      const { unmount } = renderHook(() => useInstallPrompt());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );
    });
  });

  describe('beforeinstallprompt event', () => {
    it('should set canInstall to true when event fires', () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      expect(result.current.canInstall).toBe(true);
    });

    it('should prevent default on the event', () => {
      renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      expect(mockPromptEvent.preventDefault).toHaveBeenCalled();
    });

    it('should set platforms from the event', () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      expect(result.current.platforms).toEqual(['web', 'android']);
    });
  });

  describe('promptInstall', () => {
    it('should return null when no prompt is available', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      let outcome: string | null = null;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });

      expect(outcome).toBeNull();
    });

    it('should call prompt() on the deferred event', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      await act(async () => {
        await result.current.promptInstall();
      });

      expect(mockPromptEvent.prompt).toHaveBeenCalled();
    });

    it('should return accepted outcome', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      let outcome: string | null = null;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });

      expect(outcome).toBe('accepted');
    });

    it('should return dismissed outcome', async () => {
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' });

      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      let outcome: string | null = null;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });

      expect(outcome).toBe('dismissed');
    });

    it('should set canInstall to false after prompt', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      expect(result.current.canInstall).toBe(true);

      await act(async () => {
        await result.current.promptInstall();
      });

      expect(result.current.canInstall).toBe(false);
    });
  });

  describe('appinstalled event', () => {
    it('should set canInstall to false when app is installed', () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        eventListeners.beforeinstallprompt.forEach((handler) => handler(mockPromptEvent as unknown as Event));
      });

      expect(result.current.canInstall).toBe(true);

      act(() => {
        eventListeners.appinstalled.forEach((handler) => handler(new Event('appinstalled')));
      });

      expect(result.current.canInstall).toBe(false);
    });
  });
});
