# KGC ERP v7.0 - Döntési Összefoglaló

**Dokumentum verzió:** 1.0
**Dátum:** 2026-02-03
**Készítette:** Claude Code (BMAD feldolgozás)
**Forrás:** Követelmény Tisztázó Válaszok (2026-02-03)

---

## Executive Summary

Ez a dokumentum az ügyfél válaszai alapján azonosított kulcsfontosságú döntéseket, architektúrát érintő változásokat és új ADR (Architecture Decision Record) igényeket tartalmazza.

**Összesítés:**

- **Kulcsfontosságú döntések:** 15
- **Új ADR igény:** 7
- **Meglévő ADR módosítás:** 3
- **Tisztázandó döntések:** 8

---

## 1. Kulcsfontosságú Döntések

### 1.1 MyPOS Kaució Kezelés

#### D-01: Kaució kötelező minden bérléshez

**Döntés:** Kaució kezelés kötelező rövid távú ÉS hosszú távú bérléshez egyaránt.

**Forrás:** 4.1, 1.5

**Indoklás:** Az ügyfél megerősítette, hogy a kaució mindig a bérlés idejére náluk marad, függetlenül a szerződés típusától.

**Implementációs hatás:**

- `@kgc/rental-core`: Kaució kötelező validáció minden bérlés létrehozásakor
- `@kgc/mypos`: MyPOS integráció alapvető követelmény (nem opcionális)

**ADR igény:** ❌ Nem szükséges (üzleti szabály, nem architektúra döntés)

---

#### D-02: Géptípus szintű kaució konfiguráció + gép szintű felülírás

**Döntés:** Minden géphez egyedi kaució érték állítható be (gép ár %-a vagy fix érték). Ha nincs egyedi beállítás, akkor az alapértelmezett (géptípus szintű) kaució értéket használjuk.

**Forrás:** 1.5

**Indoklás:** Rugalmas kaució rendszer szükséges - alapértelmezett értékek + egyedi felülírási lehetőség.

**Implementációs hatás:**

- `@kgc/inventory`: Kaució konfiguráció tárolása géptípus és gép szinten
- `@kgc/config`: Kaució számítási szabályok (fix érték vs. gép ár %-a)

**ADR igény:** ✅ **ADR-044: Kaució Konfiguráció és Kalkuláció**

---

#### D-03: Pre-authorization vs. Azonnali terhelés

**Döntés:** ⚠️ **TISZTÁZANDÓ** - Az ügyfél válasz nem egyértelmű.

**Forrás:** 1.1

**Javasolt megközelítések:**

1. **Pre-authorization (MyPOS pre-auth)**: Kaució összeg blokkolása, terhelés csak károsodás/késedelem esetén
2. **Azonnali terhelés + visszatérítés**: Kaució azonnali levonása, visszautalás visszavétel után

**Implementációs hatás:** MyPOS API integráció architektúra (pre-auth endpoint vs. payment endpoint)

**Következő lépés:** Tisztázó kérdés küldése az ügyfélnek + MyPOS API dokumentáció áttekintése

**ADR igény:** ✅ **ADR-045: MyPOS Pre-authorization Stratégia** (döntés után)

---

### 1.2 Hosszú Távú Szerződések

#### D-04: Szerződés típusok és időtartamok

**Döntés:** Többféle szerződés típus támogatása:

- **Szolgáltatók, biztosítók, pályázatok:** éves, 2 éves, hosszabbítható
- **Beszerzeléseknél:** egyenlő arányú szerződések (valószínűleg havi/negyedéves)

**Forrás:** 2.1

**Implementációs hatás:**

- `@kgc/rental-contract`: Rugalmas szerződés modul
  - Időtartam típusok: havi, negyedéves, féléves, éves, 2 éves
  - Hosszabbítási mechanizmus
  - Pályázat-specifikus szerződés flag

**ADR igény:** ✅ **ADR-046: Hosszú Távú Szerződés Architektúra**

---

#### D-05: Időtartam alapú automatikus kedvezmény

**Döntés:** Kedvezmény struktúra:

- **1 hét után:** 10% kedvezmény
- **3 hét után:** 20% kedvezmény
- **Havi:** magasabb kedvezmény (pontos érték tisztázandó)

**Forrás:** 2.3

**Implementációs hatás:**

- `@kgc/rental-core`: Időtartam alapú kedvezmény kalkulátor
- `@kgc/config`: Konfigurálható kedvezmény táblázat (admin által szerkeszthető)

**Üzleti szabály:**

```typescript
function calculateDiscount(rentalDays: number): number {
  if (rentalDays >= 30) return MONTHLY_DISCOUNT; // konfig
  if (rentalDays >= 21) return 0.2;
  if (rentalDays >= 7) return 0.1;
  return 0;
}
```

**ADR igény:** ❌ Nem szükséges (üzleti logika, nem architektúra döntés)

---

#### D-06: Előre/Utólag számlázás (60% előre, 40% utólag)

