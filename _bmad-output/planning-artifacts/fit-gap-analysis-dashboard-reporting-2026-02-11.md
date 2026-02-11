# KGC ERP v7.0 - Dashboard és Riporting Fit-Gap Analízis

**Dokumentum verzió:** 1.0
**Dátum:** 2026-02-11
**Készítette:** Claude Code (BMAD Analyst Agent)
**Állapot:** Befejezve

---

## Összefoglaló

Ez a dokumentum összehasonlítja a kliens által specifikált dashboard és riporting követelményeket (2026-02-03, Section 7) az aktuálisan implementált funkcionalitással. Az analízis célja a hiányosságok azonosítása és a fejlesztési prioritások meghatározása.

### Összesítő Eredmények

| Kategória                   | Követelmények | Teljes | Részleges | Hiányzó | Lefedettség |
| --------------------------- | ------------- | ------ | --------- | ------- | ----------- |
| 7.1 Általános Dashboard     | 4             | 2      | 2         | 0       | **75%**     |
| 7.2 Bevételi Riportok       | 5             | 1      | 3         | 1       | **50%**     |
| 7.3 Készlet Riportok        | 4             | 3      | 1         | 0       | **87%**     |
| 7.4 Szerviz Statisztikák    | 4             | 1      | 1         | 2       | **37%**     |
| 7.5 Partner/Ügyfél Riportok | 4             | 2      | 1         | 1       | **62%**     |
| 7.6 Bérlési Statisztikák    | 4             | 1      | 0         | 3       | **25%**     |
| 7.7 Export és Integráció    | 4             | 2      | 1         | 1       | **62%**     |
| **ÖSSZESEN**                | **29**        | **12** | **9**     | **8**   | **57%**     |

### Kritikus Hiányok (Kliens számára nem látható funkciók)

1. **Bérlési statisztikák (7.6)** - Szinte teljes egészében hiányzik
2. **Garanciális vs. Fizetős arány (7.4.3)** - Placeholder státuszban
3. **Visszatérő hiba tracking (7.4.4)** - Nem implementált
4. **Törzsvevői aktivitás riport (7.5.4)** - Nem implementált
5. **PDF és Excel export (7.7.1)** - Csak CSV van

---

## Részletes Analízis

### 7.1 Általános Dashboard Kérdések

#### 7.1.1 Szerepkör alapú dashboard ✅ RÉSZLEGES

**Követelmény:** RBAC alapú dashboard widgetek (Operátor, Könyvelő, Admin, Partner Owner)

**Implementáció:**

- ✅ Widget Registry létezik RBAC támogatással ([widget-registry.ts](apps/kgc-web/src/features/dashboard/lib/widget-registry.ts))
- ✅ Szerepkör szűrés: `OPERATOR`, `STORE_MANAGER`, `ADMIN`
- ⚠️ **HIÁNYZIK:** Partner Owner (franchise) nézet
- ⚠️ **HIÁNYZIK:** Könyvelő specifikus szerepkör

**GAP:** Könyvelő és Partner Owner szerepkörök nem implementáltak a dashboard rendszerben.

---

#### 7.1.2 Real-time vs. Periodikus frissítés ✅ TELJES

**Követelmény:** Near real-time (5 perc frissítés), kritikus eseményeknél azonnali

**Implementáció:**

- ✅ TanStack Query refetchInterval: 300_000 (5 perc)
- ✅ WebSocket támogatás (Story 35-7)
- ✅ Notification panel real-time frissítéssel

**GAP:** Nincs.

---

#### 7.1.3 Testreszabható widget rendszer ✅ TELJES

**Követelmény:** NEM kell testreszabható widget rendszer, fix layout admin által konfigurálható

**Implementáció:**

- ✅ Admin Widget Permissions oldal ([WidgetPermissionsPage.tsx](apps/kgc-web/src/features/admin/pages/WidgetPermissionsPage.tsx))
- ✅ HybridDashboardLayout fix szekciókkal
- ✅ Widget sorrend adminisztráció

**GAP:** Nincs.

---

#### 7.1.4 Mobil-optimalizált dashboard ✅ RÉSZLEGES

**Követelmény:** Tablet támogatás, reszponzív design

**Implementáció:**

