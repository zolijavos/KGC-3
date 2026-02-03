# Epic 35: Dashboard Foundation - MVP

**Epic ID:** EPIC-35
**Cím:** Dashboard Widget Rendszer Alapjai (MVP)
**Státusz:** READY FOR DEV
**Prioritás:** P0 (KRITIKUS)
**Dátum:** 2026-02-03
**Estimált SP:** 16 SP (2 sprint)
**Kapcsolódó ADR:** ADR-041 (Dashboard Widget Architecture)

---

## Epic Leírás

Szerepkör-alapú dashboard rendszer megvalósítása a KGC ERP v7.0-hoz. Az MVP célkitűzés: **Boltvezető reggel 8-kor bejelentkezik és látja a tegnapi bevételt összehasonlítva az előző hónappal**, valamint **Operátor azonnal látja a kritikus készlethiány alerteket**.

Ez az első fázis (MVP) 3 szerepkör dashboard-ját valósítja meg:

- **OPERATOR:** Scanner Focus layout (minimál UI)
- **STORE_MANAGER:** Dashboard First layout (KPI-k + grafikonok)
- **ADMIN:** Dashboard + Reports layout (komplex elemzés)

---

## Üzleti Érték

**Probléma:**
Jelenleg nincs egységes dashboard, a boltvezetők nem látják gyorsan a napi bevételt, az operátorok nem kapnak azonnali alertet kritikus készlethiánynál.

**Megoldás:**
Szerepkör-specifikus dashboard widget rendszer, amely real-time (5 perc polling) KPI-kat és alerteket jelenít meg.

**Várható Eredmény:**

- Boltvezető napi döntéshozatali idő: -30%
- Operátor készlethiány react time: -50%
- Admin riport készítési idő: -40%

---

## Scope

### ✅ IN SCOPE (MVP - Sprint 1-2)

**Sprint 1: Dashboard Infrastructure + Pénzügyi KPI (8 SP)**

1. RBAC Dashboard Layout Engine (roles-based widget loading)
2. Pénzügyi KPI Dashboard (4 widget: Bruttó, Nettó, Kintlévő, Befizetés)
3. Date range picker + időszak összehasonlítás
4. Drill-down modal (többszintű bontás)

**Sprint 2: Készlet Dashboard + Alertek (8 SP)** 5. Készlet Dashboard (5 widget: összefoglaló, kihasználtság, alertek, mozgás, heatmap) 6. Alert Notification Panel (2 widget: notification panel, critical toast) 7. 5 perces auto-refresh (TanStack Query)

### ⚠️ PHASE 2 (Sprint 3-4)

8. Szerviz Dashboard (részleges - 3 widget + 1 placeholder)
9. Partner Dashboard (részleges - 3 widget + 1 feature flag)
10. WebSocket real-time events (kritikus események)

### 🚫 OUT OF SCOPE (Later)

- Bérlési Statisztika Dashboard (követelmények tisztázatlanok)
- Bevételi Előrejelzés Widget (időtáv tisztázatlan)
- User-level dashboard testreszabás (NEM kell! Admin által beállított fix layout)
- Mobil (telefon) támogatás (csak tablet MVP-ben)

---

## Acceptance Criteria (Epic szint)

1. ✅ **RBAC Integration:** Operátor csak Scanner Focus layout-ot lát, Boltvezető Dashboard First-öt, Admin mindent
2. ✅ **Boltvezető Use Case:** Bejelentkezés után azonnal látja a napi bevételt összehasonlítva előző hónappal
3. ✅ **Operátor Use Case:** Scanner Focus layout-ban látja a kritikus készlethiány alerteket (max 5 perc késleltetés)
4. ✅ **Date Range:** Minden KPI widget támogatja a date range picker-t (napi, heti, havi, negyedéves, éves)
5. ✅ **Összehasonlítás:** Current vs. Previous period delta számítás minden pénzügyi KPI-nál
6. ✅ **Drill-down:** KPI kártya click → modal részletes riporttal (Összesített → Bolt → Szerviz → Partner bontás)
7. ✅ **Auto-refresh:** Minden widget 5 percenként automatikusan frissül
8. ✅ **Tablet Support:** Reszponzív design, tablet portrait és landscape működik
9. ✅ **Export:** Minden táblázat/riport widget exportálható PDF/Excel/CSV formátumba
10. ✅ **Performance:** Dashboard load time < 2 sec (first paint)

---

## Sprint 1 Stories (8 SP)

### Story 1.1: RBAC Dashboard Layout Engine (3 SP)

**Cím:** Szerepkör-alapú dashboard layout váltás

