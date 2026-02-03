# ADR-041: Dashboard Widget Architecture

**Státusz:** ELFOGADVA
**Dátum:** 2026-02-03
**Döntéshozók:** Architect (Winston), PM (John), UX Designer (Sally)
**Kapcsolódó ADR-ek:** ADR-023 (Composable Frontend), ADR-032 (RBAC), ADR-040 (Feladatlista Widget)

---

## Kontextus

A KGC ERP v7.0-hoz szerepkör-alapú dashboard rendszert tervezünk. **29 tisztázott követelmény** alapján 3 fő szerepkör dashboard-ját kell megvalósítani:

- **OPERATOR:** Scanner Focus (minimál UI, gyors műveletek)
- **STORE_MANAGER:** Dashboard First (KPI-k, döntéstámogatás)
- **ADMIN:** Dashboard + Reports (komplex elemzés, részletes riportok)

### Üzleti Követelmények

| Követelmény                       | Érték                                             | Prioritás |
| --------------------------------- | ------------------------------------------------- | --------- |
| **Szerepkör-alapú nézetek**       | 3 fő szerepkör (Operator, Store Manager, Admin)   | KRITIKUS  |
| **Admin által beállított layout** | NEM user-testreszabás! Fix layout szerepkörönként | KRITIKUS  |
| **Real-time frissítés**           | 5 perces polling + kritikus események             | MAGAS     |
| **Widget típusok**                | 20+ widget (Pénzügy, Készlet, Szerviz, Partner)   | MAGAS     |
| **Tablet támogatás**              | Responsive design, tablet-optimalizált            | MAGAS     |
| **Időszak összehasonlítás**       | Current vs. Previous period                       | MAGAS     |
| **Drill-down riportok**           | Többszintű bontás (Összesített → Bolt → Szerviz)  | MAGAS     |

### Meglévő Architektúra

- **Stack:** Next.js + shadcn/ui (ADR-023)
- **RBAC:** Role-based access control (ADR-032)
- **Multi-tenancy:** tenant_id + RLS
- **Widget minta:** ADR-040 Feladatlista Widget

---

## Döntések

### 1. Widget Registry Pattern (ELFOGADVA)

**Döntés:** Központi Widget Registry lazy loading-gal, szerepkör alapú szűréssel.

**Indoklás:**

- ✅ Már bevált (ADR-040 Feladatlista Widget)
- ✅ Code splitting → gyorsabb betöltés
- ✅ Könnyű bővítés új widget-ekkel
- ✅ Role-based filtering out-of-the-box

**Alternatíva:** Monolitikus dashboard komponens (elutasítva - nem skálázódik)

```typescript
// Widget Registry
const WIDGET_REGISTRY = {
  'revenue-kpi': {
    component: lazy(() => import('./widgets/RevenueKPICard')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 perc
  },
  'stock-alerts': {
    component: lazy(() => import('./widgets/StockAlertList')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300,
  },
  // ... 20+ widget
};
```

---

### 2. Boring Technology Stack (ELFOGADVA)

**Döntés:** Használjuk a már létező, bevált technológiákat. YOLO = Ship Fast!

| Technológia        | Használat                      | Indoklás                                |
| ------------------ | ------------------------------ | --------------------------------------- |
| **shadcn/ui**      | Card, Badge, Chart komponensek | ✅ Már használjuk (ADR-023)             |
| **Recharts**       | Grafikonok (line, bar, pie)    | ✅ Simple, lightweight, works           |
| **TanStack Query** | Data fetching + cache          | ✅ Auto-refresh, stale-while-revalidate |
| **Zod**            | API response validation        | ✅ Type-safe, runtime checks            |
| **date-fns**       | Időszak számítások             | ✅ Lightweight, tree-shakeable          |

**NINCS:**

- ❌ Komplex widget engine (túl korán)
- ❌ GraphQL (REST API elég MVP-hez)
- ❌ WebSocket MVP-ben (Phase 2)

---

### 3. Update Strategy: Polling First, WebSocket Later (ELFOGADVA)