- ✅ Reszponzív grid layout
- ✅ Collapsible szekciók (Story 35-8)
- ⚠️ **Nem tesztelt:** Tablet-specifikus optimalizáció

**GAP:** Tablet UX validálás szükséges.

---

### 7.2 Bevételi Riportok

#### 7.2.1 Időszakokra bontott riport ✅ RÉSZLEGES

**Követelmény:** Napi, heti, havi, negyedéves, éves időszakok

**Implementáció:**

- ✅ ReportsPage létezik időszak választóval ([ReportsPage.tsx](apps/kgc-web/src/pages/reports/ReportsPage.tsx))
- ⚠️ **Mock adatok:** Nincs backend integráció
- ⚠️ **Hiányzó időszakok:** Negyedéves és egyedi időszak

**GAP:** ReportsPage mock adatokkal működik, nincs tényleges API integráció.

---

#### 7.2.2 Bevételi riport bontása ⚠️ RÉSZLEGES

**Követelmény:** Összesített, bolt, szerviz, bérlések, partner szerinti bontás

**Implementáció:**

- ✅ ReportsPage: Kategóriák tab (értékesítés)
- ✅ ServiceRevenueWidget: Munkadíj vs Alkatrész
- ⚠️ **HIÁNYZIK:** Bolt (franchise) szerinti bontás
- ⚠️ **HIÁNYZIK:** Bérlés vs Eladás vs Szerviz drill-down

**GAP:** Multi-tenant (bolt) bontás és részletes drill-down hiányzik.

---

#### 7.2.3 Összehasonlító nézet ✅ TELJES

**Követelmény:** Ez a hónap vs. előző hónap, % változás mutatók

**Implementáció:**

- ✅ TrendIndicator komponens minden KPI widget-ben
- ✅ Delta számítás (%, abszolút érték)
- ✅ RevenueForecastWidget előrejelzéssel

**GAP:** Nincs.

---

#### 7.2.4 Pénzügyi KPI-k ⚠️ RÉSZLEGES

**Követelmény:** Bruttó bevétel, nettó bevétel, kintlévőségek, befizetések

**Implementáció (widget-registry alapján):**

- ✅ `revenue-kpi` - Bruttó bevétel
- ✅ `net-revenue-kpi` - Nettó bevétel
- ✅ `receivables-kpi` - Kintlévőségek
- ✅ `payments-kpi` - Befizetések
- ⚠️ **Részlegesen bekötött:** Mock data dominál

**GAP:** KPI widgetek léteznek, de backend integráció hiányos.

---

#### 7.2.5 Bevétel előrejelzés ❌ HIÁNYOS

**Követelmény:** Nincs explicit említve, de 7.6.4-ben jelzett

**Implementáció:**

- ✅ `revenue-forecast` widget létezik (Story 41-2)
- ⚠️ **Algoritmus:** Egyszerű lineáris trend, nem ML alapú

**GAP:** Fejlettebb előrejelzési modell szükséges hosszú távú szerződések alapján.

---

### 7.3 Készlet Riportok

#### 7.3.1 Készlet riport bontásban ✅ TELJES

**Követelmény:** Gyártó, kategória, státusz szerinti bontás

**Implementáció:**

- ✅ `stock-summary` widget - Összesítés
- ✅ InventoryListPage szűrőkkel
- ✅ Készlet mozgás követés

**GAP:** Nincs jelentős.

---

#### 7.3.2 Készlet mozgás riport ⚠️ RÉSZLEGES

**Követelmény:** Bevételezés, kiadás, köztes, használat

**Implementáció:**

- ✅ `stock-movement` widget létezik
- ✅ InventoryMovementsPage létezik
- ⚠️ **HIÁNYZIK:** Részletes tranzakció napló export

**GAP:** Részletes export funkció hiányzik.

---

#### 7.3.3 Minimum készlet alert ✅ TELJES

**Követelmény:** Dashboard alert kritikus készlethiányra

**Implementáció:**

- ✅ `stock-alerts` widget (StockAlertListWidget)
- ✅ Notification panel integrálva
- ✅ Kritikus szint kiemelése

**GAP:** Nincs.

---

#### 7.3.4 Készlet kihasználtsági mutató ✅ TELJES

**Követelmény:** Bérlésben/bent arány, géptípus bontás, trend

