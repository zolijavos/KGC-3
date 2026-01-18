# Epic 31: Koko AI Chatbot Code Review

**Epic**: 31 - Koko AI Chatbot
**Reviewer**: Claude (Adversarial)
**Date**: 2026-01-18
**Files Reviewed**:
- `packages/integration/koko-ai/src/services/chat-widget.service.ts`
- `packages/integration/koko-ai/src/services/intent-router.service.ts`
- `packages/integration/koko-ai/src/services/quota.service.ts`
- `packages/integration/koko-ai/src/dto/koko.dto.ts`
- `packages/integration/koko-ai/src/interfaces/koko.interface.ts`

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

### Issue #1: Missing Gemini API Error Handling (HIGH)

**Location**: `intent-router.service.ts:217-222`, `chat-widget.service.ts:108-114`

**Description**: Calls to `geminiClient.generateContent()`, `geminiClient.classifyIntent()`, and `geminiClient.generateEmbedding()` are not wrapped in try-catch blocks. If the Gemini API is unavailable, rate-limited, or returns an error, the entire operation fails without graceful degradation.

```typescript
// intent-router.service.ts:217 - No error handling
const analysis = await this.geminiClient.classifyIntent(message, language);
```

**Recommendation**: Wrap Gemini API calls in try-catch and implement fallback behavior (e.g., return cached response, escalate to human, or return generic "I don't understand" message).

```typescript
let analysis: IAiAnalysisResult;
try {
  analysis = await this.geminiClient.classifyIntent(message, language);
} catch (error) {
  this.logger.error(`Gemini API error: ${error.message}`);
  return {
    response: 'Technikai probléma. Kérlek próbáld később.',
    confidence: 0,
    status: InteractionStatus.ESCALATED,
  };
}
```

**Status**: OPEN
**Auto-Fix**: NO (requires fallback strategy decision)

---

### Issue #2: Hardcoded Confidence Thresholds (MEDIUM)

**Location**: `intent-router.service.ts:100-102`

**Description**: The `AUTO_SEND_THRESHOLD` (0.8) and `ESCALATION_THRESHOLD` (0.5) are hardcoded constants. According to ADR-016, these should be configurable per tenant.

```typescript
const AUTO_SEND_THRESHOLD = 0.8;
const ESCALATION_THRESHOLD = 0.5;
```

**Recommendation**: Load thresholds from tenant configuration or environment variables.

**Status**: OPEN
**Auto-Fix**: NO (requires config infrastructure)

---

### Issue #3: Potential Token Estimation Inaccuracy (MEDIUM)

**Location**: `chat-widget.service.ts:108`, `quota.service.ts` (various)

**Description**: Token count is estimated at 500 before the actual API call, but the real usage may vary significantly. This could lead to inaccurate quota tracking.

```typescript
// chat-widget.service.ts:108
const quotaCheck = await this.quotaService.checkQuota(tenantId, 500); // Hardcoded estimate
```

**Recommendation**: Either:
1. Use the actual `tokenCount` from Gemini response when recording usage
2. Or use a more accurate estimation based on message length

**Status**: OPEN
**Auto-Fix**: NO (affects quota accuracy)

---

### Issue #4: Missing Rate Limit Cache TTL Handling (MEDIUM)

**Location**: `quota.service.ts:106-115`

**Description**: The rate limit check relies on the cache returning `null` when expired, but the implementation doesn't explicitly handle cache expiration. If the cache implementation doesn't properly expire keys, rate limits could persist incorrectly.

```typescript
const minuteLimit = await this.rateLimitCache.get(minuteKey);
if (minuteLimit && minuteLimit.count >= config.rateLimit.requestsPerMinute) {
  // Assumes cache properly expires - but what if it doesn't?
}
```

**Recommendation**: Add explicit timestamp check for cache entry validity.

**Status**: OPEN
**Auto-Fix**: NO (depends on cache implementation)

---

### Issue #5: Unused Intent Values (LOW)

**Location**: `koko.interface.ts:17-26`

**Description**: Several Intent enum values are defined but never specifically handled in the routing logic (e.g., `BOOKING_REQUEST`, `AVAILABILITY_CHECK`). While they're classified, there's no special handling for them.

```typescript
export enum Intent {
  RENTAL_INQUIRY = 'RENTAL_INQUIRY',
  SERVICE_INQUIRY = 'SERVICE_INQUIRY',
  // ... these are classified but not specially handled
  BOOKING_REQUEST = 'BOOKING_REQUEST',
  AVAILABILITY_CHECK = 'AVAILABILITY_CHECK',
}
```

**Recommendation**: Either implement intent-specific handlers or document that these are for classification/analytics only.

**Status**: OPEN
**Auto-Fix**: NO (intentional design decision)

---

## Auto-Fix Applied

No auto-fixes applied in this review. All issues require architectural decisions or external dependencies.

---

## Remaining Issues Summary

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| #1 | Missing Gemini API error handling | HIGH | OPEN |
| #2 | Hardcoded confidence thresholds | MEDIUM | OPEN |
| #3 | Token estimation inaccuracy | MEDIUM | OPEN |
| #4 | Rate limit cache TTL handling | MEDIUM | OPEN |
| #5 | Unused Intent values | LOW | OPEN |

---

## Positive Observations

1. **Well-structured architecture**: Clear separation between ChatWidget, IntentRouter, and Quota services
2. **Comprehensive quota system**: Tier-based limits with both request count and token tracking
3. **Multi-language support**: Language detection and dual-language knowledge base
4. **Admin approval workflow**: Proper queue system for manual review of uncertain responses
5. **Excellent test coverage**: 39 tests covering all major scenarios

---

## Next Steps

1. **Issue #1** should be prioritized before production (HIGH severity)
2. **Issue #2** should be addressed with tenant config system
3. Other issues can be deferred to post-MVP iterations

---

*Review completed following BMAD adversarial methodology. Minimum 3 issues required - 5 found.*
