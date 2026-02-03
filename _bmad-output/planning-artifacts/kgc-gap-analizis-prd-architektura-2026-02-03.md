# KGC ERP v7.0 - PRD és Architektúra Gap Analízis

**Dokumentum verzió:** 1.0
**Dátum:** 2026-02-03
**Készítette:** Claude Code (BMAD feldolgozás)
**Forrás dokumentumok:**

- PRD v2.0 (2026-01-01)
- Architecture v1.0 (2026-01-15)
- Követelmény Tisztázó Válaszok (2026-02-03)

---

## Executive Summary

Ez a dokumentum összeveti az ügyfél által megadott új követelményeket (2026-02-03) a meglévő **PRD v2.0** és **Architektúra v1.0** dokumentumokkal. Célja azonosítani a **gap-eket** (hiányosságokat), **ellentmondásokat** és **frissítési igényeket**.

### Összesített Eredmények

| Kategória                   | Meglévő                     | Új követelmény                   | Gap         | Státusz               |
| --------------------------- | --------------------------- | -------------------------------- | ----------- | --------------------- |
| **MyPOS Kaució Kezelés**    | Részben dokumentált         | Részletes konfiguráció szükséges | 🟠 KÖZEPES  | Frissítés szükséges   |
| **Hosszú Távú Szerződések** | ❌ Nincs dokumentálva       | Teljes modul szükséges           | 🔴 NAGY     | Új szekció hozzáadása |
| **Kedvezmény Rendszer**     | ❌ Nincs dokumentálva       | Időtartam alapú kedvezmények     | 🔴 NAGY     | Új szekció hozzáadása |
| **Makita Norma**            | ❌ Nincs dokumentálva       | Excel import + verziókezelés     | 🔴 NAGY     | Új szekció hozzáadása |
| **Pénzügyi / Számlázási**   | Részben dokumentált         | Előre/utólag, késedelmi díj      | 🟡 ALACSONY | Kiegészítés szükséges |
| **Dashboard / Riporting**   | ❌ Nincs dokumentálva       | RBAC alapú widgetek, riportok    | 🔴 NAGY     | Új szekció hozzáadása |
| **Moduláris Architektúra**  | ✅ Dokumentált (25 package) | Új package-ek szükségesek        | 🟠 KÖZEPES  | Bővítés szükséges     |

**Gap Severity:**

- 🔴 **NAGY (4):** Teljes hiányzó funkciók, új szekciók szükségesek
- 🟠 **KÖZEPES (2):** Részben dokumentált, jelentős bővítés szükséges
- 🟡 **ALACSONY (1):** Kisebb kiegészítések

---

## 1. MyPOS Kaució Kezelés

### 1.1 PRD v2.0 Lefedettség

**Meglévő tartalom (PRD 94. sor):**

> 4. **Bérlés-Specifikus Workflow**
>    - MyPos payment integráció - kártya kaució blokkolás (ADR-005)

**Meglévő tartalom (Architecture - 9.1 Integrációk):**

> | MyPos | API | Payment gateway |

**Gap:**

- ❌ Nincs részletezve a kaució konfiguráció (géptípus/gép szinten)
- ❌ Nincs dokumentálva a pre-auth vs. azonnali terhelés döntés
- ❌ Nincs leírva a károsodás kezelés logika
- ❌ Hiányzik a kaució visszatérítés workflow

### 1.2 Új Követelmények (Ügyfél válaszok alapján)

1. **D-01:** Kaució kötelező minden bérléshez (rövid/hosszú távú egyaránt)
2. **D-02:** Géptípus szintű kaució konfiguráció + gép szintű felülírás
3. **D-03:** Pre-authorization vs. Azonnali terhelés (TISZTÁZANDÓ)
4. **Károsodás kezelés:** Kaució felhasználás vagy külön számlázás
5. **Kaució visszatérítés:** Automatikus workflow visszavételkor

### 1.3 Frissítési Igény

**PRD Frissítés:**

- **3.2 Bérlés modul** (új alszekció):
  - **3.2.5 Kaució Kezelés (MyPOS Integráció)**
    - Kaució kötelező minden bérléshez
    - Géptípus és gép szintű konfiguráció (fix összeg vagy gép ár %-a)
    - Pre-authorization stratégia (ADR-045 hivatkozás)
    - Károsodás kezelés workflow
    - Automatikus visszatérítés

**Architektúra Frissítés:**

- **5.1 Monorepo Struktúra** (új package):
  - `@kgc/mypos` (integration/)

- **6. Adatbázis Architektúra** (új táblák):
  - `EquipmentDepositConfig` (kaució konfiguráció)
  - `MyPosTransaction` (MyPOS tranzakciók)

**ADR Igény:**

- **ADR-044:** Kaució Konfiguráció és Kalkuláció
- **ADR-045:** MyPOS Pre-authorization Stratégia (tisztázás után)

---

## 2. Hosszú Távú Szerződések

### 2.1 PRD v2.0 Lefedettség

**Keresés a PRD-ben:** "szerződés", "contract", "hosszú távú"

**Meglévő tartalom:**

- ❌ **NINCS** külön szekció hosszú távú szerződésekre
- ✅ Van említés rövid távú bérlésekről (napi/heti)

**Gap:**

- ❌ Nincs dokumentálva a szerződés típusok (havi, negyedéves, éves, 2 éves)
- ❌ Nincs leírva a szerződés hosszabbítás mechanizmus
- ❌ Hiányzik a több gép / csomag támogatás
- ❌ Nincs próbaidő (30 nap) koncepció
- ❌ Nincs gép csere workflow

### 2.2 Architektúra Lefedettség

**Meglévő package-ek (5.1 Monorepo):**

- `@kgc/berles` (berles-berles/)
- `@kgc/szerzodes` (berles-szerzodes/)

**Gap:**

- ✅ Van `@kgc/szerzodes` package - DE: tartalma nincs részletezve
- ❌ Nincs dokumentálva, hogy milyen szerződés típusokat támogat

### 2.3 Új Követelmények

