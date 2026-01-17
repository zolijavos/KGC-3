import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServiceWorker } from '../../src/hooks/use-service-worker';

describe('useServiceWorker hook', () => {
  let mockRegistration: Partial<ServiceWorkerRegistration>;
  let mockServiceWorker: Partial<ServiceWorker>;
  let updateFoundHandlers: Array<() => void>;
  let stateChangeHandlers: Array<() => void>;

  beforeEach(() => {
    updateFoundHandlers = [];
    stateChangeHandlers = [];

    mockServiceWorker = {
      state: 'installed',
      addEventListener: vi.fn((event, handler) => {
        if (event === 'statechange') {
          stateChangeHandlers.push(handler as () => void);
        }
      }),
      postMessage: vi.fn(),
    };

    mockRegistration = {
      installing: null,
      waiting: null,
      active: mockServiceWorker as ServiceWorker,
      scope: '/',
      addEventListener: vi.fn((event, handler) => {
        if (event === 'updatefound') {
          updateFoundHandlers.push(handler as () => void);
        }
      }),
      unregister: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(undefined),
    };

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        controller: mockServiceWorker,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when serviceWorker is available', () => {
      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      expect(result.current.isSupported).toBe(true);
    });

    it('should return false when serviceWorker is not available', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('register', () => {
    it('should register service worker with default path', async () => {
      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      await act(async () => {
        await result.current.register();
      });

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });

    it('should register service worker with custom path and scope', async () => {
      const { result } = renderHook(() =>
        useServiceWorker({ immediate: false, path: '/custom-sw.js', scope: '/app/' })
      );

      await act(async () => {
        await result.current.register();
      });

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/custom-sw.js', {
        scope: '/app/',
      });
    });

    it('should set isRegistered to true after successful registration', async () => {
      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      expect(result.current.isRegistered).toBe(false);

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.isRegistered).toBe(true);
    });

    it('should call onRegistered callback', async () => {
      const onRegistered = vi.fn();
      const { result } = renderHook(() =>
        useServiceWorker({ immediate: false, onRegistered })
      );

      await act(async () => {
        await result.current.register();
      });

      expect(onRegistered).toHaveBeenCalledWith(mockRegistration);
    });

    it('should handle registration error', async () => {
      const error = new Error('Registration failed');
      vi.mocked(navigator.serviceWorker.register).mockRejectedValueOnce(error);

      const onError = vi.fn();
      const { result } = renderHook(() => useServiceWorker({ immediate: false, onError }));

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.error).toEqual(error);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('immediate registration', () => {
    it('should register immediately when immediate is true', async () => {
      renderHook(() => useServiceWorker({ immediate: true }));

      await waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalled();
      });
    });

    it('should not register immediately when immediate is false', () => {
      renderHook(() => useServiceWorker({ immediate: false }));

      expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should unregister service worker', async () => {
      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      await act(async () => {
        await result.current.register();
      });

      await act(async () => {
        const success = await result.current.unregister();
        expect(success).toBe(true);
      });

      expect(mockRegistration.unregister).toHaveBeenCalled();
      expect(result.current.isRegistered).toBe(false);
    });

    it('should return false when no registration exists', async () => {
      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      await act(async () => {
        const success = await result.current.unregister();
        expect(success).toBe(false);
      });
    });
  });

  describe('checkForUpdates', () => {
    it('should call registration.update()', async () => {
      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      await act(async () => {
        await result.current.register();
      });

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(mockRegistration.update).toHaveBeenCalled();
    });
  });

  describe('update detection', () => {
    it('should detect waiting worker on registration', async () => {
      mockRegistration.waiting = mockServiceWorker as ServiceWorker;
      const onUpdateAvailable = vi.fn();

      const { result } = renderHook(() =>
        useServiceWorker({ immediate: false, onUpdateAvailable })
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.updateAvailable).toBe(true);
      expect(result.current.isWaiting).toBe(true);
      expect(onUpdateAvailable).toHaveBeenCalledWith(mockRegistration);
    });
  });

  describe('skipWaiting', () => {
    it('should post SKIP_WAITING message to waiting worker', async () => {
      mockRegistration.waiting = mockServiceWorker as ServiceWorker;

      const { result } = renderHook(() => useServiceWorker({ immediate: false }));

      await act(async () => {
        await result.current.register();
      });

      act(() => {
        result.current.skipWaiting();
      });

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
  });
});