**Döntés:** MVP-ben 5 perces polling MINDEN widget-re. WebSocket Phase 2-ben.

**Indoklás:**

- ✅ Egyszerű implementáció
- ✅ TanStack Query built-in support
- ✅ 5 perc elég KPI-khoz (nem real-time trading app)
- ✅ Kritikus alertek később WebSocket-tel

**Phase 2 WebSocket (nem MVP):**

- Kritikus készlethiány alert
- Fizetési hiba értesítés
- Új bérlés indítás notification

```typescript
// MVP: Simple polling
const { data, isLoading } = useQuery({
  queryKey: ['revenue-kpi', dateRange],
  queryFn: () => fetchRevenueKPI(dateRange),
  refetchInterval: 5 * 60 * 1000, // 5 perc
  staleTime: 4 * 60 * 1000, // 4 perc (1 perc átfedés)
});
```

---

### 4. Role-Based Layout Config (ELFOGADVA)

**Döntés:** JSON-based layout config admin által szerkeszthető (később admin UI).

```typescript
// Layout konfigurációk szerepkörönként
const LAYOUT_CONFIG = {
  OPERATOR: {
    layout: 'scanner-focus',
    widgets: [
      { id: 'stock-alerts', position: { row: 1, col: 1 }, size: 'medium' },
      { id: 'quick-actions', position: { row: 1, col: 2 }, size: 'small' },
      { id: 'recent-rentals', position: { row: 2, col: 1, span: 2 }, size: 'large' },
    ],
    density: 'compact',
  },

  STORE_MANAGER: {
    layout: 'dashboard-first',
    widgets: [
      // 4 KPI kártya felül (3x2 grid)
      { id: 'revenue-kpi', position: { row: 1, col: 1 }, size: 'small' },
      { id: 'net-revenue-kpi', position: { row: 1, col: 2 }, size: 'small' },
      { id: 'receivables-kpi', position: { row: 1, col: 3 }, size: 'small' },
      { id: 'stock-utilization', position: { row: 2, col: 1 }, size: 'small' },
      { id: 'service-queue', position: { row: 2, col: 2 }, size: 'small' },
      { id: 'partner-kpi', position: { row: 2, col: 3 }, size: 'small' },

      // Grafikonok alul
      { id: 'revenue-chart', position: { row: 3, col: 1, span: 2 }, size: 'large' },
      { id: 'stock-alerts', position: { row: 3, col: 3 }, size: 'medium' },
    ],
    density: 'medium',
    gridColumns: 3,
  },

  ADMIN: {
    layout: 'dashboard-first',
    widgets: [
      // Több widget, részletesebb (4x4 grid)
      { id: 'revenue-kpi', position: { row: 1, col: 1 }, size: 'small' },
      { id: 'net-revenue-kpi', position: { row: 1, col: 2 }, size: 'small' },
      { id: 'receivables-kpi', position: { row: 1, col: 3 }, size: 'small' },
      { id: 'payments-kpi', position: { row: 1, col: 4 }, size: 'small' },

      { id: 'revenue-breakdown', position: { row: 2, col: 1, span: 2 }, size: 'large' },
      { id: 'stock-heatmap', position: { row: 2, col: 3, span: 2 }, size: 'large' },

      { id: 'service-dashboard', position: { row: 3, col: 1, span: 2 }, size: 'large' },
      { id: 'partner-dashboard', position: { row: 3, col: 3, span: 2 }, size: 'large' },

      // Részletes táblázat teljes szélességben
      { id: 'detailed-report', position: { row: 4, col: 1, span: 4 }, size: 'xlarge' },
    ],
    density: 'high',
    gridColumns: 4,
  },
};
```

---

## Widget Katalógus

### MVP Widgets (Sprint 1-2)

#### 📊 Pénzügyi KPI Widgets (4 db) - PRIORITÁS 0

