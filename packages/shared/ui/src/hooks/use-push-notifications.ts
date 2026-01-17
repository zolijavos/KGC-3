'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  NotificationState,
  NotificationOptions,
  NotificationPreferences,
  NotificationPermission,
  NotificationCategory,
  NotificationData,
  OnNotificationClick,
  OnNotificationClose,
  OnPermissionChange,
  QueuedNotification,
} from '../lib/notifications';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationSupported,
  getCurrentPermission,
  generateNotificationId,
} from '../lib/notifications';

const PREFERENCES_KEY = 'kgc-notification-preferences';
const QUEUE_KEY = 'kgc-notification-queue';

/**
 * Return type for usePushNotifications hook
 */
export interface UsePushNotifications {
  /** Current notification state */
  state: NotificationState;
  /** Request notification permission */
  requestPermission: () => Promise<NotificationPermission>;
  /** Show a notification */
  showNotification: (options: NotificationOptions) => Promise<void>;
  /** Update notification preferences */
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  /** Toggle a specific category */
  toggleCategory: (category: NotificationCategory, enabled: boolean) => void;
  /** Clear all queued notifications */
  clearQueue: () => void;
  /** Process queued notifications (when back online) */
  processQueue: () => Promise<void>;
  /** Is notifications supported */
  isSupported: boolean;
  /** Current permission state */
  permission: NotificationPermission;
  /** Is permission granted */
  isPermissionGranted: boolean;
}

/**
 * Hook for managing push notifications
 *
 * Provides permission management, notification display,
 * and offline queue support.
 *
 * @example
 * ```tsx
 * const { requestPermission, showNotification, permission } = usePushNotifications({
 *   onClick: (data) => navigate(data.url),
 * });
 *
 * // Request permission
 * await requestPermission();
 *
 * // Show notification
 * await showNotification({
 *   title: 'Új bérlés',
 *   body: 'Bérlés létrehozva',
 *   data: { category: 'rental', id: '123', priority: 'normal', timestamp: Date.now() }
 * });
 * ```
 */