1. **D-04:** Többféle szerződés típus (havi, negyedéves, éves, 2 éves)
2. **D-06:** Előre/utólag számlázás (60% előre, 40% utólag)
3. **D-07:** Szerződés több gép és csomag támogatás
4. **D-09:** Gép csere workflow
5. **D-10:** Próbaidő kezelés (30 nap)
6. **HT-11, HT-12:** Online szerződés módosítás, automatikus karbantartás

### 2.4 Frissítési Igény

**PRD Frissítés:**

- **3.2 Bérlés modul** (új alszekció):
  - **3.2.6 Hosszú Távú Szerződések**
    - Szerződés típusok és időtartamok (havi, negyedéves, éves, 2 éves)
    - Előre/utólag számlázási módok
    - Több gép és csomag támogatás
    - Gép csere workflow
    - Próbaidő (30 nap) díjmentes lemondással
    - Online szerződés módosítás (ügyfél portál)
    - Automatikus karbantartás ütemezés (1 hónap után)

**Architektúra Frissítés:**

- **5.1 Monorepo Struktúra** (új/bővített package-ek):
  - `@kgc/rental-contract` (berles/) - Hosszú távú szerződések modul
  - `@kgc/rental-discount` (berles/) - Kedvezmény engine

- **6. Adatbázis Architektúra** (új táblák):
  - `RentalContract` (szerződés típusok, próbaidő, státusz)
  - `EquipmentPackage` (gépcsomagok)

**ADR Igény:**

- **ADR-046:** Hosszú Távú Szerződés Architektúra

---

## 3. Időtartam Alapú Kedvezmény Rendszer

### 3.1 PRD v2.0 Lefedettség

**Keresés:** "kedvezmény", "discount"

**Meglévő tartalom:**

- ❌ **NINCS** dokumentált kedvezmény rendszer
- ✅ RBAC (7.1): Boltvezetőnek ±20% kedvezmény jog van

**Gap:**

- ❌ Nincs időtartam alapú automatikus kedvezmény (1 hét = 10%, 3 hét = 20%)
- ❌ Nincs korai lemondási visszaszámítás logika
- ❌ Nincs konfiguráció rendszer kedvezményekhez

### 3.2 Új Követelmények

1. **D-05:** Időtartam alapú automatikus kedvezmény (1 hét: 10%, 3 hét: 20%, havi: KONFIG)
2. **D-08:** Korai lemondás - kedvezmény visszaszámítás
3. **HT-05, HT-06, HT-07:** Kedvezmény konfiguráció, visszaszámítás logika

### 3.3 Frissítési Igény

**PRD Frissítés:**

- **3.2 Bérlés modul** (új alszekció):
  - **3.2.7 Időtartam Alapú Kedvezmény Rendszer**
    - Automatikus kedvezmény kalkuláció bérlési időtartam alapján
    - Konfigurálható kedvezmény táblázat (admin szerkeszthető)
    - Korai lemondás - kedvezmény visszaszámítás
    - Kedvezmény halmozódás szabályok (csak legnagyobb érvényes)

**Architektúra Frissítés:**

- **5.1 Monorepo** (új package):
  - `@kgc/rental-discount` (berles/)

- **6. Adatbázis** (új tábla):
  - `DiscountRule` (min napok, kedvezmény %)

**ADR Igény:**

- ❌ Nem szükséges (üzleti logika, ADR-046 része lehet)

---

## 4. Makita Norma / Garanciális Javítás

### 4.1 PRD v2.0 Lefedettség

**Keresés:** "Makita", "norma", "garancia"

**Meglévő tartalom (5.1 Monorepo - Architecture):**

- ✅ Van `@kgc/garancia` (szerviz-garancia/)
- ✅ Van `@kgc/norma` (szerviz-norma/)

**Gap:**

- ❌ Nincs leírva, hogy Makita-specifikus
- ❌ Nincs Excel import funkció
- ❌ Nincs verziókezelés (éves frissítés)
- ❌ Nincs Makita platform integráció

### 4.2 Új Követelmények

1. **D-11:** Makita Excel norma import + éves frissítés
2. **D-12:** Csak Makita esetén norma (SBM, Hikoki nem)
3. **MN-01 - MN-06:** Excel import, verziókezelés, Makita platform integráció

### 4.3 Frissítési Igény

**PRD Frissítés:**

- **3.3 Szerviz modul** (új alszekció):
  - **3.3.5 Makita Norma és Garanciális Integráció**
    - Makita-specifikus norma rendszer (SBM, Hikoki nem)
    - Excel norma import funkció (XLSX parser)
    - Norma verziókezelés (éves frissítés workflow)
    - Makita platform integráció (CSV/Excel import)
    - Havi elszámolás párosítás munkalapokkal

**Architektúra Frissítés:**

- **5.1 Monorepo** (package átnevezés/bővítés):
  - `@kgc/norma` → `@kgc/service-makita` (Makita-specifikus)

- **6. Adatbázis** (új táblák):
  - `MakitaNorma` (verzió, effectiveFrom, effectiveTo)
  - `MakitaNormaItem` (service code, labor hours, labor rate)

- **9. Integrációk** (új integráció):
  - Makita platform (CSV/Excel import)

**ADR Igény:**

- **ADR-047:** Makita Norma Integráció és Verziókezelés

---

## 5. Pénzügyi / Számlázási

### 5.1 PRD v2.0 Lefedettség

**Meglévő tartalom:**

- ✅ NAV Online számlázás (ADR-030)
- ✅ Számlázz.hu integráció
- ✅ MyPos payment gateway

**Gap:**

- ❌ Nincs előre/utólag számlázás dokumentálva
- ❌ Nincs előleg kezelés
- ❌ Nincs késedelmi díj kalkuláció
- ❌ Nincs fizetési késedelem következmények (felfüggesztés, értesítés)

### 5.2 Új Követelmények

