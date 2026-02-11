# Epic 48: Bérlési Dashboard & Export

## Epic Összefoglaló

| Mező           | Érték                      |
| -------------- | -------------------------- |
| **Epic ID**    | 48                         |
| **Név**        | Bérlési Dashboard & Export |
| **Prioritás**  | P1 - Magas                 |
| **Becsült SP** | 8                          |
| **Sprint**     | Sprint 11                  |
| **Státusz**    | READY                      |

## Üzleti Kontextus

### Forrás

- Fit-Gap Analízis (2026-02-11)
- Ügyfél visszajelzés: "Nem látom a bérlési statisztikákat"
- Követelmény 7.6: Bérlési Statisztikák

### Üzleti érték

- **Bérlési átláthatóság** - Boltvezető látja a bérlési trendeket
- **Döntéstámogatás** - Legnépszerűbb gépek, szezonalitás
- **Export minden riporthoz** - PDF/Excel az ügyfél kérésére

## User Stories

---

### Story 48-1: Bérlési Statisztika Widget

**Mint** boltvezető,
**Szeretném** látni a bérlési statisztikákat a dashboard-on,
**Hogy** áttekinthessem a bérlési trendeket.

#### Acceptance Criteria

```gherkin
Feature: Bérlési Statisztika Widget

  Scenario: Átlagos bérlési idő megjelenítése
    Given bejelentkezett boltvezető vagyok
    When megnyitom a dashboard-ot
    Then látom az átlagos bérlési időt napokban
    And látom az előző időszakhoz képest a változást (%)

  Scenario: Legnépszerűbb gépek listája
    Given bejelentkezett boltvezető vagyok
    When megnyitom a dashboard-ot
    Then látom a Top 5 legnépszerűbb gépet
    And látom a bérlések számát gépenként
    And látom a bevételt gépenként

  Scenario: Szezonalitás grafikon
    Given bejelentkezett boltvezető vagyok
    When megnyitom a dashboard-ot
    Then látom a havi bérlési trendet grafikonon
    And az elmúlt 12 hónap adatai láthatók
```

#### Technikai követelmények

- [ ] `RentalStatsWidget.tsx` - Fő widget komponens
- [ ] `PopularEquipmentWidget.tsx` - Top 5 gép lista
- [ ] `SeasonalityChartWidget.tsx` - Havi trend grafikon (Recharts)
- [ ] API endpoint: `GET /api/v1/dashboard/rental/stats`
- [ ] API endpoint: `GET /api/v1/dashboard/rental/popular`
- [ ] API endpoint: `GET /api/v1/dashboard/rental/seasonality`
- [ ] Widget registry integráció (STORE_MANAGER, ADMIN)

#### Becsült SP: 3

---

### Story 48-2: Bérlési Riport Oldal

**Mint** boltvezető,
**Szeretném** részletes bérlési riportot látni külön oldalon,
**Hogy** mélyebb elemzést végezhessek.

#### Acceptance Criteria

```gherkin
Feature: Bérlési Riport Oldal

  Scenario: Bérlési riport megnyitása
    Given bejelentkezett boltvezető vagyok
    When megnyitom a /reports/rentals oldalt
    Then látom a bérlési összesítőt
    And szűrhetek időszak szerint
    And szűrhetek géptípus szerint

  Scenario: Riport adatok
    Given a bérlési riport oldalon vagyok
    When betölt az oldal
    Then látom: összes bérlés, aktív bérlések, lezárt bérlések
    And látom: átlagos bérlési idő, átlagos bevétel/bérlés
    And látom: késedelmes visszavételek száma
```

#### Technikai követelmények

- [ ] `RentalReportsPage.tsx` - Új oldal
- [ ] Route: `/reports/rentals`
- [ ] Időszak szűrő (DateRangePicker)
- [ ] Géptípus szűrő
- [ ] API endpoint: `GET /api/v1/reports/rentals`

#### Becsült SP: 2

---

### Story 48-3: PDF Export Funkció

