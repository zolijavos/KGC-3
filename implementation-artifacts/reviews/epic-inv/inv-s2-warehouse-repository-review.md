# Code Review: INV-S2 PrismaWarehouseRepository

> **Story:** INV-S2 - PrismaWarehouseRepository
> **Reviewer:** Claude (Adversarial Review Round 1)
> **Date:** 2026-01-24
> **Status:** ✅ FIXED

---

## Files Reviewed

- `apps/kgc-api/src/modules/inventory/repositories/prisma-warehouse.repository.ts`
- `apps/kgc-api/src/modules/inventory/repositories/prisma-warehouse.repository.spec.ts`

---

## Summary

A repository implementáció jó minőségű, követi a projekt mintákat és az összes 14 interface metódust implementálja. Azonban **6 kritikus/közepes súlyosságú problémát** találtam, amelyeket javítani kell a story lezárása előtt.

---

## Issues Found

### 🔴 CRITICAL-1: Security - tenantId nem validált a delete/update metódusokban

**File:** `prisma-warehouse.repository.ts:270-278, 235-268, 398-424`
**Severity:** CRITICAL

A `delete()`, `update()`, és `updateTransfer()` metódusok megkapják a `tenantId` paramétert, de nem használják a Prisma where feltételben. Ez lehetővé teszi cross-tenant módosítást/törlést, ha valaki ismeri az ID-t.

```typescript
// JELENLEGI (HIBÁS):
async delete(id: string, _tenantId: string): Promise<void> {
  await this.prisma.warehouse.update({
    where: { id },  // ❌ Nincs tenant validáció!
    data: { ... },
  });
}

// HELYES:
async delete(id: string, tenantId: string): Promise<void> {
  await this.prisma.warehouse.updateMany({
    where: { id, tenantId },  // ✅ Tenant validáció
    data: { ... },
  });
}
```

**Fix Required:** Használj `updateMany` + tenant where feltételt, vagy `findFirst` ellenőrzést minden update/delete előtt.

---

### 🟠 MEDIUM-1: AC3 megsértése - delete() nem ellenőrzi hasInventoryItems-t

**File:** `prisma-warehouse.repository.ts:270-278`
**Severity:** MEDIUM

Az AC3 expliciten kimondja: "Cannot delete warehouse with inventory items (hasInventoryItems check)". A jelenlegi implementáció nem ellenőrzi ezt.

```typescript
// JELENLEGI:
async delete(id: string, _tenantId: string): Promise<void> {
  await this.prisma.warehouse.update({ ... });  // ❌ Nincs inventory check!
}

// HELYES:
async delete(id: string, tenantId: string): Promise<void> {
  const hasItems = await this.hasInventoryItems(id, tenantId);
  if (hasItems) {
    throw new Error('Cannot delete warehouse with inventory items');
  }
  // ... proceed with delete
}
```

---

### 🟠 MEDIUM-2: AC1 megsértése - create() nem dob hibát duplicate code-ra

**File:** `prisma-warehouse.repository.ts:111-141`
**Severity:** MEDIUM

Az AC1 kimondja: "create throws on duplicate code within same tenant". A jelenlegi implementáció hagyja, hogy a Prisma unique constraint hibát dobjon, de:

1. Nincs explicit ellenőrzés
2. A Prisma hiba nem felhasználóbarát

```typescript
// AJÁNLOTT:
async create(warehouse: ...): Promise<Warehouse> {
  const existing = await this.findByCode(warehouse.code, warehouse.tenantId);
  if (existing) {
    throw new Error(`Warehouse with code ${warehouse.code} already exists`);
  }
  // ... proceed
}
```

---

### 🟠 MEDIUM-3: AC5 megsértése - updateTransfer() nem validálja státusz átmeneteket

**File:** `prisma-warehouse.repository.ts:398-424`
**Severity:** MEDIUM

Az AC5 explicit státusz átmeneteket definiál:

- PENDING → IN_TRANSIT → COMPLETED
- PENDING → CANCELLED

A jelenlegi implementáció bármilyen státusz változást elfogad (pl. COMPLETED → PENDING).

```typescript
// AJÁNLOTT:
private validateStatusTransition(current: TransferStatus, next: TransferStatus): boolean {
  const transitions: Record<TransferStatus, TransferStatus[]> = {
    'PENDING': ['IN_TRANSIT', 'CANCELLED'],
    'IN_TRANSIT': ['COMPLETED'],
    'COMPLETED': [],
    'CANCELLED': [],
  };
  return transitions[current]?.includes(next) ?? false;
}
```

---

### 🟡 LOW-1: Hiányzó teszt - duplicate code hiba

**File:** `prisma-warehouse.repository.spec.ts`
**Severity:** LOW

Nincs teszt arra, hogy a `create()` hibát dob duplikált kódra. Az AC1 szerint ez tesztelendő.

---

### 🟡 LOW-2: Hiányzó teszt - delete inventory check

**File:** `prisma-warehouse.repository.spec.ts`
**Severity:** LOW

Nincs teszt arra, hogy a `delete()` megtagadja a törlést ha van készlet a raktárban.

---

### 🟡 LOW-3: productName placeholder getCrossWarehouseStock-ban

**File:** `prisma-warehouse.repository.ts:509`
**Severity:** LOW

```typescript
productName: productId, // TODO: Join with Product table when available
```

Ez elfogadható jelenleg, mert a Product tábla még nincs implementálva. De dokumentálni kell, hogy ez egy technikai adósság.

---

## Test Coverage Analysis

| Kategória       | Teszt szám | Státusz |
| --------------- | ---------- | ------- |
| Warehouse CRUD  | 10         | ✅      |
| Warehouse Query | 5          | ✅      |
| Transfer CRUD   | 5          | ✅      |
| Cross-Warehouse | 3          | ✅      |
| Hiányzó tesztek | 2          | ❌      |
| **Összesen**    | **24**     | ⚠️      |

---

## Recommendations

1. **CRITICAL-1:** Azonnal javítandó - security issue
2. **MEDIUM-1, MEDIUM-2, MEDIUM-3:** Story befejezése előtt javítandó
3. **LOW-1, LOW-2:** Tesztek hozzáadása
4. **LOW-3:** Elfogadható technikai adósság

---

## Decision

- [x] ✅ APPROVED - All issues fixed
- [ ] 🔴 CHANGES REQUIRED - Fix issues before merging
- [ ] ⚠️ APPROVED WITH NOTES - Minor issues, can merge

---

## Fix Tracking

| Issue      | Status                   | Fixed By                                                           |
| ---------- | ------------------------ | ------------------------------------------------------------------ |
| CRITICAL-1 | ✅ Fixed                 | Added tenantId validation with findFirst before update/delete      |
| MEDIUM-1   | ✅ Fixed                 | Added hasInventoryItems() check before delete                      |
| MEDIUM-2   | ✅ Fixed                 | Added duplicate code check in create()                             |
| MEDIUM-3   | ✅ Fixed                 | Added isValidStatusTransition() method                             |
| LOW-1      | ✅ Fixed                 | Added test "should throw error on duplicate code within tenant"    |
| LOW-2      | ✅ Fixed                 | Added test "should throw error when warehouse has inventory items" |
| LOW-3      | ⏳ Accepted as tech debt | productName uses productId placeholder                             |

---

## Verification

- **Tests:** 30 passed (was 24, added 6 new tests)
- **TypeScript:** Compiles without errors
- **All issues resolved:** 2026-01-24

---

_Review created: 2026-01-24_
_Review fixed: 2026-01-24_
