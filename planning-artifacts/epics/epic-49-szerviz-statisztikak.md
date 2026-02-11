# Epic 49: Szerviz Statisztikák Dashboard

## Epic Összefoglaló

| Mező           | Érték                          |
| -------------- | ------------------------------ |
| **Epic ID**    | 49                             |
| **Név**        | Szerviz Statisztikák Dashboard |
| **Prioritás**  | P1 - Magas                     |
| **Becsült SP** | 5                              |
| **Sprint**     | Sprint 11                      |
| **Státusz**    | READY                          |

## Üzleti Kontextus

### Forrás

- Fit-Gap Analízis (2026-02-11)
- Ügyfél visszajelzés: "Hiányzik a garanciális vs fizetős arány"
- Követelmény 7.4.3: Garanciális vs. Fizetős arány
- Követelmény 7.4.4: Visszatérő hiba tracking

### Üzleti érték

- **Garanciális átláthatóság** - Makita elszámolás támogatása
- **Minőségbiztosítás** - Visszatérő hibák azonosítása
- **Költségoptimalizálás** - Problémás gépek kiszűrése

## User Stories

---

### Story 49-1: Garanciális vs Fizetős Arány Widget

**Mint** boltvezető,
**Szeretném** látni a garanciális és fizetős javítások arányát,
**Hogy** átlássam a szerviz összetételét.

#### Acceptance Criteria

```gherkin
Feature: Garanciális vs Fizetős Arány Widget

  Scenario: Arány megjelenítése
    Given bejelentkezett boltvezető vagyok
    When megnyitom a dashboard-ot
    Then látom a garanciális/fizetős arányt kördiagramon
    And látom a számokat: X garanciális, Y fizetős
    And látom a bevételt mindkét kategóriában

  Scenario: Időszak szűrés
    Given a dashboard-on vagyok
    When kiválasztom a "Hónap" időszakot
    Then az arány az aktuális hónapra frissül
    And látom az előző hónaphoz képest a változást

  Scenario: Trend megjelenítése
    Given a dashboard-on vagyok
    When megnézem a widget-et
    Then látom a 6 havi trendet kis grafikonon
    And a trend mutatja ha nő a garanciális arány
```

#### Technikai követelmények

- [ ] `WarrantyRatioWidget.tsx` - Lecseréli a placeholder-t
- [ ] Kördiagram (Recharts PieChart)
- [ ] Mini trend grafikon (Recharts Sparkline)
- [ ] API endpoint: `GET /api/v1/dashboard/service/warranty-ratio`
- [ ] Widget registry frissítés (placeholder → valódi widget)

#### Becsült SP: 2

---

### Story 49-2: Visszatérő Hiba Tracking Widget

**Mint** boltvezető,
**Szeretném** látni mely gépek kerülnek gyakran szervizbe,
**Hogy** azonosíthassam a problémás eszközöket.

#### Acceptance Criteria

```gherkin
Feature: Visszatérő Hiba Tracking

  Scenario: Problémás gépek listája
    Given bejelentkezett boltvezető vagyok
    When megnyitom a dashboard-ot
    Then látom a "Visszatérő hibák" widget-et
    And látom a gépeket amelyek 3+ alkalommal voltak szervizben (90 napon belül)
    And látom a szervizek számát gépenként

  Scenario: Gép részletek
    Given látom a visszatérő hibák listáját
    When rákattintok egy gépre
    Then megnyílik a gép szerviz története
    And látom az összes munkalapot időrendben
    And látom a hibajelenségeket

  Scenario: Alert kritikus esetben
    Given egy gép 5+ alkalommal volt szervizben 90 napon belül
    When betölt a dashboard
    Then piros figyelmeztetés jelenik meg a gép mellett
    And értesítés küldődik a boltvezetőnek
```

#### Technikai követelmények

- [ ] `RecurringIssuesWidget.tsx` - Új widget
- [ ] Gép szerviz történet modal
- [ ] API endpoint: `GET /api/v1/dashboard/service/recurring-issues`
- [ ] Threshold konfiguráció (alapértelmezett: 3 szerviz / 90 nap)
- [ ] Notification integráció kritikus esetekre

#### Becsült SP: 3

---

## API Specifikáció

### Új Endpoint-ok

```typescript
// Garanciális vs Fizetős arány
GET /api/v1/dashboard/service/warranty-ratio?period=month
Response: {
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
    month: string;
    warrantyPercent: number;
  }[];
  periodStart: string;
  periodEnd: string;
}

// Visszatérő hibák
GET /api/v1/dashboard/service/recurring-issues?threshold=3&days=90
Response: {
  equipment: {
    id: string;
    name: string;
    serialNumber: string;
    serviceCount: number;
    lastServiceDate: string;
    issues: string[];
    isCritical: boolean;
  }[];
  totalCount: number;
  criticalCount: number;
}
```

---

## Widget Registry Változások

```typescript
// Törlendő
'warranty-ratio-placeholder': { ... }

// Új
'warranty-ratio': {
  component: lazy(() => import('../widgets/WarrantyRatioWidget')),
  roles: ['STORE_MANAGER', 'ADMIN'],
  category: 'service',
  refreshInterval: 300,
},
'recurring-issues': {
  component: lazy(() => import('../widgets/RecurringIssuesWidget')),
  roles: ['STORE_MANAGER', 'ADMIN'],
  category: 'service',
  refreshInterval: 300,
},
```

---

## Függőségek

| Típus        | Leírás                     |
| ------------ | -------------------------- |
| **Epic 35**  | Widget Registry, Dashboard |
| **Epic 17**  | Worksheet model            |
| **Epic 4.3** | Warranty Claims model      |

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Unit tesztek PASS (min. 80% coverage)
- [ ] Code review PASS (adversarial, min. 3 issue fix)
- [ ] Placeholder widget lecserélve valódi widget-re
- [ ] Widget-ek megjelennek a dashboard-on
- [ ] Dokumentáció frissítve

## Kockázatok

| Kockázat                | Valószínűség | Hatás    | Mitigáció               |
| ----------------------- | ------------ | -------- | ----------------------- |
| Garanciális adat hiány  | Közepes      | Közepes  | Makita import szükséges |
| Threshold finomhangolás | Alacsony     | Alacsony | Admin beállítás         |
| Szerviz történet lassú  | Alacsony     | Alacsony | Indexek + pagination    |

---

## Changelog

| Verzió | Dátum      | Változás        |
| ------ | ---------- | --------------- |
| 1.0    | 2026-02-11 | Epic létrehozva |

---

**Készítette:** BMAD Party Mode (John PM + Mary Analyst + Winston Architect)