**Döntés:** Rugalmas számlázási mód:

- **60% ügyfelek:** Azonnali fizetés (előre) - amikor kimondják mennyi időre kérik
- **Előleg lehetősége**
- **Utólag:** Hónap végén számlázás

**Forrás:** 2.2

**Implementációs hatás:**

- `@kgc/sales-invoice`: Számlázási mód flag (`PREPAID`, `POSTPAID`, `MIXED`)
- `@kgc/rental-contract`: Szerződés szintű számlázási beállítás
- Előleg kezelés: Előleg rögzítés, párosítás végszámlával

**ADR igény:** ❌ Nem szükséges (üzleti folyamat, meglévő ADR-030 NAV Online számlázás kiterjesztése)

---

#### D-07: Szerződés több gép és csomag támogatás

**Döntés:** Egy szerződés tartalmazhat:

- Több gépet (1:N kapcsolat)
- Előre definiált gépcsomagokat (pl: "Alapcsomag", "Profi csomag")

**Forrás:** 2.7

**Implementációs hatás:**

- `@kgc/rental-contract`: Szerződés-gép kapcsolótábla (M:N)
- `@kgc/inventory`: Csomag definíció (template géplistákkal)
- Csomag szintű kedvezmények

**ADR igény:** ❌ Nem szükséges (adatmodell bővítés, nem architektúra döntés)

---

#### D-08: Korai lemondás - Kedvezmény visszaszámítás

**Döntés:** Ha kedvezményesen vették igénybe és korán lémondják, a kedvezményt vissza kell számítani.

**Forrás:** 2.6

**Üzleti szabály:**

- Ügyfél 3 hétre (21 nap) bérelt gépet 20% kedvezménnyel
- 10 nap után lemondja
- Visszaszámítás: 10 nap esetén csak 10% kedvezmény járna
- Visszakövetelés: (20% - 10%) _ napi díj _ 10 nap

**Implementációs hatás:**

- `@kgc/rental-core`: Korai lemondási díj kalkulátor
- `@kgc/sales-invoice`: Sztornó + új számla generálás helyes kedvezménnyel

**⚠️ TISZTÁZANDÓ:** Pontos kalkulációs módszer az ügyféllel.

**ADR igény:** ❌ Nem szükséges (üzleti logika)

---

#### D-09: Gép csere workflow hosszú távú szerződésben

**Döntés:** Hosszú távú szerződéseknél a gép cserélhető a szerződés alatt (pl: elromlik, hasonló gép allokálása).

**Forrás:** 6.1

**Implementációs hatás:**

- `@kgc/rental-contract`: Gép csere műveleti típus
- `@kgc/inventory`: Hasonló gép keresés logika (kategória, gyártó, modell alapján)
- Automatikus szerződés módosítás (új gép hozzárendelése, régi gép eltávolítása)

**ADR igény:** ❌ Nem szükséges (üzleti folyamat)

---

#### D-10: Próbaidő kezelés (30 nap)

**Döntés:** Első 30 nap díjmentes lemondás lehetősége ("egy hónapos próbaidő").

**Forrás:** 6.3

**Implementációs hatás:**

- `@kgc/rental-contract`: Próbaidő flag (`trial_period_days: 30`)
- Díjmentes lemondási workflow próbaidő alatt
- Automatikus státusz váltás próbaidő lejárta után (`trial` → `active`)

**ADR igény:** ❌ Nem szükséges (üzleti logika)

---

### 1.3 Makita Norma / Garanciális Javítás

#### D-11: Makita Excel norma import + éves frissítés

**Döntés:**

- **Formátum:** Excel
- **Frissítési gyakoriság:** Évente
- **Elszámolás:** Makita platformon rögzítés → havi számla importálás

**Forrás:** 3.1, 3.2, 3.4

**Implementációs hatás:**

- `@kgc/service-core`: Excel import funkció (XLSX parser)
- Norma verziókezelés (verzió ID, érvényesség dátum)
- Makita platform CSV/Excel import workflow (havi elszámolás)

**ADR igény:** ✅ **ADR-047: Makita Norma Integráció és Verziókezelés**

---

#### D-12: Csak Makita esetén van norma (SBM, Hikoki nem)

**Döntés:** Csak Makita beszállítónál van norma rendszer. SBM, Hikoki és egyéb beszállítóknál standard munkalap kezelés.

**Forrás:** 3.5

**Implementációs hatás:**

- `@kgc/service-core`: Beszállító-specifikus logika
- Makita munkalapnál norma validáció kötelező
- Egyéb beszállítóknál szabadon rögzíthető munka/anyag költségek

**ADR igény:** ❌ Nem szükséges (üzleti szabály)

---

### 1.4 Pénzügyi / Számlázási

#### D-13: Egységes késedelmi díj kalkuláció

**Döntés:** Késedelmi díj számítás rövid/hosszú távú szerződéseknél egyaránt azonos.

**Forrás:** 4.3

