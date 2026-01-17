# Story 7.1: Partner CRUD (Magánszemély és Cég)

**Status:** ready-for-dev
**Epic:** Epic 7 - Partner Management (@kgc/partner)
**Package:** `packages/shared/partner/` → `@kgc/partner`

---

## Story

**As a** operátor,
**I want** partnereket (ügyfeleket) rögzíteni,
**So that** bérléshez/szervizhez azonosíthatók legyenek.

---

## Acceptance Criteria

### AC1: Partner Létrehozás

**Given** partner adatok (név, telefon, email, cím)
**When** POST /api/v1/partners
**Then** partner létrejön tenant context-ben
**And** partnerType: INDIVIDUAL (magánszemély) vagy COMPANY (cég)
**And** kötelező mezők: name, phone (legalább egyik)
**And** tenant_id automatikusan beállítódik

### AC2: Cég Specifikus Mezők

**Given** partnerType: COMPANY
**When** partner létrehozás/módosítás
**Then** extra mezők elérhetők: taxNumber (adószám), registrationNumber (cégjegyzékszám)
**And** adószám validáció (magyar formátum: 8 számjegy-1-2 számjegy)
**And** cég esetén contactPerson kötelező

### AC3: Partner CRUD Műveletek

**Given** létező partner
**When** GET/PATCH/DELETE /api/v1/partners/:id
**Then** megfelelő CRUD művelet végrehajtódik
**And** soft delete implementálva (status: INACTIVE)
**And** audit log bejegyzés minden módosításról
**And** csak saját tenant partnerei láthatók (RLS)

### AC4: Duplikáció Ellenőrzés

**Given** új partner adatok
**When** POST /api/v1/partners
**Then** duplikáció ellenőrzés fut (telefon, email)
**And** 409 Conflict ha pontos egyezés van
**And** figyelmeztetés ha hasonló található (fuzzy match)
**And** force flag-gel felülírható

### AC5: Partner Lista és Keresés

**Given** meglévő partnerek
**When** GET /api/v1/partners?search=&type=&status=&page=&limit=
**Then** lapozható partner lista
**And** keresés név, telefon, email alapján
**And** szűrés típus és státusz szerint
**And** rendezés: lastInteraction desc (legutóbbi interakció)

### AC6: Elérhetőség Kezelés

**Given** partner több elérhetőséggel
**When** partner létrehozás/módosítás
**Then** több telefon és email támogatott
**And** primary flag megjelölés
**And** címek: billing (számlázási), shipping (szállítási) típussal

---

## Tasks / Subtasks

- [ ] **Task 1: Package Setup** (AC: all)
  - [ ] 1.1: @kgc/partner package létrehozása (package.json, tsconfig.json)
  - [ ] 1.2: vitest.config.ts konfigurálás
  - [ ] 1.3: Prisma schema létrehozása Partner entitással
  - [ ] 1.4: Függőségek: @nestjs/common, prisma, zod, @kgc/tenant, @kgc/audit

