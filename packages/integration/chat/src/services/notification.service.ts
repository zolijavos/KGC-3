/**
 * Chat Notification Service
 * @package @kgc/chat
 * Story 32-3: Chat Értesítések
 *
 * Manages chat notifications, unread counts, and push subscriptions.
 */

import { Injectable } from '@nestjs/common';
import {
  type ChatNotification,
  type CreateNotificationFromMessage,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type INotificationService,
  type NotificationPreferences,
  type PushPayload,
  type PushSubscription,
  type UnreadCount,
  type UserUnreadSummary,
} from '../interfaces/notification.interface';

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  /** Maximum notifications to keep per user */
  maxNotificationsPerUser: number;
  /** Notification retention period in days */
  retentionDays: number;
  /** Default app icon for push notifications */
  defaultIcon?: string;
  /** Default badge icon for push notifications */
  defaultBadge?: string;
}

const DEFAULT_CONFIG: NotificationServiceConfig = {
  maxNotificationsPerUser: 100,
  retentionDays: 30,
  defaultIcon: '/icons/chat-icon.png',
  defaultBadge: '/icons/badge.png',
};

@Injectable()
export class NotificationService implements INotificationService {
  private notifications = new Map<string, ChatNotification[]>();
  private unreadCounts = new Map<string, Map<string, UnreadCount>>();
  private preferences = new Map<string, NotificationPreferences>();
  private pushSubscriptions = new Map<string, PushSubscription[]>();
  private config: NotificationServiceConfig;

  constructor(config: Partial<NotificationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create a new notification
   */
  createNotification(
    notification: Omit<ChatNotification, 'id' | 'createdAt'>,
  ): ChatNotification {
    const newNotification: ChatNotification = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
    };

    const userNotifications = this.notifications.get(notification.userId) ?? [];
    userNotifications.unshift(newNotification);

    // Trim to max notifications
    if (userNotifications.length > this.config.maxNotificationsPerUser) {
      userNotifications.splice(this.config.maxNotificationsPerUser);
    }

    this.notifications.set(notification.userId, userNotifications);
    return newNotification;
  }

  /**
   * Create notification from incoming message
   */
  createFromMessage(params: CreateNotificationFromMessage): ChatNotification {
    const { message, senderName, recipientId } = params;

    // Build notification body - truncate if too long
    const maxBodyLength = 100;
    const body =
      message.content.length > maxBodyLength
        ? `${message.content.substring(0, maxBodyLength)}...`
        : message.content;

    return this.createNotification({
      type: 'message',
      priority: 'normal',
      userId: recipientId,
      tenantId: message.tenantId,
      title: senderName,
      body,
      conversationId: message.conversationId,
      messageId: message.id,
      senderId: message.senderId,
      senderName,
    });
  }

  /**
   * Get notifications for a user
   */
  getNotifications(userId: string, limit = 50): ChatNotification[] {
    const userNotifications = this.notifications.get(userId) ?? [];
    return userNotifications.slice(0, limit);
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) ?? [];
    return userNotifications.filter((n) => !n.readAt).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    for (const [, userNotifications] of this.notifications) {
      const notification = userNotifications.find((n) => n.id === notificationId);
      if (notification && !notification.readAt) {
        notification.readAt = new Date();
        return;
      }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return;

    const now = new Date();
    for (const notification of userNotifications) {
      if (!notification.readAt) {
        notification.readAt = now;
      }
    }
  }

  /**
   * Clear notifications for a conversation
   */
  clearForConversation(userId: string, conversationId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return;

    const filtered = userNotifications.filter(
      (n) => n.conversationId !== conversationId,
    );
    this.notifications.set(userId, filtered);
  }

  /**
   * Get unread message counts per conversation
   */
  getUnreadSummary(userId: string): UserUnreadSummary | null {
    const userUnreads = this.unreadCounts.get(userId);
    if (!userUnreads || userUnreads.size === 0) {
      return null;
    }

    const conversations = Array.from(userUnreads.values());
    const totalUnread = conversations.reduce((sum, c) => sum + c.count, 0);

    // Get tenantId from first unread entry (all should be same tenant)
    const firstUnread = conversations[0];

    return {
      userId,
      tenantId: firstUnread ? this.getTenantForUser(userId) : '',
      totalUnread,
      conversations,
    };
  }

  /**
   * Helper to get tenant for user (from preferences)
   */
  private getTenantForUser(userId: string): string {
    const prefs = this.preferences.get(userId);
    return prefs?.tenantId ?? '';
  }

  /**
   * Increment unread count for a conversation
   */
  incrementUnread(userId: string, conversationId: string): void {
    let userUnreads = this.unreadCounts.get(userId);
    if (!userUnreads) {
      userUnreads = new Map();
      this.unreadCounts.set(userId, userUnreads);
    }

    const current = userUnreads.get(conversationId) ?? {
      conversationId,
      count: 0,
      lastMessageAt: new Date(),
    };

    userUnreads.set(conversationId, {
      conversationId,
      count: current.count + 1,
      lastMessageAt: new Date(),
    });
  }

