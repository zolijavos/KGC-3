# Story 32.3: Chat Értesítések

## Status: done

## User Story

**As a** dolgozó,
**I want** értesítést kapni új üzenetről,
**So that** ne maradjak le semmiről.

## Acceptance Criteria

- [x] AC1: Toast notification új üzenetnél (ha nem aktív a chat ablak)
- [x] AC2: Badge olvasatlan számmal
- [x] AC3: Push notification ha app háttérben

## Technical Context

**Package:** @kgc/chat (packages/integration/chat/)
**Architecture:** ADR-002 (Offline-first PWA)

**Dependencies:**
- @kgc/chat (Story 32-1, 32-2)
- Web Push API
- Service Worker (PWA)

**Related Files:**
- packages/integration/chat/src/services/notification.service.ts
- packages/integration/chat/src/interfaces/notification.interface.ts
- packages/integration/chat/tests/notification.service.spec.ts

## Tasks

1. [x] Create notification interfaces and types
2. [x] Create NotificationService for managing notifications
3. [x] Implement unread message tracking per conversation
4. [x] Add push notification subscription management
5. [x] Write unit tests (34 tests)
6. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest ✅
- Coverage target: 80%+ ✅
- **Tests: 34 passed**

## Implementation Summary

### NotificationService Features:
- `createNotification()` - Create in-app notification
- `createFromMessage()` - Convert chat message to notification
- `getNotifications()` / `getUnreadCount()` - Query notifications
- `markAsRead()` / `markAllAsRead()` - Mark notifications as read
- `clearForConversation()` - Clear conversation notifications
- `incrementUnread()` / `clearUnread()` - Track unread counts per conversation
- `getUnreadSummary()` - Get total + per-conversation unread counts
- `shouldNotify()` - Check notification preferences (quiet hours, muted conversations)
- `getPreferences()` / `updatePreferences()` - Manage user preferences
- `registerPushSubscription()` / `removePushSubscription()` - Push subscription management
- `buildPushPayload()` - Build Web Push API payload
- `cleanup()` - Remove old notifications (retention policy)

### Key Interfaces:
```typescript
interface ChatNotification {
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
}

interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  showPreview: boolean;
  mutedConversations: string[];
  quietHours?: { enabled: boolean; start: string; end: string; };
}
```

## Notes

- Toast notifications for in-app alerts
- Badge count for unread messages (per conversation + total)
- Push notifications with configurable preview (privacy option)
- Quiet hours support (overnight ranges handled correctly)
- Notification retention: 30 days default
- Hungarian UI text for push notifications ("Új üzenet", "Kattints a megtekintéshez")

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Backend implementation complete - NotificationService with 34 tests
