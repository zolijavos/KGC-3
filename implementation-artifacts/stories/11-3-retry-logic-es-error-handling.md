# Story 11-3: Retry Logic és Error Handling

**Epic:** Epic 11 - NAV Integration (@kgc/nav-online)
**Státusz:** ✅ DONE
**Implementálva:** 2026-01-16

## User Story

**As a** rendszergazda
**I want** hibakezelést NAV API hívásoknál
**So that** átmeneti hibák ne okozzanak adatvesztést.

## Acceptance Criteria

- [x] NAV API hiba esetén retry
- [x] Exponential backoff (max 5 próba)
- [x] Permanent error esetén nem próbálkozik újra
- [x] Minden hiba naplózva

## Technical Implementation

### Létrehozott fájlok

- `packages/integration/nav-online/src/services/retry.service.ts` - Retry szolgáltatás
- `packages/integration/nav-online/src/interfaces/retry.interface.ts` - Retry interfészek
- `packages/integration/nav-online/tests/retry.service.spec.ts` - Tesztek (22 teszt)

### Retry konfiguráció (ADR-030)

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,

  retryableCodes: [
    'TIMEOUT',
    'CONNECTION_ERROR',
    'RATE_LIMIT',
    'SERVICE_UNAVAILABLE',
    'NAV_TEMPORARY_ERROR',
  ],

  permanentCodes: [
    'INVALID_TAX_NUMBER',
    'INVALID_INVOICE_DATA',
    'DUPLICATE_INVOICE',
    'AUTH_ERROR',
  ],
};
```

### Megvalósított funkciók

1. **Exponential Backoff** (`calculateNextDelay`)
   - Delay = baseDelay * 2^attempt
   - Maximum delay cap
   - Jitter (±10%) a thundering herd elkerülésére

2. **Retry végrehajtás** (`executeWithRetry`)
   - Automatikus újrapróbálkozás
   - Callback támogatás retry eseményekre
   - Hibakód alapú döntés

3. **Queue elem kezelés**
   - `createQueueItem()`
   - `updateQueueItemOnFailure()`

## Tesztek

- 22 teszt eset
- Exponential backoff ellenőrzés
- Retryable vs permanent error kezelés
- Max retry limit ellenőrzés