**Implementáció:**

- ✅ `stock-utilization` widget
- ✅ `stock-heatmap` widget (vizualizáció)
- ✅ Kihasználtsági % számítás

**GAP:** Nincs.

---

### 7.4 Szerviz Statisztikák

#### 7.4.1 Szerviz KPI-k ⚠️ RÉSZLEGES

**Követelmény:** Átfutási idő, munkalapok száma, átlagár

**Implementáció:**

- ✅ `worksheet-summary` - Munkalapok státusz szerint
- ✅ `service-revenue` - Bevétel
- ⚠️ **HIÁNYZIK:** Átfutási idő KPI
- ⚠️ **HIÁNYZIK:** Átlagár munkalapok

**GAP:** Átfutási idő és átlagár KPI-k hiányoznak.

---

#### 7.4.2 Technikus hatékonyság riport ✅ TELJES

**Követelmény:** Technikusok munkalapok száma, terhelés

**Implementáció:**

- ✅ `technician-workload` widget
- ✅ Kapacitás progress bar
- ✅ Színkód terhelés szerint

**GAP:** Nincs.

---

#### 7.4.3 Garanciális vs. Fizetős javítások ❌ PLACEHOLDER

**Követelmény:** Arány megjelenítése, trend

**Implementáció:**

- ⚠️ `warranty-ratio-placeholder` - "Hamarosan..." felirat
- ❌ **NEM IMPLEMENTÁLT**

**GAP:** **KRITIKUS** - Kliens által kért, de placeholder státuszban.

---

#### 7.4.4 Visszatérő hiba tracking ❌ NEM IMPLEMENTÁLT

**Követelmény:** Ugyanaz a gép többször szervizbe

**Implementáció:**

- ❌ Nincs implementálva
- ❌ Nincs gép szerviz történet widget

**GAP:** **KRITIKUS** - Teljesen hiányzó funkció.

---

### 7.5 Partner/Ügyfél Riportok

#### 7.5.1 Partner KPI-k ✅ TELJES

**Követelmény:** Top 10 partner bevétel alapján

**Implementáció:**

- ✅ `top-partners` widget (Story 35-6, 41-3)
- ✅ Ajándékra jogosult jelölés
- ✅ Trend indikátor

**GAP:** Nincs.

---

#### 7.5.2 Partner szegmentáció ⚠️ RÉSZLEGES

**Követelmény:** VIP, rendszeres, alkalmi, inaktív

**Implementáció:**

- ✅ `partner-overview` widget kategória bontással (RETAIL, B2B, VIP)
- ⚠️ **HIÁNYZIK:** Inaktív partnerek szűrő
- ⚠️ **HIÁNYZIK:** Szegmentáció részletes riport

**GAP:** Részletes szegmentáció riport hiányzik.

---

#### 7.5.3 Kintlévőség riport ✅ TELJES

**Követelmény:** Aging report (0-30, 30-60, 60-90, 90+)

**Implementáció:**

- ✅ `receivables-aging` widget (Story 41-1)
- ✅ ReceivablesPage teljes oldal ([ReceivablesPage.tsx](apps/kgc-web/src/pages/finance/ReceivablesPage.tsx))
- ✅ Partner felfüggesztés funkció (Story 46-8)
- ✅ CSV export

**GAP:** Nincs.

---

#### 7.5.4 Törzsvevői aktivitás riport ❌ NEM IMPLEMENTÁLT

**Követelmény:** Hűségprogram használat, kedvezmények kihasználtsága

**Implementáció:**

- ✅ `partner-activity` widget létezik (tranzakciók)
- ❌ **HIÁNYZIK:** Törzsvevői program integráció
- ❌ **HIÁNYZIK:** Kedvezmény használat tracking

**GAP:** **KRITIKUS** - Törzsvevői program nem implementált.

---

### 7.6 Bérlési Statisztikák

#### 7.6.1 Bérlési mutatók ❌ NEM IMPLEMENTÁLT

**Követelmény:** Átlagos bérlési idő, legnépszerűbb gépek, szezonalitás

**Implementáció:**

- ❌ Nincs dedikált widget
- ⚠️ ReportsPage tartalmaz mock bérlési adatokat

**GAP:** **KRITIKUS** - Bérlési statisztika dashboard widget hiányzik.

