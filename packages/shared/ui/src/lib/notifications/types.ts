/**
 * Push notification types and interfaces for @kgc/ui
 * Per ADR-002: Offline-first PWA strategy
 */

/**
 * Notification permission state
 */
export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'high' | 'normal' | 'low';

/**
 * Notification category for grouping
 */
export type NotificationCategory =
  | 'rental'      // Bérlés értesítések
  | 'service'     // Szerviz értesítések
  | 'inventory'   // Készlet értesítések
  | 'payment'     // Fizetés értesítések
  | 'system'      // Rendszer értesítések
  | 'chat'        // Chat üzenetek
  | 'general';    // Általános

/**
 * Notification action button
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Notification data payload
 */
export interface NotificationData {
  /** Unique notification ID */
  id: string;
  /** Notification category */
  category: NotificationCategory;
  /** Priority level */
  priority: NotificationPriority;
  /** URL to navigate to when clicked */
  url?: string;
  /** Custom data */
  payload?: Record<string, unknown>;
  /** Timestamp when notification was created */
  timestamp: number;
}

/**
 * Notification options for displaying
 */
export interface NotificationOptions {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Icon URL */
  icon?: string;
  /** Badge URL (small icon) */
  badge?: string;
  /** Image URL (large image) */
  image?: string;
  /** Notification tag for grouping */
  tag?: string;
  /** Should notification be silent */
  silent?: boolean;
  /** Vibration pattern */
  vibrate?: number[];
  /** Auto-close after ms (0 = don't auto-close) */
  requireInteraction?: boolean;
  /** Action buttons */
  actions?: NotificationAction[];
  /** Custom data */
  data?: NotificationData;
}

/**
 * Queued notification for offline support
 */
export interface QueuedNotification {
  id: string;
  options: NotificationOptions;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
}

/**
 * Notification preferences per category
 */
export interface NotificationPreferences {
  /** Enable/disable all notifications */
  enabled: boolean;
  /** Per-category settings */
  categories: Record<NotificationCategory, boolean>;
  /** Sound enabled */
  sound: boolean;
  /** Vibration enabled */
  vibrate: boolean;
  /** Show badge count */
  badge: boolean;
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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
};

/**
 * Notification state for the hook
 */
export interface NotificationState {
  /** Is notifications supported in this browser */
  isSupported: boolean;
  /** Current permission state */
  permission: NotificationPermission;
  /** Is permission being requested */
  isRequesting: boolean;
  /** User's notification preferences */
  preferences: NotificationPreferences;
  /** Number of queued notifications (offline) */
  queuedCount: number;
}

/**
 * Callback types
 */
export type OnNotificationClick = (notification: NotificationData) => void;
export type OnNotificationClose = (notification: NotificationData) => void;
export type OnPermissionChange = (permission: NotificationPermission) => void;

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission
 */
export function getCurrentPermission(): NotificationPermission {
  if (typeof window === 'undefined') return 'default';
  if (!('Notification' in window)) return 'denied';
  return Notification.permission as NotificationPermission;
}

/**
 * Generate a unique notification ID
 */
export function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