**User Story:**
_"Mint Boltvezető, szeretném látni a Dashboard First layout-ot 4-6 KPI kártyával és grafikonokkal, hogy gyorsan áttekinthessem a napi teljesítményt."_

**Acceptance Criteria:**

1. ✅ `RoleBasedDashboard` komponens lazy load-olja a role-specific layout-ot
2. ✅ OPERATOR → `ScannerFocusLayout` (3-5 widget, minimál UI)
3. ✅ STORE_MANAGER → `DashboardFirstLayout` (8-10 widget, 3x2-3 grid)
4. ✅ ADMIN → `DashboardFirstLayout` + Reports (15+ widget, 4x4 grid)
5. ✅ Widget Registry pattern (ADR-041 szerint)
6. ✅ Role-based widget filtering (`WIDGET_REGISTRY[widget].roles`)
7. ✅ Responsive grid (tablet portrait/landscape)
8. ✅ Skeleton loading minden widget-hez

**Technical Tasks:**

- [ ] `RoleBasedDashboard.tsx` komponens (lazy load)
- [ ] `WidgetRegistry.ts` (widget katalógus + role filter)
- [ ] `ScannerFocusLayout.tsx` (OPERATOR layout)
- [ ] `DashboardFirstLayout.tsx` (STORE_MANAGER/ADMIN layout)
- [ ] `WidgetSkeleton.tsx` (loading state)
- [ ] `WidgetError.tsx` (error state)
- [ ] Layout config JSON (`LAYOUT_CONFIG` ADR-041 szerint)
- [ ] Unit tesztek (Vitest)
- [ ] E2E teszt (Playwright): role switch teszt

**Estimált SP:** 3

---

### Story 1.2: Pénzügyi KPI Dashboard - Phase 1 (5 SP)

**Cím:** 4 KPI kártya + Date Range Picker + Összehasonlítás

**User Story:**
_"Mint Boltvezető, szeretném látni a napi/heti/havi bevételt összehasonlítva az előző időszakkal, hogy lássam a trend-et és delta-t."_

**Acceptance Criteria:**

1. ✅ **4 KPI Kártya Widget:**
   - `RevenueKPICard` - Bruttó bevétel
   - `NetRevenueKPICard` - Nettó bevétel
   - `ReceivablesKPICard` - Kintlévőség (piros ha > 500K)
   - `PaymentsKPICard` - Befizetések

2. ✅ **Minden KPI kártya tartalmazza:**
   - Current period érték
   - Previous period érték
   - Delta (%, abszolút)
   - Trend indicator (↑ zöld / ↓ piros / → szürke)
   - Badge státusszal (ha van threshold)

3. ✅ **Date Range Picker (shadcn Calendar):**
   - Period selector: Napi, Heti, Havi, Negyedéves, Éves
   - Date from - Date to picker
   - "Comparison" toggle (current vs. previous)
   - Preset ranges: "Ma", "Tegnap", "Ez a hét", "Ez a hónap", "Előző hónap"

4. ✅ **Drill-down Modal:**
   - KPI kártya click → `DrillDownModal` nyílik
   - Többszintű bontás (breadcrumb nav):
     - Összesített
     - Bolt szint (`bolt_id`)
     - Szerviz szint (szerviz bevétel)
     - Bérlések szint (rental bevétel)
     - Partner szint (`partner_id`)
   - Táblázat (shadcn Table) sort/filter támogatással
   - Export gombok (PDF, Excel, CSV)

5. ✅ **API Integration:**
   - `GET /api/v1/dashboard/kpi/revenue` (bruttó bevétel)
   - `GET /api/v1/dashboard/kpi/net-revenue` (nettó)
   - `GET /api/v1/dashboard/kpi/receivables` (kintlévőség)
   - `GET /api/v1/dashboard/kpi/payments` (befizetések)
   - Query params: `dateFrom`, `dateTo`, `period`, `comparison=true`, `groupBy`

6. ✅ **Auto-refresh:**
   - TanStack Query `refetchInterval: 5 * 60 * 1000` (5 perc)
   - `staleTime: 4 * 60 * 1000` (4 perc)
   - Manual refresh button (RefreshCw icon)

**Technical Tasks:**

