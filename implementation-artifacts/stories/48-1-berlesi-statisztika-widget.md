# Story 48-1: Bérlési Statisztika Widget

**Status:** done
**Epic:** Epic 48 - Bérlési Dashboard & Export
**Package:** `apps/kgc-web/` + `apps/kgc-api/`
**Estimated SP:** 3

---

## Story

**As a** Boltvezető,
**I want** látni a bérlési statisztikákat a dashboard-on,
**So that** áttekinthessem a bérlési trendeket.

---

## Scope

### IN SCOPE

1. **RentalStatsWidget** - Átlagos bérlési idő + változás
2. **PopularEquipmentWidget** - Top 5 legnépszerűbb gép
3. **SeasonalityChartWidget** - Havi bérlési trend grafikon (12 hónap)
4. **API endpoint-ok** - 3 új végpont

### OUT OF SCOPE

- Részletes bérlési riport oldal (→ Story 48-2)
- Export funkciók (→ Story 48-3, 48-4)

---

## Acceptance Criteria

### AC1: Átlagos Bérlési Idő Widget

**Given** bejelentkezett Boltvezető/Admin
**When** a Dashboard betölt
**Then** látom a `RentalStatsWidget`-et amely megmutatja:

- Átlagos bérlési időt napokban
- Előző időszakhoz képest a változást (%)
- TrendIndicator (fel/le nyíl)

### AC2: Legnépszerűbb Gépek Widget

**Given** bejelentkezett Boltvezető/Admin
**When** a Dashboard betölt
**Then** látom a `PopularEquipmentWidget`-et amely megmutatja:

- Top 5 legnépszerűbb gépet
- Bérlések számát gépenként
- Bevételt gépenként (Ft)

### AC3: Szezonalitás Grafikon Widget

**Given** bejelentkezett Boltvezető/Admin
**When** a Dashboard betölt
**Then** látom a `SeasonalityChartWidget`-et amely megmutatja:

- Havi bérlési trend grafikont (Recharts AreaChart)
- Elmúlt 12 hónap adatait
- Bérlések száma és bevétel

### AC4: API Endpoint-ok

**Given** bérlési dashboard widget-ek
**When** adatot kérnek
**Then** a következő API endpoint-ok működnek:

- `GET /api/v1/dashboard/rental/stats` - átlag bérlési idő
- `GET /api/v1/dashboard/rental/popular?limit=5` - népszerű gépek
- `GET /api/v1/dashboard/rental/seasonality?months=12` - szezonalitás

### AC5: Widget Registry Integráció

**Given** Widget Registry létezik
**When** a widget-eket regisztrálom
**Then** a bérlési widget-ek megjelennek:

- STORE_MANAGER és ADMIN role-oknak
- Lazy loading React.lazy()-vel
- Auto-refresh 5 percenként

---

## Tasks / Subtasks

- [x] **Task 1: Backend API**
  - [x] 1.1: `RentalDashboardController` létrehozása
  - [x] 1.2: `GET /dashboard/rental/stats` endpoint
  - [x] 1.3: `GET /dashboard/rental/popular` endpoint
  - [x] 1.4: `GET /dashboard/rental/seasonality` endpoint
  - [x] 1.5: `RentalDashboardService` mock adatokkal (MVP)

- [x] **Task 2: RentalStatsWidget**
  - [x] 2.1: Widget komponens létrehozása
  - [x] 2.2: TrendIndicator integráció
  - [x] 2.3: useRentalStats hook (TanStack Query)

- [x] **Task 3: PopularEquipmentWidget**
  - [x] 3.1: Widget komponens létrehozása
  - [x] 3.2: Lista formázás (gép neve, bérlések, bevétel)
  - [x] 3.3: usePopularEquipment hook

- [x] **Task 4: SeasonalityChartWidget**
  - [x] 4.1: Widget komponens létrehozása
  - [x] 4.2: Recharts AreaChart integráció
  - [x] 4.3: useSeasonality hook

- [x] **Task 5: Widget Registry Integráció**
  - [x] 5.1: 3 widget regisztrálása WIDGET_REGISTRY-be
  - [x] 5.2: Role filter: STORE_MANAGER, ADMIN
  - [x] 5.3: Lazy loading setup

- [x] **Task 6: Tesztelés**
  - [x] 6.1: Unit tesztek (min. 80% coverage)
  - [x] 6.2: API endpoint tesztek

---

## Technical Notes

### API Response Formátumok

```typescript
// GET /dashboard/rental/stats
interface RentalStatsResponse {
  averageRentalDays: number;
  averageRentalDaysDelta: number; // % változás
  totalRentals: number;
  activeRentals: number;
  overdueRentals: number;
}

// GET /dashboard/rental/popular?limit=5
interface PopularEquipmentResponse {
  equipment: {
    id: string;
    name: string;
    rentalCount: number;
    revenue: number;
  }[];
}

// GET /dashboard/rental/seasonality?months=12
interface SeasonalityResponse {
  data: {
    month: string; // "2026-01"
    rentalCount: number;
    revenue: number;
  }[];
}
```

---

## Dependencies

- Story 35-1: RBAC Dashboard Layout
- Story 35-2: Pénzügyi KPI Dashboard (TrendIndicator)
- Epic 14: Rental model

---

## Definition of Done

- [ ] Minden AC teljesítve
- [ ] 3 widget működik és megjelenik a dashboard-on
- [ ] API endpoint-ok működnek
- [ ] Unit tesztek (min. 80% coverage)
- [ ] Code review PASS (adversarial, min. 3 issue fix)
- [ ] TypeScript build sikeres

---

## Changelog

| Verzió | Dátum      | Változás                                  |
| ------ | ---------- | ----------------------------------------- |
| 1.0    | 2026-02-11 | Story létrehozva                          |
| 1.1    | 2026-02-11 | Implementation completed - all tasks done |

---

**Készítette:** BMAD Sprint Planning (SM Agent)
