# Story 28.1: Partner Szinkronizálás

Status: done

---

## Story

**Mint** értékesítési vezető,
**szeretnék** a KGC rendszer partnerei és a Twenty CRM között kétirányú szinkronizálást,
**hogy** az ügyfélkapcsolati adatok mindkét rendszerben konzisztensek maradjanak.

---

## Acceptance Criteria

### AC1: Partner mapping kezelés

- [x] KGC partnerId ↔ CRM partnerId összerendelés
- [x] Mapping CRUD műveletek (create, read, delete)
- [x] Tenant-aware mapping tárolás
- [x] Mapping státusz követés (PENDING, COMPLETED, FAILED)

### AC2: Kétirányú szinkronizálás

- [x] KGC → CRM: Partner adatok küldése a CRM-be
- [x] CRM → KGC: Partner adatok fogadása a CRM-ből
- [x] BIDIRECTIONAL mód: Mindkét irányú szinkron
- [x] Részleges szinkron: Csak megadott partnerek

### AC3: Auto-link funkció

- [x] Automatikus partner összerendelés email alapján
- [x] Meglévő mappingek kihagyása
- [x] Email nélküli partnerek kihagyása
- [x] Audit log minden művelethez

### AC4: Hibakezelés és riportálás

- [x] Szinkronizálási eredmény részletes riport
- [x] Hibás szinkronok listázása (ISyncError)
- [x] Tenant isolation - csak saját adatok láthatók
- [x] Access denied kezelés

---

## Tasks / Subtasks

### Task 1: PartnerSyncService implementáció (AC: 1, 2, 3)

- [x] 1.1 syncPartners() - kétirányú szinkronizálás
- [x] 1.2 createMapping() - mapping létrehozás
- [x] 1.3 getMappings() - mappingek lekérdezése
- [x] 1.4 deleteMapping() - mapping törlése
- [x] 1.5 autoLinkByEmail() - automatikus összerendelés
- [x] 1.6 Unit tesztek (13 teszt)

### Task 2: Interface-ek és DTO-k (AC: all)

- [x] 2.1 IPartnerMapping interface
- [x] 2.2 ISyncResult, ISyncError interface-ek
- [x] 2.3 SyncPartnersDto Zod schema
- [x] 2.4 CreatePartnerMappingDto Zod schema

### Task 3: Repository interfészek (AC: 1)

- [x] 3.1 IPartnerMappingRepository interface
- [x] 3.2 IKgcPartnerService interface
- [x] 3.3 ITwentyCrmClient interface

### Task 4: API endpoints (AC: all)

- [x] 4.1 POST /twenty-crm/sync/partners - partner szinkron
- [x] 4.2 POST /twenty-crm/mappings - mapping létrehozás
- [x] 4.3 GET /twenty-crm/mappings - mappingek listázás
- [x] 4.4 DELETE /twenty-crm/mappings/:id - mapping törlés
- [x] 4.5 POST /twenty-crm/auto-link - auto-link email alapján
- [x] 4.6 Controller tesztek (20 teszt)

---

## Dev Notes

### Architektúra

**Package:** `@kgc/twenty-crm` (packages/integration/twenty-crm/)

**Szinkronizálási irányok:**

- `KGC_TO_CRM` - KGC → Twenty CRM
- `CRM_TO_KGC` - Twenty CRM → KGC
- `BIDIRECTIONAL` - Mindkét irány

**Mapping státuszok:**

- `PENDING` - Várakozik szinkronra
- `IN_PROGRESS` - Szinkron folyamatban
- `COMPLETED` - Sikeres szinkron
- `FAILED` - Sikertelen szinkron
- `PARTIAL` - Részlegesen sikeres

### Kapcsolódó Epic-ek

- Epic 7: Partner Management (alap)
- Epic 28-2: CRM Dashboard Embed

### TDD kötelező

- Mapping CRUD tesztek
- Szinkron irány tesztek
- Auto-link tesztek
- Hibakezelés tesztek

---

## Test Summary

- **Package Tests:** 13
- **Controller Tests:** 20
- **Total Tests:** 33
- **Test Files:**
  - `partner-sync.service.spec.ts`
  - `twenty-crm.controller.spec.ts`

### Test Coverage:

- `syncPartners()` - 4 tests (directions, errors)
- `createMapping()` - 3 tests (success, validation)
- `getMappings()` - 1 test
- `deleteMapping()` - 2 tests (success, access)
- `autoLinkByEmail()` - 3 tests (match, skip)
- Controller endpoints - 20 tests

---

## Code Review Results

### Review Date: 2026-01-26

### Reviewer: Claude Opus 4.5 (BMAD Adversarial)

| #   | Severity | Issue                             | Location                 | Status   |
| --- | -------- | --------------------------------- | ------------------------ | -------- |
| 1   | LOW      | Contact sync placeholder          | syncContactsForPartner() | Deferred |
| 2   | LOW      | No retry logic on CRM API failure | syncPartnerToCrm()       | Deferred |
| 3   | LOW      | In-memory repos for MVP           | API module               | Deferred |

### Notes:

- Issue 1-3: Elfogadható az MVP-hez, későbbi iterációban implementálandó

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Clean implementation

### Completion Notes List

1. PartnerSyncService teljes implementáció
2. 13 unit teszt a package-ben
3. 20 controller teszt az API-ban
4. Zod validáció minden inputra
5. Audit logging minden művelethez
6. Tenant-aware mapping kezelés

### Change Log

| Dátum      | Változás                     | Szerző                      |
| ---------- | ---------------------------- | --------------------------- |
| 2026-01-26 | Story létrehozva             | Claude Opus 4.5 (dev-story) |
| 2026-01-26 | Implementáció kész, 33 teszt | Claude Opus 4.5 (dev-story) |

### File List

**Package (packages/integration/twenty-crm/src/):**

- `interfaces/twenty-crm.interface.ts`
- `dto/twenty-crm.dto.ts`
- `services/partner-sync.service.ts`
- `services/partner-sync.service.spec.ts`
- `index.ts`

**API (apps/kgc-api/src/modules/twenty-crm/):**

- `controllers/twenty-crm.controller.ts`
- `repositories/in-memory-mapping.repository.ts`
- `repositories/in-memory-services.ts`
- `twenty-crm.module.ts`
- `__tests__/twenty-crm.controller.spec.ts`

---

## References

- [Epic 28: Twenty CRM Integration](../../planning-artifacts/epics/epic-28-twenty-crm.md)
- [ADR-015: Twenty CRM + Chatwoot Integration](../../planning-artifacts/adr/ADR-015-twenty-crm-chatwoot.md)