**Implementációs hatás:**

- `@kgc/sales-invoice`: Egységes késedelmi díj számítás függvény
- ADR-037 (Bérlési díj kalkuláció) kiterjesztése késedelmi díjra

**ADR igény:** ⚙️ **ADR-037 kiterjesztés:** Késedelmi díj kalkuláció

---

#### D-14: Fizetési késedelem következményei

**Döntés:** Fizetési késedelem esetén:

1. Automata értesítések
2. Szolgáltatás felfüggesztés
3. Kedvezmények megszűnése

**Forrás:** 4.2

**Implementációs hatás:**

- `@kgc/sales-invoice`: Fizetési késedelem követés
- `@kgc/audit`: Esemény naplózás (értesítés küldése, felfüggesztés)
- Email/push értesítés workflow
- Szerződés státusz: `active` → `suspended` (fizetési késedelem miatt)
- Kedvezmény automatikus visszavonás

**ADR igény:** ❌ Nem szükséges (üzleti folyamat)

---

### 1.5 Dashboard és Riporting

#### D-15: RBAC alapú fix dashboard layout (NINCS user testreszabás!)

**Döntés:**

- **Szerepkör-specifikus widgetek:** Operátor, Buhaszető, Admin, Partner Owner
- **Fix layout:** Admin által beállított widget elrendezés
- **NINCS user-szintű testreszabás** - egységes nézet minden szerepkörön belül

**Forrás:** 7.1.1, 7.1.3

**Indoklás:** Az ügyfél egyértelműen jelezte, hogy NEM kell testreszabható widget rendszer. Egyszerűség és egységesség prioritás.

**Implementációs hatás:**

- `@kgc/ui`: Fix dashboard layout komponensek szerepkörönként
- Admin konfiguráció: Melyik widgetek jelenjenek meg melyik szerepkörnél
- RBAC (ADR-032) integráció

**ADR igény:** ✅ **ADR-048: Dashboard Architektúra és Widget Rendszer**

---

## 2. Architektúrát Érintő Változások

### 2.1 Új Modulok / Packages

Az alábbi új package-ek szükségesek az új követelmények teljesítéséhez:

| Package                | Réteg             | Indoklás                                                                    | ADR Hivatkozás |
| ---------------------- | ----------------- | --------------------------------------------------------------------------- | -------------- |
| `@kgc/rental-contract` | Domain (berles/)  | Hosszú távú szerződések kezelése (jelenleg csak `@kgc/rental-core` létezik) | ADR-046        |
| `@kgc/rental-discount` | Domain (berles/)  | Időtartam alapú kedvezmény rendszer (elkülönül a core-tól)                  | ADR-046        |
| `@kgc/service-makita`  | Domain (szerviz/) | Makita-specifikus norma kezelés (elkülönül a `@kgc/service-core`-tól)       | ADR-047        |
| `@kgc/mypos`           | Integration       | MyPOS API integráció kaució kezeléshez                                      | ADR-045        |
| `@kgc/dashboard`       | Shared            | Dashboard widget rendszer és RBAC integráció                                | ADR-048        |
| `@kgc/reporting`       | Shared            | Riporting engine (időszak, pivot, export)                                   | ADR-048        |

**ADR-014 (Moduláris architektúra) követése:** Minden új package követi a meglévő architektúrát (Core/Shared/Domain/Integration rétegek).

---

### 2.2 Meglévő Package-ek Bővítése

| Package              | Bővítés                                           | Indoklás   |
| -------------------- | ------------------------------------------------- | ---------- |
| `@kgc/inventory`     | Kaució konfiguráció tárolása géptípus/gép szinten | D-02       |
| `@kgc/inventory`     | Csomag definíció (template géplisták)             | D-07       |
| `@kgc/rental-core`   | Próbaidő kezelés, gép csere workflow              | D-09, D-10 |
| `@kgc/sales-invoice` | Előre/utólag számlázás, előleg kezelés            | D-06       |
| `@kgc/sales-invoice` | Késedelmi díj kalkuláció                          | D-13       |
| `@kgc/service-core`  | Excel import funkció, verziókezelés               | D-11       |
| `@kgc/auth`          | Dashboard RBAC integráció                         | D-15       |

---

### 2.3 Adatmodell Változások (Prisma Schema)

#### Új táblák:

