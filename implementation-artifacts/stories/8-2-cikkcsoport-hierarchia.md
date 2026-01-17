# Story 8.2: Cikkcsoport Hierarchia

**Status:** ready-for-dev
**Epic:** Epic 8 - Product Catalog (@kgc/cikk)
**Package:** `packages/shared/cikk/` → `@kgc/cikk`

---

## Story

**As a** admin,
**I want** kategória hierarchiát kezelni,
**So that** termékek logikusan csoportosulva legyenek.

---

## Acceptance Criteria

### AC1: Kategória CRUD

**Given** admin jogosultság
**When** POST/GET/PATCH/DELETE /api/v1/categories
**Then** kategória létrehozás, lekérdezés, módosítás, törlés
**And** kötelező mezők: name, code (unique per tenant)
**And** opcionális: description, parentId, image
**And** soft delete (status: INACTIVE)

### AC2: Fa Struktúra (Parent-Child)

**Given** kategória parentId mezővel
**When** kategóriát hozok létre
**Then** gyermek-szülő kapcsolat létrejön
**And** max 5 mélységű hierarchia
**And** körkörös referencia tiltott
**And** gyermekek lekérdezése (children[])

### AC3: Kategória Fa Lekérdezés

**Given** meglévő kategória hierarchia
**When** GET /api/v1/categories/tree
**Then** teljes fa struktúra visszaadva
**And** tenant izolált (RLS)
**And** opcionális: rootOnly, maxDepth filter

### AC4: Cikk-Kategória Kapcsolat

**Given** cikk és kategória entitások
**When** cikk létrehozás/módosítás
**Then** cikk egy kategóriába tartozik (categoryId FK)
**And** kategória törlés esetén cikkek kategória nélkül maradnak
**And** kategória alapú cikk szűrés működik

### AC5: Kategória Statisztikák

**Given** kategória cikkekkel
**When** GET /api/v1/categories/:id/stats
**Then** itemCount (közvetlen cikkek száma)
**And** totalItemCount (al-kategóriákkal együtt)
**And** activeItemCount (csak aktív cikkek)

---

## Tasks / Subtasks

