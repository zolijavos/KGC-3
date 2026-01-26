# Story 27.1: Dashboard Widgetek

Status: ready-for-dev

---

## Story

**Mint** üzletvezető,
**szeretnék** egy áttekinthető dashboard-ot látni a legfontosabb KPI-okkal,
**hogy** gyorsan felmérhessem az üzlet aktuális állapotát.

---

## Acceptance Criteria

### AC1: KPI Widget-ek

- [ ] Napi bevétel widget (mai összeg, tegnapi összehasonlítás, %)
- [ ] Aktív bérlések widget (darab, lejárók ma, késések)
- [ ] Nyitott munkalapok widget (darab, státusz szerinti bontás)
- [ ] Készlet figyelmeztetések widget (alacsony készlet darab)

### AC2: Trend Grafikonok

- [ ] Heti bevétel trend (vonaldiagram)
- [ ] Bérlés/eladás arány (kördiagram)
- [ ] Top 5 termék (bar chart)

### AC3: Widget konfiguráció

- [ ] Widget-ek pozíciója drag-and-drop
- [ ] Widget-ek láthatósága ki/be kapcsolható
- [ ] Konfiguráció mentése user-enként

### AC4: Valós idejű frissítés

- [ ] Auto-refresh konfigurálható időközönként
- [ ] WebSocket push update kritikus változásoknál
- [ ] Loading/stale state jelzés

---

## Tasks / Subtasks

### Task 1: Dashboard API (AC: 1, 2)

- [ ] 1.1 DashboardService implementáció
- [ ] 1.2 getDailyRevenue() - napi bevétel + trend
- [ ] 1.3 getActiveRentals() - aktív bérlések összesítő
- [ ] 1.4 getOpenWorksheets() - nyitott munkalapok
- [ ] 1.5 getStockAlerts() - készlet figyelmeztetések
- [ ] 1.6 Unit tesztek

### Task 2: Aggregációs lekérdezések (AC: 1, 2)

- [ ] 2.1 RevenueAggregationService - bevétel összesítés
- [ ] 2.2 getWeeklyTrend() - 7 napos trend
- [ ] 2.3 getTopProducts() - top termékek
- [ ] 2.4 Cache layer (Redis/in-memory)

### Task 3: Widget konfigurációs API (AC: 3)

- [ ] 3.1 DashboardConfig Prisma modell
- [ ] 3.2 getUserDashboardConfig() - konfig lekérés
- [ ] 3.3 updateDashboardConfig() - konfig mentés
- [ ] 3.4 Default konfig tenant szinten

### Task 4: API endpoints (AC: all)

- [ ] 4.1 GET /dashboard - összes widget adat
- [ ] 4.2 GET /dashboard/widgets/:type - egyedi widget
- [ ] 4.3 GET /dashboard/config - user konfig
- [ ] 4.4 PUT /dashboard/config - konfig mentés
- [ ] 4.5 WebSocket /dashboard/live - élő frissítések

### Task 5: Frontend widget-ek (AC: 1, 2, 3, 4)

- [ ] 5.1 KpiCard komponens (szám + változás %)
- [ ] 5.2 TrendChart komponens (recharts)
- [ ] 5.3 DashboardGrid komponens (@dnd-kit)
- [ ] 5.4 WidgetSettingsDialog
- [ ] 5.5 Auto-refresh hook

---

## Dev Notes

### Architektúra

**Package:** Új `@kgc/reporting` (packages/shared/reporting/) package

**API Response:**

```typescript
interface DashboardData {
  revenue: {
    today: number;
    yesterday: number;
    change: number; // percentage
    weeklyTrend: { date: string; amount: number }[];
  };
  rentals: {
    active: number;
    dueToday: number;
    overdue: number;
  };
  worksheets: {
    open: number;
    byStatus: Record<WorksheetStatus, number>;
  };
  stockAlerts: {
    count: number;
    critical: number;
  };
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}
```

### Cache stratégia

- Dashboard adatok: 1 perc TTL
- Trend adatok: 5 perc TTL
- Real-time push: bevétel változás, új bérlés, munkalap lezárás

### Kapcsolódó Epic-ek

- Epic 22: POS (bevétel adatok)
- Epic 14: Rental (bérlés adatok)
- Epic 17: Worksheet (munkalap adatok)
- Epic 9: Inventory (készlet adatok)

### TDD kötelező

- Aggregációs lekérdezések pontossága
- Cache invalidáció
- Tenant isolation

---

## References

- [Epic 27: Reporting Engine](../planning-artifacts/epics/epic-27-reporting-engine.md)
- [ADR-023: Composable frontend](../planning-artifacts/adr/ADR-023-composable-frontend-shadcn.md)
