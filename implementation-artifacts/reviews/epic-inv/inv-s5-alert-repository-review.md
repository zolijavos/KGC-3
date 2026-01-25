# Code Review: INV-S5 PrismaAlertRepository

> **Story:** INV-S5 - PrismaAlertRepository
> **Reviewer:** Claude (Adversarial Review Round 1)
> **Date:** 2026-01-24
> **Status:** ✅ FIXED

---

## Files Reviewed

- `apps/kgc-api/src/modules/inventory/repositories/prisma-alert.repository.ts`
- `apps/kgc-api/src/modules/inventory/repositories/prisma-alert.repository.spec.ts`

---

## Issues Found

### MEDIUM-1: Empty warehouseId fallback in createAlert

**File:** `prisma-alert.repository.ts:280`
**Severity:** MEDIUM

```typescript
warehouseId: alert.warehouseId ?? '',
```

Using an empty string as fallback for warehouseId is problematic. If warehouseId is optional in the interface, it should either:

- Be null in the database
- Throw an error if required by Prisma

**Recommendation:** Check if Prisma schema allows null for warehouseId. If yes, use null. If no, throw an error when warehouseId is not provided.

---

### MEDIUM-2: Hardcoded unit value 'db'

**File:** `prisma-alert.repository.ts:114`
**Severity:** MEDIUM

```typescript
unit: 'db', // Default unit - not stored in Prisma model
```

The unit is hardcoded as 'db'. This should come from the related StockLevelSetting or be passed in the alert data.

**Recommendation:** Add a comment explaining this limitation, or consider joining with StockLevelSetting to get the actual unit.

---

### LOW-1: inventoryItemId fallback to productId

**File:** `prisma-alert.repository.ts:281`
**Severity:** LOW

```typescript
inventoryItemId: (alert as { inventoryItemId?: string }).inventoryItemId ?? alert.productId,
```

Using productId as fallback for inventoryItemId is semantically incorrect. They are different entities.

**Recommendation:** Document this as a schema limitation or require inventoryItemId in the interface.

---

### LOW-2: OVERSTOCK maps to LOW_STOCK

**File:** `prisma-alert.repository.ts:53`
**Severity:** LOW

```typescript
OVERSTOCK: PrismaAlertType.LOW_STOCK, // Fallback - no direct match
```

OVERSTOCK (too much stock) maps to LOW_STOCK which is semantically opposite. This could cause confusion.

**Recommendation:** Document this limitation. Consider using REORDER_POINT as mapping target instead.

---

### LOW-3: resolvedAt derived from acknowledgedAt

**File:** `prisma-alert.repository.ts:129-133`
**Severity:** LOW

```typescript
if (alert.status === 'RESOLVED') {
  if (alert.acknowledgedAt !== null) result.resolvedAt = alert.acknowledgedAt;
}
```

resolvedAt is derived from acknowledgedAt when status is RESOLVED. These timestamps have different meanings.

**Recommendation:** Add comment clarifying this is an approximation due to schema limitations.

---

## Test Coverage Analysis

| Kategória              | Teszt szám | Státusz |
| ---------------------- | ---------- | ------- |
| StockLevelSetting CRUD | 8          | ✅      |
| Alert CRUD             | 6          | ✅      |
| Alert Query            | 4          | ✅      |
| Alert Summary          | 2          | ✅      |
| Bulk Operations        | 3          | ✅      |
| **Összesen**           | **23**     | ✅      |

---

## Positive Observations

1. **Good type mapping** - Interface-Prisma type mapping well implemented
2. **Consistent patterns** - Same structure as other repositories
3. **Comprehensive tests** - 23 tests covering all methods
4. **Good documentation** - Schema limitations documented in comments

---

## Recommendations

1. **MEDIUM-1:** Fix warehouseId fallback - use null or throw error
2. **MEDIUM-2:** Add comment about unit limitation
3. **LOW-1-3:** Acceptable as documented limitations

---

## Decision

- [ ] 🔴 CHANGES REQUIRED - Fix MEDIUM issues before merging
- [x] ⚠️ APPROVED WITH NOTES - Minor fixes recommended

---

## Fix Tracking

| Issue    | Status      | Action                                                                 |
| -------- | ----------- | ---------------------------------------------------------------------- |
| MEDIUM-1 | ✅ Fixed    | Added validation - throws error if warehouseId/inventoryItemId missing |
| MEDIUM-2 | ✅ Fixed    | Added detailed comments for unit and resolvedAt limitations            |
| LOW-1-3  | ✅ Accepted | Documented limitations                                                 |

---

## Verification

- **Tests:** 25 passed (was 23, added 2 validation tests)
- **TypeScript:** Compiles without errors
- **All issues resolved:** 2026-01-24

---

_Review created: 2026-01-24_
_Review fixed: 2026-01-24_