| Widget ID         | Leírás                         | AC                               | SP  |
| ----------------- | ------------------------------ | -------------------------------- | --- |
| `revenue-kpi`     | Bruttó bevétel + trend + delta | Összehasonlítás előző időszakkal | 1   |
| `net-revenue-kpi` | Nettó bevétel + trend          | Összehasonlítás előző időszakkal | 1   |
| `receivables-kpi` | Kintlévőség + status színkód   | Piros ha >500K                   | 1   |
| `payments-kpi`    | Befizetések + trend            | Zöld ha növekvő                  | 1   |

**Közös funkciók:**

- ✅ Date range picker (shadcn Calendar)
- ✅ Időszak összehasonlítás (current vs. previous)
- ✅ Delta számítás (%, abszolút érték)
- ✅ Trend indicator (↑ zöld, ↓ piros, → szürke)
- ✅ Click → drill-down táblázat modal

---

#### 📦 Készlet Widgets (5 db) - PRIORITÁS 0

| Widget ID           | Leírás                                    | AC                        | SP  |
| ------------------- | ----------------------------------------- | ------------------------- | --- |
| `stock-summary`     | Összes gép + bontás (Bolt/Raktár/Szerviz) | Badge-ek színkóddal       | 1   |
| `utilization-gauge` | Kihasználtsági mutató (%)                 | Circular progress         | 1   |
| `stock-alerts`      | Készlethiány lista                        | Minimum készlet threshold | 1   |
| `stock-movement`    | Készlet mozgás timeline                   | Recharts line chart       | 1.5 |
| `stock-heatmap`     | Géptípus x Helyszín heatmap               | Recharts heatmap          | 1.5 |

---

#### 🔧 Szerviz Widgets (4 db) - PRIORITÁS 1 (részleges)

| Widget ID               | Leírás                        | AC                      | SP  | Blocker                  |
| ----------------------- | ----------------------------- | ----------------------- | --- | ------------------------ |
| `technician-efficiency` | Technikus hatékonyság         | Lezárt munkalapok / nap | 1   | ✅ Nincs                 |
| `warranty-vs-paid`      | Garanciális vs. Fizetős arány | Donut chart             | 1   | ✅ Nincs                 |
| `recurring-issues`      | Visszatérő hiba tracking      | Lista + badge           | 1   | ✅ Nincs                 |
| `service-kpi-summary`   | Szerviz KPI összefoglaló      | **PLACEHOLDER**         | 1   | ❌ KPI lista tisztázandó |

---

#### 👥 Partner Widgets (4 db) - PRIORITÁS 1 (részleges)

| Widget ID              | Leírás               | AC                   | SP  | Blocker                    |
| ---------------------- | -------------------- | -------------------- | --- | -------------------------- |
| `partner-kpi`          | Partner KPI kártyák  | Tranzakciók, bevétel | 1   | ✅ Nincs                   |
| `partner-receivables`  | Kintlévőség riport   | Táblázat + status    | 1   | ✅ Nincs                   |
| `loyalty-activity`     | Törzsvevő aktivitás  | Timeline             | 1.5 | ✅ Nincs                   |
| `partner-segmentation` | Partner szegmentáció | **FEATURE FLAG**     | 1   | ❌ Kategóriák tisztázandók |

---

#### 🔔 Alert & Notification Widgets (2 db) - PRIORITÁS 0

| Widget ID              | Leírás               | AC            | SP  |
| ---------------------- | -------------------- | ------------- | --- |
| `notification-panel`   | Értesítési panel     | Badge + lista | 1   |
| `critical-alert-toast` | Kritikus alert toast | shadcn Toast  | 0.5 |

---

### Phase 2 Widgets (Sprint 4+) - BLOKKOLT

| Widget ID          | Leírás               | Blocker                               |
| ------------------ | -------------------- | ------------------------------------- |
| `rental-stats`     | Bérlési statisztika  | ❌ Bérlési mutatók tisztázatlanok     |
| `rental-schedule`  | Kiadási ütemezés     | ❌ Riport formátum tisztázatlan       |
| `revenue-forecast` | Bevételi előrejelzés | ❌ Időtáv tisztázatlan (1/3/6 hónap?) |

---

## Komponens Architektúra

### Base Widget Komponens