1. **D-06:** Előre/utólag számlázás (60% előre, 40% utólag)
2. **D-13:** Egységes késedelmi díj kalkuláció
3. **D-14:** Fizetési késedelem követés (értesítés, felfüggesztés, kedvezmény visszavonás)
4. **PF-01 - PF-03:** Kaució kezelés, késedelem követés, késedelmi díj

### 5.3 Frissítési Igény

**PRD Frissítés:**

- **3.4 Pénzügy modul** (bővítés):
  - **3.4.3 Számlázási Módok**
    - Előre számlázás (60% ügyfelek - azonnali fizetés)
    - Utólag számlázás (40% ügyfelek - hónap végén)
    - Előleg kezelés (előleg számla + végszámla párosítás)

  - **3.4.4 Késedelmi Díj és Fizetési Késedelem**
    - Egységes késedelmi díj kalkuláció (ADR-037 kiterjesztés)
    - Automata értesítések
    - Szolgáltatás felfüggesztés workflow
    - Kedvezmény automatikus visszavonás

**Architektúra Frissítés:**

- **6. Adatbázis** (meglévő tábla bővítése):
  - `Invoice` tábla: `billingMode`, `isAdvancePayment`, `parentInvoiceId`, `lateFeeAmount`

**ADR Igény:**

- **ADR-037 kiterjesztés:** Késedelmi díj kalkuláció

---

## 6. Dashboard és Riporting

### 6.1 PRD v2.0 Lefedettség

**Keresés:** "dashboard", "riport", "report"

**Meglévő tartalom (Architecture 8.1):**

- ✅ Composable Dashboard (Widget Registry)

**Gap:**

- ❌ Nincs részletezve a dashboard widgetek típusai
- ❌ Nincs RBAC alapú widget megjelenítés dokumentálva
- ❌ Nincs riporting modul követelményei
- ❌ Nincs bevételi/készlet/szerviz/partner riportok

### 6.2 Új Követelmények

1. **D-15:** RBAC alapú fix dashboard layout (NINCS user testreszabás!)
2. **DR-01 - DR-19:** 19 dashboard/riporting funkció
   - Szerepkör-specifikus widgetek
   - Near real-time frissítés (5 perc)
   - Bevételi, készlet, szerviz, partner riportok
   - Időszak összehasonlítás
   - Export (PDF, Excel, CSV)
   - Könyvelői speciális riportok

### 6.3 Frissítési Igény

**PRD Frissítés:**

- **Új szekció: 3.7 Dashboard és Riporting Modul**
  - **3.7.1 RBAC Alapú Dashboard**
    - Fix widget layout szerepkörönként (Operátor, Buhaszető, Admin, Partner Owner)
    - Admin által konfigurálható widget engedélyek
    - Near real-time frissítés (5 perc) + WebSocket/SSE kritikus eseményekhez
    - Reszponzív design (tablet támogatás)

  - **3.7.2 Bevételi Riportok**
    - Többszintű bontás (összesített, bolt, szerviz, bérlések, partner)
    - Időszak összehasonlítás (current vs. previous)
    - Pénzügyi KPI-k (bruttó, nettó, kintlévők)

  - **3.7.3 Készlet Riportok**
    - Készlet riport (gyártó, kategória, státusz)
    - Készlet mozgás (beszerzés, kiadás, visszavétel, javítás, selejtezés)
    - Minimum készlet alert
    - Kihasználtsági ráta

  - **3.7.4 Szerviz Riportok**
    - Technikus teljesítmény
    - Garanciális / Fizetős javítások aránya
    - Visszatérő hiba tracking

  - **3.7.5 Partner / Ügyfél Riportok**
    - Top 10 partner (bevétel, bérlés)
    - Kintlévőség aging riport (0-30, 30-60, 60-90, 90+ nap)

  - **3.7.6 Export és Integráció**
    - Export formátumok (PDF, Excel, CSV)
    - Könyvelői speciális riportok (ÁFA összesítő, be/kimenő számlák, banki párosítás)

**Architektúra Frissítés:**

- **5.1 Monorepo** (új package-ek):
  - `@kgc/dashboard` (shared/)
  - `@kgc/reporting` (shared/)

- **8.1 Frontend Architektúra** (bővítés):
  - Dashboard widget típusok részletezése
  - RBAC integráció dashboard-nál

**ADR Igény:**

- **ADR-048:** Dashboard Architektúra és Widget Rendszer

---

## 7. Moduláris Architektúra (Package Struktúra)

### 7.1 Meglévő Package-ek (Architecture 5.1)

**CORE (4 package):**

- `@kgc/auth` (core-auth/)
- `@kgc/users` (core-users/)
- `@kgc/tenant` (core-tenant/)
- `@kgc/config` (core-config/)
- `@kgc/ui` (core-ui/)

**SHARED (5 package):**

- `@kgc/partner` (shared-partner/)
- `@kgc/cikk` (shared-cikk/)
- `@kgc/keszlet` (shared-keszlet/)
- `@kgc/szamla` (shared-szamla/)
- `@kgc/nav` (shared-nav/)

**BÉRLÉS (4 package):**

- `@kgc/bergep` (berles-bergep/)
- `@kgc/berles` (berles-berles/)
- `@kgc/szerzodes` (berles-szerzodes/)
- `@kgc/kaucio` (berles-kaucio/)

**SZERVIZ (4 package):**

- `@kgc/munkalap` (szerviz-munkalap/)
- `@kgc/arajanlat` (szerviz-arajanlat/)
- `@kgc/garancia` (szerviz-garancia/)
- `@kgc/norma` (szerviz-norma/)

**ÁRUHÁZ (4 package):**

- `@kgc/bevetelezes` (aruhaz-bevetelezes/)
- `@kgc/eladas` (aruhaz-eladas/)
- `@kgc/arres` (aruhaz-arres/)
- `@kgc/leltar` (aruhaz-leltar/)

**INTEGRATION (3 package):**

- `@kgc/bergep-szerviz`
- `@kgc/online-foglalas`
- `@kgc/riportok`

**Összesen:** 24-25 package

### 7.2 Új Package Igények