- [ ] **Task 2: Prisma Schema** (AC: #1, #2, #6)
  - [ ] 2.1: Partner entity (id, tenantId, name, partnerType, status, createdAt, updatedAt)
  - [ ] 2.2: PartnerType enum (INDIVIDUAL, COMPANY)
  - [ ] 2.3: PartnerStatus enum (ACTIVE, INACTIVE, BLACKLISTED)
  - [ ] 2.4: CompanyDetails relation (taxNumber, registrationNumber, contactPerson)
  - [ ] 2.5: ContactInfo relation (phones[], emails[], addresses[])
  - [ ] 2.6: Indexes: tenantId, phone, email, name

- [ ] **Task 3: Partner Service (TDD)** (AC: #1, #2, #3)
  - [ ] 3.1: PartnerService létrehozása
  - [ ] 3.2: `createPartner(dto)` - partner + company details + contacts
  - [ ] 3.3: `getPartnerById(id)` - partner lekérdezés includes-szal
  - [ ] 3.4: `updatePartner(id, dto)` - partner módosítás
  - [ ] 3.5: `deletePartner(id)` - soft delete (status: INACTIVE)
  - [ ] 3.6: `listPartners(filter)` - lista, keresés, szűrés
  - [ ] 3.7: Unit tesztek (TDD - minimum 20 teszt)

- [ ] **Task 4: Duplikáció Service (TDD)** (AC: #4)
  - [ ] 4.1: DuplicateCheckService létrehozása
  - [ ] 4.2: `checkExactDuplicate(phone, email)` - pontos egyezés
  - [ ] 4.3: `checkFuzzyDuplicate(name, phone)` - hasonlóság keresés
  - [ ] 4.4: DuplicateCheckResult interface
  - [ ] 4.5: Unit tesztek (TDD - minimum 8 teszt)

- [ ] **Task 5: Validáció Service (TDD)** (AC: #2)
  - [ ] 5.1: PartnerValidationService létrehozása
  - [ ] 5.2: `validateTaxNumber(taxNumber)` - magyar adószám formátum
  - [ ] 5.3: `validatePhone(phone)` - magyar telefonszám
  - [ ] 5.4: `validateEmail(email)` - email formátum
  - [ ] 5.5: Unit tesztek (TDD - minimum 10 teszt)

- [ ] **Task 6: Partner Controller** (AC: #1, #3, #5)
  - [ ] 6.1: PartnerController létrehozása
  - [ ] 6.2: POST /api/v1/partners - create
  - [ ] 6.3: GET /api/v1/partners - list with pagination
  - [ ] 6.4: GET /api/v1/partners/:id - get by id
  - [ ] 6.5: PATCH /api/v1/partners/:id - update
  - [ ] 6.6: DELETE /api/v1/partners/:id - soft delete

- [ ] **Task 7: Input Validation DTOs** (AC: #1, #2, #5)
  - [ ] 7.1: CreatePartnerDto (name, phone, email, partnerType, companyDetails?)
  - [ ] 7.2: UpdatePartnerDto (partial of CreatePartnerDto)
  - [ ] 7.3: PartnerFilterDto (search, type, status, page, limit, sortBy)
  - [ ] 7.4: CompanyDetailsDto (taxNumber, registrationNumber, contactPerson)
  - [ ] 7.5: ContactInfoDto (phones[], emails[], addresses[])
  - [ ] 7.6: Zod validáció magyar hibaüzenetekkel

- [ ] **Task 8: Partner Module** (AC: all)
  - [ ] 8.1: PartnerModule létrehozása
  - [ ] 8.2: Service-ek regisztrálása (PartnerService, DuplicateCheckService, PartnerValidationService)
  - [ ] 8.3: Controller regisztrálása
  - [ ] 8.4: @kgc/tenant dependency (TenantContextMiddleware)
  - [ ] 8.5: @kgc/audit dependency (AuditService)
  - [ ] 8.6: Export: PartnerService, interfaces

- [ ] **Task 9: E2E Tests** (AC: all)
  - [ ] 9.1: Happy path: partner CRUD teljes flow
  - [ ] 9.2: Company partner creation with all fields
  - [ ] 9.3: Duplicate detection és handling
  - [ ] 9.4: Pagination és filter tesztek
  - [ ] 9.5: RLS isolation teszt (tenant A ≠ tenant B)
  - [ ] 9.6: Integration tesztek (minimum 15 teszt)

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
| ----------- | ------ | --------- |
| NestJS      | 10.x   | Backend framework |
| Prisma      | 5.x    | ORM |
| PostgreSQL  | 15+    | Database (RLS enabled) |
| zod         | 3.23.x | Validation (DTO) |
| uuid        | 9.x    | Partner ID generálás |

### Architektúra Minták

```typescript
// Partner entity
interface Partner {
  id: string;              // UUID
  tenantId: string;        // FK to Tenant (RLS)
  name: string;            // Partner neve
  partnerType: PartnerType; // INDIVIDUAL | COMPANY
  status: PartnerStatus;   // ACTIVE | INACTIVE | BLACKLISTED

  // Relations
  companyDetails?: CompanyDetails; // Only for COMPANY
  contacts: ContactInfo[];         // Phones, emails, addresses

  // Audit
  lastInteraction?: Date;  // Utolsó interakció (bérlés, szerviz)
  notes?: string;          // Belső megjegyzések
  createdAt: Date;
  updatedAt: Date;
}

enum PartnerType {
  INDIVIDUAL = 'INDIVIDUAL', // Magánszemély
  COMPANY = 'COMPANY',       // Cég
}

enum PartnerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',     // Soft deleted
  BLACKLISTED = 'BLACKLISTED', // Story 7-5
}

interface CompanyDetails {
  taxNumber: string;         // Adószám: 12345678-1-42
  registrationNumber?: string; // Cégjegyzékszám
  contactPerson: string;     // Kapcsolattartó neve
}

interface ContactInfo {
  type: 'phone' | 'email' | 'address';
  value: string;
  label?: string;           // pl. "Mobil", "Számlázási"
  isPrimary: boolean;
  addressType?: 'billing' | 'shipping'; // Only for address
}
```

### Magyar Adószám Validáció

```typescript
// Formátum: XXXXXXXX-Y-ZZ
// X: 8 számjegy (törzsszám)
// Y: 1 számjegy (ÁFA kód: 1-5)
// ZZ: 2 számjegy (megye kód: 01-44)
const TAX_NUMBER_REGEX = /^\d{8}-[1-5]-\d{2}$/;

function validateHungarianTaxNumber(taxNumber: string): boolean {
  if (!TAX_NUMBER_REGEX.test(taxNumber)) return false;

  // Ellenőrző összeg validáció (CDV - check digit validation)
  const digits = taxNumber.replace(/-/g, '').split('').map(Number);
  const weights = [9, 7, 3, 1, 9, 7, 3, 1];
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * weights[i], 0);
  return sum % 10 === 0;
}
```

### Project Structure

```
packages/shared/partner/
├── src/
│   ├── index.ts                     # Barrel export
│   ├── partner.module.ts
│   ├── partner.controller.ts
│   ├── partner.controller.spec.ts   # E2E tests
│   ├── services/
│   │   ├── partner.service.ts
│   │   ├── partner.service.spec.ts  # TDD - 20+ tesztek
│   │   ├── duplicate-check.service.ts
│   │   ├── duplicate-check.service.spec.ts # TDD - 8+ tesztek
│   │   ├── partner-validation.service.ts
│   │   └── partner-validation.service.spec.ts # TDD - 10+ tesztek
│   ├── dto/
│   │   ├── create-partner.dto.ts
│   │   ├── update-partner.dto.ts
│   │   ├── partner-filter.dto.ts
│   │   └── company-details.dto.ts
│   └── interfaces/
│       └── partner.interface.ts
├── prisma/
│   └── schema.prisma                # Partner entities
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
    "name": "Kovács János",
    "partnerType": "INDIVIDUAL",
    "status": "ACTIVE",
    "contacts": [
      { "type": "phone", "value": "+36301234567", "isPrimary": true }
    ],
    "createdAt": "2026-01-16T...",
    "updatedAt": "2026-01-16T..."
  }
}

// Lista válasz
{
  "data": [...],
  "meta": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}

// Duplikáció figyelmeztetés
{
  "warning": {
    "code": "POTENTIAL_DUPLICATE",
    "message": "Hasonló partner található",
    "existingPartners": [
      { "id": "uuid", "name": "Kovács J.", "phone": "+36301234567" }
    ]
  },
  "data": { ... } // Létrehozott partner (ha force=true)
}

// Hiba válasz
{
  "error": {
    "code": "DUPLICATE_PARTNER",
    "message": "Ez a telefonszám már létezik",
    "fields": {
      "phone": "A +36301234567 telefonszám már regisztrálva van"
    }
  }
}
```

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor - 85% coverage:**
- `partner.service.spec.ts` - minimum 20 teszt (CRUD, validation, search)
- `duplicate-check.service.spec.ts` - minimum 8 teszt (exact, fuzzy, edge cases)
- `partner-validation.service.spec.ts` - minimum 10 teszt (taxNumber, phone, email)

### Dependencies

```json
{
  "dependencies": {
    "@kgc/tenant": "workspace:*",  // TenantContextMiddleware, @CurrentTenant
    "@kgc/audit": "workspace:*",   // AuditService (FR22)
    "@kgc/common": "workspace:*"   // Base interfaces, utils
  }
}
```

---

### References

- [Source: planning-artifacts/epics.md - Story 7.1]
- [Source: planning-artifacts/prd.md - FR25-FR33]
- [Source: docs/project-context.md - Partner Management]
- [Source: docs/kgc3-development-principles.md - TDD requirements]
- [Source: planning-artifacts/adr/ADR-001-franchise-multi-tenancy.md]

---

## Change Log

| Dátum      | Változás                            | Szerző          |
| ---------- | ----------------------------------- | --------------- |
| 2026-01-16 | Story file létrehozva               | Claude Opus 4.5 |
