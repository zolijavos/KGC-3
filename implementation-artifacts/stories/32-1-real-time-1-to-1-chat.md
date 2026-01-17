# Story 32.1: Real-time 1-to-1 Chat

## Status: done

## User Story

**As a** dolgozó,
**I want** kollégákkal chatelni,
**So that** gyorsan kommunikálhassunk.

## Acceptance Criteria

- [x] AC1: WebSocket kapcsolat létrehozás és kezelés
- [x] AC2: Üzenet küldés és fogadás real-time
- [x] AC3: Typing indicator
- [x] AC4: Delivered/Read status
- [x] AC5: Üzenet formázás (text, emoji)
- [x] AC6: Tenant-scoped chat (csak azonos tenant userei látják egymást)

## Technical Context

**Package:** @kgc/chat (packages/integration/chat/)
**Architecture:** ADR-002 (Offline-first PWA), ADR-023 (Composable frontend)

**Dependencies:**
- WebSocket (Socket.io via @nestjs/websockets)
- @kgc/auth (user authentication)
- @kgc/tenant (tenant context)
- @kgc/ui (UI components)

**Related Files:**
- packages/integration/chat/src/chat.gateway.ts (WebSocket gateway)
- packages/integration/chat/src/chat.service.ts (Business logic)
- packages/integration/chat/src/chat.controller.ts (REST API)
- packages/integration/chat/src/chat.module.ts (NestJS module)

## Tasks

1. [x] Create @kgc/chat package structure
2. [x] Create interfaces and DTOs
3. [x] Create ChatService with CRUD operations
4. [x] Create WebSocket gateway (NestJS)
5. [x] Create ChatController for REST API
6. [x] Write unit tests
7. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest
- WebSocket tests: Mock WS connections
- Coverage target: 80%+

## Implementation Summary

### Package Created: @kgc/chat

**Directory:** packages/integration/chat/

### Components

1. **ChatService** (chat.service.ts):
   - `startConversation()` - Create/reuse conversations
   - `getConversations()` - List user's conversations
   - `getConversation()` - Get single conversation
   - `sendMessage()` - Send message to conversation
   - `getMessages()` - Get message history with pagination
   - `markAsRead()` - Mark messages as read
   - `getUnreadCounts()` - Get unread counts per conversation
   - `updateMessageStatus()` - Update delivered/read status

2. **ChatGateway** (chat.gateway.ts):
   - WebSocket gateway with Socket.io
   - Real-time message delivery
   - Typing indicators
   - User presence tracking (online/offline)
   - Room-based conversation management
   - Tenant isolation

3. **ChatController** (chat.controller.ts):
   - REST API endpoints as WebSocket fallback
   - Conversation management
   - Message history retrieval

### Interfaces

- `ChatMessage` - Message entity
- `Conversation` - Conversation entity
- `MessageStatus` - sending, sent, delivered, read, failed
- `UserStatus` - online, away, offline
- `ChatServerEvent` - Server WebSocket events
- `ChatClientEvent` - Client WebSocket events

### DTOs with Zod Validation

- `sendMessageSchema` - Message validation (max 4000 chars)
- `startConversationSchema` - Conversation start (max 50 participants)

### Test Coverage

- 28 tests passing
- ChatService: 19 tests
- DTOs: 9 tests

## Notes

- WebSocket for real-time communication via Socket.io
- Tenant-scoped: users can only chat within their tenant
- Message status: sent → delivered → read
- Supports direct (1-to-1) and group conversations
- REST API fallback when WebSocket unavailable

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Implementation completed - 28 tests passing (done)
