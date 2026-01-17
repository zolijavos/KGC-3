import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from '../src/services/notification.service';
import type { ChatMessage } from '../src/interfaces/chat.interface';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-16T10:00:00'));
    service = new NotificationService();
  });

  afterEach(() => {
    service.clearAll();
    vi.useRealTimers();
  });

  describe('createNotification', () => {
    it('should create notification with generated id and timestamp', () => {
      const notification = service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test Title',
        body: 'Test body message',
        conversationId: 'conv-1',
      });

      expect(notification.id).toMatch(/^notif_/);
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(notification.type).toBe('message');
      expect(notification.title).toBe('Test Title');
      expect(notification.body).toBe('Test body message');
    });

    it('should add notification to user list', () => {
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Notification 1',
        body: 'Body 1',
        conversationId: 'conv-1',
      });

      const notifications = service.getNotifications('user-1');
      expect(notifications).toHaveLength(1);
    });

    it('should limit notifications per user', () => {
      const limitedService = new NotificationService({ maxNotificationsPerUser: 5 });

      for (let i = 0; i < 10; i++) {
        limitedService.createNotification({
          type: 'message',
          priority: 'normal',
          userId: 'user-1',
          tenantId: 'tenant-1',
          title: `Notification ${i}`,
          body: `Body ${i}`,
          conversationId: 'conv-1',
        });
      }

      const notifications = limitedService.getNotifications('user-1');
      expect(notifications).toHaveLength(5);
      // Most recent should be first
      expect(notifications[0]?.title).toBe('Notification 9');
    });
  });

  describe('createFromMessage', () => {
    it('should create notification from chat message', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: 'Hello there!',
        status: 'sent',
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const notification = service.createFromMessage({
        message,
        senderName: 'John Doe',
        recipientId: 'user-1',
      });

      expect(notification.type).toBe('message');
      expect(notification.title).toBe('John Doe');
      expect(notification.body).toBe('Hello there!');
      expect(notification.userId).toBe('user-1');
      expect(notification.senderId).toBe('user-2');
      expect(notification.messageId).toBe('msg-1');
      expect(notification.conversationId).toBe('conv-1');
    });

    it('should truncate long messages', () => {
      const longContent = 'A'.repeat(150);
      const message: ChatMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: longContent,
        status: 'sent',
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const notification = service.createFromMessage({
        message,
        senderName: 'John Doe',
        recipientId: 'user-1',
      });

      expect(notification.body.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(notification.body.endsWith('...')).toBe(true);
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for user', () => {
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test',
        body: 'Body',
        conversationId: 'conv-1',
      });

      const notifications = service.getNotifications('user-1');
      expect(notifications).toHaveLength(1);
    });

    it('should return empty array for user with no notifications', () => {
      const notifications = service.getNotifications('user-nonexistent');
      expect(notifications).toHaveLength(0);
    });

    it('should limit returned notifications', () => {
      for (let i = 0; i < 10; i++) {
        service.createNotification({
          type: 'message',
          priority: 'normal',
          userId: 'user-1',
          tenantId: 'tenant-1',
          title: `Notification ${i}`,
          body: `Body ${i}`,
          conversationId: 'conv-1',
        });
      }

      const notifications = service.getNotifications('user-1', 3);
      expect(notifications).toHaveLength(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', () => {
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test 1',
        body: 'Body',
        conversationId: 'conv-1',
      });

      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test 2',
        body: 'Body',
        conversationId: 'conv-1',
      });

      expect(service.getUnreadCount('user-1')).toBe(2);
    });

    it('should return 0 for user with no notifications', () => {
      expect(service.getUnreadCount('user-nonexistent')).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification = service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test',
        body: 'Body',
        conversationId: 'conv-1',
      });

      expect(service.getUnreadCount('user-1')).toBe(1);

      service.markAsRead(notification.id);

      expect(service.getUnreadCount('user-1')).toBe(0);
    });

    it('should handle non-existent notification', () => {
      expect(() => service.markAsRead('notif-nonexistent')).not.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', () => {
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test 1',
        body: 'Body',
        conversationId: 'conv-1',
      });

      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Test 2',
        body: 'Body',
        conversationId: 'conv-1',
      });

      expect(service.getUnreadCount('user-1')).toBe(2);

      service.markAllAsRead('user-1');

      expect(service.getUnreadCount('user-1')).toBe(0);
    });

    it('should handle user with no notifications', () => {
      expect(() => service.markAllAsRead('user-nonexistent')).not.toThrow();
    });
  });

  describe('clearForConversation', () => {
    it('should clear notifications for specific conversation', () => {
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Conv 1',
        body: 'Body',
        conversationId: 'conv-1',
      });

      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Conv 2',
        body: 'Body',
        conversationId: 'conv-2',
      });

      service.clearForConversation('user-1', 'conv-1');

      const notifications = service.getNotifications('user-1');
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.conversationId).toBe('conv-2');
    });
  });

  describe('unread counts per conversation', () => {
    it('should increment unread count', () => {
      service.incrementUnread('user-1', 'conv-1');
      service.incrementUnread('user-1', 'conv-1');
      service.incrementUnread('user-1', 'conv-2');

      const summary = service.getUnreadSummary('user-1');
      expect(summary?.totalUnread).toBe(3);
      expect(summary?.conversations).toHaveLength(2);
    });

    it('should clear unread count for conversation', () => {
      service.incrementUnread('user-1', 'conv-1');
      service.incrementUnread('user-1', 'conv-1');

      service.clearUnread('user-1', 'conv-1');

      const summary = service.getUnreadSummary('user-1');
      expect(summary).toBeNull();
    });

    it('should return null for user with no unreads', () => {
      const summary = service.getUnreadSummary('user-nonexistent');
      expect(summary).toBeNull();
    });
  });

  describe('shouldNotify', () => {
    it('should return true by default', () => {
      expect(service.shouldNotify('user-1', 'conv-1')).toBe(true);
    });

    it('should return false when notifications disabled', () => {
      service.updatePreferences('user-1', 'tenant-1', { enabled: false });

      expect(service.shouldNotify('user-1', 'conv-1')).toBe(false);
    });

    it('should return false for muted conversation', () => {
      service.updatePreferences('user-1', 'tenant-1', {
        enabled: true,
        mutedConversations: ['conv-1'],
      });

      expect(service.shouldNotify('user-1', 'conv-1')).toBe(false);
      expect(service.shouldNotify('user-1', 'conv-2')).toBe(true);
    });

    it('should respect quiet hours (same day)', () => {
      service.updatePreferences('user-1', 'tenant-1', {
        enabled: true,
        quietHours: {
          enabled: true,
          start: '09:00',
          end: '11:00',
        },
      });

      // Current time is 10:00
      expect(service.shouldNotify('user-1', 'conv-1')).toBe(false);

      // Move to 12:00
      vi.setSystemTime(new Date('2026-01-16T12:00:00'));
      expect(service.shouldNotify('user-1', 'conv-1')).toBe(true);
    });

    it('should respect quiet hours (overnight)', () => {
      service.updatePreferences('user-1', 'tenant-1', {
        enabled: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      });

      // Current time is 10:00 - outside quiet hours
      expect(service.shouldNotify('user-1', 'conv-1')).toBe(true);

      // Move to 23:00 - inside quiet hours
      vi.setSystemTime(new Date('2026-01-16T23:00:00'));
      expect(service.shouldNotify('user-1', 'conv-1')).toBe(false);

      // Move to 07:00 next day - still inside quiet hours
      vi.setSystemTime(new Date('2026-01-17T07:00:00'));
      expect(service.shouldNotify('user-1', 'conv-1')).toBe(false);
    });
  });

  describe('preferences', () => {
    it('should return null for user with no preferences', () => {
      expect(service.getPreferences('user-nonexistent')).toBeNull();
    });

    it('should update preferences', () => {
      const prefs = service.updatePreferences('user-1', 'tenant-1', {
        soundEnabled: false,
      });

      expect(prefs.userId).toBe('user-1');
      expect(prefs.tenantId).toBe('tenant-1');
      expect(prefs.soundEnabled).toBe(false);
      expect(prefs.enabled).toBe(true); // Default
    });

    it('should merge with existing preferences', () => {
      service.updatePreferences('user-1', 'tenant-1', { soundEnabled: false });
      service.updatePreferences('user-1', 'tenant-1', { showPreview: false });

      const prefs = service.getPreferences('user-1');
      expect(prefs?.soundEnabled).toBe(false);
      expect(prefs?.showPreview).toBe(false);
    });
  });

  describe('push subscriptions', () => {
    it('should register push subscription', () => {
      service.registerPushSubscription({
        userId: 'user-1',
        tenantId: 'tenant-1',
        endpoint: 'https://push.example.com/subscription1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });

      const subs = service.getPushSubscriptions('user-1');
      expect(subs).toHaveLength(1);
      expect(subs[0]?.endpoint).toBe('https://push.example.com/subscription1');
      expect(subs[0]?.createdAt).toBeInstanceOf(Date);
    });

    it('should replace subscription with same endpoint', () => {
      service.registerPushSubscription({
        userId: 'user-1',
        tenantId: 'tenant-1',
        endpoint: 'https://push.example.com/subscription1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });

      service.registerPushSubscription({
        userId: 'user-1',
        tenantId: 'tenant-1',
        endpoint: 'https://push.example.com/subscription1',
        keys: { p256dh: 'key2', auth: 'auth2' },
      });

      const subs = service.getPushSubscriptions('user-1');
      expect(subs).toHaveLength(1);
      expect(subs[0]?.keys.p256dh).toBe('key2');
    });

    it('should remove push subscription', () => {
      service.registerPushSubscription({
        userId: 'user-1',
        tenantId: 'tenant-1',
        endpoint: 'https://push.example.com/subscription1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });

      service.removePushSubscription('user-1', 'https://push.example.com/subscription1');

      const subs = service.getPushSubscriptions('user-1');
      expect(subs).toHaveLength(0);
    });

    it('should return empty array for user with no subscriptions', () => {
      const subs = service.getPushSubscriptions('user-nonexistent');
      expect(subs).toHaveLength(0);
    });
  });

  describe('buildPushPayload', () => {
    it('should build push payload from notification', () => {
      const notification = service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'John Doe',
        body: 'Hello there!',
        conversationId: 'conv-1',
        messageId: 'msg-1',
        senderId: 'user-2',
      });

      const payload = service.buildPushPayload(notification);

      expect(payload.title).toBe('John Doe');
      expect(payload.body).toBe('Hello there!');
      expect(payload.tag).toBe('conv-1');
      expect(payload.data?.conversationId).toBe('conv-1');
      expect(payload.data?.messageId).toBe('msg-1');
      expect(payload.data?.url).toBe('/chat/conv-1');
      expect(payload.actions).toHaveLength(2);
    });

    it('should hide preview when preference is set', () => {
      service.updatePreferences('user-1', 'tenant-1', { showPreview: false });

      const notification = service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Secret Sender',
        body: 'Secret message',
        conversationId: 'conv-1',
      });

      const payload = service.buildPushPayload(notification);

      expect(payload.title).toBe('Új üzenet');
      expect(payload.body).toBe('Kattints a megtekintéshez');
    });
  });

  describe('cleanup', () => {
    it('should remove old notifications', () => {
      // Create notification 40 days ago
      vi.setSystemTime(new Date('2025-12-06T10:00:00'));
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Old',
        body: 'Old message',
        conversationId: 'conv-1',
      });

      // Create notification today
      vi.setSystemTime(new Date('2026-01-16T10:00:00'));
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'New',
        body: 'New message',
        conversationId: 'conv-1',
      });

      service.cleanup('user-1');

      const notifications = service.getNotifications('user-1');
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.title).toBe('New');
    });

    it('should cleanup all users when no userId provided', () => {
      vi.setSystemTime(new Date('2025-12-06T10:00:00'));
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-1',
        tenantId: 'tenant-1',
        title: 'Old',
        body: 'Body',
        conversationId: 'conv-1',
      });
      service.createNotification({
        type: 'message',
        priority: 'normal',
        userId: 'user-2',
        tenantId: 'tenant-1',
        title: 'Old',
        body: 'Body',
        conversationId: 'conv-1',
      });

      vi.setSystemTime(new Date('2026-01-16T10:00:00'));
      service.cleanup();

      expect(service.getNotifications('user-1')).toHaveLength(0);
      expect(service.getNotifications('user-2')).toHaveLength(0);
    });
  });
});
