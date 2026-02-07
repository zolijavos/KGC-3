# Epic 44: Fizetési Emlékeztetők & Felfüggesztés

## Epic Összefoglaló

| Mező           | Érték                                 |
| -------------- | ------------------------------------- |
| **Epic ID**    | 44                                    |
| **Név**        | Fizetési Emlékeztetők & Felfüggesztés |
| **Prioritás**  | P1 - Magas                            |
| **Becsült SP** | 5                                     |
| **Sprint**     | Sprint 11                             |
| **Státusz**    | DONE (YOLO Pipeline - 2026-02-07)     |

## Üzleti Kontextus

### Forrás

- 02-04 Meeting jegyzőkönyv
- ADR-052 Kintlévőség rendszerezés

### Üzleti érték

- **Csökkentett kintlévőség** - Proaktív fizetési emlékeztetők
- **Automatizált eszkaláció** - Nincs elfelejtett lejárt számla
- **Partner fegyelem** - Következetes kezelés késedelmes fizetésnél

## User Stories

---

### Story 44-1: Fizetési emlékeztetők

**Mint** boltvezető,
**Szeretném** automatikus fizetési emlékeztetőket küldeni a lejárt számlákra,
**Hogy** csökkentsem a kintlévőségeket.

#### Acceptance Criteria

```gherkin
Feature: Fizetési emlékeztetők

  Scenario: Első emlékeztető (7 nap késés)
    Given egy számla 7 napja lejárt
    And még nem volt emlékeztető küldve
    When a napi scheduler fut
    Then email emlékeztető küldődik a partnernek
    And az emlékeztető tartalma udvarias hangnemű
    And a PaymentReminder rekord létrejön státusz: FIRST

  Scenario: Második emlékeztető (14 nap késés)
    Given egy számla 14 napja lejárt
    And első emlékeztető már kiküldve
    When a scheduler fut
    Then második emlékeztető küldődik
    And a hangnem határozottabb
    And státusz: SECOND

  Scenario: Harmadik emlékeztető (30 nap késés)
    Given egy számla 30 napja lejárt
    And két emlékeztető már kiküldve
    When a scheduler fut
    Then harmadik (végleges) emlékeztető küldődik
    And a szöveg tartalmazza a felfüggesztés figyelmeztetést
    And státusz: FINAL

  Scenario: Manuális emlékeztető törlés
    Given egy számla emlékeztető ütemezéssel
    When a partner fizet
    And a számla státusza PAID lesz
    Then az összes ütemezett emlékeztető törlődik
```

#### Technikai követelmények

- [ ] `PaymentReminder` Prisma model
  - `invoiceId`, `level` (FIRST/SECOND/FINAL), `sentAt`, `status`
- [ ] `PaymentReminderScheduler` cron job (daily 09:00)
- [ ] Email templates: 3 szint különböző hangnemmel
- [ ] `PaymentReminderService.sendReminder(invoiceId, level)`

#### Tesztelési követelmények

- [ ] Unit tesztek: 18 db
- [ ] Integration: Scheduler + Email mock
- [ ] E2E: Emlékeztető lista UI

---

### Story 44-2: Partner felfüggesztés

**Mint** boltvezető,
**Szeretném** automatikusan felfüggeszteni a tartósan nem fizető partnereket,
**Hogy** ne tudjanak újabb bérlést indítani amíg nem rendezik a tartozást.

#### Acceptance Criteria

```gherkin
Feature: Partner felfüggesztés

  Scenario: Automatikus felfüggesztés 45 nap után
    Given egy partner 45 napja lejárt ki nem fizetett számlával
    And 3 emlékeztető már kiküldve
    When a napi scheduler fut
    Then a partner státusza "SUSPENDED" lesz
    And a partner nem tud új bérlést indítani
    And értesítés küldődik a boltvezetőnek

  Scenario: Felfüggesztett partner bérlés próbálkozás
    Given egy felfüggesztett partner
    When bérlést próbálok indítani vele
    Then hibaüzenet jelenik meg: "Partner felfüggesztve - tartozás rendezése szükséges"
    And a bérlés nem indul el
    And a tartozás összege megjelenik

  Scenario: Manuális felfüggesztés feloldása
    Given egy felfüggesztett partner
    And a partner rendezte a tartozását
    When a boltvezető feloldja a felfüggesztést
    Then a partner státusza "ACTIVE" lesz
    And új bérlés indítható
    And audit log bejegyzés készül

  Scenario: VIP partner kivétel
    Given egy VIP kategóriás partner 60 napos késéssel
    When a scheduler fut
    Then a partner NEM kerül felfüggesztésre
    And helyette értesítés küldődik a boltvezetőnek
    And a döntés manuális marad
```

#### Technikai követelmények

- [ ] `Partner.suspendedAt` mező (nullable timestamp)
- [ ] `Partner.suspensionReason` (nullable string)
- [ ] `PartnerSuspensionService.suspend(partnerId, reason)`
- [ ] `PartnerSuspensionService.unsuspend(partnerId)`
- [ ] Bérlés workflow guard: felfüggesztett partner ellenőrzés
- [ ] VIP kategória kivétel kezelés

#### Tesztelési követelmények

- [ ] Unit tesztek: 15 db
- [ ] Integration: Scheduler + Partner repo
- [ ] E2E: Felfüggesztés és feloldás UI

---

## Függőségek

| Típus       | Leírás                         |
| ----------- | ------------------------------ |
| **Epic 10** | Invoice model (lejárt számlák) |
| **Epic 7**  | Partner model                  |
| **Epic 14** | Rental workflow (guard)        |
| **Epic 41** | Aging report (késés napok)     |

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Unit tesztek PASS
- [ ] Code review PASS (adversarial, min. 3 issue fix)
- [ ] Email templates jóváhagyva
- [ ] Sprint-status.yaml DONE státuszra állítva

## Kockázatok

| Kockázat                 | Valószínűség | Hatás   | Mitigáció                       |
| ------------------------ | ------------ | ------- | ------------------------------- |
| Téves felfüggesztés      | Alacsony     | Magas   | VIP kivétel + manual override   |
| Email delivery           | Közepes      | Közepes | Retry + log                     |
| Jogszabályi megfelelőség | Alacsony     | Magas   | Jogi review az email szövegekre |
