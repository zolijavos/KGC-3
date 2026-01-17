# Story 32.2: Online/Offline Státusz

## Status: done

## User Story

**As a** dolgozó,
**I want** látni ki van online,
**So that** tudjam kit érhetek el.

## Acceptance Criteria

- [x] AC1: Online/offline/away státusz kezelés
- [x] AC2: Zöld/piros/sárga jelzés a UI-on (interface ready, UI @kgc/ui-ban)
- [x] AC3: Last seen timestamp
- [x] AC4: "Away" automatikus 5 perc inaktivitás után
- [x] AC5: Tenant-scoped user lista
- [x] AC6: Real-time státusz frissítés WebSocket-en

## Technical Context

**Package:** @kgc/chat (packages/integration/chat/)
**Architecture:** ADR-002 (Offline-first PWA)

**Dependencies:**
- @kgc/chat (Story 32-1)
- WebSocket (Socket.io)

**Related Files:**
- packages/integration/chat/src/services/presence.service.ts
- packages/integration/chat/src/interfaces/presence.interface.ts
- packages/integration/chat/src/interfaces/index.ts
- packages/integration/chat/tests/presence.service.spec.ts

## Tasks

1. [x] Create presence service for status tracking
2. [x] Add inactivity detection (5 min → away)
3. [x] Create UserStatus type interfaces (UI component @kgc/ui-ban)
4. [x] Define presence interfaces for frontend hook
5. [x] Write unit tests (32 tests)
6. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest ✅
- Coverage target: 80%+ ✅
- **Tests: 32 passed**

## Implementation Summary

### PresenceService Features:
- `setOnline(userId, tenantId, socketId)` - Track user online
- `setOffline(userId)` - Mark user offline with lastSeenAt
- `scheduleOffline(userId)` - Grace period before offline
- `updateActivity(userId)` - Heartbeat, resets away timer
- `getPresence(userId)` - Get user presence info
- `getOnlineUsers(tenantId)` - Get online/away users in tenant
- `getAllUsers(tenantId)` - Get all users including offline
- `isOnline(userId)` / `getStatus(userId)` / `getLastSeen(userId)`
- `cleanup()` - Clear all timers and data

### Auto-Away Detection:
- Timer-based inactivity detection (default: 5 minutes)
- Activity updates reset the away timer
- Away users are included in getOnlineUsers (they're reachable)

### Configuration:
```typescript
interface PresenceConfig {
  awayTimeout: number;      // Default: 5 min
  offlineTimeout: number;   // Default: 30 sec
  heartbeatInterval: number; // Default: 30 sec
}
```

## Notes

- Status: online (zöld), away (sárga), offline (piros)
- Automatic away after 5 minutes of inactivity
- Last seen timestamp stored for offline users
- Frontend UI components go in @kgc/ui package

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Backend implementation complete - PresenceService with 32 tests