  /**
   * Clear unread count for a conversation
   */
  clearUnread(userId: string, conversationId: string): void {
    const userUnreads = this.unreadCounts.get(userId);
    if (userUnreads) {
      userUnreads.delete(conversationId);
    }
  }

  /**
   * Check if user should receive notification
   */
  shouldNotify(userId: string, conversationId: string): boolean {
    const prefs = this.preferences.get(userId);

    // If no preferences, use defaults (enabled)
    if (!prefs) {
      return true;
    }

    // Check if notifications are enabled
    if (!prefs.enabled) {
      return false;
    }

    // Check if conversation is muted
    if (prefs.mutedConversations.includes(conversationId)) {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = prefs.quietHours;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (start > end) {
        if (currentTime >= start || currentTime < end) {
          return false;
        }
      } else {
        if (currentTime >= start && currentTime < end) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreferences | null {
    return this.preferences.get(userId) ?? null;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<NotificationPreferences>,
  ): NotificationPreferences {
    const current = this.preferences.get(userId) ?? {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      userId,
      tenantId,
    };

    const updated: NotificationPreferences = {
      ...current,
      ...preferences,
      userId, // Ensure userId is not overwritten
      tenantId,
    };

    this.preferences.set(userId, updated);
    return updated;
  }

  /**
   * Register push subscription
   */
  registerPushSubscription(subscription: Omit<PushSubscription, 'createdAt'>): void {
    const userSubs = this.pushSubscriptions.get(subscription.userId) ?? [];

    // Remove existing subscription with same endpoint
    const filtered = userSubs.filter((s) => s.endpoint !== subscription.endpoint);

    filtered.push({
      ...subscription,
      createdAt: new Date(),
    });

    this.pushSubscriptions.set(subscription.userId, filtered);
  }

  /**
   * Remove push subscription
   */
  removePushSubscription(userId: string, endpoint: string): void {
    const userSubs = this.pushSubscriptions.get(userId);
    if (!userSubs) return;

    const filtered = userSubs.filter((s) => s.endpoint !== endpoint);
    this.pushSubscriptions.set(userId, filtered);
  }

  /**
   * Get push subscriptions for a user
   */
  getPushSubscriptions(userId: string): PushSubscription[] {
    return this.pushSubscriptions.get(userId) ?? [];
  }

  /**
   * Build push payload from notification
   */
  buildPushPayload(notification: ChatNotification): PushPayload {
    const prefs = this.preferences.get(notification.userId);
    const showPreview = prefs?.showPreview ?? true;

    const payload: PushPayload = {
      title: showPreview ? notification.title : 'Új üzenet',
      body: showPreview ? notification.body : 'Kattints a megtekintéshez',
      tag: notification.conversationId,
      data: this.buildPushData(notification),
      actions: [
        {
          action: 'open',
          title: 'Megnyitás',
        },
        {
          action: 'dismiss',
          title: 'Elvetés',
        },
      ],
    };
    if (this.config.defaultIcon !== undefined) {
      payload.icon = this.config.defaultIcon;
    }
    if (this.config.defaultBadge !== undefined) {
      payload.badge = this.config.defaultBadge;
    }
    return payload;
  }

  /**
   * Build push data object with conditional optional properties
   */
  private buildPushData(notification: ChatNotification): {
    conversationId: string;
    messageId?: string;
    senderId?: string;
    url?: string;
  } {
    const data: {
      conversationId: string;
      messageId?: string;
      senderId?: string;
      url?: string;
    } = {
      conversationId: notification.conversationId,
    };
    if (notification.messageId !== undefined) {
      data.messageId = notification.messageId;
    }
    if (notification.senderId !== undefined) {
      data.senderId = notification.senderId;
    }
    data.url = `/chat/${notification.conversationId}`;
    return data;
  }

  /**
   * Cleanup notifications older than retention period
   */
  cleanup(userId?: string): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const cleanupForUser = (uid: string) => {
      const userNotifications = this.notifications.get(uid);
      if (userNotifications) {
        const filtered = userNotifications.filter(
          (n) => n.createdAt > cutoffDate,
        );
        if (filtered.length === 0) {
          this.notifications.delete(uid);
        } else {
          this.notifications.set(uid, filtered);
        }
      }
    };

    if (userId) {
      cleanupForUser(userId);
    } else {
      for (const uid of this.notifications.keys()) {
        cleanupForUser(uid);
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.notifications.clear();
    this.unreadCounts.clear();
    this.preferences.clear();
    this.pushSubscriptions.clear();
  }
}