Az új követelmények alapján az alábbi package-ek szükségesek:

| Új Package             | Réteg        | Indoklás                                                       | ADR     |
| ---------------------- | ------------ | -------------------------------------------------------------- | ------- |
| `@kgc/mypos`           | integration/ | MyPOS API integráció                                           | ADR-045 |
| `@kgc/rental-contract` | berles/      | Hosszú távú szerződések                                        | ADR-046 |
| `@kgc/rental-discount` | berles/      | Kedvezmény engine                                              | ADR-046 |
| `@kgc/service-makita`  | szerviz/     | Makita norma (átnevezés: `@kgc/norma` → `@kgc/service-makita`) | ADR-047 |
| `@kgc/dashboard`       | shared/      | Dashboard widget rendszer                                      | ADR-048 |
| `@kgc/reporting`       | shared/      | Riporting engine                                               | ADR-048 |

**Új package számolás:** 25 + 6 új = **31 package** (vagy 30, ha `@kgc/norma` átnevezés)

### 7.3 Meglévő Package Bővítések

| Package        | Bővítés                             |
| -------------- | ----------------------------------- |
| `@kgc/keszlet` | Kaució konfiguráció, csomagok       |
| `@kgc/berles`  | Próbaidő, gép csere                 |
| `@kgc/szamla`  | Előre/utólag, előleg, késedelmi díj |

### 7.4 Frissítési Igény

**Architektúra Frissítés:**

- **5.1 Monorepo Struktúra** (bővítés):
  - Új package-ek hozzáadása (6 db)
  - Package diagram frissítése
  - Függőségi gráf aktualizálása

**ADR Igény:**

- **ADR-049:** Adatmodell Bővítések v7.0 (Prisma schema változások)

---

## 8. Adatbázis Architektúra

### 8.1 Meglévő Séma Felosztás (Architecture 6.1)

| Kategória     | Séma     | Táblák                                   |
| ------------- | -------- | ---------------------------------------- |
| CORE          | public   | tenants, users, roles, permissions       |
| PARTNER       | public   | partner, ceg, meghatalmazott             |
| KÉSZLET TÖRZS | public   | cikk, cikkcsoport, beszallito, arszabaly |
| BÉRLÉS        | tenant_X | bergep, berles, szerzodes, kaucio        |
| SZERVIZ       | tenant_X | munkalap, munkalap_tetel, arajanlat      |
| ÉRTÉKESÍTÉS   | tenant_X | keszlet, eladas, szamla                  |

### 8.2 Új Táblák Igénye

Az alábbi új táblák szükségesek:

**Bérlés domain:**

- `RentalContract` - Hosszú távú szerződések
- `DiscountRule` - Kedvezmény szabályok
- `EquipmentDepositConfig` - Kaució konfiguráció
- `EquipmentPackage` - Gépcsomagok
- `EquipmentPackageItem` - Csomag tételek

**Szerviz domain:**

- `MakitaNorma` - Makita norma verziók
- `MakitaNormaItem` - Norma tételek

**Integráció:**

- `MyPosTransaction` - MyPOS tranzakciók

**Összesen:** 8 új tábla

### 8.3 Meglévő Táblák Bővítése

| Tábla              | Új mezők                                                                           |
| ------------------ | ---------------------------------------------------------------------------------- |
| `Rental`           | contractId, depositAmount, depositConfigId, trialPeriodEndsAt                      |
| `Invoice`          | billingMode, isAdvancePayment, parentInvoiceId, lateFeeAmount, lateFeeCalculatedAt |
| `ServiceWorksheet` | isWarranty, makitaNormaId, supplierType                                            |

### 8.4 Frissítési Igény

**Architektúra Frissítés:**

- **6. Adatbázis Architektúra** (bővítés):
  - Új táblák listája
  - Új mezők meglévő táblákon
  - ER diagram aktualizálás (ha van)

**ADR Igény:**

- **ADR-049:** Adatmodell Bővítések v7.0

---

## 9. Integrációk

### 9.1 Meglévő Integrációk (Architecture 9.1)

| Rendszer    | Típus  | Integráció       | ADR     |
| ----------- | ------ | ---------------- | ------- |
| Twenty CRM  | Fork   | API + GraphQL    | ADR-015 |
| Chatwoot    | Fork   | Webhook + API    | ADR-015 |
| Horilla HR  | Fork   | REST API         | ADR-015 |
| Számlázz.hu | API    | NAV Online v3.0  | ADR-030 |
| MyPos       | API    | Payment gateway  | ADR-005 |
| Koko AI     | Egyedi | Gemini Flash API | ADR-016 |

### 9.2 Új Integrációk

| Rendszer        | Típus     | Integráció             | Státusz           |
| --------------- | --------- | ---------------------- | ----------------- |
| MyPos           | API       | Pre-auth vs. payment   | Bővítés (ADR-045) |
| Makita Platform | CSV/Excel | Havi elszámolás import | Új (ADR-047)      |

### 9.3 Frissítési Igény

**Architektúra Frissítés:**

- **9. Integrációk** (bővítés):
  - MyPos integráció részletezése (pre-auth workflow)
  - Makita platform integráció hozzáadása

---

## 10. RBAC (Szerepkörök és Jogosultságok)

### 10.1 Meglévő Szerepkörök (Architecture 2.2)

| Szerepkör     | Szint | Scope    | Fő Feladatok                  |
| ------------- | ----- | -------- | ----------------------------- |
| OPERATOR      | 1     | Location | Napi műveletek                |
| TECHNIKUS     | 2     | Location | Szerviz + Operátor            |
| BOLTVEZETO    | 3     | Location | ±20% kedvezmény, riportok     |
| ACCOUNTANT    | 3     | Tenant   | Pénzügyi riportok (read-only) |
| PARTNER_OWNER | 4     | Tenant   | Franchise összes bolt         |
| CENTRAL_ADMIN | 5     | Global   | Országos áttekintés           |
| DEVOPS_ADMIN  | 6     | Global   | Rendszer konfiguráció         |
| SUPER_ADMIN   | 8     | Global   | Teljes hozzáférés             |

