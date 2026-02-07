# Story 41-1: Kintlévőség Aging Report

## Story Metaadatok

| Mező           | Érték                                        |
| -------------- | -------------------------------------------- |
| **Story ID**   | 41-1                                         |
| **Epic**       | Epic 41 - Kintlévőség & Bevételi Előrejelzés |
| **Prioritás**  | P0 - Kritikus                                |
| **Becsült SP** | 3                                            |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07)            |
| **ADR**        | ADR-052                                      |
| **Sprint**     | Sprint 9                                     |

## User Story

**Mint** könyvelő/boltvezető,
**Szeretném** látni a kintlévőségeket korosztály szerint csoportosítva,
**Hogy** priorizálhassam a behajtást.

## Technikai Feladatok

### Task 1: Backend Service ✅

- [x] ReceivablesService.getAgingReport(tenantId, filters) - 14 tests
- [x] AgingBucket interface (0-30, 31-60, 61-90, 90+)
- [x] Invoice alapú aggregáció

### Task 2: API Endpoint ✅

- [x] GET /dashboard/receivables/aging - 6 controller tests
- [x] Response DTO: AgingReportResponseDto

### Task 3: Dashboard Widget ✅

- [x] ReceivablesAgingWidget komponens - 6 tests
- [x] TanStack Query integráció
- [x] Widget registry regisztráció

## Implementációs Összefoglaló

### Új Fájlok (8 fájl)

1. `packages/aruhaz/sales-invoice/src/services/receivables.service.ts` - Backend service
2. `packages/aruhaz/sales-invoice/tests/receivables.service.spec.ts` - 14 unit tests
3. `apps/kgc-api/src/modules/dashboard/receivables/dto/receivables-aging.dto.ts` - DTOs
4. `apps/kgc-api/src/modules/dashboard/receivables/receivables.controller.ts` - Controller
5. `apps/kgc-api/src/modules/dashboard/receivables/receivables.service.ts` - Dashboard service
6. `apps/kgc-api/src/modules/dashboard/receivables/receivables.controller.spec.ts` - 6 tests
7. `apps/kgc-web/src/features/dashboard/widgets/ReceivablesAgingWidget.tsx` - Widget
8. `apps/kgc-web/src/features/dashboard/widgets/ReceivablesAgingWidget.test.tsx` - 6 tests

### Módosított Fájlok (3 fájl)

1. `packages/aruhaz/sales-invoice/src/services/index.ts` - Export hozzáadás
2. `apps/kgc-api/src/modules/dashboard/dashboard.module.ts` - Controller/Service regisztráció
3. `apps/kgc-web/src/features/dashboard/lib/widget-registry.ts` - Widget regisztráció

### Tesztek

- Unit tesztek: 14 (ReceivablesService)
- Controller tesztek: 6 (ReceivablesDashboardController)
- Widget tesztek: 6 (ReceivablesAgingWidget)
- **Összesen: 26 teszt**

## Definition of Done

- [x] AC-1 Aging buckets megjelenítése (30/60/90/90+)
- [x] AC-2 Partner szűrés (partnerId query param)
- [x] TypeScript PASS
- [x] Unit tesztek (26 teszt)
- [x] Widget látható STORE_MANAGER/ADMIN role-okkal
