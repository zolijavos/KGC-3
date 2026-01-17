# Story 5.8: Push Notifications

## Status: done

## User Story

**As a** felhasználó,
**I want** push notification-öket kapni,
**So that** értesüljek fontos eseményekről.

## Acceptance Criteria

- [x] AC1: Notification permission kérés és kezelés
- [x] AC2: Push notification küldés API
- [x] AC3: Notification preferences kezelés
- [x] AC4: Offline queue támogatás
- [x] AC5: Notification click handling
- [x] AC6: Badge count kezelés

## Technical Context

**Package:** @kgc/ui
**Architecture:** ADR-002 (Offline-first PWA), ADR-023 (Composable frontend)

**Dependencies:**
- Web Push API (native)
- Service Worker API (native)

**Related Files:**
- packages/shared/ui/src/hooks/use-push-notifications.ts
- packages/shared/ui/src/components/pwa/notification-prompt.tsx
- packages/shared/ui/src/lib/notifications/index.ts
- packages/shared/ui/src/lib/notifications/types.ts

## Tasks

1. [x] Create notification types and interfaces
2. [x] Create usePushNotifications hook
3. [x] Create NotificationPrompt component
4. [x] Create notification utilities
5. [x] Write unit tests for all components
6. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest with @testing-library/react
- Coverage target: 80%+

## Implementation Summary

### Components Created

1. **NotificationPrompt Component** (notification-prompt.tsx):
   - Permission request UI with Hungarian localization
   - Customizable title, description, and button text
   - Dismiss functionality with localStorage persistence
   - forwardRef support

2. **usePushNotifications Hook** (use-push-notifications.ts):
   - Permission state management (granted, denied, default)
   - Notification display via Web Push API
   - Preferences management with localStorage persistence
   - Offline queue support with automatic processing
   - Category-based notification filtering
   - Event callbacks (onClick, onClose, onPermissionChange)

### Types and Utilities (lib/notifications/)

- **NotificationPermission**: Permission state type
- **NotificationPriority**: high, normal, low
- **NotificationCategory**: rental, service, inventory, payment, system, chat, general
- **NotificationData**: Payload interface with id, category, priority, url, timestamp
- **NotificationOptions**: Display options (title, body, icon, badge, image, actions)
- **QueuedNotification**: Offline queue item
- **NotificationPreferences**: Per-category and global settings
- **isNotificationSupported()**: Browser capability check
- **getCurrentPermission()**: Current permission state
- **generateNotificationId()**: Unique ID generator

### Test Coverage

- 698 tests passing
- lib/notifications: 100% coverage
- Hook and component tests with proper browser API mocking

## Notes

- Uses Web Push API for browser notifications
- Permission state tracking (granted, denied, default)
- Queue notifications when offline
- PWA integration for background notifications
- Hungarian localization for UI strings

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Implementation completed - all components working, 698 tests passing (done)
