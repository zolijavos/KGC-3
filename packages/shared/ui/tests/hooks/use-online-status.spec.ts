import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../../src/hooks/use-online-status';

describe('useOnlineStatus hook', () => {
  let originalNavigator: typeof navigator;
  let eventListeners: Record<string, Array<(e: Event) => void>>;

  beforeEach(() => {
    originalNavigator = window.navigator;
    eventListeners = { online: [], offline: [] };

    // Mock navigator.onLine
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    // Mock addEventListener/removeEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online' || event === 'offline') {
        eventListeners[event].push(handler as (e: Event) => void);
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'online' || event === 'offline') {
        eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
      }
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return isOnline true when navigator.onLine is true', () => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should return isOnline false when navigator.onLine is false', () => {
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('event listeners', () => {
    it('should add event listeners on mount', () => {
      renderHook(() => useOnlineStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('online/offline events', () => {
    it('should update isOnline to true when online event is fired', () => {
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.isOnline).toBe(false);

      // Update navigator.onLine and fire event
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
      act(() => {
        eventListeners.online.forEach((handler) => handler(new Event('online')));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should update isOnline to false when offline event is fired', () => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.isOnline).toBe(true);

      // Update navigator.onLine and fire event
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
      act(() => {
        eventListeners.offline.forEach((handler) => handler(new Event('offline')));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('checkOnlineStatus', () => {
    it('should return current navigator.onLine value', () => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.checkOnlineStatus()).toBe(true);

      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

      expect(result.current.checkOnlineStatus()).toBe(false);
    });
  });
});
