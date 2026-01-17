# Story 32.4: Chat Előzmények

## Status: done

## User Story

**As a** dolgozó,
**I want** régi üzeneteket visszanézni,
**So that** ne felejtsem el mit beszéltünk.

## Acceptance Criteria

- [x] AC1: Régebbi üzenetek betöltődnek görgetésnél (infinite scroll)
- [x] AC2: Keresés szövegben
- [x] AC3: 1 év retention policy

## Technical Context

**Package:** @kgc/chat (packages/integration/chat/)
**Architecture:** ADR-002 (Offline-first PWA)

**Dependencies:**
- @kgc/chat (Story 32-1, 32-2, 32-3)
- Prisma (pagination)

**Related Files:**
- packages/integration/chat/src/services/history.service.ts
- packages/integration/chat/src/interfaces/history.interface.ts
- packages/integration/chat/tests/history.service.spec.ts

## Tasks

1. [x] Create history interfaces and types
2. [x] Create HistoryService for message search and pagination
3. [x] Implement text search with highlighting
4. [x] Add retention policy enforcement
5. [x] Write unit tests (38 tests)
6. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest ✅
- Coverage target: 80%+ ✅
- **Tests: 38 passed**

## Implementation Summary

### HistoryService Features:
- `getHistory()` - Cursor-based pagination for infinite scroll
- `search()` - Full-text search with relevance scoring
- `getContext()` - Get messages around a specific message
- `applyRetention()` - Enforce retention policy (365 days default)
- `exportHistory()` - Export in JSON, CSV, HTML formats
- `getStats()` - Conversation statistics
- `highlightText()` - Search term highlighting

### Pagination:
```typescript
interface HistoryRequest {
  conversationId: string;
  tenantId: string;
  limit?: number;
  cursor?: { messageId: string; timestamp: Date; };
  direction?: 'before' | 'after';
}
```

### Search Features:
- Case-insensitive full-text search
- Relevance scoring (exact match, word boundary, frequency)
- Context messages (before/after) included
- Date range filtering
- Pagination support

### Retention Policy:
- Default: 365 days
- Optional archiving before delete
- Can be enabled/disabled per tenant

### Export Formats:
- JSON: Full message data
- CSV: Tabular format with headers
- HTML: Styled document with metadata

## Notes

- Cursor-based pagination for efficient infinite scroll
- Full-text search in message content
- 1 year retention = 365 days
- Search results include context (conversation, timestamp)
- Export supports date range filtering

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Backend implementation complete - HistoryService with 38 tests
