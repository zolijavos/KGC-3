# Story 8.1: Cikk CRUD

**Status:** done
**Epic:** Epic 8 - Product Catalog (@kgc/cikk)
**Package:** `packages/shared/cikk/` → `@kgc/cikk`

---

## Story

**As a** admin,
**I want** termékeket és alkatrészeket rögzíteni,
**So that** készlet és bérlés alapja legyen.

---

## Acceptance Criteria

### AC1: Cikk Létrehozás

**Given** cikk adatok (kód, név, kategória, ár)
**When** POST /api/v1/products
**Then** cikk létrejön tenant context-ben
**And** itemType: PRODUCT (termék), PART (alkatrész), SERVICE (szolgáltatás)
**And** kötelező mezők: code (unique per tenant), name, itemType
**And** tenant_id automatikusan beállítódik

### AC2: Cikk Kód Generálás

**Given** új cikk létrehozása kód nélkül
**When** POST /api/v1/products code mező nélkül
**Then** automatikus kód generálás: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
**And** PREFIX: PRD (termék), PRT (alkatrész), SVC (szolgáltatás)
**And** SEQUENCE: 4 számjegyű szekvenciális szám (0001-9999)
**And** unique constraint tenant + code kombinációra

### AC3: Cikk CRUD Műveletek

**Given** létező cikk
**When** GET/PATCH/DELETE /api/v1/products/:id
**Then** megfelelő CRUD művelet végrehajtódik
**And** soft delete implementálva (status: INACTIVE)
**And** audit log bejegyzés minden módosításról
**And** csak saját tenant cikkei láthatók (RLS)

### AC4: Vonalkód Kezelés

**Given** cikk vonalkód mezővel
**When** cikk létrehozás/módosítás
**Then** vonalkód opcionálisan megadható vagy generálható
**And** EAN-13 formátum validáció ha megadva
**And** unique constraint vonalkódra (tenant-en belül)
**And** alternatív vonalkódok támogatása (alternativeBarcodes[])

### AC5: Cikk Lista és Keresés

**Given** meglévő cikkek
**When** GET /api/v1/products?search=&type=&status=&categoryId=&page=&limit=
**Then** lapozható cikk lista
**And** keresés kód, név, vonalkód alapján
**And** szűrés típus, státusz, kategória szerint
**And** rendezés: name asc (alapértelmezett), createdAt desc, code asc

### AC6: Alapértelmezett Árak

**Given** cikk árazási mezőkkel
**When** cikk létrehozás/módosítás
**Then** listPrice (listaár) kötelező PRODUCT és PART típusnál
**And** costPrice (beszerzési ár) opcionális
**And** unitOfMeasure: db, kg, m, óra, stb.
**And** vatRate: 27% (alapértelmezett magyar ÁFA)

---

## Tasks / Subtasks

- [x] **Task 1: Package Setup** (AC: all) ✅
  - [x] 1.1: @kgc/cikk package létrehozása (package.json, tsconfig.json)
  - [x] 1.2: vitest.config.ts konfigurálás
  - [x] 1.3: Prisma schema létrehozása Item (cikk) entitással
  - [x] 1.4: Függőségek: @nestjs/common, prisma, zod, @kgc/tenant, @kgc/audit

