# Story 48-2: Bérlési Riport Oldal

**Status:** done
**Epic:** Epic 48 - Bérlési Dashboard & Export
**Package:** `apps/kgc-web/` + `apps/kgc-api/`
**Estimated SP:** 2

---

## Story

**As a** Boltvezető,
**I want** részletes bérlési riportot látni külön oldalon,
**So that** mélyebb elemzést végezhessek.

---

## Scope

### IN SCOPE

1. **RentalReportsPage** - Új oldal `/reports/rentals` route-on
2. **Időszak szűrő** - DateRangePicker
3. **Géptípus szűrő** - Select komponens
4. **API endpoint** - Részletes bérlési adatok

### OUT OF SCOPE

- PDF export (→ Story 48-3)
- Excel export (→ Story 48-4)

---

## Acceptance Criteria

### AC1: Bérlési Riport Oldal Megnyitása

**Given** bejelentkezett Boltvezető/Admin
**When** megnyitom a `/reports/rentals` oldalt
**Then** látom a bérlési riport oldalt:

- Oldal címe: "Bérlési Riport"
- DateRangePicker időszak szűrővel
- Géptípus dropdown szűrővel

### AC2: Riport Adatok Megjelenítése

**Given** a bérlési riport oldalon vagyok
**When** betölt az oldal
**Then** látom az alábbi adatokat:

- Összes bérlés száma
- Aktív bérlések száma
- Lezárt bérlések száma
- Átlagos bérlési idő (napokban)
- Átlagos bevétel/bérlés (Ft)
- Késedelmes visszavételek száma

### AC3: Szűrők Működése

**Given** a bérlési riport oldalon vagyok
**When** módosítom az időszak vagy géptípus szűrőt
**Then** a riport adatok frissülnek az új szűrő szerint

### AC4: API Endpoint

**Given** bérlési riport oldal
**When** adatot kér
**Then** a következő API endpoint működik:

- `GET /api/v1/reports/rentals?from=&to=&equipmentType=`

---

## Tasks / Subtasks

- [x] **Task 1: Backend API**
  - [x] 1.1: `RentalReportsController` létrehozva `/reports/rentals` endpoint-tal
  - [x] 1.2: Query paraméterek: from, to, equipmentType
  - [x] 1.3: Mock data szolgáltatás (MVP)

- [x] **Task 2: Frontend Page**
  - [x] 2.1: `RentalReportsPage.tsx` komponens
  - [x] 2.2: Route hozzáadása: `/reports/rentals`
  - [x] 2.3: Navigation link hozzáadása (ReportsPage "Bérlések" tabról)

- [x] **Task 3: Szűrők**
  - [x] 3.1: DateRangePicker (native date input + quick range gombok)
  - [x] 3.2: Géptípus Select komponens
  - [x] 3.3: URL query param szinkronizáció

- [x] **Task 4: Adatok Megjelenítése**
  - [x] 4.1: KPI kártyák (6 összesítő)
  - [x] 4.2: Részletes táblázat (gép típusonként)
  - [x] 4.3: useRentalReport hook (TanStack Query)

- [x] **Task 5: Tesztelés**
  - [x] 5.1: Unit tesztek (backend + frontend)
  - [ ] 5.2: E2E teszt (pending)

---

## Technical Notes

### API Response Formátum

```typescript
// GET /reports/rentals?from=&to=&equipmentType=
interface RentalReportResponse {
  summary: {
    totalRentals: number;
    activeRentals: number;
    closedRentals: number;
    averageRentalDays: number;
    averageRevenuePerRental: number;
    overdueReturns: number;
  };
  byEquipmentType: {
    type: string;
    count: number;
    revenue: number;
  }[];
  periodStart: string;
  periodEnd: string;
}
```

---

## Dependencies

- Story 48-1: Bérlési Statisztika Widget (API service)
- Epic 14: Rental model

---

## Definition of Done

- [ ] Minden AC teljesítve
- [ ] Oldal elérhető `/reports/rentals` route-on
- [ ] Szűrők működnek
- [ ] Unit tesztek (min. 80% coverage)
- [ ] Code review PASS

---

## Changelog

| Verzió | Dátum      | Változás         |
| ------ | ---------- | ---------------- |
| 1.0    | 2026-02-11 | Story létrehozva |

---

**Készítette:** BMAD Sprint Planning (SM Agent)