```prisma
// @kgc/rental-contract
model RentalContract {
  id                  String   @id @default(cuid())
  tenantId            String
  contractType        ContractType // MONTHLY, QUARTERLY, YEARLY, TWO_YEAR
  billingMode         BillingMode  // PREPAID, POSTPAID, MIXED
  discountRate        Decimal?     // Alkalmazott kedvezmény (%)
  trialPeriodDays     Int?         // Próbaidő (30)
  status              ContractStatus // TRIAL, ACTIVE, SUSPENDED, CANCELLED

  // Kapcsolatok
  rentals             Rental[]
  invoices            Invoice[]

  @@index([tenantId])
}

// @kgc/rental-discount
model DiscountRule {
  id                  String   @id @default(cuid())
  tenantId            String
  minDays             Int      // Minimum napok (7, 21, 30)
  discountRate        Decimal  // Kedvezmény (0.10, 0.20)

  @@index([tenantId])
}

// @kgc/inventory
model EquipmentDepositConfig {
  id                  String   @id @default(cuid())
  equipmentTypeId     String?  // Géptípus szintű konfig
  equipmentId         String?  // Gép szintű felülírás
  depositType         DepositType // FIXED, PERCENTAGE
  depositAmount       Decimal?    // Fix összeg
  depositPercentage   Decimal?    // Gép ár %-a

  @@index([equipmentTypeId])
  @@index([equipmentId])
}

// @kgc/inventory
model EquipmentPackage {
  id                  String   @id @default(cuid())
  tenantId            String
  name                String   // "Alapcsomag", "Profi csomag"
  description         String?
  discountRate        Decimal? // Csomag szintű kedvezmény

  items               EquipmentPackageItem[]

  @@index([tenantId])
}

model EquipmentPackageItem {
  id                  String   @id @default(cuid())
  packageId           String
  equipmentTypeId     String
  quantity            Int

  package             EquipmentPackage @relation(fields: [packageId], references: [id])

  @@index([packageId])
}

// @kgc/service-makita
model MakitaNorma {
  id                  String   @id @default(cuid())
  version             String   // "2026-V1"
  effectiveFrom       DateTime
  effectiveTo         DateTime?

  items               MakitaNormaItem[]

  @@index([version])
}

model MakitaNormaItem {
  id                  String   @id @default(cuid())
  normaId             String
  serviceCode         String   // Makita norma kód
  description         String
  laborHours          Decimal
  laborRate           Decimal

  norma               MakitaNorma @relation(fields: [normaId], references: [id])

  @@index([normaId])
  @@index([serviceCode])
}

// @kgc/mypos
model MyPosTransaction {
  id                  String   @id @default(cuid())
  rentalId            String
  transactionType     MyPosTransactionType // PRE_AUTH, CAPTURE, REFUND
  amount              Decimal
  myposTransactionId  String   // MyPOS API transaction ID
  status              MyPosStatus // PENDING, AUTHORIZED, CAPTURED, REFUNDED, FAILED

  @@index([rentalId])
  @@index([myposTransactionId])
}
```

#### Meglévő táblák bővítése:

```prisma
// @kgc/rental-core - Rental tábla bővítése
model Rental {
  // ... meglévő mezők

  contractId          String?  // Kapcsolat RentalContract-hez
  contract            RentalContract? @relation(fields: [contractId], references: [id])

  depositAmount       Decimal? // Kaució összeg (MyPOS-tól)
  depositConfigId     String?  // Használt kaució konfig

  trialPeriodEndsAt   DateTime? // Próbaidő vége

  @@index([contractId])
}

// @kgc/sales-invoice - Invoice tábla bővítése
model Invoice {
  // ... meglévő mezők

  billingMode         BillingMode? // PREPAID, POSTPAID, MIXED
  isAdvancePayment    Boolean @default(false) // Előleg flag
  parentInvoiceId     String? // Előleg esetén hivatkozás végszámlára

  lateFeeAmount       Decimal? // Késedelmi díj
  lateFeeCalculatedAt DateTime? // Késedelmi díj számítás ideje

  @@index([parentInvoiceId])
}

// @kgc/service-worksheet - ServiceWorksheet bővítése
model ServiceWorksheet {
  // ... meglévő mezők

  isWarranty          Boolean @default(false) // Garanciális javítás flag
  makitaNormaId       String? // Makita norma hivatkozás
  supplierType        SupplierType // MAKITA, SBM, HIKOKI, OTHER

  @@index([makitaNormaId])
}
```

**ADR igény:** ✅ **ADR-049: Adatmodell Bővítések v7.0** (Prisma schema változások dokumentálása)

---

## 3. Új ADR Igények

Az alábbi ADR-ek készítése szükséges az új döntések dokumentálásához:

### ADR-044: Kaució Konfiguráció és Kalkuláció

**Státusz:** Javasolt
**Kategória:** Domain Logic
**Scope:** `@kgc/inventory`, `@kgc/rental-core`, `@kgc/mypos`

**Döntési kérdés:** Hogyan konfiguráljuk és kalkuláljuk a kaució összegeket géptípus és gép szinten?

**Kontextus:** D-02 döntés - géptípus szintű alapértelmezett + gép szintű felülírás

**Alternatívák:**

1. **Fix kaució összeg géptípusonként** - egyszerű, de nem rugalmas
2. **Gép ár százalékában** - dinamikus, de komplex kalkuláció
3. **Hibrid (fix + százalék opció)** - rugalmas, de több konfiguráció

**Javasolt megoldás:** Hibrid megközelítés (3)

---

### ADR-045: MyPOS Pre-authorization Stratégia

