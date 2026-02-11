# Story 49-1: Garanciális vs Fizetős Arány Widget

**Status:** done
**Epic:** Epic 49 - Szerviz Statisztikák Dashboard
**Package:** `apps/kgc-web/` + `apps/kgc-api/`
**Estimated SP:** 2

---

## Story

**As a** Boltvezető,
**I want** látni a garanciális és fizetős javítások arányát,
**So that** átlássam a szerviz összetételét.

---

## Scope

### IN SCOPE

1. **WarrantyRatioWidget** - Lecseréli a placeholder-t
2. **Kördiagram** - Recharts PieChart
3. **Mini trend grafikon** - 6 havi trend
4. **API endpoint** - Garanciális vs fizetős arány

### OUT OF SCOPE

- Részletes szerviz riport oldal
- Makita specifikus riportok

---

## Acceptance Criteria

### AC1: Arány Megjelenítése

**Given** bejelentkezett Boltvezető/Admin
**When** megnyitom a dashboard-ot
**Then** látom a `WarrantyRatioWidget`-et:

- Garanciális/fizetős arány kördiagramon
- Számok: X garanciális, Y fizetős
- Bevétel mindkét kategóriában (Ft)

### AC2: Időszak Szűrés

**Given** a dashboard-on vagyok
**When** kiválasztom a "Hónap" időszakot (period selector)
**Then** az arány az aktuális hónapra frissül:

- Előző hónaphoz képest a változás látható

### AC3: Trend Megjelenítése

**Given** a dashboard-on vagyok
**When** megnézem a widget-et
**Then** látom a 6 havi trendet:

- Mini sparkline grafikon
- Trend mutatja ha nő a garanciális arány

### AC4: API Endpoint

**Given** warranty ratio widget
**When** adatot kér
**Then** a következő API endpoint működik:

- `GET /api/v1/dashboard/service/warranty-ratio?period=month`

### AC5: Widget Registry Frissítés

**Given** létező `warranty-ratio-placeholder` a registry-ben
**When** ez a story elkészül
**Then** a placeholder lecserélődik:

- `warranty-ratio-placeholder` → `warranty-ratio`
- Valódi widget jelenik meg

---

## Tasks / Subtasks

- [x] **Task 1: Backend API**
  - [x] 1.1: `GET /dashboard/service/warranty-ratio` endpoint
  - [x] 1.2: Period paraméter (day, week, month)
  - [x] 1.3: Trend adatok (6 hónap)
  - [x] 1.4: Warranty vs Paid aggregáció

- [x] **Task 2: WarrantyRatioWidget**
  - [x] 2.1: Widget komponens létrehozása
  - [x] 2.2: Recharts PieChart integráció
  - [x] 2.3: Számok és bevétel megjelenítés
  - [x] 2.4: useWarrantyRatio hook (TanStack Query)

- [x] **Task 3: Mini Trend Grafikon**
  - [x] 3.1: Sparkline komponens
  - [x] 3.2: 6 havi adat megjelenítés
  - [x] 3.3: Trend irány jelzés

- [x] **Task 4: Widget Registry Frissítés**
  - [x] 4.1: Placeholder eltávolítása
  - [x] 4.2: Valódi widget regisztrálása
  - [x] 4.3: Role filter: STORE_MANAGER, ADMIN

- [x] **Task 5: Tesztelés**
  - [x] 5.1: Unit tesztek (min. 80% coverage)
  - [x] 5.2: API endpoint tesztek

---

## Technical Notes

### API Response Formátum

```typescript
// GET /dashboard/service/warranty-ratio?period=month
interface WarrantyRatioResponse {
  warranty: {
    count: number;
    revenue: number;
    percentage: number;
  };
  paid: {
    count: number;
    revenue: number;
    percentage: number;
  };
  trend: {
    month: string; // "2026-01"
    warrantyPercent: number;
  }[];
  periodStart: string;
  periodEnd: string;
}
```

### Kördiagram Színek

| Kategória   | Szín | Hex     |
| ----------- | ---- | ------- |
| Garanciális | Kék  | #3B82F6 |
| Fizetős     | Zöld | #10B981 |

---

## Dependencies

- Story 35-5: Szerviz Dashboard (placeholder widget)
- Epic 17: Worksheet model
- Epic 19: Warranty Claims model

---

## Definition of Done

- [ ] Minden AC teljesítve
- [ ] Placeholder lecserélve valódi widget-re
- [ ] Kördiagram és trend működik
- [ ] API endpoint működik
- [ ] Unit tesztek (min. 80% coverage)
- [ ] Code review PASS (adversarial, min. 3 issue fix)

---

## Changelog

| Verzió | Dátum      | Változás         |
| ------ | ---------- | ---------------- |
| 1.0    | 2026-02-11 | Story létrehozva |

---

**Készítette:** BMAD Sprint Planning (SM Agent)
