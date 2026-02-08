# Story 45-1: Dashboard Widget Jogosultságok Admin

## Story Info

| Mező            | Érték                         |
| --------------- | ----------------------------- |
| **Epic**        | Epic 45: Admin & Konfiguráció |
| **Story ID**    | 45-1                          |
| **Prioritás**   | Medium                        |
| **Becsült idő** | 1-1.5 nap                     |
| **Státusz**     | done                          |

---

## User Story

**Mint** rendszergazda,
**Szeretném** online felületen beállítani, hogy melyik szerepkör melyik dashboard widgetet láthassa,
**Hogy** ne kelljen kódot módosítani a jogosultságok változtatásához.

---

## Acceptance Criteria

### AC1: Backend API - Jogosultságok lekérése

```gherkin
Given bejelentkezett admin felhasználó vagyok
When GET /api/v1/dashboard/permissions endpoint-ot hívom
Then megkapom az összes widget és szerepkör mátrixot
And a válasz tartalmazza a widget ID-kat, neveket és aktuális szerepköröket
```

### AC2: Backend API - Jogosultságok módosítása

```gherkin
Given bejelentkezett admin felhasználó vagyok
When PUT /api/v1/dashboard/permissions endpoint-ot hívom módosított adatokkal
Then a jogosultságok mentésre kerülnek az adatbázisban
And audit log bejegyzés készül a változásról
```

### AC3: Admin UI - Widget jogosultság mátrix

```gherkin
Given a Beállítások > Dashboard > Widget jogosultságok oldalon vagyok
When betöltődik az oldal
Then látom az összes widgetet soronként
And látom az összes szerepkört oszloponként (OPERATOR, STORE_MANAGER, ADMIN)
And checkbox-ok jelzik a jelenlegi beállításokat
```

### AC4: Admin UI - Jogosultság módosítása

```gherkin
Given a Widget jogosultságok oldalon vagyok
When kattintok egy checkbox-ra
Then a checkbox állapota megváltozik
And a "Mentés" gomb aktívvá válik
When kattintok a "Mentés" gombra
Then a módosítások mentésre kerülnek
And sikeres értesítést kapok
```

### AC5: Frontend - Dinamikus jogosultság betöltés

```gherkin
Given bejelentkezett felhasználó vagyok
When a Dashboard oldalra navigálok
Then a backend-ről töltődnek be a widget jogosultságok
And csak azokat a widgeteket látom, amikhez van jogosultságom
```

### AC6: Cache és fallback

```gherkin
Given a jogosultság API nem elérhető (hálózati hiba)
When a Dashboard oldalra navigálok
Then a hardkódolt alapértelmezett jogosultságok töltődnek be
And a rendszer működőképes marad
```

---

## Technical Requirements

### Adatbázis

```sql
-- Widget jogosultság tábla
CREATE TABLE dashboard_widget_permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  widget_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES "user"(id),

  UNIQUE(tenant_id, widget_id, role)
);

-- Index a gyors lekérdezéshez
CREATE INDEX idx_widget_permission_tenant ON dashboard_widget_permission(tenant_id);
```

### Backend Endpoints

```typescript
// GET /api/v1/dashboard/permissions
// Response:
{
  data: {
    widgets: [
      {
        id: 'revenue-kpi',
        name: 'Bevétel KPI',
        category: 'finance',
        roles: {
          OPERATOR: false,
          STORE_MANAGER: true,
          ADMIN: true,
        },
      },
      // ...
    ];
  }
}

// PUT /api/v1/dashboard/permissions
// Request:
{
  permissions: [
    { widgetId: 'revenue-kpi', role: 'OPERATOR', enabled: true },
    // ...
  ];
}
```

### Frontend Módosítások

1. **widget-registry.ts**
   - `getRolesFromAPI()` async funkció
   - Fallback a hardkódolt értékekre

2. **Új komponensek**
   - `WidgetPermissionsPage.tsx` - Admin oldal
   - `PermissionMatrix.tsx` - Mátrix komponens