**Mint** boltvezető,
**Szeretném** PDF formátumban exportálni a riportokat,
**Hogy** kinyomtathassam vagy emailben küldhessem.

#### Acceptance Criteria

```gherkin
Feature: PDF Export

  Scenario: Riport exportálása PDF-be
    Given bármely riport oldalon vagyok
    When rákattintok az "Export PDF" gombra
    Then letöltődik a riport PDF formátumban
    And a PDF tartalmazza a riport címét és dátumát
    And a PDF tartalmazza az összes táblázatot és grafikont

  Scenario: PDF formázás
    Given exportálok egy riportot PDF-be
    When megnyitom a PDF-et
    Then a KGC logó látható a fejlécben
    And az oldalszámozás látható
    And a magyar karakterek helyesen jelennek meg
```

#### Technikai követelmények

- [ ] PDF library integráció (jsPDF vagy pdfmake)
- [ ] `usePdfExport` hook
- [ ] PDF template KGC branding-gel
- [ ] Magyar karakterkészlet támogatás
- [ ] Táblázat és grafikon renderelés

#### Becsült SP: 2

---

### Story 48-4: Excel Export Funkció

**Mint** könyvelő,
**Szeretném** Excel formátumban exportálni a riportokat,
**Hogy** további elemzést végezhessek.

#### Acceptance Criteria

```gherkin
Feature: Excel Export

  Scenario: Riport exportálása Excel-be
    Given bármely riport oldalon vagyok
    When rákattintok az "Export Excel" gombra
    Then letöltődik a riport XLSX formátumban
    And a fájlnév tartalmazza a riport nevét és dátumát

  Scenario: Excel formázás
    Given exportálok egy riportot Excel-be
    When megnyitom az Excel fájlt
    Then az oszlopok megfelelően formázottak
    And a számok számként jelennek meg (nem szövegként)
    And a dátumok dátumként jelennek meg
```

#### Technikai követelmények

- [ ] Excel library integráció (xlsx vagy exceljs)
- [ ] `useExcelExport` hook
- [ ] Oszlop formázás (szám, dátum, pénznem)
- [ ] Több munkalap támogatás (összesítő + részletes)

#### Becsült SP: 1

---

## API Specifikáció

### Új Endpoint-ok

```typescript
// Bérlési statisztikák
GET /api/v1/dashboard/rental/stats
Response: {
  averageRentalDays: number;
  averageRentalDaysDelta: number;
  totalRentals: number;
  activeRentals: number;
  overdueRentals: number;
}

// Népszerű gépek
GET /api/v1/dashboard/rental/popular?limit=5
Response: {
  equipment: {
    id: string;
    name: string;
    rentalCount: number;
    revenue: number;
  }[];
}

// Szezonalitás
GET /api/v1/dashboard/rental/seasonality?months=12
Response: {
  data: {
    month: string;
    rentalCount: number;
    revenue: number;
  }[];
}
```

---

## Függőségek

| Típus       | Leírás              |
| ----------- | ------------------- |
| **Epic 35** | Widget Registry     |
| **Epic 14** | Rental model        |
| **Epic 43** | Export alapok (CSV) |

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Unit tesztek PASS (min. 80% coverage)
- [ ] Code review PASS (adversarial, min. 3 issue fix)
- [ ] Widget-ek megjelennek a dashboard-on
- [ ] Export funkciók működnek (PDF, Excel, CSV)
- [ ] Dokumentáció frissítve

## Kockázatok

| Kockázat           | Valószínűség | Hatás    | Mitigáció           |
| ------------------ | ------------ | -------- | ------------------- |
| PDF lib méret      | Közepes      | Alacsony | Lazy load           |
| Excel formázás     | Alacsony     | Alacsony | Standard formátumok |
| Bérlési adat hiány | Alacsony     | Közepes  | Mock data fallback  |

---

## Changelog

| Verzió | Dátum      | Változás        |
| ------ | ---------- | --------------- |
| 1.0    | 2026-02-11 | Epic létrehozva |

---

**Készítette:** BMAD Party Mode (John PM + Mary Analyst + Winston Architect)
