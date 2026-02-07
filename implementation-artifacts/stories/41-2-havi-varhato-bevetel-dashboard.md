# Story 41-2: Havi Várható Bevétel Dashboard

## Story Metaadatok

| Mező           | Érték                                        |
| -------------- | -------------------------------------------- |
| **Story ID**   | 41-2                                         |
| **Epic**       | Epic 41 - Kintlévőség & Bevételi Előrejelzés |
| **Prioritás**  | P1 - Magas                                   |
| **Becsült SP** | 3                                            |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07)            |
| **ADR**        | ADR-052                                      |
| **Sprint**     | Sprint 9                                     |

## User Story

**Mint** boltvezető,
**Szeretném** látni a várható havi bevételt,
**Hogy** tervezhessem a cash flow-t.

## Technikai Feladatok

### Task 1: Backend Service (TDD) ✅

- [x] RevenueForecasterService.getForecast(tenantId, month) - 16 tests
- [x] RevenueSource interface (rental, contract, service)
- [x] Month-over-month comparison (trend: up/down/stable)

### Task 2: API Endpoint ✅

- [x] GET /dashboard/revenue/forecast - 6 controller tests
- [x] Response DTO: RevenueForecastResponseDto

### Task 3: Dashboard Widget ✅

- [x] RevenueForecastWidget komponens - 6 tests
- [x] TanStack Query integráció (5 min refresh)
- [x] Widget registry regisztráció

## Implementációs Összefoglaló

### Új Fájlok (8 fájl)

1. `packages/aruhaz/sales-invoice/src/services/revenue-forecaster.service.ts` - Backend service
2. `packages/aruhaz/sales-invoice/tests/revenue-forecaster.service.spec.ts` - 16 unit tests
3. `apps/kgc-api/src/modules/dashboard/revenue/dto/revenue-forecast.dto.ts` - DTOs
4. `apps/kgc-api/src/modules/dashboard/revenue/revenue.controller.ts` - Controller
5. `apps/kgc-api/src/modules/dashboard/revenue/revenue.service.ts` - Dashboard service
6. `apps/kgc-api/src/modules/dashboard/revenue/revenue.controller.spec.ts` - 6 tests
7. `apps/kgc-web/src/features/dashboard/widgets/RevenueForecastWidget.tsx` - Widget
8. `apps/kgc-web/src/features/dashboard/widgets/RevenueForecastWidget.test.tsx` - 6 tests

### Módosított Fájlok (3 fájl)

1. `packages/aruhaz/sales-invoice/src/services/index.ts` - Export hozzáadás
2. `apps/kgc-api/src/modules/dashboard/dashboard.module.ts` - Controller/Service regisztráció
3. `apps/kgc-web/src/features/dashboard/lib/widget-registry.ts` - Widget regisztráció

### Tesztek

- Unit tesztek: 16 (RevenueForecasterService)
- Controller tesztek: 6 (RevenueForecastController)
- Widget tesztek: 6 (RevenueForecastWidget)
- **Összesen: 28 teszt**

## Definition of Done

- [x] AC-1 Várható bevétel számítás (bérlés + szerződés + szerviz)
- [x] AC-2 Forrás szerinti bontás (percentage bar chart)
- [x] AC-3 Historikus összehasonlítás (előző hó vs. aktuális + trend)
- [x] TypeScript PASS
- [x] Unit tesztek (28 teszt > min. 15)
- [x] Widget látható STORE_MANAGER/ADMIN role-okkal