- [ ] **Task 1: Prisma Schema Bővítés** (AC: #1, #2)
  - [ ] 1.1: Category entity (id, tenantId, code, name, parentId, status, path)
  - [ ] 1.2: CategoryStatus enum (ACTIVE, INACTIVE)
  - [ ] 1.3: Self-referencing FK (parentId → Category)
  - [ ] 1.4: Indexes: tenantId, code, parentId, path
  - [ ] 1.5: Unique constraint: (tenantId, code)
  - [ ] 1.6: Item.categoryId FK update

- [ ] **Task 2: Category Service (TDD)** (AC: #1, #2, #3)
  - [ ] 2.1: CategoryService létrehozása
  - [ ] 2.2: `createCategory(dto)` - validáció + max depth check
  - [ ] 2.3: `getCategoryById(id)` - lekérdezés
  - [ ] 2.4: `updateCategory(id, dto)` - módosítás + circular ref check
  - [ ] 2.5: `deleteCategory(id)` - soft delete + gyermekek kezelése
  - [ ] 2.6: `getCategoryTree(filter)` - fa struktúra
  - [ ] 2.7: `getChildren(id)` - közvetlen gyermekek
  - [ ] 2.8: `getAncestors(id)` - ősök lánca
  - [ ] 2.9: Unit tesztek (TDD - minimum 15 teszt)

- [ ] **Task 3: Hierarchy Validation Service (TDD)** (AC: #2)
  - [ ] 3.1: HierarchyValidationService létrehozása
  - [ ] 3.2: `validateMaxDepth(parentId)` - max 5 szint
  - [ ] 3.3: `detectCircularReference(categoryId, newParentId)` - kör detektálás
  - [ ] 3.4: `calculatePath(categoryId)` - materialized path számítás
  - [ ] 3.5: Unit tesztek (TDD - minimum 8 teszt)

- [ ] **Task 4: Category Stats Service (TDD)** (AC: #5)
  - [ ] 4.1: CategoryStatsService létrehozása
  - [ ] 4.2: `getStats(categoryId)` - itemCount, totalItemCount
  - [ ] 4.3: `getActiveItemCount(categoryId)` - csak aktív cikkek
  - [ ] 4.4: Unit tesztek (TDD - minimum 5 teszt)

- [ ] **Task 5: Category Controller** (AC: #1, #3, #5)
  - [ ] 5.1: CategoryController létrehozása
  - [ ] 5.2: POST /api/v1/categories - create
  - [ ] 5.3: GET /api/v1/categories - list
  - [ ] 5.4: GET /api/v1/categories/tree - fa struktúra
  - [ ] 5.5: GET /api/v1/categories/:id - get by id
  - [ ] 5.6: GET /api/v1/categories/:id/children - gyermekek
  - [ ] 5.7: GET /api/v1/categories/:id/stats - statisztikák
  - [ ] 5.8: PATCH /api/v1/categories/:id - update
  - [ ] 5.9: DELETE /api/v1/categories/:id - soft delete

- [ ] **Task 6: Input Validation DTOs** (AC: #1)
  - [ ] 6.1: CreateCategoryDto (code, name, parentId?, description?)
  - [ ] 6.2: UpdateCategoryDto (partial)
  - [ ] 6.3: CategoryFilterDto (search, parentId, rootOnly, includeInactive)
  - [ ] 6.4: Zod validáció magyar hibaüzenetekkel

- [ ] **Task 7: Item-Category Integration** (AC: #4)
  - [ ] 7.1: ItemService frissítés categoryId validációval
  - [ ] 7.2: Item filter bővítés categoryId támogatással
  - [ ] 7.3: Cascade logic: kategória törlés → cikk.categoryId = null

- [ ] **Task 8: E2E Tests** (AC: all)
  - [ ] 8.1: Category CRUD happy path
  - [ ] 8.2: Hierarchy (parent-child) tesztek
  - [ ] 8.3: Max depth validation teszt
  - [ ] 8.4: Circular reference detection teszt
  - [ ] 8.5: Category stats teszt
  - [ ] 8.6: Item-Category kapcsolat tesztek
  - [ ] 8.7: Integration tesztek (minimum 12 teszt)

---

## Dev Notes

### Technológiai Stack

| Technológia | Verzió | Használat |
| ----------- | ------ | --------- |
| NestJS      | 10.x   | Backend framework |
| Prisma      | 5.x    | ORM (self-referencing FK) |
| PostgreSQL  | 15+    | Database (RLS enabled) |
| zod         | 3.23.x | Validation (DTO) |

### Architektúra Minták

```typescript
// Category entity
interface Category {
  id: string;              // UUID
  tenantId: string;        // FK to Tenant (RLS)
  code: string;            // Kategória kód (unique per tenant)
  name: string;            // Kategória neve
  description?: string;    // Leírás
  parentId?: string;       // FK to parent Category (self-ref)
  path: string;            // Materialized path: /root/parent/child
  depth: number;           // Hierarchia mélység (0-4)
  status: CategoryStatus;  // ACTIVE | INACTIVE

  // Computed/Virtual
  children?: Category[];   // Gyermek kategóriák
  itemCount?: number;      // Közvetlen cikkek száma

  createdAt: Date;
  updatedAt: Date;
}

enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

### Hierarchia Validáció

```typescript
// Max 5 szint mélység
const MAX_DEPTH = 5;

// Materialized path pattern
// path: "/electronics/power-tools/drills"
// depth: 2

// Circular reference check
async function detectCircularReference(
  categoryId: string,
  newParentId: string
): Promise<boolean> {
  // Get ancestors of newParentId
  // If categoryId is in ancestors → circular!
}
```

### API Response Format

```typescript
// Category tree response
{
  "data": [
    {
      "id": "uuid",
      "code": "POWER-TOOLS",
      "name": "Elektromos szerszámok",
      "depth": 0,
      "children": [
        {
          "id": "uuid",
          "code": "DRILLS",
          "name": "Fúrógépek",
          "depth": 1,
          "children": [...]
        }
      ]
    }
  ]
}

// Category stats response
{
  "data": {
    "categoryId": "uuid",
    "itemCount": 15,
    "totalItemCount": 42,
    "activeItemCount": 38
  }
}
```

### Project Structure

```
packages/shared/cikk/
├── src/
│   ├── services/
│   │   ├── category.service.ts
│   │   ├── category.service.spec.ts
│   │   ├── hierarchy-validation.service.ts
│   │   ├── hierarchy-validation.service.spec.ts
│   │   ├── category-stats.service.ts
│   │   └── category-stats.service.spec.ts
│   ├── dto/
│   │   ├── create-category.dto.ts
│   │   ├── update-category.dto.ts
│   │   └── category-filter.dto.ts
│   ├── interfaces/
│   │   └── category.interface.ts
│   └── category.controller.ts
└── prisma/
    └── schema.prisma  # Category entity hozzáadva
```

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor - 85% coverage:**
- `category.service.spec.ts` - minimum 15 teszt
- `hierarchy-validation.service.spec.ts` - minimum 8 teszt
- `category-stats.service.spec.ts` - minimum 5 teszt

### Dependencies

```json
{
  "dependencies": {
    "@kgc/tenant": "workspace:*",
    "@kgc/audit": "workspace:*"
  }
}
```

---

### References

- [Source: planning-artifacts/epics.md - Story 8.2]
- [Source: planning-artifacts/prd.md - FR35]
- [Source: packages/shared/cikk/prisma/schema.prisma]

---

## Change Log

| Dátum      | Változás                            | Szerző          |
| ---------- | ----------------------------------- | --------------- |
| 2026-01-16 | Story file létrehozva (auto-pilot)  | Claude Opus 4.5 |
