# Dashboard Requirements Specification

## KGC ERP v7.0 - Dashboard Rendszer

**Verzió:** 1.0
**Dátum:** 2026-02-03
**Készítette:** Mary (Analyst) + BMAD Party Mode
**Forrás:** 29 tisztázott követelmény (kgc-valaszok-tisztazott-2026-02-03.md)

---

## 1. Szerepkör-alapú Dashboard Nézetek

| Szerepkör         | Layout Stratégia    | Widget Szám | Elsődleges Use Case                                      |
| ----------------- | ------------------- | ----------- | -------------------------------------------------------- |
| **OPERATOR**      | Scanner Focus       | 3-5 widget  | Gyors scan műveletek, minimal UI, kritikus alertek       |
| **STORE_MANAGER** | Dashboard First     | 8-10 widget | Napi döntéshozatal, KPI monitoring, operatív irányítás   |
| **ADMIN**         | Dashboard + Reports | 15+ widget  | Komplex elemzés, részletes riportok, stratégiai döntések |

### 1.1 Operátor Dashboard (Scanner Focus)

**Jellemzők:**

- ✅ Minimál UI (60% scan terület)
- ✅ Csak kritikus információk
- ✅ Nagy gombok, egyszerű interakciók

**Widgets:**

- Készlet Alert Lista (kritikus készlethiány)
- Nyitott Munkalapok (sürgős feladatok)
- Mai Feladatok (quick action)

**Use Case:**
_"Pultos reggel 8-kor bejelentkezik, azonnal látja van-e kritikus készlethiány vagy sürgős feladat, majd scan-nel dolgozik."_

---

### 1.2 Boltvezető Dashboard (Dashboard First)

**Jellemzők:**

- ✅ Widget-grid (3x2 vagy 3x3)
- ✅ KPI-k felül, grafikonok alul
- ✅ Döntéstámogatás (trend, összehasonlítás)

**Widgets (8-10 db):**

**Felső sor (KPI kártyák):**

1. Bruttó Bevétel
2. Nettó Bevétel
3. Kintlévőség
4. Készlet Kihasználtság
5. Szerviz Queue
6. Partner KPI

**Alsó sor (grafikonok/listák):** 7. Bevételi Grafikon (current vs. previous) 8. Készlet Alert Lista 9. Szerviz Hatékonyság 10. Partner Aktivitás

**Use Case:**
_"Boltvezető reggel 8-kor bejelentkezik, látja a tegnapi bevételt (+12% vs. előző hónap), ellenőrzi a készlet alerteket (2 kritikus), és látja a napi szerviz queue-t (12 munkalap)."_

---

### 1.3 Admin Dashboard (Dashboard + Reports)

**Jellemzők:**

- ✅ Nagyobb grid (4x4)
- ✅ Több widget, részletesebb adatok
- ✅ Drill-down riportok

**Widgets (15+ db):**

**KPI kártyák (4 db):**
1-4. Pénzügyi KPI-k (Bruttó, Nettó, Kintlévő, Befizetés)

**Dashboard widgetek (10 db):** 5. Bevételi Bontás Táblázat (drill-down) 6. Készlet Heatmap (géptípus x helyszín) 7. Szerviz Dashboard (technikus hatékonyság, garanciális/fizetős, visszatérő hiba) 8. Partner Dashboard (KPI-k, kintlévőség, törzsvevő aktivitás) 9. Bérlési Statisztika (Phase 2) 10. Bevételi Előrejelzés (Phase 2)

**Részletes riport:** 11. Komplex Riport Táblázat (teljes szélesség, több szintű bontás)

**Use Case:**
_"Admin havi záráskor áttekinti az összes bevételt bolt szinten lebontva, ellenőrzi a szerviz hatékonyságot, és előrejelzést készít a következő negyedévre."_

---

## 2. Widget Követelmények

### 2.1 Pénzügyi KPI Widgets (4 db) - MVP PRIORITÁS 0

#### 2.1.1 Bruttó Bevétel KPI Kártya

**Adatok:**

- Bruttó bevétel (current period)
- Előző időszak értéke (comparison)
- Trend (↑ up / ↓ down / → stable)
- Delta (%, abszolút érték)

**Acceptance Criteria:**

- ✅ Date range picker (napi, heti, havi, negyedéves, éves)
- ✅ Összehasonlítás előző időszakkal (current vs. previous)
- ✅ Trend indicator színkódolt (↑ zöld, ↓ piros, → szürke)
- ✅ Click → drill-down táblázat modal (Összesített → Bolt → Szerviz → Bérlések → Partner)
- ✅ 5 perces auto-refresh