### 10.2 Új RBAC Követelmények

**Dashboard widget engedélyek:**

- OPERATOR: Aktív bérlések, Mai visszavételek, Készlet alert
- ACCOUNTANT (Buhaszető): Bevételi KPI-k, Kintlévőségek, Számlák listája
- BOLTVEZETO: Forgalmi riportok, Készlet kihasználtság, Szerviz statisztikák
- PARTNER_OWNER: Franchise-specifikus dashboard
- CENTRAL_ADMIN: Teljes rendszer áttekintés

**Nincs módosítás a szerepkörökön,** csak új permission-ök szükségesek:

- `dashboard:view:<widget_type>`
- `report:view:<report_type>`
- `report:export:<format>`

### 10.3 Frissítési Igény

**Architektúra Frissítés:**

- **7. RBAC és Jogosultságok** (bővítés):
  - Dashboard widget permission-ök
  - Riport permission-ök

**ADR Igény:**

- ❌ Nem szükséges (ADR-032 kiterjesztése vagy ADR-048 része)

---

## 11. Gap Összefoglaló Táblázat

| #   | Terület                 | PRD Lefedettség             | Arch Lefedettség                | Gap Severity | Frissítés Igény                              |
| --- | ----------------------- | --------------------------- | ------------------------------- | ------------ | -------------------------------------------- |
| 1   | MyPOS Kaució Kezelés    | 🟠 Részleges (csak említés) | 🟠 Részleges                    | 🟠 KÖZEPES   | PRD 3.2.5 + Arch 5.1 + ADR-044, ADR-045      |
| 2   | Hosszú Távú Szerződések | ❌ Nincs                    | 🟡 Package van, de nincs leírva | 🔴 NAGY      | PRD 3.2.6 + Arch 5.1 + ADR-046               |
| 3   | Kedvezmény Rendszer     | ❌ Nincs                    | ❌ Nincs                        | 🔴 NAGY      | PRD 3.2.7 + Arch 5.1 (új package)            |
| 4   | Makita Norma            | 🟡 Package van              | 🟡 Package van, de nincs leírva | 🔴 NAGY      | PRD 3.3.5 + Arch 5.1 + ADR-047               |
| 5   | Pénzügyi / Számlázási   | 🟠 NAV Online van           | 🟠 Részleges                    | 🟡 ALACSONY  | PRD 3.4.3, 3.4.4 + ADR-037 kiterjesztés      |
| 6   | Dashboard / Riporting   | 🟡 Composable dashboard van | 🟡 Widget registry van          | 🔴 NAGY      | PRD 3.7.\* (új szekció) + Arch 8.1 + ADR-048 |
| 7   | Package Struktúra       | ✅ 25 package dokumentált   | ✅ Dokumentált                  | 🟠 KÖZEPES   | Arch 5.1 (6 új package) + ADR-049            |
| 8   | Adatbázis               | ✅ Séma felosztás van       | ✅ Dokumentált                  | 🟠 KÖZEPES   | Arch 6.\* (8 új tábla) + ADR-049             |
| 9   | Integrációk             | 🟠 MyPos említve            | 🟠 MyPos említve                | 🟡 ALACSONY  | Arch 9.1 (bővítés)                           |
| 10  | RBAC                    | ✅ 8 szerepkör              | ✅ Permission matrix van        | 🟡 ALACSONY  | Arch 7.\* (új permission-ök)                 |

---

## 12. Frissítési Prioritások

### 12.1 KRITIKUS Frissítések (1-2 hét)

Ezeket a frissítéseket azonnal el kell végezni, mert blokkolják az implementációt:

1. **ADR-044:** Kaució Konfiguráció és Kalkuláció
2. **ADR-046:** Hosszú Távú Szerződés Architektúra
3. **PRD 3.2.6:** Hosszú Távú Szerződések szekció hozzáadása
4. **PRD 3.2.7:** Kedvezmény Rendszer szekció hozzáadása
5. **Architektúra 5.1:** 6 új package hozzáadása

### 12.2 MAGAS Frissítések (2-4 hét)

Fontos, de nem blokkoló:

6. **ADR-047:** Makita Norma Integráció
7. **ADR-048:** Dashboard Architektúra és Widget Rendszer
8. **PRD 3.3.5:** Makita Norma szekció
9. **PRD 3.7.\*:** Dashboard és Riporting szekció (6 alszekció)
10. **Architektúra 6.\*:** Adatbázis séma bővítések

### 12.3 KÖZEPES Frissítések (1-2 hónap)

Később is elvégezhető:

11. **ADR-037 kiterjesztés:** Késedelmi díj kalkuláció
12. **ADR-049:** Adatmodell Bővítések v7.0 (összefoglaló ADR)
13. **PRD 3.4.3, 3.4.4:** Pénzügyi szekciók bővítése
14. **Architektúra 7.\*:** RBAC permission-ök bővítése
15. **Architektúra 9.1:** Integrációk bővítése

---

## 13. Konkrét Frissítési Javaslatok

### 13.1 PRD v2.0 → v2.1 Frissítési Terv

**Új szekciók hozzáadása:**

```markdown
## 3.2 Bérlés Modul

### 3.2.5 Kaució Kezelés (MyPOS Integráció)

[Teljes tartalom a döntési összefoglalóból - D-01, D-02, D-03 alapján]

### 3.2.6 Hosszú Távú Szerződések

[Teljes tartalom a döntési összefoglalóból - D-04, D-06, D-07, D-09, D-10 alapján]

### 3.2.7 Időtartam Alapú Kedvezmény Rendszer

[Teljes tartalom a döntési összefoglalóból - D-05, D-08 alapján]

## 3.3 Szerviz Modul

### 3.3.5 Makita Norma és Garanciális Integráció

[Teljes tartalom a döntési összefoglalóból - D-11, D-12 alapján]

## 3.4 Pénzügy Modul

### 3.4.3 Számlázási Módok

[Előre/utólag számlázás, előleg kezelés - D-06 alapján]

### 3.4.4 Késedelmi Díj és Fizetési Késedelem

[Késedelmi díj, fizetési késedelem - D-13, D-14 alapján]

## 3.7 Dashboard és Riporting Modul (ÚJ SZEKCIÓ)

### 3.7.1 RBAC Alapú Dashboard

### 3.7.2 Bevételi Riportok

### 3.7.3 Készlet Riportok

### 3.7.4 Szerviz Riportok

### 3.7.5 Partner / Ügyfél Riportok

### 3.7.6 Export és Integráció

[Teljes tartalom a döntési összefoglalóból - D-15, DR-01 - DR-19 alapján]
```