**Státusz:** Blokkolt (ügyfél tisztázás szükséges)
**Kategória:** Integration
**Scope:** `@kgc/mypos`, `@kgc/rental-core`

**Döntési kérdés:** Pre-authorization vagy azonnali terhelés használata kauciókhoz?

**Kontextus:** D-03 döntés - tisztázás alatt

**Alternatívák:**

1. **Pre-authorization:** Összeg blokkolása, terhelés csak kár/késedelem esetén
2. **Azonnali terhelés + visszatérítés:** Kaució levonása, visszautalás visszavétel után
3. **Hibrid:** Kis összegnél pre-auth, nagy összegnél terhelés

**Javasolt megoldás:** TBD (ügyfél visszajelzés után)

---

### ADR-046: Hosszú Távú Szerződés Architektúra

**Státusz:** Javasolt
**Kategória:** Domain Architecture
**Scope:** `@kgc/rental-contract`, `@kgc/rental-discount`, `@kgc/rental-core`

**Döntési kérdés:** Hogyan építsük fel a hosszú távú szerződés modult?

**Kontextus:** D-04, D-05, D-06, D-07, D-09, D-10 döntések

**Alternatívák:**

1. **Bővítjük a meglévő `@kgc/rental-core`-t** - egyszerű, de monolitikus lesz
2. **Új `@kgc/rental-contract` package** - tiszta szeparáció, de több package
3. **Szerződés mint Rental decorator** - DDD pattern, de komplex

**Javasolt megoldás:** Új `@kgc/rental-contract` package (2) + `@kgc/rental-discount` package

**Indoklás:**

- Clean separation of concerns
- `@kgc/rental-core`: rövid távú bérlések (napi/heti)
- `@kgc/rental-contract`: hosszú távú szerződések (havi/éves)
- `@kgc/rental-discount`: kedvezmény engine (mindkettő használja)

---

### ADR-047: Makita Norma Integráció és Verziókezelés

**Státusz:** Javasolt
**Kategória:** Integration / Domain Logic
**Scope:** `@kgc/service-makita`, `@kgc/service-core`

**Döntési kérdés:** Hogyan integráljuk a Makita norma rendszert?

**Kontextus:** D-11, D-12 döntések

**Alternatívák:**

1. **Excel file upload + manuális frissítés** - egyszerű, de hibalehetőség
2. **Makita API integráció (ha van)** - automatikus, de vendor lock-in
3. **Hibrid: Excel import + API (ha elérhető)** - rugalmas

**Javasolt megoldás:** Excel import (1) + jövőbeli API migráció opció

**Implementációs részletek:**

- XLSX parser (`xlsx` npm package)
- Norma verziókezelés (version, effectiveFrom, effectiveTo)
- Csak Makita munkalapnál kötelező norma validáció
- Egyéb beszállítók (SBM, Hikoki): szabadon rögzített költségek

---

### ADR-048: Dashboard Architektúra és Widget Rendszer

**Státusz:** Javasolt
**Kategória:** Frontend Architecture
**Scope:** `@kgc/dashboard`, `@kgc/reporting`, `@kgc/ui`

**Döntési kérdés:** Hogyan építsük fel a dashboard és riporting rendszert?

**Kontextus:** D-15 döntés - RBAC alapú fix layout, NINCS user testreszabás

**Alternatívák:**

1. **Hardcoded dashboard layouts** - gyors, de nem konfigurálható
2. **Admin konfigurálható widget rendszer** - rugalmas, admin szinten testreszabható
3. **User testreszabható drag-and-drop** - maximális flexibilitás (DE: ügyfél NEM kérte!)

**Javasolt megoldás:** Admin konfigurálható widget rendszer (2)

**Implementációs részletek:**

- Fix widget lista (pl: 20 előre definiált widget)
- Admin konfiguráció: szerepkör → engedélyezett widgetek listája
- Layout: CSS Grid vagy Flexbox fix elrendezés
- RBAC integráció (ADR-032)

**Widget példák:**

- Operátor: Aktív bérlések, Mai visszavételek, Készlet alert
- Buhaszető: Bevételi KPI-k, Kintlévőségek, Számlák listája
- Admin: Teljes rendszer áttekintés, Teljesítmény metrikák
- Partner Owner: Franchise-specifikus nézet (saját bolt adatai)

---

### ADR-049: Adatmodell Bővítések v7.0

**Státusz:** Javasolt
**Kategória:** Data Architecture
**Scope:** Prisma schema (minden érintett package)

**Döntési kérdés:** Hogyan bővítsük a Prisma schemát az új követelmények teljesítéséhez?

**Kontextus:** 2.3 adatmodell változások

**Tartalom:**

- Új táblák: `RentalContract`, `DiscountRule`, `EquipmentDepositConfig`, `EquipmentPackage`, `MakitaNorma`, `MyPosTransaction`
- Meglévő táblák bővítése: `Rental`, `Invoice`, `ServiceWorksheet`
- Indexelési stratégia
- Migráció terv (több lépcsős migráció nagy táblákhoz)

