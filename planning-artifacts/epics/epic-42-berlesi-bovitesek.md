# Epic 42: Bérlési Bővítések

## Epic Összefoglaló

| Mező           | Érték             |
| -------------- | ----------------- |
| **Epic ID**    | 42                |
| **Név**        | Bérlési Bővítések |
| **Prioritás**  | P1 - Magas        |
| **Becsült SP** | 8                 |
| **Sprint**     | Sprint 10         |
| **Státusz**    | READY             |

## Üzleti Kontextus

### Forrás

- 02-04 Meeting jegyzőkönyv
- KGC-testdoc-02-03.pdf (7.1 Bérlési folyamat)

### Üzleti érték

- **Több gép egy szerződésen** - Építőipari cégek gyakran több gépet bérelnek egyszerre
- **Automatikus megújulás** - Csökkenti az adminisztrációt hosszú távú bérleteknél
- **Kártya lejárat kezelés** - Megszakításmentes kaució biztosítás

## User Stories

---

### Story 42-1: Több gép egy szerződésen

**Mint** eladó,
**Szeretném** több bérgépet egy szerződésre tenni,
**Hogy** a nagyobb bérlők egyszerre vihessék a gépeket.

#### Acceptance Criteria

```gherkin
Feature: Több gép szerződés

  Scenario: Szerződés létrehozása 3 géppel
    Given a bérlési wizard-ban vagyok
    When hozzáadok 3 bérgépet: "Fúró-001", "Csiszoló-002", "Vágó-003"
    And megadom a közös bérlési időszakot
    Then egy szerződés jön létre 3 tétellel
    And mindhárom gép státusza "KIADVA"
    And a kaució az összesített gépértékre számolódik

  Scenario: Részleges visszavétel
    Given egy szerződés 3 géppel
    When visszaveszem a "Fúró-001" gépet
    Then a szerződés nyitva marad
    And csak ez a gép státusza változik "BENT"-re
    And a többi gép továbbra is "KIADVA"

  Scenario: Teljes visszavétel
    Given egy szerződés 3 géppel, 1 már visszavéve
    When visszaveszem a maradék 2 gépet
    Then a szerződés lezárul
    And a kaució visszaadható
```

#### Technikai követelmények

- [ ] `RentalContract.items[]` - egy-sok kapcsolat bérgépekhez
- [ ] `RentalContractItem` model (contractId, equipmentId, returnedAt)
- [ ] Wizard UI bővítés multi-select gép kiválasztással
- [ ] Kaució számítás aggregált értékből

#### Tesztelési követelmények

- [ ] Unit tesztek: 15 db
- [ ] Integration: API + Prisma
- [ ] E2E: Wizard multi-gép flow

---

### Story 42-2: Automatikus megújulás értesítés

**Mint** eladó,
**Szeretném** automatikus értesítést kapni a lejáró hosszú távú bérlésekről,
**Hogy** időben tudjam egyeztetni az ügyféllel a meghosszabbítást.

#### Acceptance Criteria

```gherkin
Feature: Bérlés lejárat értesítés

  Scenario: 7 napos előzetes értesítés
    Given egy hosszú távú bérlés lejárata 7 nap múlva
    When a napi scheduler fut
    Then értesítés küldődik az eladónak
    And az értesítés tartalmazza a partner nevét és telefonszámát
    And megjelenik a dashboard értesítések között

  Scenario: 3 napos sürgős értesítés
    Given egy bérlés lejárata 3 nap múlva
    And még nem volt megújítás vagy visszavétel
    When a scheduler fut
    Then SÜRGŐS értesítés küldődik
    And piros badge jelenik meg a bérlés mellett

  Scenario: Lejárt bérlés figyelmeztetés
    Given egy bérlés tegnap lejárt
    And a gép még nincs visszavéve
    When a scheduler fut
    Then KÉSEDELMES értesítés küldődik
    And a késedelmi díj kalkuláció aktiválódik
```

#### Technikai követelmények

- [ ] `RentalExpirationScheduler` cron job (daily 08:00)
- [ ] `NotificationService.sendRentalExpiration(rentalId, level)`
- [ ] Értesítés szintek: INFO (7 nap), WARNING (3 nap), URGENT (lejárt)
- [ ] Dashboard notification widget integráció

#### Tesztelési követelmények

- [ ] Unit tesztek: 12 db
- [ ] Integration: Scheduler + Notification
- [ ] E2E: Értesítés megjelenítés

---

### Story 42-3: Kártya lejárat kezelés bérlés közben

**Mint** boltvezető,
**Szeretném** értesítést kapni ha egy aktív bérlés kártyája lejár,
**Hogy** időben be tudjam kérni az új kártyát.

#### Acceptance Criteria

```gherkin
Feature: Kártya lejárat kezelés

  Scenario: Kártya lejár 5 napon belül
    Given egy aktív bérlés MyPOS kaució rögzítéssel
    And a kártya lejárati dátuma 5 nap múlva
    When a napi ellenőrzés fut
    Then értesítés küldődik az eladónak
    And a bérlés mellé sárga figyelmeztetés ikon kerül

  Scenario: Új kártya rögzítése
    Given egy bérlés lejárt kártyával
    When az ügyfél új kártyát ad meg
    And sikeres MyPOS SALE tranzakció történik
    Then a régi kaució REFUND-olásra kerül
    And az új kártya lesz az aktív kaució forrás

  Scenario: Kártya lejárt, nincs új
    Given egy bérlés lejárt kártyával
    And 3 napja küldtünk értesítést
    When még mindig nincs új kártya
    Then a bérlés blokkolásra kerül
    And manuális beavatkozás szükséges
```

#### Technikai követelmények

- [ ] `CardExpirationChecker` service (napi job)
- [ ] MyPOS tranzakció: `cardExpiryDate` tracking
- [ ] `Deposit.replaceCard(newTransactionId)` method
- [ ] UI: Kártya csere modal a bérlés oldalon

#### Tesztelési követelmények

- [ ] Unit tesztek: 10 db
- [ ] Integration: MyPOS mock
- [ ] E2E: Kártya csere flow

---

## Függőségek

| Típus       | Leírás                     |
| ----------- | -------------------------- |
| **Epic 14** | Rental model alap          |
| **Epic 15** | RentalContract model       |
| **Epic 36** | MyPOS SALE/REFUND workflow |
| **Epic 35** | Notification panel         |

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Unit tesztek PASS
- [ ] Code review PASS (adversarial, min. 3 issue fix)
- [ ] Dokumentáció frissítve
- [ ] Sprint-status.yaml DONE státuszra állítva

## Kockázatok

| Kockázat              | Valószínűség | Hatás    | Mitigáció           |
| --------------------- | ------------ | -------- | ------------------- |
| Multi-gép komplexitás | Közepes      | Közepes  | Fokozatos bevezetés |
| MyPOS card expiry API | Alacsony     | Magas    | Mock fallback       |
| Scheduler timing      | Alacsony     | Alacsony | Timezone kezelés    |