- [x] **Task 2: Prisma Schema** (AC: #1, #2, #4, #6) ✅
  - [x] 2.1: Item entity (id, tenantId, code, name, itemType, status, createdAt, updatedAt)
  - [x] 2.2: ItemType enum (PRODUCT, PART, SERVICE)
  - [x] 2.3: ItemStatus enum (ACTIVE, INACTIVE, DISCONTINUED)
  - [x] 2.4: Pricing fields (listPrice, costPrice, vatRate, unitOfMeasure)
  - [x] 2.5: Barcode fields (barcode, alternativeBarcodes[])
  - [x] 2.6: Indexes: tenantId, code, barcode, name (fulltext)
  - [x] 2.7: Unique constraints: (tenantId, code), (tenantId, barcode)

- [x] **Task 3: Item Service (TDD)** (AC: #1, #2, #3) ✅
  - [x] 3.1: ItemService létrehozása
  - [x] 3.2: `createItem(dto)` - cikk létrehozás + kód generálás
  - [x] 3.3: `getItemById(id)` - cikk lekérdezés
  - [x] 3.4: `updateItem(id, dto)` - cikk módosítás
  - [x] 3.5: `deleteItem(id)` - soft delete (status: INACTIVE)
  - [x] 3.6: `listItems(filter)` - lista, keresés, szűrés
  - [x] 3.7: Unit tesztek (TDD - **23 teszt**)

- [x] **Task 4: Code Generator Service (TDD)** (AC: #2) ✅
  - [x] 4.1: ItemCodeGeneratorService létrehozása
  - [x] 4.2: `generateCode(itemType, tenantId)` - kód generálás
  - [x] 4.3: `getNextSequence(prefix, date, tenantId)` - szekvencia lekérdezés
  - [x] 4.4: Prefix mapping: PRODUCT→PRD, PART→PRT, SERVICE→SVC
  - [x] 4.5: Unit tesztek (TDD - **9 teszt**)

- [x] **Task 5: Barcode Service (TDD)** (AC: #4) ✅
  - [x] 5.1: BarcodeService létrehozása
  - [x] 5.2: `validateEAN13(barcode)` - EAN-13 validáció (check digit)
  - [x] 5.3: `generateEAN13(tenantPrefix)` - EAN-13 generálás
  - [x] 5.4: `findByBarcode(barcode, tenantId)` - keresés vonalkód alapján
  - [x] 5.5: Unit tesztek (TDD - **12 teszt**)

- [x] **Task 6: Item Controller** (AC: #1, #3, #5) ✅
  - [x] 6.1: ItemController létrehozása
  - [x] 6.2: POST /api/v1/products - create
  - [x] 6.3: GET /api/v1/products - list with pagination
  - [x] 6.4: GET /api/v1/products/:id - get by id
  - [x] 6.5: PATCH /api/v1/products/:id - update
  - [x] 6.6: DELETE /api/v1/products/:id - soft delete
  - [x] 6.7: GET /api/v1/products/barcode/:barcode - find by barcode

- [x] **Task 7: Input Validation DTOs** (AC: #1, #4, #5, #6) ✅
  - [x] 7.1: CreateItemDto (code?, name, itemType, listPrice?, barcode?, etc.)
  - [x] 7.2: UpdateItemDto (partial of CreateItemDto)
  - [x] 7.3: ItemFilterDto (search, type, status, categoryId, page, limit, sortBy)
  - [x] 7.4: Zod validáció magyar hibaüzenetekkel
  - [x] 7.5: EAN-13 custom validator

- [x] **Task 8: Item Module** (AC: all) ✅
  - [x] 8.1: ItemModule létrehozása
  - [x] 8.2: Service-ek regisztrálása (ItemService, ItemCodeGeneratorService, BarcodeService)
  - [x] 8.3: Controller regisztrálása
  - [x] 8.4: @kgc/tenant dependency (TenantContextMiddleware)
  - [x] 8.5: @kgc/audit dependency (AuditService)
  - [x] 8.6: Export: ItemService, BarcodeService, interfaces

- [x] **Task 9: E2E Tests** (AC: all) ✅
  - [x] 9.1: Happy path: item CRUD teljes flow
  - [x] 9.2: Auto code generation teszt
  - [x] 9.3: Barcode validation és duplicate check
  - [x] 9.4: Pagination és filter tesztek
  - [x] 9.5: RLS isolation teszt (tenant A ≠ tenant B)
  - [x] 9.6: Integration tesztek (**16 teszt**)

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
| ----------- | ------ | --------- |
| NestJS      | 10.x   | Backend framework |
| Prisma      | 5.x    | ORM |
| PostgreSQL  | 15+    | Database (RLS enabled) |
| zod         | 3.23.x | Validation (DTO) |
| uuid        | 9.x    | Item ID generálás |

### Architektúra Minták

```typescript
// Item (Cikk) entity
interface Item {
  id: string;              // UUID
  tenantId: string;        // FK to Tenant (RLS)
  code: string;            // Cikkszám (unique per tenant)
  name: string;            // Cikk neve
  description?: string;    // Leírás
  itemType: ItemType;      // PRODUCT | PART | SERVICE
  status: ItemStatus;      // ACTIVE | INACTIVE | DISCONTINUED

  // Pricing
  listPrice?: number;      // Listaár (HUF) - kötelező PRODUCT/PART-nál
  costPrice?: number;      // Beszerzési ár
  vatRate: number;         // ÁFA kulcs (default: 27)
  unitOfMeasure: string;   // Mértékegység (db, kg, m, óra)

  // Barcode
  barcode?: string;        // EAN-13 vonalkód (unique per tenant)
  alternativeBarcodes: string[]; // Alternatív vonalkódok

  // Category (Story 8-2)
  categoryId?: string;     // FK to Category

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

enum ItemType {
  PRODUCT = 'PRODUCT',     // Termék (eladásra)
  PART = 'PART',           // Alkatrész (szervizhez)
  SERVICE = 'SERVICE',     // Szolgáltatás (munkadíj)
}

enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',       // Soft deleted
  DISCONTINUED = 'DISCONTINUED', // Kifutott termék
}
```

### Cikk Kód Generálás

```typescript
// Formátum: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
// Példák:
// PRD-20260116-0001 (első termék ma)
// PRT-20260116-0042 (42. alkatrész ma)
// SVC-20260116-0001 (első szolgáltatás ma)

const PREFIX_MAP: Record<ItemType, string> = {
  PRODUCT: 'PRD',
  PART: 'PRT',
  SERVICE: 'SVC',
};

async function generateCode(itemType: ItemType, tenantId: string): Promise<string> {
  const prefix = PREFIX_MAP[itemType];
  const date = format(new Date(), 'yyyyMMdd');
  const sequence = await this.getNextSequence(prefix, date, tenantId);
  return `${prefix}-${date}-${sequence.toString().padStart(4, '0')}`;
}
```

### EAN-13 Validáció

```typescript
// EAN-13: 13 számjegy, utolsó a check digit
function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;

  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}
```

### Project Structure

```
packages/shared/cikk/
├── src/
│   ├── index.ts                     # Barrel export
│   ├── item.module.ts
│   ├── item.controller.ts
│   ├── item.controller.spec.ts      # E2E tests
│   ├── services/
│   │   ├── item.service.ts
│   │   ├── item.service.spec.ts     # TDD - 20+ tesztek
│   │   ├── item-code-generator.service.ts
│   │   ├── item-code-generator.service.spec.ts # TDD - 8+ tesztek
│   │   ├── barcode.service.ts
│   │   └── barcode.service.spec.ts  # TDD - 10+ tesztek
│   ├── dto/
│   │   ├── create-item.dto.ts
│   │   ├── update-item.dto.ts
│   │   └── item-filter.dto.ts
│   └── interfaces/
│       └── item.interface.ts
├── prisma/
│   └── schema.prisma                # Item entity
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### API Response Format

```typescript
// Sikeres válasz
{
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "code": "PRD-20260116-0001",
    "name": "Makita fúrógép",
    "itemType": "PRODUCT",
    "status": "ACTIVE",
    "listPrice": 125000,
    "vatRate": 27,
    "unitOfMeasure": "db",
    "barcode": "5901234123457",
    "createdAt": "2026-01-16T...",
    "updatedAt": "2026-01-16T..."
  }
}

// Lista válasz
{
  "data": [...],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "totalPages": 63
  }
}

// Hiba válasz
{
  "error": {
    "code": "DUPLICATE_BARCODE",
    "message": "Ez a vonalkód már létezik",
    "fields": {
      "barcode": "A 5901234123457 vonalkód már regisztrálva van"
    }
  }
}
```

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor - 85% coverage:**
- `item.service.spec.ts` - minimum 20 teszt (CRUD, validation, search)
- `item-code-generator.service.spec.ts` - minimum 8 teszt (generation, sequence)
- `barcode.service.spec.ts` - minimum 10 teszt (EAN-13 validation, generation)

### Dependencies

```json
{
  "dependencies": {
    "@kgc/tenant": "workspace:*",  // TenantContextMiddleware, @CurrentTenant
    "@kgc/audit": "workspace:*",   // AuditService
    "@kgc/common": "workspace:*"   // Base interfaces, utils
  }
}
```

---

### References

- [Source: planning-artifacts/epics.md - Story 8.1]
- [Source: planning-artifacts/prd.md - FR34-FR42]
- [Source: docs/project-context.md - Product Catalog]
- [Source: docs/kgc3-development-principles.md - TDD requirements]
- [Source: planning-artifacts/adr/ADR-001-franchise-multi-tenancy.md]

---

## Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| item.service.spec.ts | 30 | PASS |
| item-code-generator.service.spec.ts | 9 | PASS |
| barcode.service.spec.ts | 15 | PASS |
| item.e2e.spec.ts | 16 | PASS |
| **Total** | **70** | **ALL PASS** |

**Coverage:** 94.76% lines, 94.11% functions, 84.21% branches

---

## Code Review Results

**Reviewer:** Claude Opus 4.5 (Auto-Pilot Adversarial)
**Date:** 2026-01-16
**Verdict:** PASSED (3 issues javítva)

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | MEDIUM | calculateCheckDigit error path nem tesztelt | ✅ FIXED |
| 2 | MEDIUM | generateEAN13 max retry error nem tesztelt | ✅ FIXED |
| 3 | MINOR | updateItem UUID validáció hiányzott | ✅ FIXED |

---

## Change Log

| Dátum      | Változás                            | Szerző          |
| ---------- | ----------------------------------- | --------------- |
| 2026-01-16 | Story DONE (code review passed)     | Claude Opus 4.5 |
| 2026-01-16 | Code review: 3 issues fixed         | Claude Opus 4.5 |
| 2026-01-16 | Implementation complete (70 tests)  | Claude Opus 4.5 |
| 2026-01-16 | Story file létrehozva               | Claude Opus 4.5 |