**Meglévő szekciók módosítása:**

- Nincs

**Verzió frissítés:**

- `Version: 2.0` → `Version: 2.1`
- `Date: 2026-01-01` → `Date: 2026-02-03`
- Változásnapló bővítése

---

### 13.2 Architektúra v1.0 → v1.1 Frissítési Terv

**Bővítendő szekciók:**

```markdown
## 5. Moduláris Rendszer (Micro-Modules)

### 5.1 Monorepo Struktúra

[Meglévő 25 package + 6 új package hozzáadása:]

packages/
├── integration/
│ ├── mypos/ # @kgc/mypos (ÚJ)
│ └── ...
│
├── berles/
│ ├── rental-contract/ # @kgc/rental-contract (ÚJ)
│ ├── rental-discount/ # @kgc/rental-discount (ÚJ)
│ └── ...
│
├── szerviz/
│ ├── service-makita/ # @kgc/service-makita (ÁTNEVEZÉS: norma →)
│ └── ...
│
├── shared/
│ ├── dashboard/ # @kgc/dashboard (ÚJ)
│ ├── reporting/ # @kgc/reporting (ÚJ)
│ └── ...

[Package diagram frissítése 31 package-re]

## 6. Adatbázis Architektúra

### 6.3 Új Táblák (v7.0 Követelmények) (ÚJ ALSZEKCIÓ)

[8 új tábla leírása - lásd döntési összefoglaló 2.3 szekció]

### 6.4 Meglévő Táblák Bővítése (ÚJ ALSZEKCIÓ)

[Rental, Invoice, ServiceWorksheet mezők - lásd döntési összefoglaló 2.3 szekció]

## 7. RBAC és Jogosultságok

### 7.3 Dashboard és Riport Permission-ök (ÚJ ALSZEKCIÓ)

[Dashboard widget és riport permission-ök - lásd gap analízis 10.2]

## 8. Frontend Architektúra

### 8.3 Dashboard Widget Rendszer (ÚJ ALSZEKCIÓ)

[RBAC alapú widget rendszer - lásd döntési összefoglaló D-15]

## 9. Integrációk

### 9.3 MyPOS Pre-authorization Workflow (ÚJ ALSZEKCIÓ)

[MyPOS pre-auth workflow - ADR-045 hivatkozás]

### 9.4 Makita Platform Integráció (ÚJ ALSZEKCIÓ)

[Makita CSV/Excel import - ADR-047 hivatkozás]

## 12. ADR Összefoglaló

### Új ADR-ek (v7.0 Követelmények)

[7 új ADR hozzáadása a táblázathoz:]

| ADR       | Téma                                      | Státusz                            |
| --------- | ----------------------------------------- | ---------------------------------- |
| ADR-044   | Kaució Konfiguráció és Kalkuláció         | 🟡 Tervezés                        |
| ADR-045   | MyPOS Pre-authorization Stratégia         | 🟡 Tervezés (blokkolt - tisztázás) |
| ADR-046   | Hosszú Távú Szerződés Architektúra        | 🟡 Tervezés                        |
| ADR-047   | Makita Norma Integráció és Verziókezelés  | 🟡 Tervezés                        |
| ADR-048   | Dashboard Architektúra és Widget Rendszer | 🟡 Tervezés                        |
| ADR-049   | Adatmodell Bővítések v7.0                 | 🟡 Tervezés                        |
| ADR-037\* | Késedelmi Díj Kalkuláció (kiterjesztés)   | 🟡 Tervezés                        |
```

**Verzió frissítés:**

- `Version: 1.0` → `Version: 1.1`
- `Date: 2026-01-15` → `Date: 2026-02-03`
- Változásnapló bővítése

---

## 14. Ellentmondások és Ütközések

### 14.1 Azonosított Ellentmondások

#### E-01: Package elnevezés (Magyar vs. Angol)

**Probléma:**

- **Architektúra 5.1:** Magyar package nevek (`@kgc/berles`, `@kgc/szerviz`, `@kgc/munkalap`)
- **CLAUDE.md (Projekt szabály):** "Package aliasok ANGOL nevek" (`@kgc/rental-core`, `@kgc/service-core`)

**Impact:** HIGH

**Javasolt megoldás:**

1. **Döntés szükséges:** Magyar VAGY Angol elnevezés
2. **Javasolt:** Angol elnevezés (nemzetközi best practice, kód olvashatóság)
3. **Frissítés:** Architektúra 5.1 táblázat átírása angol nevekre
4. **ADR:** ADR-010 kiterjesztés (package naming convention)

**Angol elnevezési javaslat:**