**Adatforrás:** `sales_invoice`, `rental_core`, `service_worksheet` táblák aggregálva

---

#### 2.1.2 Nettó Bevétel KPI Kártya

**Adatok:**

- Nettó bevétel (current period)
- Előző időszak értéke
- Trend + delta

**AC:** Ugyanaz mint 2.1.1

---

#### 2.1.3 Kintlévőség KPI Kártya

**Adatok:**

- Kintlévőség összege (aktuális)
- Előző időszak összehasonlítás
- **Státusz színkód:** Piros ha > 500K Ft

**AC:**

- ✅ Színkódolt háttér (piros/sárga/zöld threshold alapján)
- ✅ Click → kintlévőség részletes lista (partner szinten)

---

#### 2.1.4 Befizetések KPI Kártya

**Adatok:**

- Befizetések összege (current period)
- Trend + delta

**AC:** Ugyanaz mint 2.1.1

---

### 2.2 Készlet Widgets (5 db) - MVP PRIORITÁS 0

#### 2.2.1 Készlet Összefoglaló Kártya

**Adatok:**

- Összes gép darabszám
- Bontás: Bolt / Raktár / Szervizben
- Badge-ek színkóddal

**AC:**

- ✅ Badge komponensek (Bolt: kék, Raktár: szürke, Szerviz: narancssárga)
- ✅ Hover → tooltip részletes bontással

---

#### 2.2.2 Kihasználtsági Mutató (Gauge)

**Adatok:**

- Kihasználtság % = (Bérlésben levő gépek / Összes gép) \* 100

**AC:**

- ✅ Circular progress (shadcn Progress)
- ✅ Színkód: Zöld > 80%, Sárga 60-80%, Piros < 60%
- ✅ Label: "Bérlésben: 290 / 342 gép"

---

#### 2.2.3 Készlet Alert Lista

**Adatok:**

- Géptípusok ahol aktuális készlet < minimum threshold
- Kritikus (< 50% min) vs. Figyelmeztetés (50-100% min)

**AC:**

- ✅ Lista komponens (shadcn Table vagy Card lista)
- ✅ Badge státusz (kritikus: piros, figyelmeztetés: sárga)
- ✅ Click → gép részletek + beszerzési javaslat

**Adatforrás:** `inventory` tábla + `min_stock` threshold

---

#### 2.2.4 Készlet Mozgás Grafikon

**Adatok:**

- Készlet be/ki mozgás timeline (last 30 days)
- X tengely: időpont
- Y tengely: darabszám (pozitív = be, negatív = ki)

**AC:**

- ✅ Recharts LineChart vagy BarChart
- ✅ Két vonal: "Beszerzés" (zöld) és "Kiadás" (piros)
- ✅ Tooltip hover adatokkal

---

#### 2.2.5 Készlet Heatmap

**Adatok:**

- Géptípus x Helyszín kereszttábla
- Színkód: készlet mennyiség alapján

**AC:**

- ✅ Recharts Heatmap vagy custom grid
- ✅ Színskála: Zöld (sok készlet) → Piros (kevés készlet)
- ✅ Click → részletes lista

---

### 2.3 Szerviz Widgets (4 db) - MVP PRIORITÁS 1 (részleges)

#### 2.3.1 Technikus Hatékonyság Kártya

**Adatok:**

- Lezárt munkalapok / nap (átlag)
- Technikus neve + hatékonyság %

**AC:**

- ✅ Progress bar vagy badge
- ✅ Top 3 technikus kiemelve

---

#### 2.3.2 Garanciális vs. Fizetős Riport

**Adatok:**

- Garanciális munkalapok száma/értéke
- Fizetős munkalapok száma/értéke
- Arány %

**AC:**

- ✅ Donut chart (Recharts PieChart)
- ✅ Két szegmens: Garanciális (kék), Fizetős (zöld)

---

#### 2.3.3 Visszatérő Hiba Tracking

**Adatok:**

- Géptípusok ahol > 2 javítás 30 napon belül
- Hiba típusa + darabszám

**AC:**

- ✅ Lista (shadcn Table)
- ✅ Badge: Visszatérő hiba (piros)
- ✅ Click → munkalap részletek

---

#### 2.3.4 Szerviz KPI Összefoglaló (PLACEHOLDER)

**Státusz:** ❌ **BLOKKOLT** - Szerviz KPI lista tisztázatlan