---

### ADR-037 Kiterjesztés: Késedelmi Díj Kalkuláció

**Státusz:** Kiterjesztés (meglévő ADR módosítás)
**Kategória:** Domain Logic
**Scope:** `@kgc/sales-invoice`

**Eredeti ADR:** ADR-037 (Bérlési díj kalkuláció)

**Bővítés:** Késedelmi díj számítási logika hozzáadása

**Üzleti szabály:**

- Egységes késedelmi díj rövid/hosszú távú szerződéseknél
- Napi késedelmi díj = (számlázott összeg) \* (késedelmi kamat %) / 365
- Késedelmi kamat % = konfigurálható (pl: jegybanki alapkamat + 8%)

---

## 4. Üzleti Szabályok Összefoglalása

### 4.1 Kaució Szabályok

```yaml
# @kgc/rental-core - Kaució szabályok
kaució_kötelező: IGAZ (minden bérléshez)
kaució_kalkuláció:
  - IF gép_szintű_konfig EXISTS THEN használd azt
  - ELSE IF géptípus_szintű_konfig EXISTS THEN használd azt
  - ELSE HIBA (nincs konfiguráció)

kaució_típus:
  - FIXED: fix összeg (pl: 50000 Ft)
  - PERCENTAGE: gép ár %-a (pl: gép ár * 20%)

károsodás_kezelés:
  - IF kár > kaució THEN kaució felhasználás + különbözet számlázás
  - ELSE kaució részleges levonás + maradék visszatérítés
```

### 4.2 Kedvezmény Szabályok

```yaml
# @kgc/rental-discount - Kedvezmény szabályok
időtartam_alapú_kedvezmény:
  - 1-6 nap: 0%
  - 7-20 nap: 10%
  - 21-29 nap: 20%
  - 30+ nap: KONFIG (MONTHLY_DISCOUNT) # tisztázandó

kedvezmény_halmozódás: NEM (csak a legnagyobb kedvezmény érvényes)

korai_lemondás_visszaszámítás:
  formula: |
    tervezett_napok = 21 (3 hét)
    tervezett_kedvezmény = 20%
    tényleges_napok = 10
    tényleges_kedvezmény = 10% (1-2 hét közötti)
    visszakövetelés = (tervezett_kedvezmény - tényleges_kedvezmény) * napi_díj * tényleges_napok
```

### 4.3 Szerződés Szabályok

```yaml
# @kgc/rental-contract - Szerződés szabályok
szerződés_típusok:
  - MONTHLY: havi
  - QUARTERLY: negyedéves
  - SEMI_ANNUAL: féléves
  - YEARLY: éves
  - TWO_YEAR: 2 éves

próbaidő:
  időtartam: 30 nap
  lemondás: díjmentes (teljes visszatérítés)
  státusz_változás: trial → active (30 nap után automatikusan)

gép_csere:
  feltétel: hasonló kategória, hasonló érték
  jóváhagyás: operátor jóváhagyás szükséges
  státusz: szerződés aktív marad (csak gép referencia változik)
```

### 4.4 Számlázási Szabályok

```yaml
# @kgc/sales-invoice - Számlázási szabályok
számlázási_mód:
  PREPAID: előre (60% ügyfelek)
    - Teljes összeg számlázás bérlés kezdetekor
  POSTPAID: utólag (40% ügyfelek)
    - Számlázás időszak végén (hónap vége)
  MIXED: vegyes
    - Előleg (pl: 50%) + végszámla

előleg_kezelés:
  - Előleg számla (isAdvancePayment = TRUE)
  - Végszámla (parentInvoiceId hivatkozás)
  - Előleg összeg levonása végszámláról

késedelmi_díj:
  számítás: napi_késedelmi_díj * késedelmes_napok
  napi_késedelmi_díj: (számla_összeg * késedelmi_kamat_%) / 365
  késedelmi_kamat_%: KONFIG (pl: jegybanki_alapkamat + 8%)
```

### 4.5 Makita Norma Szabályok

```yaml
# @kgc/service-makita - Makita norma szabályok
norma_érvényesség:
  - Verziókezelés (version, effectiveFrom, effectiveTo)
  - Aktív verzió: effectiveFrom <= MA <= effectiveTo (vagy effectiveTo NULL)

garanciális_munkalap:
  feltétel: beszállító = MAKITA AND isWarranty = TRUE
  kötelező: Makita norma kód kiválasztása
  kalkuláció: norma.laborHours * norma.laborRate + alkatrész_költség

egyéb_beszállító: (SBM, HIKOKI, OTHER)
  - Nincs norma validáció
  - Szabadon rögzíthető munka/anyag költségek
```

---

## 5. Implementációs Irányelvek

### 5.1 Fejlesztési Prioritások

