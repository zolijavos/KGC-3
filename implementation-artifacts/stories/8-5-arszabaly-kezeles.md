# Story 8-5: Árszabály Kezelés

**Status:** done
**Epic:** Epic 8 - Product Catalog (@kgc/cikk)
**Package:** `packages/shared/cikk/` → `@kgc/cikk`

---

## Story

**As a** admin felhasználó,
**I want** hierarchikus árszabályokat kezelni,
**So that** rugalmasan tudok árat kalkulálni akciók, partnerek és kategóriák alapján.

---

## Acceptance Criteria

### AC1: Árszabály típusok

**Given** egy árszabály létrehozása
**When** a szabály típusát választom
**Then** a következő típusok támogatottak:
- PROMOTION: Akció (időkorlátozott)
- PARTNER: Partner kedvezmény
- ITEM: Cikk-specifikus ár
- SUPPLIER: Beszállító szintű
- CATEGORY: Cikkcsoport szintű
- LIST: Listaár (alapértelmezett)

### AC2: Kalkulációs típusok

**Given** egy árszabály
**When** kalkulációs típust választok
**Then** elérhető:
- FIXED: Fix ár (HUF)
- PERCENTAGE: Százalékos árrés
- DISCOUNT: Kedvezmény % (listaárból)
- LIST_PRICE: Beszállítói listaár használata

### AC3: Prioritás rendszer (ADR-012)

**Given** több árszabály alkalmazható egy cikkre
**When** ár kalkuláció történik
**Then** a szabályok prioritás sorrendben kerülnek alkalmazásra:
1. Promotion (100)
2. Partner (80)
3. Item (60)
4. Supplier (40)
5. Category (20)
6. List price (0)

### AC4: Időalapú érvényesség

**Given** promotion típusú szabály
**When** validFrom/validTo dátumot állítok be
**Then** a szabály csak az adott időszakban érvényes
**And** lejárat után EXPIRED státuszba kerül

### AC5: Árkalkuláció

**Given** itemId, categoryId, partnerId, supplierId és basePrice
**When** calculatePrice metódust hívom
**Then** megkapom:
- finalPrice: végső ár
- appliedRules: alkalmazott szabályok listája
- totalDiscount: összes kedvezmény (HUF)
- totalDiscountPercent: kedvezmény %

---

## Tasks / Subtasks

- [x] **Task 1: Interface és típusok** (AC: #1, #2)
  - [x] 1.1: PriceRuleType enum (6 típus)
  - [x] 1.2: PriceCalculationType enum (4 típus)
  - [x] 1.3: PriceRuleStatus enum (ACTIVE, INACTIVE, SCHEDULED, EXPIRED)
  - [x] 1.4: PriceRule interface és variánsok
  - [x] 1.5: CreatePriceRuleInput, UpdatePriceRuleInput
  - [x] 1.6: PriceCalculationContext, PriceCalculationResult

- [x] **Task 2: Prisma Schema** (AC: #3, #4)
  - [x] 2.1: PriceRule model (29 mező)
  - [x] 2.2: Indexek: tenantId, ruleType, status, itemId, categoryId, etc.
  - [x] 2.3: Enums: PriceRuleType, PriceCalculationType, PriceRuleStatus

- [x] **Task 3: PriceRuleService CRUD** (AC: #1, #4)
  - [x] 3.1: createPriceRule() - default priority, auto status
  - [x] 3.2: updatePriceRule() - partial update
  - [x] 3.3: deletePriceRule() - audit log
  - [x] 3.4: getPriceRuleById()
  - [x] 3.5: listPriceRules() - pagination, filter

- [x] **Task 4: Árkalkuláció** (AC: #3, #5)
  - [x] 4.1: calculatePrice() - priority-based application
  - [x] 4.2: getApplicableRules() - rule matching
  - [x] 4.3: FIXED: replace price
  - [x] 4.4: PERCENTAGE: add markup
  - [x] 4.5: DISCOUNT: subtract percentage
  - [x] 4.6: Validity date check

- [x] **Task 5: Unit Tests (TDD)**
  - [x] 5.1: createPriceRule tesztek (5 teszt)
  - [x] 5.2: calculatePrice tesztek (7 teszt)
  - [x] 5.3: Priority ordering tesztek (2 teszt)
  - [x] 5.4: Update/delete tesztek (3 teszt)
  - [x] 5.5: List/filter tesztek (4 teszt)

---

## Implementation Notes

### Hierarchikus árazás (ADR-012)

A rendszer kombinált hierarchikus árazást alkalmaz:
1. Alacsonyabb prioritású szabályok először (category → supplier → item → partner → promotion)
2. Minden szabály a már módosított árra hat
3. Fix ár (FIXED) felülírja az aktuális árat
4. Százalékos (PERCENTAGE) hozzáad az aktuális árhoz
5. Kedvezmény (DISCOUNT) levon az aktuális árból

### Példa kalkuláció

```
Base price: 100,000 HUF
1. Category rule (+30% markup): 100,000 * 1.30 = 130,000
2. Partner rule (-10% discount): 130,000 * 0.90 = 117,000
Final price: 117,000 HUF
```

---

## Test Results

```
21 tests passed (21)
- createPriceRule: 5 tests
- calculatePrice: 7 tests
- rule priority: 2 tests
- updatePriceRule: 2 tests
- deletePriceRule: 1 test
- getApplicableRules: 2 tests
- listPriceRules: 2 tests
```

---

## Files Created

| File | Description |
|------|-------------|
| `src/interfaces/price-rule.interface.ts` | Típusok és interface-ek |
| `src/services/price-rule.service.ts` | CRUD + árkalkuláció |
| `src/services/price-rule.service.spec.ts` | 21 unit teszt |
| `prisma/schema.prisma` | PriceRule model + enumok |
| `src/index.ts` | Export frissítés |

---

## DoD Checklist

- [x] Összes AC implementálva
- [x] Unit tesztek (21 teszt) átmentek
- [x] TypeScript strict mode megfelelés
- [x] Prisma schema frissítve
- [x] Index.ts exportok hozzáadva
- [x] Kód dokumentálva (JSDoc)
- [x] ADR-012 követelményei teljesítve