**Javasolt KPI-k (KGC-tól várjuk):**

- Átfutási idő (órában/napokban)
- Nyitott munkalapok száma
- Várakozó alkatrészre darabszám
- First-time fix rate (%)

**AC:** Placeholder widget "Szerviz KPI-k tisztázása folyamatban"

---

### 2.4 Partner Widgets (4 db) - MVP PRIORITÁS 1 (részleges)

#### 2.4.1 Partner KPI Kártyák

**Adatok:**

- Összes partner száma
- Aktív partnerek (last 30 days)
- Partner bevétel (current period)

**AC:**

- ✅ 3 KPI kártya
- ✅ Trend + delta

---

#### 2.4.2 Kintlévőség Riport (Partner szinten)

**Adatok:**

- Partner név + kintlévőség összeg
- Késedelem napokban
- Státusz színkód

**AC:**

- ✅ Táblázat (shadcn Table)
- ✅ Sort by: kintlévőség, késedelem
- ✅ Filter: státusz (rendezett, késedelmes, kritikus)

---

#### 2.4.3 Törzsvevő Aktivitás Timeline

**Adatok:**

- Partner tranzakciók timeline (last 90 days)
- Tranzakció típusa (bérlés, eladás, szerviz)

**AC:**

- ✅ Timeline komponens
- ✅ Ikonok típusonként
- ✅ Click → tranzakció részletek

---

#### 2.4.4 Partner Szegmentáció (FEATURE FLAG)

**Státusz:** ❌ **BLOKKOLT** - Partner kategóriák tisztázatlanok

**Javasolt kategóriák (KGC-tól várjuk):**

- VIP ügyfelek (éves bevétel > X Ft)
- Rendszeres ügyfelek (3+ tranzakció/hó)
- Alkalmi ügyfelek (< 3 tranzakció/hó)
- Inaktív ügyfelek (90+ nap nincs tranzakció)

**AC:** Feature flag alapján megjelenítés (ha KGC válaszol → hotfix)

---

### 2.5 Alert & Notification Widgets (2 db) - MVP PRIORITÁS 0

#### 2.5.1 Notification Panel

**Adatok:**

- Értesítések lista (kritikus, figyelmeztetés, info)
- Badge: olvasatlan száma
- Timestamp

**AC:**

- ✅ Badge (piros) olvasatlan számmal
- ✅ Click → panel slide-in (shadcn Sheet)
- ✅ Lista: időrend szerinti
- ✅ Mark as read funkció

---

#### 2.5.2 Critical Alert Toast

**Adatok:**

- Kritikus események (készlethiány, fizetési hiba, sürgős munkalap)

**AC:**

- ✅ shadcn Toast komponens
- ✅ Auto-dismiss 10 másodperc után
- ✅ Action button: "Részletek" → redirect widget-hez

---

## 3. Közös Követelmények (Minden Widget)

### 3.1 Real-time Frissítés

**MVP:** 5 perces polling MINDEN widget-re (TanStack Query)

```typescript
refetchInterval: 5 * 60 * 1000; // 5 perc
staleTime: 4 * 60 * 1000; // 4 perc (1 perc átfedés)
```

**Phase 2:** WebSocket kritikus események

- Kritikus készlethiány alert
- Fizetési hiba értesítés
- Új bérlés indítás notification

---

### 3.2 Időszak Összehasonlítás

**Minden pénzügyi/KPI widget:**

- ✅ Date range picker (shadcn Calendar)
- ✅ Period selector: Napi, Heti, Havi, Negyedéves, Éves
- ✅ Comparison toggle: Current vs. Previous
- ✅ Delta számítás (%, abszolút)
- ✅ Trend indicator (↑ ↓ →)

---

### 3.3 Drill-down Riportok

**Többszintű bontás:**

1. Összesített (teljes rendszer)
2. Bolt szint (bolt_id)
3. Szerviz szint (szerviz tevékenység)
4. Bérlések szint (rental kategória)
5. Partner szint (partner_id)

**Implementáció:**

- Click KPI kártya → Modal (shadcn Dialog)
- Táblázat (shadcn Table) drill-down gombokkal
- Breadcrumb navigáció

---

### 3.4 Export Funkció

**Minden riport/táblázat widget:**

- ✅ Export PDF (server-side)
- ✅ Export Excel (XLSX)
- ✅ Export CSV

**AC:**

- ✅ Export gomb (shadcn Button)
- ✅ Progress indicator (shadcn Progress)
- ✅ Download automatikus

---

### 3.5 RBAC Integráció