3. **Routing**
   - `/settings/dashboard/permissions` útvonal

---

## UI/UX Terv

### Widget Jogosultságok Oldal

```
┌─────────────────────────────────────────────────────────────┐
│ ← Vissza    Dashboard Widget Jogosultságok                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Widget                    │ Operátor │ Manager │ Admin    │
│  ─────────────────────────┼──────────┼─────────┼─────────  │
│  📊 Pénzügyi KPI-k         │          │         │          │
│     Bevétel KPI            │    ☐     │    ☑    │    ☑     │
│     Nettó bevétel KPI      │    ☐     │    ☑    │    ☑     │
│     Kintlévőség KPI        │    ☐     │    ☑    │    ☑     │
│     Befizetések KPI        │    ☐     │    ☑    │    ☑     │
│  ─────────────────────────┼──────────┼─────────┼─────────  │
│  📦 Készlet                 │          │         │          │
│     Készlet összesítő      │    ☑     │    ☑    │    ☑     │
│     Készlet riasztások     │    ☑     │    ☑    │    ☑     │
│     Kihasználtság          │    ☑     │    ☑    │    ☑     │
│     Készlet mozgások       │    ☐     │    ☑    │    ☑     │
│  ─────────────────────────┼──────────┼─────────┼─────────  │
│  🔧 Szerviz                 │          │         │          │
│     Munkalap összesítő     │    ☐     │    ☑    │    ☑     │
│     Szerelő terhelés       │    ☐     │    ☑    │    ☑     │
│  ─────────────────────────┼──────────┼─────────┼─────────  │
│  👥 Partner                 │          │         │          │
│     Partner áttekintés     │    ☐     │    ☑    │    ☑     │
│     Top partnerek          │    ☐     │    ☑    │    ☑     │
│                                                             │
│                            [ Visszaállítás ]  [ Mentés ]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tasks / Subtasks

### Backend (6h)

- [x] **45-1-BE-1:** Prisma schema - `DashboardWidgetPermission` model
- [x] **45-1-BE-2:** Migration létrehozása és futtatása
- [x] **45-1-BE-3:** `PermissionsController` - GET endpoint
- [x] **45-1-BE-4:** `PermissionsController` - PUT endpoint
- [x] **45-1-BE-5:** `PermissionsService` - üzleti logika
- [x] **45-1-BE-6:** Audit log integráció
- [x] **45-1-BE-7:** Unit tesztek

### Frontend (6h)

- [x] **45-1-FE-1:** `useWidgetPermissions` hook - API kommunikáció
- [x] **45-1-FE-2:** `PermissionMatrix` komponens
- [x] **45-1-FE-3:** `WidgetPermissionsPage` admin oldal
- [x] **45-1-FE-4:** Routing hozzáadása (`/settings/dashboard/permissions`)
- [x] **45-1-FE-5:** `widget-registry.ts` módosítás - dinamikus betöltés
- [x] **45-1-FE-6:** Fallback logika (API hiba esetén)
- [x] **45-1-FE-7:** Unit tesztek

### E2E (2h)

- [x] **45-1-E2E-1:** Admin oldal betöltés teszt
- [x] **45-1-E2E-2:** Jogosultság módosítás és mentés teszt
- [x] **45-1-E2E-3:** Dashboard widget megjelenés teszt (szerepkör alapján)

### Review Follow-ups (AI)

- [x] [AI-Review][LOW] Frontend unit tesztek - useAdminWidgetPermissions, PermissionMatrix, WidgetPermissionsPage
- [x] [AI-Review][LOW] Replace confirm() with Dialog component in WidgetPermissionsPage.tsx

---

## Definition of Done

- [x] Minden AC teljesül
- [x] Backend API működik és dokumentált (Swagger)
- [x] Admin UI működik és reszponzív
- [x] Frontend dinamikusan tölti be a jogosultságokat
- [x] Fallback működik API hiba esetén
- [x] Unit tesztek PASS (min. 80% coverage)
- [x] E2E tesztek PASS
- [x] Code review PASS
- [x] Dokumentáció frissítve

---

## Notes

- A jelenlegi hardkódolt jogosultságok (`widget-registry.ts`) megmaradnak fallback-ként
- Tenant-izolált: minden franchise saját beállításokkal
- ADMIN szerepkör mindig lát mindent (nem korlátozható)
- Változások azonnal érvénybe lépnek (nincs deploy szükséges)

---

## Dependencies

- Epic 35: Dashboard Foundation (DONE)
- RBAC rendszer (DONE)
- Settings/Admin routing (létezik)

---

## Dev Agent Record

### File List

#### Backend Files

- `apps/kgc-api/prisma/migrations/20260208000000_add_dashboard_widget_permissions/migration.sql` - DB migration
- `apps/kgc-api/prisma/schema.prisma` - DashboardWidgetPermission model
- `apps/kgc-api/src/modules/dashboard/dashboard.module.ts` - Module registration
- `apps/kgc-api/src/modules/dashboard/permissions/admin-permissions.controller.ts` - Admin API controller
- `apps/kgc-api/src/modules/dashboard/permissions/admin-permissions.service.ts` - Business logic
- `apps/kgc-api/src/modules/dashboard/permissions/role-permissions.controller.ts` - Role endpoint (AC5)
- `apps/kgc-api/src/modules/dashboard/permissions/guards/admin-only.guard.ts` - RBAC guard
- `apps/kgc-api/src/modules/dashboard/permissions/dto/admin-permissions.dto.ts` - DTOs
- `apps/kgc-api/src/modules/dashboard/permissions/__tests__/admin-permissions.service.spec.ts` - Unit tests
- `apps/kgc-api/src/modules/dashboard/permissions/__tests__/admin-permissions.controller.spec.ts` - Unit tests

#### Frontend Files

- `apps/kgc-web/src/App.tsx` - Route registration
- `apps/kgc-web/src/pages/index.ts` - Page export
- `apps/kgc-web/src/pages/settings/dashboard/WidgetPermissionsPage.tsx` - Re-export
- `apps/kgc-web/src/pages/settings/dashboard/index.ts` - Index export
- `apps/kgc-web/src/features/admin/hooks/useAdminWidgetPermissions.ts` - TanStack Query hook
- `apps/kgc-web/src/features/admin/hooks/__tests__/useAdminWidgetPermissions.test.tsx` - Hook unit tests
- `apps/kgc-web/src/features/admin/components/PermissionMatrix.tsx` - Matrix table component
- `apps/kgc-web/src/features/admin/components/__tests__/PermissionMatrix.test.tsx` - Component unit tests
- `apps/kgc-web/src/features/admin/pages/WidgetPermissionsPage.tsx` - Admin page
- `apps/kgc-web/src/features/admin/pages/__tests__/WidgetPermissionsPage.test.tsx` - Page unit tests
- `apps/kgc-web/src/features/dashboard/lib/dynamic-permissions.ts` - Dynamic permission loader with fallback

#### E2E Files

- `e2e/important/widget-permissions.e2e.ts` - E2E test suite

### Change Log

| Dátum      | Változás                                           | Szerző         |
| ---------- | -------------------------------------------------- | -------------- |
| 2026-02-08 | Initial implementation - Backend API + Frontend UI | AI Dev Agent   |
| 2026-02-08 | Code Review - Fixed HIGH/MEDIUM issues             | AI Code Review |
| 2026-02-08 | Added /role/:role endpoint for AC5                 | AI Code Review |
| 2026-02-08 | Added AdminOnlyGuard for RBAC protection           | AI Code Review |
| 2026-02-08 | Fixed N+1 query with batch transaction             | AI Code Review |
| 2026-02-08 | Added widget ID validation                         | AI Code Review |
| 2026-02-08 | Added frontend unit tests (hook, component, page)  | AI Code Review |
| 2026-02-08 | Replaced confirm() with Dialog component           | AI Code Review |
| 2026-02-08 | Removed `any` type casts after prisma generate     | AI Code Review |
| 2026-02-08 | Story marked as DONE                               | AI Code Review |