---

#### 7.6.2 Kiadás részletesség riport ❌ NEM IMPLEMENTÁLT

**Követelmény:** Időpont, időtartam, géptípus szerinti kiadás elemzés

**Implementáció:**

- ❌ Nem implementált

**GAP:** **KRITIKUS** - Teljesen hiányzó funkció.

---

#### 7.6.3 Foglalás vs. Kivétel ❌ NEM IMPLEMENTÁLT

**Követelmény:** No-show arány, foglalás konverzió

**Implementáció:**

- ❌ Nincs foglalás modul
- ❌ Nincs no-show tracking

**GAP:** Foglalás rendszer nem létezik, ezért nem releváns most.

---

#### 7.6.4 Előrejelzés ✅ TELJES

**Követelmény:** Bevételi előrejelzés hosszú távú szerződések alapján

**Implementáció:**

- ✅ `revenue-forecast` widget (Story 41-2)
- ⚠️ **Egyszerű algoritmus:** Trend-alapú, nem szerződés-specifikus

**GAP:** Algoritmus fejlesztés szükséges.

---

### 7.7 Export és Integráció

#### 7.7.1 Export formátumok ⚠️ RÉSZLEGES

**Követelmény:** PDF, Excel, CSV minden riporthoz

**Implementáció:**

- ✅ CSV export (ReceivablesPage, VATSummaryPage)
- ❌ **HIÁNYZIK:** PDF export
- ❌ **HIÁNYZIK:** Excel export

**GAP:** PDF és Excel export hiányzik.

---

#### 7.7.2 Automatikus email küldés ❌ NEM IMPLEMENTÁLT

**Követelmény:** Heti összefoglaló email (későbbi fázis)

**Implementáció:**

- ❌ Nem MVP, később implementálandó

**GAP:** Későbbi epic-ben tervezendő.

---

#### 7.7.3 API endpoint riportokhoz ✅ TELJES

**Követelmény:** REST API riport adatokhoz

**Implementáció:**

- ✅ Dashboard API kontrollerek léteznek
- ✅ /api/v1/dashboard/\* endpointok

**GAP:** Nincs.

---

#### 7.7.4 Könyvelői speciális riportok ✅ RÉSZLEGES

**Követelmény:** ÁFA összesítő, számla lista, tranzakciók

**Implementáció:**

- ✅ VATSummaryPage ([VATSummaryPage.tsx](apps/kgc-web/src/pages/finance/VATSummaryPage.tsx)) - Story 46-10
- ✅ ReceivablesPage - Kintlévőségek
- ⚠️ **HIÁNYZIK:** Kimenő/Bejövő számlák lista
- ⚠️ **HIÁNYZIK:** Bankkivonat párosítás

**GAP:** Számla listák és banki párosítás hiányzik.

---

## Prioritásos Fejlesztési Javaslatok

### P0 - Kritikus (Kliens által azonnal hiányolt)

| #   | Funkció                                 | Követelmény | Becsült SP | Javasolt Epic |
| --- | --------------------------------------- | ----------- | ---------- | ------------- |
| 1   | **Bérlési Statisztika Widget**          | 7.6.1       | 5 SP       | Epic 47       |
| 2   | **Garanciális vs Fizetős Arány Widget** | 7.4.3       | 3 SP       | Epic 38       |
| 3   | **Visszatérő Hiba Tracking**            | 7.4.4       | 5 SP       | Epic 38       |
| 4   | **PDF Export**                          | 7.7.1       | 3 SP       | Epic 47       |

### P1 - Magas (Könyvelő/Admin funkciók)

| #   | Funkció                          | Követelmény | Becsült SP | Javasolt Epic |
| --- | -------------------------------- | ----------- | ---------- | ------------- |
| 5   | **Könyvelő szerepkör dashboard** | 7.1.1       | 3 SP       | Epic 47       |
| 6   | **Kimenő/Bejövő számlák riport** | 7.7.4       | 5 SP       | Epic 41+      |
| 7   | **Átfutási idő KPI**             | 7.4.1       | 2 SP       | Epic 38       |
| 8   | **Excel Export**                 | 7.7.1       | 2 SP       | Epic 47       |

### P2 - Közepes (Későbbi fejlesztés)

