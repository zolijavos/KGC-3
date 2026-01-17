import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getCurrentPermission,
  generateNotificationId,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../../src/lib/notifications';

describe('Notification utilities', () => {
  describe('isNotificationSupported', () => {
    const originalNotification = window.Notification;
    const originalServiceWorker = navigator.serviceWorker;

    afterEach(() => {
      // Restore originals
      if (originalNotification) {
        Object.defineProperty(window, 'Notification', {
          value: originalNotification,
          writable: true,
          configurable: true,
        });
      } else {
        // @ts-expect-error - deleting for test cleanup
        delete window.Notification;
      }
      if (originalServiceWorker) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: originalServiceWorker,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return true when Notification and serviceWorker are available', () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isNotificationSupported()).toBe(true);
    });

    it('should return false when Notification is not available', () => {
      // @ts-expect-error - deleting for test
      delete window.Notification;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isNotificationSupported()).toBe(false);
    });

    it('should return false when serviceWorker is not available', () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      // In jsdom, we can't truly remove serviceWorker since 'in' checks property existence
      // So we test via a custom navigator mock
      const customNavigator = { userAgent: navigator.userAgent };
      // @ts-expect-error - testing with incomplete navigator
      Object.defineProperty(global, 'navigator', {
        value: customNavigator,
        writable: true,
        configurable: true,
      });

      expect(isNotificationSupported()).toBe(false);
    });
  });

  describe('getCurrentPermission', () => {
    const originalNotification = window.Notification;

    afterEach(() => {
      if (originalNotification) {
        Object.defineProperty(window, 'Notification', {
          value: originalNotification,
          writable: true,
          configurable: true,
        });
      } else {
        // @ts-expect-error - deleting for test cleanup
        delete window.Notification;
      }
    });

    it('should return "granted" when permission is granted', () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      expect(getCurrentPermission()).toBe('granted');
    });

    it('should return "denied" when permission is denied', () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'denied' },
        writable: true,
        configurable: true,
      });

      expect(getCurrentPermission()).toBe('denied');
    });

    it('should return "default" when permission is default', () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });

      expect(getCurrentPermission()).toBe('default');
    });

    it('should return "denied" when Notification is not available', () => {
      // @ts-expect-error - deleting for test
      delete window.Notification;

      expect(getCurrentPermission()).toBe('denied');
    });
  });

  describe('generateNotificationId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateNotificationId();
      const id2 = generateNotificationId();

      expect(id1).not.toBe(id2);
    });

    it('should start with "notif-"', () => {
      const id = generateNotificationId();

      expect(id.startsWith('notif-')).toBe(true);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const id = generateNotificationId();
      const after = Date.now();

      // Extract timestamp from ID
      const parts = id.split('-');
      const timestamp = parseInt(parts[1] ?? '0', 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('DEFAULT_NOTIFICATION_PREFERENCES', () => {
    it('should have enabled true by default', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.enabled).toBe(true);
    });

    it('should have all categories enabled by default', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.rental).toBe(true);
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.service).toBe(true);
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.inventory).toBe(true);
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.payment).toBe(true);
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.system).toBe(true);
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.chat).toBe(true);
      expect(DEFAULT_NOTIFICATION_PREFERENCES.categories.general).toBe(true);
    });

    it('should have sound enabled by default', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.sound).toBe(true);
    });

    it('should have vibrate enabled by default', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.vibrate).toBe(true);
    });

    it('should have badge enabled by default', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.badge).toBe(true);
    });
  });
});