**Minden widget role-based:**

- OPERATOR: csak saját műveletek + kritikus alertek
- STORE_MANAGER: saját bolt + szerviz adatok
- ADMIN: minden adat, franchise-wide

**Implementáció:**

- API szinten: `tenant_id` + `user.role` szűrés
- Frontend: widget visibility check `WIDGET_REGISTRY[widget].roles`

---

### 3.6 Responsive Design (Tablet támogatás)

**Breakpoints:**

- Desktop: >= 1024px (4 oszlop grid)
- Tablet: 768-1023px (2-3 oszlop grid)
- Mobile: < 768px (1 oszlop grid, NEM prioritás MVP-ben)

**AC:**

- ✅ Tablet portrait és landscape teszt
- ✅ Touch-friendly gombok (min 44px)
- ✅ Swipe gesture (később)

---

## 4. Tisztázandó Kérdések (KGC-nak)

### 🔴 KRITIKUS (Dashboard development blokkolt)

1. **Szerviz KPI-k konkrét lista** (7.4.1)
   - Átfutási idő? (órában/napokban)
   - First-time fix rate?
   - Nyitott munkalapok threshold?
   - Technikus kihasználtság kalkuláció?

2. **Real-time vs. Polling prioritás** (ÚJ)
   - Melyik widget legyen real-time WebSocket?
   - Melyik elég 5 perces polling?

### 🟡 KÖZEPES (Feature flag-gel megoldható)

3. **Partner szegmentáció kategóriák** (7.5.2)
   - VIP / Rendszeres / Alkalmi / Inaktív?
   - Threshold-ok (bevétel/tranzakció alapú)?

4. **Bérlési mutatók részletei** (7.6.1)
   - Átlagos bérlési időtartam?
   - Top 10 legnépszerűbb gép?
   - Szezonális trend?

5. **Kiadási ütemezési riport** (7.6.2)
   - Kell-e? (foglalás → átvétel timeline)

6. **Bevételi előrejelzés** (7.6.4)
   - Kell-e?
   - Időtáv: 1/3/6 hónap?

7. **Dashboard sűrűség preferencia** (ÚJ)
   - Kompakt (high density) vs. Légies (low density)?
   - Vagy szerepkör-függő?

---

## 5. MVP Scope Összefoglaló

### ✅ FEJLESZTHETŐ (Sprint 1-2) - 16 SP

**Sprint 1 (8 SP):**

- RBAC Dashboard Layout Engine (3 SP)
- Pénzügyi KPI Dashboard (4 KPI widget) (5 SP)

**Sprint 2 (8 SP):**

- Készlet Dashboard (5 widget) (5 SP)
- Alert Notification Panel (2 widget) (3 SP)

### ⚠️ RÉSZLEGESEN FEJLESZTHETŐ (Sprint 3) - 7 SP

**Sprint 3 (7 SP):**

- Szerviz Dashboard - részleges (3 widget + 1 placeholder) (4 SP)
- Partner Dashboard - részleges (3 widget + 1 feature flag) (3 SP)

### 🚫 BLOKKOLT (Sprint 4+) - TBD

**Phase 2:**

- Bérlési Statisztika Dashboard (BLOKKOLT)
- Bevételi Előrejelzés Widget (BLOKKOLT)
- WebSocket Real-time Events (nem blokkolt, de Phase 2)

---

## 6. Adatforrások

| Widget Kategória | Táblák                                                          | Join-ok                      |
| ---------------- | --------------------------------------------------------------- | ---------------------------- |
| **Pénzügyi KPI** | `sales_invoice`, `rental_core`, `service_worksheet`, `payments` | `tenant_id`, `created_at`    |
| **Készlet**      | `inventory`, `rental_core`, `service_worksheet`                 | `equipment_id`, `tenant_id`  |
| **Szerviz**      | `service_worksheet`, `service_warranty`, `users` (technikus)    | `technician_id`, `tenant_id` |
| **Partner**      | `partner`, `sales_invoice`, `rental_core`, `service_worksheet`  | `partner_id`, `tenant_id`    |

---

## Changelog

| Verzió | Dátum      | Változás                                                          |
| ------ | ---------- | ----------------------------------------------------------------- |
| 1.0    | 2026-02-03 | Kezdeti dokumentum - 29 tisztázott követelmény alapján (YOLO MVP) |

---

**Készítette:** Mary (Analyst) + BMAD Party Mode
**Jóváhagyva:** YOLO Mode 🚀
**Módszertan:** BMAD Method
