# Story 28.2: CRM Dashboard Embed

Status: done

---

## Story

**Mint** üzleti vezető,
**szeretnék** Twenty CRM dashboardokat beágyazni a KGC alkalmazásba,
**hogy** az értékesítési metrikákat egy helyről láthassam anélkül, hogy váltanom kellene a rendszerek között.

---

## Acceptance Criteria

### AC1: Dashboard konfiguráció kezelés

- [x] Dashboard config CRUD műveletek
- [x] Tenant-aware konfiguráció tárolás
- [x] Méret beállítások (width, height)
- [x] Automatikus frissítési intervallum
- [x] Aktív/inaktív státusz kezelés

### AC2: Jogosultság kezelés

- [x] Dashboard-szintű permission lista
- [x] User permission ellenőrzés token generáláskor
- [x] Csak jogosult dashboardok listázása
- [x] Access denied kezelés tenant mismatch esetén

### AC3: Embed token generálás

- [x] Biztonságos token generálás (JWT-szerű)
- [x] Konfigurálható lejárati idő (5-1440 perc)
- [x] User és tenant azonosítás a tokenben
- [x] CRM signature validáció

### AC4: Embed URL szolgáltatás

- [x] Teljes embed URL token paraméterrel
- [x] Dashboard konfiguráció visszaadása
- [x] Aktív dashboard ellenőrzés
- [x] Audit logging minden token generáláshoz

---

## Tasks / Subtasks

### Task 1: DashboardEmbedService implementáció (AC: 1, 2, 3, 4)

- [x] 1.1 createDashboardConfig() - config létrehozás
- [x] 1.2 updateDashboardConfig() - config módosítás
- [x] 1.3 deleteDashboardConfig() - config törlés
- [x] 1.4 getDashboardConfigs() - összes config
- [x] 1.5 getActiveDashboards() - jogosult dashboardok
- [x] 1.6 generateEmbedToken() - token generálás
- [x] 1.7 getEmbedUrl() - teljes URL előállítás
- [x] 1.8 Unit tesztek (13 teszt)

### Task 2: Interface-ek és DTO-k (AC: all)

- [x] 2.1 IDashboardConfig interface
- [x] 2.2 IEmbedToken interface
- [x] 2.3 CreateDashboardConfigDto Zod schema
- [x] 2.4 UpdateDashboardConfigDto Zod schema
- [x] 2.5 GenerateEmbedTokenDto Zod schema

### Task 3: Repository és kliens interfészek (AC: 1, 3)

- [x] 3.1 IDashboardConfigRepository interface
- [x] 3.2 ITwentyCrmAuthClient interface
- [x] 3.3 IUserService interface

### Task 4: API endpoints (AC: all)

- [x] 4.1 POST /twenty-crm/dashboards - config létrehozás
- [x] 4.2 GET /twenty-crm/dashboards - összes config
- [x] 4.3 GET /twenty-crm/dashboards/active - aktív dashboardok
- [x] 4.4 GET /twenty-crm/dashboards/:id - config lekérdezés
- [x] 4.5 PATCH /twenty-crm/dashboards/:id - config módosítás
- [x] 4.6 DELETE /twenty-crm/dashboards/:id - config törlés
- [x] 4.7 POST /twenty-crm/dashboards/:id/token - token generálás
- [x] 4.8 GET /twenty-crm/dashboards/:id/embed - embed URL
- [x] 4.9 Controller tesztek (28 teszt)

---

## Dev Notes

### Architektúra

**Package:** `@kgc/twenty-crm` (packages/integration/twenty-crm/)

**Token struktúra:**

```typescript
{
  dashboardId: string;
  tenantId: string;
  userId: string;
  permissions: string[];
  expiresAt: ISO8601;
  nonce: string; // Replay attack védelem
}
```

**Signature generálás:**

- CRM AuthClient generateEmbedSignature() hívás
- Base64url payload + signature összekapcsolás

### Kapcsolódó Epic-ek

- Epic 28-1: Partner szinkronizálás
- Epic 27: Reporting (dashboard adatok)

### TDD kötelező

- Dashboard CRUD tesztek
- Permission ellenőrzés tesztek
- Token generálás tesztek
- Embed URL tesztek

---

## Test Summary

- **Package Tests:** 13
- **Controller Tests:** 28
- **Total Tests:** 41
- **Test Files:**
  - `dashboard-embed.service.spec.ts`
  - `twenty-crm.controller.spec.ts`

### Test Coverage:

- `createDashboardConfig()` - 2 tests
- `updateDashboardConfig()` - 3 tests
- `deleteDashboardConfig()` - 1 test
- `generateEmbedToken()` - 4 tests
- `getActiveDashboards()` - 2 tests
- `getEmbedUrl()` - 1 test
- Controller endpoints - 28 tests

---

## Code Review Results

### Review Date: 2026-01-26

### Reviewer: Claude Opus 4.5 (BMAD Adversarial)

| #   | Severity | Issue                        | Location                    | Status   |
| --- | -------- | ---------------------------- | --------------------------- | -------- |
| 1   | LOW      | Token signature mock         | InMemoryTwentyCrmAuthClient | Deferred |
| 2   | LOW      | No token validation endpoint | DashboardEmbedService       | Deferred |
| 3   | LOW      | In-memory dashboard repo     | API module                  | Deferred |

### Notes:

- Issue 1-3: Elfogadható az MVP-hez, production-ben valódi CRM kliens szükséges

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Clean implementation

### Completion Notes List

1. DashboardEmbedService teljes implementáció
2. 13 unit teszt a package-ben
3. 28 controller teszt az API-ban
4. Zod validáció minden inputra
5. Secure token generálás (nonce + signature)
6. Permission-based dashboard filtering
7. Audit logging minden művelethez

### Change Log

| Dátum      | Változás                     | Szerző                      |
| ---------- | ---------------------------- | --------------------------- |
| 2026-01-26 | Story létrehozva             | Claude Opus 4.5 (dev-story) |
| 2026-01-26 | Implementáció kész, 41 teszt | Claude Opus 4.5 (dev-story) |

### File List

**Package (packages/integration/twenty-crm/src/):**

- `interfaces/twenty-crm.interface.ts`
- `dto/twenty-crm.dto.ts`
- `services/dashboard-embed.service.ts`
- `services/dashboard-embed.service.spec.ts`
- `index.ts`

**API (apps/kgc-api/src/modules/twenty-crm/):**

- `controllers/twenty-crm.controller.ts`
- `repositories/in-memory-dashboard.repository.ts`
- `repositories/in-memory-services.ts`
- `twenty-crm.module.ts`
- `__tests__/twenty-crm.controller.spec.ts`

---

## References

- [Epic 28: Twenty CRM Integration](../../planning-artifacts/epics/epic-28-twenty-crm.md)
- [ADR-015: Twenty CRM + Chatwoot Integration](../../planning-artifacts/adr/ADR-015-twenty-crm-chatwoot.md)