- [ ] `RevenueKPICard.tsx` widget
- [ ] `NetRevenueKPICard.tsx` widget
- [ ] `ReceivablesKPICard.tsx` widget
- [ ] `PaymentsKPICard.tsx` widget
- [ ] `DateRangePicker.tsx` komponens (shadcn Calendar + Popover)
- [ ] `TrendIndicator.tsx` komponens (↑ ↓ → ikonok + színkód)
- [ ] `ComparisonText.tsx` komponens (delta számítás + formázás)
- [ ] `DrillDownModal.tsx` komponens (breadcrumb nav + táblázat)
- [ ] `ExportButtons.tsx` komponens (PDF/Excel/CSV)
- [ ] API routes (NestJS):
  - `dashboard/kpi/revenue.controller.ts`
  - `dashboard/kpi/net-revenue.controller.ts`
  - `dashboard/kpi/receivables.controller.ts`
  - `dashboard/kpi/payments.controller.ts`
- [ ] Service layer:
  - `dashboard-kpi.service.ts` (aggregált lekérdezések)
  - Delta kalkuláció logic
  - Period comparison logic
- [ ] Zod schemas (API response validation)
- [ ] Unit tesztek (Vitest) - TDD!
- [ ] E2E teszt (Playwright): full user journey (date picker → drill-down → export)

**Estimált SP:** 5

---

## Sprint 2 Stories (8 SP)

### Story 2.1: Készlet Dashboard (5 SP)

**Cím:** 5 Készlet Widget + Alert Rendszer

**User Story:**
_"Mint Operátor, szeretném látni a kritikus készlethiány alerteket azonnal bejelentkezéskor, hogy gyorsan reagálhassak."_

**Acceptance Criteria:**

1. ✅ **5 Készlet Widget:**
   - `StockSummaryCard` - Összes gép + bontás (Bolt/Raktár/Szerviz)
   - `UtilizationGauge` - Kihasználtsági mutató (%) circular progress
   - `StockAlertList` - Készlethiány lista (kritikus/figyelmeztetés badge-el)
   - `StockMovementChart` - Készlet be/ki mozgás timeline (Recharts LineChart)
   - `StockHeatmap` - Géptípus x Helyszín heatmap (Recharts)

2. ✅ **Készlethiány Alert Logika:**
   - Kritikus: aktuális készlet < 50% minimum threshold (piros badge)
   - Figyelmeztetés: 50-100% threshold (sárga badge)
   - Alert lista click → gép részletek + beszerzési javaslat

3. ✅ **Kihasználtsági Mutató:**
   - Formula: `(Bérlésben levő gépek / Összes gép) * 100`
   - Színkód: Zöld > 80%, Sárga 60-80%, Piros < 60%
   - Label: "Bérlésben: 290 / 342 gép"

4. ✅ **API Integration:**
   - `GET /api/v1/dashboard/inventory/summary`
   - `GET /api/v1/dashboard/inventory/alerts`
   - `GET /api/v1/dashboard/inventory/movement?days=30`
   - `GET /api/v1/dashboard/inventory/heatmap`

**Technical Tasks:**

- [ ] `StockSummaryCard.tsx` widget
- [ ] `UtilizationGauge.tsx` widget (shadcn Progress circular)
- [ ] `StockAlertList.tsx` widget (shadcn Table vagy Card lista)
- [ ] `StockMovementChart.tsx` widget (Recharts LineChart)
- [ ] `StockHeatmap.tsx` widget (Recharts custom heatmap vagy grid)
- [ ] API routes (NestJS):
  - `dashboard/inventory.controller.ts`
- [ ] Service:
  - `dashboard-inventory.service.ts` (készlet aggregációk)
  - Alert threshold kalkuláció
  - Kihasználtsági mutató számítás
- [ ] Zod schemas
- [ ] Unit tesztek (TDD)
- [ ] E2E teszt: Operátor bejelentkezik → látja alerteket < 5 sec

**Estimált SP:** 5

---

### Story 2.2: Alert Notification Panel (3 SP)

**Cím:** Értesítési panel + Critical Alert Toast

**User Story:**
_"Mint Operátor, szeretnék kritikus eseményekről azonnal értesítést kapni toast-ban, és látni az összes értesítést egy panel-ben."_

**Acceptance Criteria:**

1. ✅ **Notification Panel:**
   - Badge (piros) header-ben olvasatlan számmal
   - Click → Slide-in panel (shadcn Sheet)
   - Lista: értesítések időrend szerinti (legújabb felül)
   - 3 típus: Kritikus (piros), Figyelmeztetés (sárga), Info (kék)
   - Mark as read funkció (checkbox vagy click)
   - "Clear all" gomb

2. ✅ **Critical Alert Toast:**
   - shadcn Toast komponens
   - Kritikus események:
     - Készlethiány (< 50% min threshold)
     - Fizetési hiba (elutasított tranzakció)
     - Sürgős munkalap (priority: urgent)
   - Auto-dismiss: 10 másodperc
   - Action button: "Részletek" → redirect widget-hez/modal-hoz
   - Sound alert opcionális (feature flag)