1. **KRITIKUS (Phase 1 - Sprint 1-3):**
   - MyPOS integráció alapok (pre-auth döntés után!)
   - Kaució konfiguráció és kalkuláció
   - Hosszú távú szerződések alapfunkciók
   - Kedvezmény rendszer
   - Dashboard RBAC alapok

2. **MAGAS (Phase 2 - Sprint 4-6):**
   - Makita norma integráció
   - Pénzügyi modul (késedelem, díjszámítás)
   - Riporting alapok (bevétel, készlet, szerviz)
   - Szerződés bővített funkciók (csere, próbaidő)

3. **KÖZEPES (Phase 3 - Sprint 7-9):**
   - Dashboard kiegészítő widgetek
   - Riporting kiegészítő funkciók
   - Ügyfél portál
   - Könyvelői modul

### 5.2 Tesztelési Követelmények

**TDD/ATDD Hibrid Stratégia (kgc3-development-principles.md):**

**TDD KÖTELEZŐ (Unit tesztek):**

- Kaució kalkuláció (`@kgc/inventory`)
- Kedvezmény kalkuláció (`@kgc/rental-discount`)
- Késedelmi díj kalkuláció (`@kgc/sales-invoice`)
- Korai lemondás visszaszámítás (`@kgc/rental-contract`)
- Makita norma validáció (`@kgc/service-makita`)

**ATDD KÖTELEZŐ (E2E tesztek):**

- Bérlés indítás MyPOS kaucióval
- Hosszú távú szerződés létrehozás + kedvezmény
- Garanciális munkalap Makita normával
- Dashboard widget megjelenítés RBAC szerint

### 5.3 ADR Készítési Sorrend

1. **ADR-044** (Kaució konfiguráció) - ELSŐ (blokkol: MK-01, MK-02)
2. **ADR-046** (Hosszú távú szerződés architektúra) - MÁSODIK (nagy Epic)
3. **ADR-048** (Dashboard architektúra) - HARMADIK
4. **ADR-047** (Makita norma) - NEGYEDIK
5. **ADR-045** (MyPOS pre-auth) - ÖTÖDIK (ügyfél tisztázás után!)
6. **ADR-049** (Adatmodell bővítések) - HATODODIK (összefoglaló ADR)
7. **ADR-037 kiterjesztés** (Késedelmi díj) - HETEDIK

### 5.4 Dokumentáció Frissítések

**PRD Frissítés szükséges:**

- 3.2 Bérlés modul: Hosszú távú szerződések, kaució kezelés
- 3.3 Szerviz modul: Makita norma, garanciális javítás
- 3.4 Pénzügy modul: Előre/utólag számlázás, késedelmi díj
- 3.5 Dashboard és Riporting: RBAC widgetek, riport típusok

**Architektúra dokumentum frissítés:**

- 4.2 Package struktúra: Új package-ek (`@kgc/rental-contract`, `@kgc/rental-discount`, `@kgc/service-makita`, `@kgc/mypos`, `@kgc/dashboard`, `@kgc/reporting`)
- 4.3 Adatmodell: Új táblák és mezők
- 4.4 Integrációk: MyPOS, Makita platform

---

## 6. Következő Lépések

### 6.1 Azonnali Akciók (1 hét)

1. **Tisztázó kérdések küldése az ügyfélnek** (lásd 7. szekció)
2. **MyPOS API dokumentáció áttekintése** (pre-auth vs. payment)
3. **Makita norma minta Excel fájl kérése** (import fejlesztéshez)
4. **ADR-044 és ADR-046 elkészítése** (blokkol implementációt)

### 6.2 Rövid Távú (2-4 hét)

1. **PRD és Architektúra frissítése** (új követelmények integrálása)
2. **Epic és Story készítés** (`/bmad:bmm:workflows:create-epics-and-stories`)
3. **Sprint Planning** (`/bmad:bmm:workflows:sprint-planning`)
4. **Prisma schema tervezés** (adatmodell bővítések)

### 6.3 Közép Távú (1-3 hónap)

1. **Phase 1 implementáció** (MyPOS, kaució, szerződések alapok)
2. **TDD/ATDD tesztek** (kritikus üzleti logika)
3. **Phase 2 implementáció** (Makita, pénzügy, riportok)

---

## 7. Tisztázandó Kérdések (Follow-up)

Az alábbi kérdések **egyértelmű választ igényelnek** az ügyféltől:

### 7.1 MyPOS Kaució - Pre-authorization

**Kérdés 1.1 újra:** A kauciók **pre-authorization** módon legyenek tárolva (csak blokkolás, nincs pénz áttranszakció), vagy a bérlés indulásakor azonnal terheljük a kaució összeget?

**Miért fontos:** MyPOS API integráció architektúra döntés (pre-auth endpoint vs. payment endpoint).

**Opciók:**

- **A) Pre-authorization:** Összeg blokkolása kártyán, terhelés csak károsodás/késedelem esetén
- **B) Azonnali terhelés:** Kaució levonása bérlés kezdetekor, visszautalás visszavétel után