| Magyar (jelenleg Arch-ban) | Angol (CLAUDE.md szerint)                       | Választott                  |
| -------------------------- | ----------------------------------------------- | --------------------------- |
| `@kgc/berles`              | `@kgc/rental-core`                              | `@kgc/rental-core` ✅       |
| `@kgc/bergep`              | `@kgc/equipment` vagy `@kgc/rental-equipment`   | `@kgc/rental-equipment` ✅  |
| `@kgc/szerzodes`           | `@kgc/rental-contract`                          | `@kgc/rental-contract` ✅   |
| `@kgc/kaucio`              | `@kgc/deposit` vagy `@kgc/rental-deposit`       | `@kgc/deposit` ✅           |
| `@kgc/munkalap`            | `@kgc/service-worksheet`                        | `@kgc/service-worksheet` ✅ |
| `@kgc/arajanlat`           | `@kgc/quote` vagy `@kgc/sales-quote`            | `@kgc/sales-quote` ✅       |
| `@kgc/garancia`            | `@kgc/service-warranty`                         | `@kgc/service-warranty` ✅  |
| `@kgc/norma`               | `@kgc/service-makita` (Makita-specifikus)       | `@kgc/service-makita` ✅    |
| `@kgc/bevetelezes`         | `@kgc/procurement` vagy `@kgc/receiving`        | `@kgc/receiving` ✅         |
| `@kgc/eladas`              | `@kgc/sales-core`                               | `@kgc/sales-core` ✅        |
| `@kgc/arres`               | `@kgc/margin` vagy `@kgc/pricing`               | `@kgc/pricing` ✅           |
| `@kgc/leltar`              | `@kgc/stock-taking` vagy `@kgc/inventory-count` | `@kgc/inventory-count` ✅   |
| `@kgc/keszlet`             | `@kgc/inventory`                                | `@kgc/inventory` ✅         |
| `@kgc/szamla`              | `@kgc/invoice` vagy `@kgc/sales-invoice`        | `@kgc/sales-invoice` ✅     |
| `@kgc/nav`                 | `@kgc/nav-online`                               | `@kgc/nav-online` ✅        |
| `@kgc/partner`             | `@kgc/customer` vagy `@kgc/partner`             | `@kgc/partner` ✅           |
| `@kgc/cikk`                | `@kgc/product`                                  | `@kgc/product` ✅           |

**Akció:** Architektúra 5.1 teljes átírása angol package nevekre.

---

#### E-02: Kedvezmény Jogosultság vs. Automatikus Kedvezmény

**Probléma:**

- **Architektúra 7.1 (RBAC):** Boltvezető ±20% kedvezmény manuális jog
- **Új követelmény (D-05):** Automatikus időtartam alapú kedvezmény (1 hét: 10%, 3 hét: 20%)

**Impact:** MEDIUM

**Nincs valódi ütközés,** két különböző kedvezmény típus:

- **Automatikus kedvezmény:** Időtartam alapú (rendszer számítja)
- **Manuális kedvezmény:** Boltvezető egyedi döntése (±20% manuális módosítás)

**Javasolt megoldás:**

- Mindkét kedvezmény típus támogatása
- Kedvezmény halmozódás szabály: legnagyobb kedvezmény érvényes (VAGY: admin konfiguráció)
- PRD 3.2.7-ben tisztázás: "Automatikus kedvezmény + manuális felülírás (RBAC szerint)"

**Akció:** PRD 3.2.7 tisztázás hozzáadása.

---

#### E-03: Bérlés Modul vs. Szerződés Modul

**Probléma:**

- **Architektúra 5.1:** Van `@kgc/szerzodes` (berles-szerzodes/) package
- **Új követelmény:** Hosszú távú szerződések → új `@kgc/rental-contract` package javasolt

**Impact:** MEDIUM

**Kérdés:** Ugyanaz a modul vagy külön?

**Javasolt megoldás:**

- **Döntés 1:** `@kgc/szerzodes` = `@kgc/rental-contract` (csak átnevezés angol névre)
- **Döntés 2:** Meglévő `@kgc/szerzodes` bővítése (ha már létezik implementáció)

**Feltételezés:** Jelenleg `@kgc/szerzodes` valószínűleg üres vagy minimális → átnevezés + teljes implementáció

**Akció:** Ellenőrizni a meglévő `packages/berles-szerzodes/` tartalmat, majd döntés.

---

### 14.2 Ellentmondás Összefoglaló

| ID   | Ellentmondás                        | Impact | Javasolt megoldás                        | Érintett dokumentumok       |
| ---- | ----------------------------------- | ------ | ---------------------------------------- | --------------------------- |
| E-01 | Magyar vs. Angol package nevek      | HIGH   | Angol elnevezés választása               | Architecture 5.1, ADR-010   |
| E-02 | Manuális vs. Automatikus kedvezmény | MEDIUM | Mindkettő támogatása, szabály tisztázása | PRD 3.2.7, Architecture 7.1 |
| E-03 | Szerződés modul duplikáció          | MEDIUM | Meglévő package bővítése vagy átnevezés  | Architecture 5.1            |

---

## 15. Következő Lépések - Akcióterv

### Fázis 1: Tisztázások és ADR-ek (1-2 hét)

**Week 1:**

1. ✅ **Tisztázó kérdések küldése az ügyfélnek** (8 kérdés - lásd döntési összefoglaló 7. szekció)
2. ✅ **MyPOS API dokumentáció áttekintése** (pre-auth vs. payment döntéshez)
3. ✅ **Makita norma minta Excel fájl kérése**
4. 🔄 **ADR-044 elkészítése** (Kaució konfiguráció)
5. 🔄 **ADR-046 elkészítése** (Hosszú távú szerződések)

**Week 2:** 6. 🔄 **ADR-048 elkészítése** (Dashboard architektúra) 7. 🔄 **ADR-047 elkészítése** (Makita norma) 8. 🔄 **ADR-045 elkészítése** (MyPOS pre-auth - ügyfél válasz után) 9. 🔄 **ADR-049 elkészítése** (Adatmodell bővítések - összefoglaló) 10. 🔄 **ADR-037 kiterjesztés** (Késedelmi díj)

### Fázis 2: Dokumentáció Frissítés (2-3 hét)

**Week 3:** 11. 🔄 **PRD v2.0 → v2.1 frissítés** - 3.2.5 Kaució kezelés (ÚJ) - 3.2.6 Hosszú távú szerződések (ÚJ) - 3.2.7 Kedvezmény rendszer (ÚJ) - 3.3.5 Makita norma (ÚJ)

**Week 4:** 12. 🔄 **PRD v2.1 frissítés folytatása** - 3.4.3 Számlázási módok (ÚJ) - 3.4.4 Késedelmi díj (ÚJ) - 3.7.\* Dashboard és riporting (ÚJ SZEKCIÓ - 6 alszekció)

