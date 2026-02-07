# Story 40-4: Bérgép megtérülés dashboard widget

## Story Metaadatok

| Mező           | Érték                                    |
| -------------- | ---------------------------------------- |
| **Story ID**   | 40-4                                     |
| **Epic**       | Epic 40 - Bérgép Megtérülés & Előzmények |
| **Prioritás**  | P1 - Magas                               |
| **Becsült SP** | 3                                        |
| **Státusz**    | done                                     |
| **ADR**        | ADR-051                                  |
| **Sprint**     | Sprint 9                                 |

## User Story

**Mint** boltvezető,
**Szeretném** a dashboardon látni a bérgépek megtérülés összesítőjét,
**Hogy** gyorsan átlássam a flotta profitabilitását.

## Acceptance Criteria

### AC-1: Widget megjelenítése

```gherkin
Given bejelentkezett boltvezető szerepkörrel
When megnyitom a dashboardot
Then látom a "Bérgép Megtérülés" widgetet
And látom az összesített adatokat:
  | Mező | Példa |
  | Összes bevétel | 12,450,000 Ft |
  | Összes költség | 8,230,000 Ft |
  | Összes profit | 4,220,000 Ft |
  | Átlag ROI | +64.9% |
```

### AC-2: Top 5 lista

```gherkin
Given 20 bérgép a rendszerben
When megnézem a widgetet
Then látom a "Top 5" listát profit szerint rendezve
And minden gépnél látom:
  - Gép neve
  - Gép kód
  - Profit összeg
  - ROI %
```

### AC-3: Gépszám statisztika

```gherkin
Given a widget megnyitva
When látom a statisztikákat
Then látom az összes gép számát
And látom a nyereséges gépek számát
And látom a veszteséges gépek számát
```

## Technikai Feladatok

### Task 1: Backend API ✅ KÉSZ

- [x] `GET /dashboard/equipment-profit/summary` - Flotta összesítés
- [x] `GET /dashboard/equipment-profit/top` - Top N gépek
- [x] `GET /dashboard/equipment-profit/:id` - Gép részletek (dropdown-hoz)
- [x] DTOs és Service implementáció
- [x] Dashboard module integráció

**Fájlok:**

- `apps/kgc-api/src/modules/dashboard/equipment-profit/equipment-profit.controller.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/dashboard/equipment-profit/equipment-profit.service.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/dashboard/equipment-profit/dto/equipment-profit-dashboard.dto.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/dashboard/equipment-profit/equipment-profit.module.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/dashboard/dashboard.module.ts` - ✅ Frissítve

### Task 2: Frontend Widget ✅ KÉSZ

- [x] `EquipmentProfitWidget` React komponens
- [x] TanStack Query integráció (5 perc cache)
- [x] Loading és error state
- [x] Widget registry regisztráció
- [x] Responsive design (Tailwind)

**Fájlok:**

- `apps/kgc-web/src/features/dashboard/widgets/EquipmentProfitWidget.tsx` - ✅ Létrehozva
- `apps/kgc-web/src/features/dashboard/lib/widget-registry.ts` - ✅ Frissítve

### Task 3: Gép Selector Dropdown (SKIPPED)

- [ ] Dropdown komponens - SKIPPED (nincs UI az egyes gépekhez)

## Tesztelési Követelmények

| Típus     | Darab | Fájl                         | Státusz |
| --------- | ----- | ---------------------------- | ------- |
| Component | 5     | `EquipmentProfitWidget.test` | ✅ PASS |
| E2E       | 3     | `dashboard-widgets.e2e.ts`   | ⏳ TODO |

## Definition of Done

- [x] AC-1, AC-2, AC-3 teljesül
- [x] TypeScript ellenőrzés PASS (backend + frontend)
- [x] TanStack Query integráció (5 perc cache)
- [x] Widget registry-ben regisztrálva
- [x] STORE_MANAGER és ADMIN role-ok láthatják
- [x] Component tesztek (5 db) - PASS
- [ ] Sprint-status.yaml DONE státuszra állítva

## Megjegyzések

- Mock data-t használ MVP-hez (TODO: Prisma integráció)
- Gép selector dropdown skippelve (nincs dedikált gép részletek oldal)
- A widget a `finance` kategóriába került