| #   | Funkció                          | Követelmény | Becsült SP |
| --- | -------------------------------- | ----------- | ---------- |
| 9   | Partner szegmentáció riport      | 7.5.2       | 3 SP       |
| 10  | Törzsvevői program               | 7.5.4       | 8 SP       |
| 11  | Bolt (franchise) szerinti bontás | 7.2.2       | 5 SP       |
| 12  | Bankkivonat párosítás            | 7.7.4       | 8 SP       |

---

## Implementált Widget-ek Összefoglalója

### Jelenlegi Widget Registry (24 widget)

| Kategória     | Widget ID                  | Státusz | Megjegyzés          |
| ------------- | -------------------------- | ------- | ------------------- |
| **General**   | welcome-card               | ✅      | Üdvözlő kártya      |
|               | empty-state                | ✅      | Üres állapot        |
| **Finance**   | revenue-kpi                | ✅      | Bruttó bevétel      |
|               | net-revenue-kpi            | ✅      | Nettó bevétel       |
|               | receivables-kpi            | ✅      | Kintlévőségek       |
|               | payments-kpi               | ✅      | Befizetések         |
|               | equipment-profit           | ✅      | Bergép megtérülés   |
|               | receivables-aging          | ✅      | Aging riport        |
|               | revenue-forecast           | ✅      | Bevétel előrejelzés |
| **Inventory** | stock-summary              | ✅      | Készlet összesítő   |
|               | stock-utilization          | ✅      | Kihasználtság       |
|               | stock-alerts               | ✅      | Készlet alertek     |
|               | stock-movement             | ✅      | Mozgás chart        |
|               | stock-heatmap              | ✅      | Heatmap             |
| **Service**   | worksheet-summary          | ✅      | Munkalap összesítő  |
|               | technician-workload        | ✅      | Szerelő terhelés    |
|               | service-revenue            | ✅      | Szerviz bevétel     |
|               | warranty-ratio-placeholder | ⚠️      | **PLACEHOLDER**     |
|               | service-profit             | ✅      | Szerviz profit      |
| **Partner**   | partner-overview           | ✅      | Partner áttekintés  |
|               | top-partners               | ✅      | Top 10 partner      |
|               | partner-activity           | ✅      | Partner aktivitás   |
|               | partner-credit-placeholder | ⚠️      | **PLACEHOLDER**     |
| **Alerts**    | notification-panel         | ✅      | Értesítések         |

### Hiányzó Widget-ek (Követelmények alapján)

| Kategória   | Javasolt Widget ID | Követelmény                  |
| ----------- | ------------------ | ---------------------------- |
| **Rental**  | rental-stats       | 7.6.1 - Bérlési mutatók      |
|             | rental-utilization | 7.6.2 - Kiadás részletesség  |
|             | popular-equipment  | 7.6.1 - Legnépszerűbb gépek  |
| **Service** | warranty-ratio     | 7.4.3 - Garanciális arány    |
|             | recurring-issues   | 7.4.4 - Visszatérő hibák     |
|             | turnaround-time    | 7.4.1 - Átfutási idő         |
| **Partner** | loyalty-stats      | 7.5.4 - Törzsvevői aktivitás |

---

## Standalone Riport Oldalak Állapota

| Oldal           | Route                | Státusz | Backend |
| --------------- | -------------------- | ------- | ------- |
| ReportsPage     | /reports             | ⚠️ Mock | Nincs   |
| ReceivablesPage | /finance/receivables | ✅ Kész | ✅ API  |
| VATSummaryPage  | /finance/vat         | ✅ Kész | ⚠️ Mock |

---

## Következő Lépések

1. **Sprint Planning:** Epic 47 létrehozása "Bérlési Dashboard & Export" néven
2. **Epic 38 bővítése:** Garanciális arány és visszatérő hibák
3. **Backend prioritás:** ReportsPage API bekötés
4. **Export prioritás:** PDF export könyvtár (jsPDF/pdfmake) integrálása

---

## Dokumentum Történet

| Verzió | Dátum      | Változás                    |
| ------ | ---------- | --------------------------- |
| 1.0    | 2026-02-11 | Fit-gap analízis elkészítve |

---

**Dokumentum vége**

_Generálva: BMAD Analyst Agent, 2026-02-11_