---

### 7.2 Hosszú Távú Szerződés Definíció

**Kérdés 5.3 pontosítása:** Mit értünk "hosszú távú szerződés" alatt?

**Miért fontos:** MVP scope meghatározás, Epic tervezés.

**Opciók:**

- **A) Rövid távú:** Napi/heti bérlés (1-30 nap)
- **B) Hosszú távú:** Havi/negyedéves/éves szerződések (30+ nap)
- **C) Átdobázó szerződések:** Megújítható, ismétlődő szerződések

**Javasolt pontosítás:** Minden 30 napnál hosszabb bérlés = hosszú távú szerződés?

---

### 7.3 Automatikus Szerződés Megújítás

**Kérdés 2.4 újra:** A szerződés automatikusan megújul lejárat után, vagy külön jóváhagyás szükséges?

**Miért fontos:** Workflow tervezés, értesítési mechanizmus.

**Opciók:**

- **A) Automatikus megújítás:** Szerződés automatikusan hosszabbodik (opt-out modell)
- **B) Manuális megújítás:** Lejárat előtt értesítés + ügyfél megerősítés szükséges (opt-in modell)
- **C) Konfigurálható:** Szerződésenként beállítható

---

### 7.4 Korai Lemondás Visszaszámítás Pontosítása

**Kérdés 2.6 pontosítása:** Hogyan számítsuk pontosan a korai lemondási díjat?

**Miért fontos:** Üzleti logika implementáció, ügyfél elégedettség.

**Példa szcenárió:**

- Ügyfél 30 napra bérel gépet havi kedvezménnyel (pl: 25%)
- 15 nap után lemondja

**Kérdések:**

- Milyen kedvezmény járna 15 napra? (valószínűleg 10-20% között)
- A különbözetet visszaköveteljük? (25% - 15 napi kedvezmény) \* 15 nap?
- Vagy lemondási díjat számítunk?

**Javasolt formula megerősítése az ügyféllel.**

---

### 7.5 Havi Kedvezmény Mértéke

**Kérdés 2.3 pontosítása:** Mennyi a havi (30+ napos) bérlések kedvezménye?

**Jelenlegi info:**

- 1 hét: 10%
- 3 hét: 20%
- **Havi: ?%** (csak annyi, hogy "magasabb")

**Javasolt:** 25-30% (vagy egyéb konkrét érték)

---

### 7.6 Szerviz KPI-k Pontosítása

**Kérdés 7.4.1:** Milyen szerviz KPI-k szükségesek?

**Miért fontos:** Dashboard és riportok tervezése.

**Javasolt KPI-k megerősítése:**

- Átfutási idő (órában/napokban)
- Munkalapok száma (nyitott, lezárt, várakozó alkatrészre)
- Átlagár munkalapok
- First-time fix rate (első javítás sikeressége %)
- Technikus kihasználtság

---

### 7.7 Partner Szegmentáció

**Kérdés 7.5.2:** Kell-e partner szegmentáció riport?

**Miért fontos:** CRM funkciók, marketing stratégia.

**Javasolt szegmentáció:**

- **VIP:** Top 10 partner (bevétel szerint)
- **Rendszeres:** Havi bérlés van
- **Alkalmi:** Ritkán bérel (3-6 havonta)
- **Inaktív:** 6+ hónapja nincs bérlés

---

### 7.8 Bérlési Statisztikák Részletei

**Kérdések 7.6.1, 7.6.2, 7.6.4:** Bérlési statisztikák részletei (nincs válasz a PDF-ben).

**Miért fontos:** Riporting modul scope meghatározása.

**Pontosítandó:**

- Átlagos bérlési időtartam szükséges?
- Top 10 legnépszerűbb gép riport?
- Szezonális trend elemzés?
- Foglalás vs. tényleges kivétel összehasonlítás?
- Bevételi előrejelzés hosszú távú szerződések alapján?

---

## 8. Összefoglalás - Gyors Referencia

| Kategória               | Döntések száma | ADR igény            | Tisztázandó  |
| ----------------------- | -------------- | -------------------- | ------------ |
| MyPOS Kaució            | 3 döntés       | 2 ADR                | 1 kérdés     |
| Hosszú Távú Szerződések | 7 döntés       | 1 ADR                | 3 kérdés     |
| Makita Norma            | 2 döntés       | 1 ADR                | 0 kérdés     |
| Pénzügyi / Számlázási   | 2 döntés       | 1 ADR (kiterjesztés) | 1 kérdés     |
| Dashboard és Riporting  | 1 döntés       | 1 ADR                | 3 kérdés     |
| **ÖSSZESEN**            | **15 döntés**  | **7 ADR**            | **8 kérdés** |

**Következő akció:** Tisztázó kérdések küldése az ügyfélnek → ADR-ek elkészítése → Sprint Planning

---

**Dokumentum vége**

_Generálva: BMAD Correct-Course Workflow, 2026-02-03_
