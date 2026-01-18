# Epic 29: Chatwoot Integration Code Review

**Epic**: 29 - Chatwoot Integráció
**Reviewer**: Claude (Adversarial)
**Date**: 2026-01-18
**Files Reviewed**:
- `packages/integration/chatwoot/src/services/ticket.service.ts`
- `packages/integration/chatwoot/src/services/escalation.service.ts`
- `packages/integration/chatwoot/src/dto/chatwoot.dto.ts`
- `packages/integration/chatwoot/src/interfaces/chatwoot.interface.ts`

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 1     |
| MEDIUM   | 3     |
| LOW      | 1     |
| **Total**| **5** |

---

## Issues Found

### Issue #1: DRY Violation - Duplicate Interface Definitions (MEDIUM)

**Location**: `ticket.service.ts:28-70`, `escalation.service.ts:23-81`

**Description**: Both services define their own versions of `IChatwootClient`, `ITicketRepository`, and `IAuditService` interfaces with different method signatures. This violates DRY and could lead to integration issues.

```typescript
// ticket.service.ts - IChatwootClient
export interface IChatwootClient {
  getConversation(conversationId: string): Promise<...>;
  sendMessage(conversationId: string, content: string, isPrivate?: boolean): Promise<{ id: string }>;
  updateConversationStatus(conversationId: string, status: string): Promise<void>;
  assignAgent(conversationId: string, agentId: string): Promise<void>;
  addLabel(conversationId: string, label: string): Promise<void>;
}

// escalation.service.ts - IChatwootClient
export interface IChatwootClient {
  assignAgent(conversationId: string, agentId: string): Promise<void>;
  sendMessage(conversationId: string, content: string, isPrivate?: boolean): Promise<{ id: string }>;
  addNote(conversationId: string, note: string): Promise<void>;  // <-- Different method
}
```

**Recommendation**: Create a unified `IChatwootClient` interface in `chatwoot.interface.ts` that includes all methods used by both services.

**Status**: OPEN
**Auto-Fix**: NO (requires architectural decision)

---

### Issue #2: Missing Error Handling for External Service Calls (HIGH)

**Location**: `ticket.service.ts:135`, `escalation.service.ts:157`

**Description**: Calls to `chatwootClient.assignAgent()`, `chatwootClient.sendMessage()`, and other external service calls are made without try-catch blocks. If Chatwoot is unavailable, the entire operation fails without graceful degradation.

```typescript
// ticket.service.ts:135 - No error handling
await this.chatwootClient.addLabel(validInput.chatwootConversationId, `kgc-${ticketNumber}`);
```

**Recommendation**: Wrap external service calls in try-catch and log failures. The primary database operation should succeed even if Chatwoot sync fails.

```typescript
try {
  await this.chatwootClient.addLabel(validInput.chatwootConversationId, `kgc-${ticketNumber}`);
} catch (error) {
  // Log but don't fail the ticket creation
  this.logger.warn(`Failed to sync label to Chatwoot: ${error.message}`);
}
```

**Status**: OPEN
**Auto-Fix**: NO (affects error handling strategy)

---

### Issue #3: Hardcoded AI Thresholds (MEDIUM)

**Location**: `escalation.service.ts:84-86`

**Description**: AI confidence and sentiment thresholds are hardcoded as constants. Different tenants might have different tolerance levels for escalation.

```typescript
const AI_CONFIDENCE_THRESHOLD = 0.7;
const NEGATIVE_SENTIMENT_THRESHOLD = -0.5;  // <-- Not even used
```

**Recommendation**: Make thresholds configurable via tenant settings or environment variables.

**Status**: OPEN
**Auto-Fix**: NO (requires config infrastructure)

---

### Issue #4: Unused Interface in Codebase (LOW)

**Location**: `chatwoot.interface.ts:131-139`

**Description**: The `ISlaConfig` interface is defined but never used in any service. This is dead code.

```typescript
export interface ISlaConfig {
  id: string;
  tenantId: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  escalationMinutes: number;
  isActive: boolean;
}
```

**Recommendation**: Either implement SLA functionality or remove the interface.

**Status**: FIXED
**Auto-Fix**: YES (applied)

---

### Issue #5: Inconsistent ID Validation (MEDIUM)

**Location**: `chatwoot.dto.ts:21`

**Description**: `chatwootConversationId` uses simple string validation while other IDs use UUID validation. If Chatwoot uses a specific ID format, it should be validated.

```typescript
chatwootConversationId: z.string().min(1),  // <-- No format validation
// vs
ticketId: z.string().uuid(),  // <-- UUID validation
```

**Recommendation**: Either validate Chatwoot ID format if known, or document why it's left as a generic string.

**Status**: OPEN
**Auto-Fix**: NO (needs Chatwoot ID format research)

---

## Auto-Fix Applied

### Issue #4: Remove unused ISlaConfig interface

```diff
- export interface ISlaConfig {
-   id: string;
-   tenantId: string;
-   priority: TicketPriority;
-   firstResponseMinutes: number;
-   resolutionMinutes: number;
-   escalationMinutes: number;
-   isActive: boolean;
- }
```

---

## Remaining Issues Summary

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| #1 | DRY - Duplicate interfaces | MEDIUM | OPEN |
| #2 | Missing error handling | HIGH | OPEN |
| #3 | Hardcoded AI thresholds | MEDIUM | OPEN |
| #5 | Inconsistent ID validation | MEDIUM | OPEN |

---

## Next Steps

1. **Issue #2** should be prioritized (HIGH severity)
2. **Issue #1** should be addressed before adding more services
3. Other issues can be deferred to future iterations

---

*Review completed following BMAD adversarial methodology. Minimum 3 issues required - 5 found.*