export function usePushNotifications(
  options: {
    /** Callback when notification is clicked */
    onClick?: OnNotificationClick;
    /** Callback when notification is closed */
    onClose?: OnNotificationClose;
    /** Callback when permission changes */
    onPermissionChange?: OnPermissionChange;
  } = {}
): UsePushNotifications {
  const { onClick, onClose, onPermissionChange } = options;

  const [state, setState] = useState<NotificationState>(() => ({
    isSupported: isNotificationSupported(),
    permission: getCurrentPermission(),
    isRequesting: false,
    preferences: loadPreferences(),
    queuedCount: loadQueue().length,
  }));

  const activeNotifications = useRef<Map<string, Notification>>(new Map());

  /**
   * Load preferences from localStorage
   */
  function loadPreferences(): NotificationPreferences {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore errors
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences(prefs: NotificationPreferences): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Load queue from localStorage
   */
  function loadQueue(): QueuedNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore errors
    }
    return [];
  }

  /**
   * Save queue to localStorage
   */
  function saveQueue(queue: QueuedNotification[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Add notification to offline queue
   */
  function addToQueue(options: NotificationOptions): void {
    const queue = loadQueue();
    const queuedNotification: QueuedNotification = {
      id: options.data?.id ?? generateNotificationId(),
      options,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3,
    };
    queue.push(queuedNotification);
    saveQueue(queue);
    setState((prev) => ({ ...prev, queuedCount: queue.length }));
  }

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      return 'denied';
    }

    setState((prev) => ({ ...prev, isRequesting: true }));

    try {
      const permission = await Notification.requestPermission();
      const permissionState = permission as NotificationPermission;

      setState((prev) => ({
        ...prev,
        permission: permissionState,
        isRequesting: false,
      }));

      onPermissionChange?.(permissionState);
      return permissionState;
    } catch {
      setState((prev) => ({ ...prev, isRequesting: false }));
      return 'denied';
    }
  }, [state.isSupported, onPermissionChange]);

  /**
   * Show a notification
   */
  const showNotification = useCallback(
    async (notificationOptions: NotificationOptions): Promise<void> => {
      if (!state.isSupported) return;

      // Check if notifications are enabled
      if (!state.preferences.enabled) return;

      // Check category preference
      const category = notificationOptions.data?.category ?? 'general';
      if (!state.preferences.categories[category]) return;

      // Check permission
      if (state.permission !== 'granted') {
        // Queue for later
        addToQueue(notificationOptions);
        return;
      }

      // Check if online
      if (!navigator.onLine) {
        addToQueue(notificationOptions);
        return;
      }

      try {
        // Apply sound/vibrate preferences
        const finalOptions: NotificationOptions = {
          ...notificationOptions,
          silent: !state.preferences.sound,
          vibrate: state.preferences.vibrate ? notificationOptions.vibrate : undefined,
        };

        // Ensure data has required fields
        const data: NotificationData = {
          id: generateNotificationId(),
          category: 'general',
          priority: 'normal',
          timestamp: Date.now(),
          ...notificationOptions.data,
        };

        // Create notification
        const notification = new Notification(finalOptions.title, {
          body: finalOptions.body,
          icon: finalOptions.icon,
          badge: finalOptions.badge,
          image: finalOptions.image,
          tag: finalOptions.tag,
          silent: finalOptions.silent,
          vibrate: finalOptions.vibrate,
          requireInteraction: finalOptions.requireInteraction,
          data,
        });

        // Store reference
        activeNotifications.current.set(data.id, notification);

        // Handle click
        notification.onclick = () => {
          onClick?.(data);
          notification.close();
          activeNotifications.current.delete(data.id);
        };

        // Handle close
        notification.onclose = () => {
          onClose?.(data);
          activeNotifications.current.delete(data.id);
        };
      } catch {
        // Failed to show, queue for later
        addToQueue(notificationOptions);
      }
    },
    [state.isSupported, state.permission, state.preferences, onClick, onClose]
  );

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      setState((prev) => {
        const newPreferences = { ...prev.preferences, ...updates };
        savePreferences(newPreferences);
        return { ...prev, preferences: newPreferences };
      });
    },
    []
  );

  /**
   * Toggle a specific category
   */
  const toggleCategory = useCallback(
    (category: NotificationCategory, enabled: boolean) => {
      setState((prev) => {
        const newPreferences = {
          ...prev.preferences,
          categories: {
            ...prev.preferences.categories,
            [category]: enabled,
          },
        };
        savePreferences(newPreferences);
        return { ...prev, preferences: newPreferences };
      });
    },
    []
  );

  /**
   * Clear all queued notifications
   */
  const clearQueue = useCallback(() => {
    saveQueue([]);
    setState((prev) => ({ ...prev, queuedCount: 0 }));
  }, []);

  /**
   * Process queued notifications
   */
  const processQueue = useCallback(async () => {
    if (state.permission !== 'granted' || !navigator.onLine) return;

    const queue = loadQueue();
    const remaining: QueuedNotification[] = [];

    for (const queued of queue) {
      if (queued.attempts >= queued.maxAttempts) {
        // Too many attempts, discard
        continue;
      }

      try {
        await showNotification(queued.options);
      } catch {
        // Failed, keep in queue
        remaining.push({
          ...queued,
          attempts: queued.attempts + 1,
        });
      }
    }

    saveQueue(remaining);
    setState((prev) => ({ ...prev, queuedCount: remaining.length }));
  }, [state.permission, showNotification]);

  // Listen for online status changes
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processQueue]);

  // Listen for permission changes
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return;

    let permissionStatus: PermissionStatus | null = null;

    const handleChange = () => {
      const newPermission = getCurrentPermission();
      setState((prev) => {
        if (prev.permission !== newPermission) {
          onPermissionChange?.(newPermission);
          return { ...prev, permission: newPermission };
        }
        return prev;
      });
    };

    navigator.permissions
      .query({ name: 'notifications' })
      .then((status) => {
        permissionStatus = status;
        status.addEventListener('change', handleChange);
      })
      .catch(() => {
        // Permissions API not supported
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, [onPermissionChange]);

  return {
    state,
    requestPermission,
    showNotification,
    updatePreferences,
    toggleCategory,
    clearQueue,
    processQueue,
    isSupported: state.isSupported,
    permission: state.permission,
    isPermissionGranted: state.permission === 'granted',
  };
}
