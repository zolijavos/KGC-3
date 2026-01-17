import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';

// Mock the notification utilities at module level
const mockIsSupported = vi.fn();
const mockGetPermission = vi.fn();
const mockRequestPermission = vi.fn();

vi.mock('../../src/lib/notifications', () => ({
  isNotificationSupported: () => mockIsSupported(),
  getCurrentPermission: () => mockGetPermission(),
  DEFAULT_NOTIFICATION_PREFERENCES: {
    enabled: true,
    categories: {
      rental: true,
      service: true,
      inventory: true,
      payment: true,
      system: true,
      chat: true,
      general: true,
    },
    sound: true,
    vibrate: true,
    badge: true,
  },
  generateNotificationId: () => `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
}));

// Import after mocking
import { usePushNotifications } from '../../src/hooks/use-push-notifications';

describe('usePushNotifications', () => {
  const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage.store[key];
    }),
    clear: vi.fn(() => {
      mockLocalStorage.store = {};
    }),
    key: vi.fn(),
    length: 0,
  };

  const originalLocalStorage = window.localStorage;
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.store = {};

    // Set default mock return values
    mockIsSupported.mockReturnValue(true);
    mockGetPermission.mockReturnValue('default');
    mockRequestPermission.mockResolvedValue('granted');

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator.permissions
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn().mockResolvedValue({
          state: 'default',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();

    // Restore localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });

    // Restore Notification
    if (originalNotification) {
      Object.defineProperty(window, 'Notification', {
        value: originalNotification,
        writable: true,
        configurable: true,
      });
    }
  });

  describe('initialization', () => {
    it('should detect notification support', async () => {
      mockIsSupported.mockReturnValue(true);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });

    it('should get current permission', async () => {
      mockGetPermission.mockReturnValue('granted');

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });
    });

    it('should load preferences from localStorage', async () => {
      const customPrefs = {
        enabled: true,
        categories: {
          rental: false,
          service: true,
          inventory: true,
          payment: true,
          system: true,
          chat: true,
          general: true,
        },
        sound: false,
        vibrate: true,
        badge: true,
      };
      mockLocalStorage.store['kgc-notification-preferences'] = JSON.stringify(customPrefs);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.state.preferences.sound).toBe(false);
        expect(result.current.state.preferences.categories.rental).toBe(false);
      });
    });

    it('should use default preferences when none stored', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.state.preferences.enabled).toBe(true);
        expect(result.current.state.preferences.sound).toBe(true);
      });
    });
  });

  describe('requestPermission', () => {
    it('should request permission', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const { result } = renderHook(() => usePushNotifications());

      let permission: string;
      await act(async () => {
        permission = await result.current.requestPermission();
      });

      expect(permission!).toBe('granted');
    });

    it('should update state after permission granted', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
        expect(result.current.isPermissionGranted).toBe(true);
      });
    });

    it('should call onPermissionChange callback', async () => {
      const onPermissionChange = vi.fn();
      mockRequestPermission.mockResolvedValue('granted');

      const { result } = renderHook(() =>
        usePushNotifications({ onPermissionChange })
      );

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(onPermissionChange).toHaveBeenCalledWith('granted');
    });

    it('should handle permission denied', async () => {
      mockRequestPermission.mockResolvedValue('denied');

      const { result } = renderHook(() => usePushNotifications());

      let permission: string;
      await act(async () => {
        permission = await result.current.requestPermission();
      });

      expect(permission!).toBe('denied');
    });

    it('should return denied when not supported', async () => {
      mockIsSupported.mockReturnValue(false);

      const { result } = renderHook(() => usePushNotifications());

      let permission: string;
      await act(async () => {
        permission = await result.current.requestPermission();
      });

      expect(permission!).toBe('denied');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.updatePreferences({ sound: false });
      });

      await waitFor(() => {
        expect(result.current.state.preferences.sound).toBe(false);
      });
    });

    it('should save preferences to localStorage', async () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.updatePreferences({ sound: false });
      });

      await waitFor(() => {
        const stored = JSON.parse(
          mockLocalStorage.store['kgc-notification-preferences'] ?? '{}'
        );
        expect(stored.sound).toBe(false);
      });
    });
  });

  describe('toggleCategory', () => {
    it('should toggle a category', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.state.preferences.categories.rental).toBe(true);
      });

      act(() => {
        result.current.toggleCategory('rental', false);
      });

      await waitFor(() => {
        expect(result.current.state.preferences.categories.rental).toBe(false);
      });
    });

    it('should save to localStorage', async () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.toggleCategory('service', false);
      });

      await waitFor(() => {
        const stored = JSON.parse(
          mockLocalStorage.store['kgc-notification-preferences'] ?? '{}'
        );
        expect(stored.categories.service).toBe(false);
      });
    });
  });

  describe('clearQueue', () => {
    it('should clear the notification queue', async () => {
      mockLocalStorage.store['kgc-notification-queue'] = JSON.stringify([
        { id: '1', options: {}, createdAt: Date.now(), attempts: 0, maxAttempts: 3 },
      ]);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.state.queuedCount).toBe(1);
      });

      act(() => {
        result.current.clearQueue();
      });

      await waitFor(() => {
        expect(result.current.state.queuedCount).toBe(0);
      });
    });
  });

  describe('isPermissionGranted', () => {
    it('should be true when permission is granted', async () => {
      mockGetPermission.mockReturnValue('granted');

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isPermissionGranted).toBe(true);
      });
    });

    it('should be false when permission is denied', async () => {
      mockGetPermission.mockReturnValue('denied');

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isPermissionGranted).toBe(false);
      });
    });

    it('should be false when permission is default', async () => {
      mockGetPermission.mockReturnValue('default');

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isPermissionGranted).toBe(false);
      });
    });
  });
});
