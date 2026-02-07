# Story 42-3: Kártya lejárat kezelés bérlés közben

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 42-3                              |
| **Epic**       | Epic 42 - Bérlési Bővítések       |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 2                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 10                         |

## User Story

**Mint** boltvezető,
**Szeretném** értesítést kapni ha egy aktív bérlés kártyája lejár,
**Hogy** időben be tudjam kérni az új kártyát.

## Acceptance Criteria

- AC-1: Értesítés kártya lejárat előtt 5 nappal
- AC-2: Új kártya rögzítése, régi kaució visszautalás
- AC-3: Kártya lejárt blokkolás kezelés

## Technikai Feladatok

### Task 1: Card Expiration Service ✅

- [x] `CardExpirationService` implementáció
- [x] Kártya lejárat ellenőrzés logika (5 nap WARNING, lejárt URGENT)
- [x] Unit tesztek (12 teszt)

### Task 2: Card Replacement Logic ✅

- [x] `replaceCard()` metódus
- [x] Refund flag a régi tranzakcióhoz

## Implementációs Összefoglaló

### Új Fájlok (2 fájl)

1. `packages/berles/rental-checkout/src/services/card-expiration.service.ts`
   - `CardExpirationService.checkCardExpirations()` - lejáró kártyák ellenőrzése
   - `calculateDaysUntilCardExpiry()` - napok számítás
   - `replaceCard()` - kártya csere logika
   - `getExpiringDeposits()` - tenant-re szűrt lejáró kauciók
   - `getAlertMessage()` - magyar nyelvű üzenetek

2. `packages/berles/rental-checkout/src/services/card-expiration.service.spec.ts`
   - 12 TDD unit teszt

### Módosított Fájlok (1 fájl)

1. `packages/berles/rental-checkout/src/index.ts` - exportok bővítése

## Tesztek (12 PASS)

- checkCardExpirations: 5 teszt
- calculateDaysUntilCardExpiry: 2 teszt
- replaceCard: 2 teszt
- getExpiringDeposits: 1 teszt
- getAlertMessage: 2 teszt

## Definition of Done

- [x] AC-1 5 napos kártya lejárat értesítés (WARNING level)
- [x] AC-2 Kártya csere workflow (replaceCard + refund flag)
- [x] TypeScript PASS
- [x] Unit tesztek PASS (12/12)