```typescript
// Base Widget Interface
interface BaseWidgetProps {
  widgetId: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  refreshInterval?: number; // másodpercben
  className?: string;
}

// Widget HOC (Higher-Order Component)
function withWidget<T extends BaseWidgetProps>(
  WrappedComponent: React.ComponentType<T>,
  config: WidgetConfig
) {
  return function Widget(props: T) {
    const { data, isLoading, error, refetch } = useQuery({
      queryKey: [config.queryKey, props],
      queryFn: () => config.fetcher(props),
      refetchInterval: props.refreshInterval || 300000, // default 5 perc
      staleTime: 240000, // 4 perc
    });

    if (isLoading) return <WidgetSkeleton size={props.size} />;
    if (error) return <WidgetError error={error} onRetry={refetch} />;

    return (
      <Card className={cn('widget', `widget-${props.size}`, props.className)}>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>{config.title}</CardTitle>
            <RefreshButton onClick={refetch} />
          </div>
        </CardHeader>
        <CardContent>
          <WrappedComponent {...props} data={data} />
        </CardContent>
      </Card>
    );
  };
}

// Példa widget
const RevenueKPICard = withWidget<RevenueKPIProps>(
  ({ data }) => (
    <div className="space-y-2">
      <div className="text-3xl font-bold">{formatCurrency(data.value)}</div>
      <TrendIndicator value={data.trend} />
      <ComparisonText current={data.value} previous={data.previousValue} />
    </div>
  ),
  {
    queryKey: 'revenue-kpi',
    title: 'Bruttó Bevétel',
    fetcher: fetchRevenueKPI,
  }
);
```

---

## Adatmodell & API

### API Endpoints

| Endpoint                               | Method | Leírás                | Widget-ek                                   |
| -------------------------------------- | ------ | --------------------- | ------------------------------------------- |
| `/api/v1/dashboard/kpi/revenue`        | GET    | Bevételi KPI-k        | `revenue-kpi`, `net-revenue-kpi`            |
| `/api/v1/dashboard/kpi/receivables`    | GET    | Kintlévőség KPI       | `receivables-kpi`                           |
| `/api/v1/dashboard/kpi/payments`       | GET    | Befizetés KPI         | `payments-kpi`                              |
| `/api/v1/dashboard/inventory/summary`  | GET    | Készlet összefoglaló  | `stock-summary`, `utilization-gauge`        |
| `/api/v1/dashboard/inventory/alerts`   | GET    | Készlethiány lista    | `stock-alerts`                              |
| `/api/v1/dashboard/inventory/movement` | GET    | Készlet mozgás adatok | `stock-movement`                            |
| `/api/v1/dashboard/service/kpi`        | GET    | Szerviz KPI-k         | `technician-efficiency`, `warranty-vs-paid` |
| `/api/v1/dashboard/partner/kpi`        | GET    | Partner KPI-k         | `partner-kpi`, `partner-receivables`        |

### Query Parameters (közös)

```typescript
interface DashboardQueryParams {
  dateFrom: string; // ISO 8601
  dateTo: string; // ISO 8601
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  comparison: boolean; // ha true, previous period is adatok is
  groupBy?: 'location' | 'category' | 'partner'; // drill-down
}
```

### Response Format (közös)

```typescript
interface KPIResponse {
  value: number;
  previousValue?: number; // ha comparison=true
  trend: 'up' | 'down' | 'stable';
  delta: {
    absolute: number;
    percentage: number;
  };
  timestamp: string; // ISO 8601
}
```

---

## Implementációs Terv

### Sprint 1: Dashboard Foundation (8 SP)

**Story 1.1:** RBAC Dashboard Layout Engine (3 SP)

- Szerepkör alapú layout váltás
- Widget lazy loading
- Responsive grid (tablet támogatás)
- **AC:** Operátor = Scanner Focus, Boltvezető = Dashboard First

**Story 1.2:** Pénzügyi KPI Dashboard - Phase 1 (5 SP)

