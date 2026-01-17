# Story 5.5: Background Sync és Conflict Resolution

## Status: done

## User Story

**As a** felhasználó,
**I want** offline változásaim automatikusan szinkronizálódjanak,
**So that** ne veszítsek adatot.

## Acceptance Criteria

- [x] AC1: Offline queue-ba kerülnek a változások (useSyncQueue hook)
- [x] AC2: Background sync automatikus internet visszatérésekor (useBackgroundSync hook)
- [x] AC3: Last-Write-Wins conflict resolution implementálva
- [x] AC4: Sync progress indicator komponens
- [x] AC5: Conflict notification komponens
- [x] AC6: Retry logic exponential backoff-fal

## Technical Context

**Package:** @kgc/ui
**Architecture:** ADR-002 (Offline-First PWA Strategy)

**Dependencies:**
- IndexedDB (from Story 5-4)
- useOnlineStatus (from Story 5-3)

**Related Files:**
- packages/shared/ui/src/lib/sync/types.ts
- packages/shared/ui/src/lib/sync/queue.ts
- packages/shared/ui/src/lib/sync/conflict-resolution.ts
- packages/shared/ui/src/hooks/use-sync-queue.ts
- packages/shared/ui/src/hooks/use-background-sync.ts
- packages/shared/ui/src/components/sync/sync-progress.tsx
- packages/shared/ui/src/components/sync/conflict-dialog.tsx

## Tasks

1. [x] Create sync types (SyncOperation, SyncStatus, ConflictInfo)
2. [x] Create SyncQueue class with IndexedDB persistence
3. [x] Create Last-Write-Wins conflict resolver
4. [x] Create useSyncQueue hook (add, remove, getAll operations)
5. [x] Create useBackgroundSync hook (monitors online, triggers sync)
6. [x] Create SyncProgress component (pending count, progress bar)
7. [x] Create ConflictDialog component (shows conflicts, resolution options)
8. [x] Write unit tests for all functionality
9. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest with fake-indexeddb
- Test files: tests/lib/sync/*.spec.ts, tests/hooks/use-*.spec.ts
- Coverage target: 80%+ ✅ Achieved: 89.47%

## Implementation Summary

### New Files Created:
- `src/lib/sync/types.ts` - SyncOperation, SyncStatus, ConflictInfo, etc.
- `src/lib/sync/queue.ts` - SyncQueue class with IndexedDB persistence
- `src/lib/sync/conflict-resolution.ts` - lastWriteWins, resolveConflict functions
- `src/lib/sync/index.ts` - Module exports
- `src/hooks/use-sync-queue.ts` - React hook for sync queue management
- `src/hooks/use-background-sync.ts` - React hook for background sync
- `src/components/sync/sync-progress.tsx` - Progress indicator component
- `src/components/sync/conflict-dialog.tsx` - Conflict resolution dialog
- `src/components/ui/progress.tsx` - Radix Progress component

### Test Files:
- `tests/lib/sync/queue.spec.ts` - 20 tests
- `tests/lib/sync/conflict-resolution.spec.ts` - 10 tests
- `tests/hooks/use-sync-queue.spec.ts` - 12 tests
- `tests/hooks/use-background-sync.spec.ts` - 12 tests
- `tests/components/sync/sync-progress.spec.tsx` - 9 tests
- `tests/components/sync/conflict-dialog.spec.tsx` - 10 tests

### Key Features:
- **SyncQueue**: IndexedDB-persisted queue with priority sorting
- **Background Sync**: Automatic sync on online status change
- **Last-Write-Wins**: Timestamp-based conflict resolution
- **Exponential Backoff**: Configurable retry delays (baseDelay * 2^retryCount)
- **Progress Tracking**: Real-time sync progress with status indicators

## Notes

- Background Sync API is limited in browser support, use polling fallback
- Last-Write-Wins uses timestamp comparison (cachedAt)
- Operations are persisted in IndexedDB to survive browser close

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Implementation completed (done) - 501 tests passing, 89.47% coverage
