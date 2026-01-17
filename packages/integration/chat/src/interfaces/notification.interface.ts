/**
 * Chat Notification Interfaces
 * @package @kgc/chat
 * Story 32-3: Chat Értesítések
 */

import type { ChatMessage } from './chat.interface';

/**
 * Notification types
 */
export type NotificationType = 'message' | 'mention' | 'typing' | 'status_change';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'high' | 'normal' | 'low';

/**
 * Chat notification data
 */
export interface ChatNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  conversationId: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  createdAt: Date;
  readAt?: Date;
  data?: Record<string, unknown>;
}

/**
 * Unread count per conversation
 */
export interface UnreadCount {
  conversationId: string;
  count: number;
  lastMessageAt: Date;
}

/**
 * Total unread counts for a user
 */
export interface UserUnreadSummary {
  userId: string;
  tenantId: string;
  totalUnread: number;
  conversations: UnreadCount[];
}

/**
 * Push notification subscription
 */
export interface PushSubscription {
  userId: string;
  tenantId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * Push notification payload
 */
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    conversationId: string;
    messageId?: string;
    senderId?: string;
    url?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Notification preferences for a user
 */
export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  enabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  showPreview: boolean;
  mutedConversations: string[];
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'userId' | 'tenantId'
> = {
  enabled: true,
  pushEnabled: true,
  soundEnabled: true,
  showPreview: true,
  mutedConversations: [],
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

/**
 * Notification event types for WebSocket
 */
export enum NotificationEvent {
  NEW = 'notification:new',
  READ = 'notification:read',
  CLEAR = 'notification:clear',
  BADGE_UPDATE = 'notification:badge',
  PREFERENCES_UPDATE = 'notification:preferences',
}

/**
 * Create notification from message helper type
 */
export interface CreateNotificationFromMessage {
  message: ChatMessage;
  senderName: string;
  recipientId: string;
}

/**
 * Notification service interface
 */
export interface INotificationService {
  /**
   * Create a new notification
   */
  createNotification(
    notification: Omit<ChatNotification, 'id' | 'createdAt'>,
  ): ChatNotification;

  /**
   * Create notification from incoming message
   */
  createFromMessage(params: CreateNotificationFromMessage): ChatNotification;

  /**
   * Get notifications for a user
   */
  getNotifications(userId: string, limit?: number): ChatNotification[];

  /**
   * Get unread notifications count
   */
  getUnreadCount(userId: string): number;

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void;

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: string): void;

  /**
   * Clear notifications for a conversation
   */
  clearForConversation(userId: string, conversationId: string): void;

  /**
   * Get unread message counts per conversation
   */
  getUnreadSummary(userId: string): UserUnreadSummary | null;

  /**
   * Increment unread count for a conversation
   */
  incrementUnread(userId: string, conversationId: string): void;

  /**
   * Clear unread count for a conversation
   */
  clearUnread(userId: string, conversationId: string): void;

  /**
   * Check if user should receive notification
   */
  shouldNotify(userId: string, conversationId: string): boolean;

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreferences | null;

  /**
   * Update notification preferences
   */
  updatePreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<NotificationPreferences>,
  ): NotificationPreferences;

  /**
   * Register push subscription
   */
  registerPushSubscription(subscription: Omit<PushSubscription, 'createdAt'>): void;

  /**
   * Remove push subscription
   */
  removePushSubscription(userId: string, endpoint: string): void;

  /**
   * Get push subscriptions for a user
   */
  getPushSubscriptions(userId: string): PushSubscription[];

  /**
   * Build push payload from notification
   */
  buildPushPayload(notification: ChatNotification): PushPayload;

  /**
   * Cleanup notifications older than retention period
   */
  cleanup(userId?: string): void;
}
