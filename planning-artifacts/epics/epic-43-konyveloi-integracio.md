# Epic 43: Könyvelői Integráció

## Epic Összefoglaló

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Epic ID**    | 43                                |
| **Név**        | Könyvelői Integráció              |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 5                                 |
| **Sprint**     | Sprint 10                         |
| **Státusz**    | DONE (YOLO Pipeline - 2026-02-07) |

## Üzleti Kontextus

### Forrás

- 02-04 Meeting jegyzőkönyv
- Könyvelői visszajelzések

### Üzleti érték

- **Automatizált export** - Könyvelő közvetlenül tud adatot húzni
- **Havi zárás egyszerűsítés** - Nincs kézi adatbevitel
- **NAV megfelelőség** - Teljes számla audit trail

## User Stories

---

### Story 43-1: Könyvelői API végpontok

**Mint** könyvelő,
**Szeretném** API-n keresztül lekérni a számla és tranzakció adatokat,
**Hogy** automatikusan tudjam importálni a könyvelő szoftverbe.

#### Acceptance Criteria

```gherkin
Feature: Könyvelői API

  Scenario: Számlák lekérdezése időszakra
    Given könyvelői API kulccsal hitelesítettem
    When lekérdezem a számlákat "2026-01" hónapra
    Then megkapom az összes kiállított számlát
    And a válasz tartalmazza: számlaszám, dátum, partner, nettó, áfa, bruttó
    And a válasz JSON formátumban érkezik

  Scenario: Tranzakciók lekérdezése
    Given könyvelői hozzáférésem van
    When lekérdezem a pénzmozgásokat "2026-01-01" és "2026-01-31" között
    Then megkapom: kaució bevétel, kaució kiadás, számla befizetés
    And a válasz tartalmazza a tranzakció típusát és összegét

  Scenario: ÁFA összesítő lekérdezés
    Given könyvelői hozzáférésem van
    When lekérdezem az ÁFA összesítőt "2026-01" hónapra
    Then megkapom az ÁFA kulcsok szerinti bontást
    And látom: nettó alap, ÁFA összeg, bruttó - kulcsonként
```

#### Technikai követelmények

- [ ] `AccountingController` - `/api/v1/accounting/*`
- [ ] API key authentication (nem JWT, hanem long-lived key)
- [ ] Végpontok:
  - `GET /accounting/invoices?from=&to=`
  - `GET /accounting/transactions?from=&to=`
  - `GET /accounting/vat-summary?month=`
- [ ] Rate limiting: 100 request/perc

#### Tesztelési követelmények

- [ ] Unit tesztek: 15 db
- [ ] Integration: API + auth
- [ ] E2E: Teljes export flow

---

### Story 43-2: Könyvelői riportok

**Mint** könyvelő,
**Szeretném** letölteni a havi riportokat CSV és Excel formátumban,
**Hogy** be tudjam importálni a könyvelő szoftverbe.

#### Acceptance Criteria

```gherkin
Feature: Könyvelői riportok

  Scenario: Számla riport CSV export
    Given könyvelői jogosultságom van
    When exportálom a "2026-01" havi számlákat CSV formátumban
    Then letöltődik a fájl "kgc_szamlak_2026-01.csv" néven
    And a CSV tartalmazza a kötelező oszlopokat
    And az encoding UTF-8 BOM (Excel kompatibilis)

  Scenario: ÁFA analitika Excel export
    Given könyvelői jogosultságom van
    When exportálom az ÁFA analitikát "2026-Q1" negyedévre
    Then letöltődik az Excel fájl
    And külön munkalap van: Összesítő, Részletes, NAV formátum

  Scenario: Kaució egyenleg riport
    Given könyvelői jogosultságom van
    When exportálom a kaució egyenleget
    Then látom az összes nyitott kauciót
    And a riport tartalmazza: partner, összeg, típus, dátum
```

#### Technikai követelmények

- [ ] `AccountingReportService` - riport generálás
- [ ] CSV export: `papaparse` vagy custom
- [ ] Excel export: `xlsx` library
- [ ] Formátumok: CSV, XLSX, PDF

#### Tesztelési követelmények

- [ ] Unit tesztek: 12 db
- [ ] Integration: File generálás
- [ ] E2E: Letöltés böngészőben

---

### Story 43-3: Automatikus email riportok

**Mint** könyvelő,
**Szeretném** automatikusan megkapni a havi riportokat emailben,
**Hogy** ne kelljen minden hónapban belépnem a rendszerbe.

#### Acceptance Criteria

```gherkin
Feature: Automatikus email riportok

  Scenario: Havi riport email küldés
    Given beállítottam az automatikus riport küldést
    And a cél email: "konyvelo@ceg.hu"
    When a hónap végén a scheduler fut
    Then email küldődik a beállított címre
    And a melléklet tartalmazza: számla riport, ÁFA összesítő

  Scenario: Riport beállítások módosítása
    Given admin felhasználó vagyok
    When módosítom a riport beállításokat
    And beállítok új email címet és formátumot
    Then a beállítások mentésre kerülnek
    And a következő hónaptól az új beállítások érvényesek

  Scenario: Email küldés hiba kezelés
    Given beállított automatikus riport
    When az email küldés sikertelen
    Then 3 újrapróbálkozás történik
    And ha továbbra is sikertelen, admin értesítés küldődik
```

#### Technikai követelmények

- [ ] `ReportSchedulerService` - havi cron job
- [ ] `EmailReportSettings` model - email, format, enabled
- [ ] Email service: SMTP vagy SendGrid
- [ ] Retry logic: 3 próba, exponential backoff

#### Tesztelési követelmények

- [ ] Unit tesztek: 10 db
- [ ] Integration: Scheduler + Email mock
- [ ] E2E: Beállítások UI

---

## Függőségek

| Típus       | Leírás         |
| ----------- | -------------- |
| **Epic 10** | Invoice model  |
| **Epic 16** | Deposit model  |
| **Epic 11** | NAV integráció |

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Unit tesztek PASS
- [ ] Code review PASS (adversarial, min. 3 issue fix)
- [ ] API dokumentáció (Swagger)
- [ ] Sprint-status.yaml DONE státuszra állítva

## Kockázatok

| Kockázat                 | Valószínűség | Hatás   | Mitigáció                  |
| ------------------------ | ------------ | ------- | -------------------------- |
| API key kompromittálódás | Alacsony     | Magas   | Key rotation, IP whitelist |
| Email delivery           | Közepes      | Közepes | Retry + fallback           |
| Nagy adat export         | Közepes      | Közepes | Streaming + pagination     |