3. ✅ **API Integration:**
   - `GET /api/v1/dashboard/notifications?unread=true`
   - `POST /api/v1/dashboard/notifications/:id/mark-read`
   - `POST /api/v1/dashboard/notifications/clear-all`

4. ✅ **Polling (MVP):**
   - 5 perces polling notification lista frissítéshez
   - Phase 2: WebSocket real-time push

**Technical Tasks:**

- [ ] `NotificationPanel.tsx` komponens (shadcn Sheet)
- [ ] `NotificationBadge.tsx` komponens (header-ben)
- [ ] `CriticalAlertToast.tsx` komponens (shadcn Toast)
- [ ] `NotificationList.tsx` komponens (lista renderelés)
- [ ] API routes:
  - `dashboard/notifications.controller.ts`
- [ ] Service:
  - `dashboard-notifications.service.ts`
  - Kritikus esemény detekció logic
- [ ] Zod schemas
- [ ] Unit tesztek
- [ ] E2E teszt: trigger kritikus event → toast megjelenik → panel click → lista látható

**Estimált SP:** 3

---

## Dependencies

### Blokkoló függőségek

- ❌ NINCS blokkoló függőség Sprint 1-2-höz!

### Nice-to-have (nem blokkol)

- ⚠️ WebSocket implementáció (Phase 2)
- ⚠️ Szerviz KPI lista tisztázása (Sprint 3-hoz)
- ⚠️ Partner szegmentáció kategóriák (Sprint 3-hoz)

---

## Risks & Mitigations

| Risk                                      | Probability | Impact | Mitigation                                  |
| ----------------------------------------- | ----------- | ------ | ------------------------------------------- |
| **5 perces polling lassú**                | Low         | Medium | Phase 2: WebSocket kritikus widget-ekhez    |
| **Drill-down lekérdezés lassú**           | Medium      | Medium | Indexek + aggregált view-k PostgreSQL-ben   |
| **Tablet responsive probléma**            | Low         | Low    | Tesztelés iPad + Android tablet-en          |
| **Widget proliferáció (20+)**             | Medium      | Low    | Registry pattern + lazy load → nem probléma |
| **Tisztázatlan követelmények (Sprint 3)** | High        | Low    | Feature flag + placeholder widget           |

---

## Technical Notes

### Stack

- **Frontend:** Next.js 14 + shadcn/ui + TanStack Query + Recharts + Zod
- **Backend:** NestJS + PostgreSQL + Prisma
- **Testing:** Vitest (unit) + Playwright (E2E)

### Performance Targets

- Dashboard load time (first paint): < 2 sec
- Widget data fetch: < 500ms (95th percentile)
- Auto-refresh overhead: < 100ms
- Lighthouse score: > 90

### Data Retention

- Aggregált KPI-k: 24 hónap
- Notification history: 90 nap
- Dashboard audit log: 12 hónap

---

## Definition of Done (Epic szint)

- [ ] Minden story DONE (AC teljesítve)
- [ ] Unit teszt coverage > 80%
- [ ] E2E tesztek pass (Playwright)
- [ ] Code review DONE (adversarial, min 3 issue found & fixed)
- [ ] Performance targets elérve
- [ ] Tablet responsive teszt pass
- [ ] Dokumentáció frissítve (ADR-041, README)
- [ ] Demo készült (Boltvezető + Operátor use case)
- [ ] Retrospektív DONE (epic-35-retro.md)

---

## Kapcsolódó Dokumentumok

- [ADR-041: Dashboard Widget Architecture](../adr/ADR-041-dashboard-widget-architecture.md)
- [Dashboard Requirements v1](../dashboard-requirements-v1.md)
- [ADR-023: Composable Frontend](../adr/ADR-023-composable-frontend-strategia.md)
- [ADR-032: RBAC](../adr/ADR-032-rbac-teljes-architektura.md)
- [UX Design Specification](../ux-design-specification.md)

---

## Changelog

| Verzió | Dátum      | Változás                                   |
| ------ | ---------- | ------------------------------------------ |
| 1.0    | 2026-02-03 | Epic létrehozva - READY FOR DEV (YOLO MVP) |

---

**Készítette:** John (PM) + Winston (Architect) + Sally (UX) + Mary (Analyst) + BMAD Party Mode
**Jóváhagyva:** YOLO Mode 🚀
**Módszertan:** BMAD Method