- 4 KPI kártya (Bruttó, Nettó, Kintlévőség, Befizetés)
- Date range picker (shadcn Calendar)
- Időszak összehasonlítás (current vs. previous)
- Trend indicator + delta számítás
- **AC:** Boltvezető reggel 8-kor látja a tegnapi bevételt összehasonlítva előző hónappal

---

### Sprint 2: Készlet & Alert (8 SP)

**Story 2.1:** Készlet Dashboard (5 SP)

- Készlet összefoglaló widget
- Kihasználtsági mutató (circular gauge)
- Minimum készlet alert lista
- Készlet mozgás grafikon

**Story 2.2:** Real-time Alert Notification Panel (3 SP)

- Notification panel (badge + lista)
- Critical alert toast (shadcn Toast)
- Alert history
- **AC:** Operátor azonnali értesítést kap kritikus készlethiánynál (5 perc késleltetéssel MVP-ben)

---

### Sprint 3: Szerviz & Partner Dashboard (7 SP)

**Story 3.1:** Szerviz Dashboard - Phase 1 (4 SP)

- Technikus hatékonyság widget
- Garanciális vs. Fizetős riport
- Visszatérő hiba tracking
- **SKIP:** Szerviz KPI összefoglaló (placeholder widget)

**Story 3.2:** Partner Dashboard - Phase 1 (3 SP)

- Partner KPI kártyák
- Kintlévőség riport táblázat
- Törzsvevő aktivitás timeline
- **FEATURE FLAG:** Partner szegmentáció (ha KGC válaszol)

---

## Következmények

### Pozitív

1. **Gyors MVP:** Boring technology → ship fast, iterate later
2. **Skálázódik:** Widget Registry pattern → könnyen bővíthető
3. **Szerepkör-alapú:** RBAC integráció out-of-the-box
4. **Type-safe:** Zod validation + TypeScript
5. **Performant:** Code splitting + lazy loading + 5 perc cache

### Negatív / Kockázatok

| Kockázat                              | Valószínűség | Hatás    | Mitigáció                                  |
| ------------------------------------- | ------------ | -------- | ------------------------------------------ |
| 5 perces polling lassú                | Alacsony     | Közepes  | Phase 2: WebSocket kritikus widget-ekhez   |
| Widget proliferáció (20+)             | Közepes      | Alacsony | Registry pattern + lazy load               |
| Layout komplexitás növekszik          | Közepes      | Közepes  | Admin UI a layout szerkesztéshez (Phase 3) |
| Tisztázatlan követelmények (3 widget) | Magas        | Alacsony | Feature flag + placeholder widget          |

---

## Alternatívák (Elutasítva)

### Alternatíva 1: Custom Widget Engine

**Miért NEM:** Túl komplex MVP-hez, 2+ hét fejlesztés, YAGNI.

### Alternatíva 2: WebSocket Real-time Mindenhol

**Miért NEM:** Overkill MVP-hez, 5 perc elég KPI-khoz. Phase 2-ben kritikus widget-ekhez.

### Alternatíva 3: GraphQL API

**Miért NEM:** REST API elég MVP-hez, GraphQL extra komplexitás.

---

## Kapcsolódó Dokumentumok

- [ADR-023: Composable Frontend Stratégia](./ADR-023-composable-frontend-strategia.md)
- [ADR-032: RBAC Teljes Architektúra](./ADR-032-rbac-teljes-architektura.md)
- [ADR-040: Feladatlista Widget Architektúra](./ADR-040-feladatlista-widget-architektura.md)
- [UX Design Specification](../ux-design-specification.md) (Dashboard layout stratégiák)
- Dashboard Requirements (később)
- Dashboard Wireframes (később)

---

## Changelog

| Verzió | Dátum      | Változás                                   |
| ------ | ---------- | ------------------------------------------ |
| 1.0    | 2026-02-03 | Kezdeti ADR - ELFOGADVA státusz (YOLO MVP) |

---

**Készítette:** Winston (Architect) + John (PM) + Sally (UX Designer) + Mary (Analyst)
**Jóváhagyva:** YOLO Mode 🚀
**Módszertan:** BMAD Method + Party Mode