13. 🔄 **Architektúra v1.0 → v1.1 frissítés**
    - 5.1 Monorepo (6 új package + angol átnevezés)
    - 6.3, 6.4 Adatbázis (8 új tábla + bővítések)
    - 7.3 RBAC (dashboard/riport permission-ök)
    - 8.3 Frontend (dashboard widget rendszer)
    - 9.3, 9.4 Integrációk (MyPOS, Makita)
    - 12. ADR összefoglaló (7 új ADR)

**Week 5:** 14. 🔄 **Ellentmondások feloldása** - E-01: Package elnevezés döntés + átírás - E-02: Kedvezmény szabály tisztázása - E-03: Szerződés modul döntés

15. 🔄 **Dokumentáció review és validáció**
    - PRD v2.1 belső review
    - Architektúra v1.1 belső review
    - Konzisztencia ellenőrzés (PRD ↔ Architektúra ↔ ADR-ek)

### Fázis 3: Epic és Story Készítés (3-4 hét)

**Week 6-7:** 16. 🔄 **Epic lebontás részletes Story-kra** - Epic 1: MyPOS Kaució Integráció - Epic 3: Hosszú Távú Szerződések - Epic 4: Kedvezmény Rendszer - Epic 7: Makita Norma - Epic 8: Pénzügyi Modul - Epic 9: Dashboard Alapok - Epic 10: Riporting Modul

17. 🔄 **Sprint Planning**
    - Phase 1 Sprint 1-3 tervezés (MVP)
    - Függőségi gráf finomítás
    - Story pontszámok meghatározása

**Week 8:** 18. 🔄 **Prisma schema tervezés** - 8 új tábla Prisma modellek - Meglévő táblák bővítése - Migráció terv (multi-step migrations nagy tábláknál)

19. 🔄 **Implementáció readiness check**
    - Blokkolók feloldása (MyPOS API kulcsok, Makita minták)
    - Dev környezet setup
    - TDD/ATDD teszt sablon készítés

### Fázis 4: Implementáció Kezdés (Week 9+)

20. 🔄 **Phase 1 - Sprint 1 kickoff**
    - Epic 1: MyPOS Kaució Integráció (részleges)
    - Epic 4: Kedvezmény Rendszer
    - Epic 9: Dashboard Alapok (részleges)

---

## 16. Összefoglalás

### Gap Analízis Eredmények

**Teljes gap darabszám:** 10 terület

**Severity megoszlás:**

- 🔴 **NAGY (4):** Hosszú távú szerződések, Kedvezmény rendszer, Makita norma, Dashboard/Riporting
- 🟠 **KÖZEPES (2):** MyPOS kaució, Package struktúra
- 🟡 **ALACSONY (1):** Pénzügyi/Számlázási

### Frissítési Igény Összefoglaló

**PRD v2.0 → v2.1:**

- Új szekciók: 7 (3.2.5, 3.2.6, 3.2.7, 3.3.5, 3.4.3, 3.4.4, 3.7.\*)
- Meglévő szekciók módosítása: 0

**Architektúra v1.0 → v1.1:**

- Új alszekciók: 7 (5.1 bővítés, 6.3, 6.4, 7.3, 8.3, 9.3, 9.4)
- Meglévő szekciók módosítása: 3 (5.1, 12. ADR összefoglaló, ellentmondás feloldás)

**Új ADR-ek:** 7

- ADR-044, ADR-045, ADR-046, ADR-047, ADR-048, ADR-049, ADR-037 kiterjesztés

**Új Package-ek:** 6

- `@kgc/mypos`, `@kgc/rental-contract`, `@kgc/rental-discount`, `@kgc/service-makita`, `@kgc/dashboard`, `@kgc/reporting`

**Új Adatbázis Táblák:** 8

- `RentalContract`, `DiscountRule`, `EquipmentDepositConfig`, `EquipmentPackage`, `EquipmentPackageItem`, `MakitaNorma`, `MakitaNormaItem`, `MyPosTransaction`

### Munkaidő Becslés

| Fázis                           | Időkeret | Fő Feladatok                                      |
| ------------------------------- | -------- | ------------------------------------------------- |
| Fázis 1: Tisztázások és ADR-ek  | 1-2 hét  | Ügyfél válaszok, 7 ADR elkészítése                |
| Fázis 2: Dokumentáció Frissítés | 2-3 hét  | PRD v2.1, Arch v1.1, ellentmondás feloldás        |
| Fázis 3: Epic és Story Készítés | 3-4 hét  | 12 Epic lebontása, Sprint planning, Prisma schema |
| Fázis 4: Implementáció Kezdés   | Week 9+  | Phase 1 Sprint 1 kickoff                          |

**Teljes gap feloldási idő:** ~8-9 hét (dokumentáció + tervezés)

---

## 17. Kockázatok

| Kockázat                                      | Valószínűség | Impact  | Mitigáció                             |
| --------------------------------------------- | ------------ | ------- | ------------------------------------- |
| Ügyfél válaszok késése (8 kérdés)             | MAGAS        | MAGAS   | Follow-up email 3 nap után            |
| MyPOS API dokumentáció hiányos                | KÖZEPES      | MAGAS   | Sandbox API tesztelés előre           |
| Makita norma Excel formátum változó           | KÖZEPES      | KÖZEPES | Rugalmas parser tervezés              |
| Package átnevezés breaking change             | ALACSONY     | KÖZEPES | Fokozatos migráció, alias támogatás   |
| ADR-ek elkészítése túl sok időt vesz          | KÖZEPES      | KÖZEPES | Prioritizálás (kritikus ADR-ek előre) |
| Ellentmondás feloldása ütközik meglévő kóddal | ALACSONY     | MAGAS   | Kód audit előre (packages/ könyvtár)  |

---

**Dokumentum vége**

_Generálva: BMAD Correct-Course Workflow, 2026-02-03_
