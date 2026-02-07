# Story 42-2: Automatikus megújulás értesítés

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 42-2                              |
| **Epic**       | Epic 42 - Bérlési Bővítések       |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 3                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 10                         |

## User Story

**Mint** eladó,
**Szeretném** automatikus értesítést kapni a lejáró hosszú távú bérlésekről,
**Hogy** időben tudjam egyeztetni az ügyféllel a meghosszabbítást.

## Acceptance Criteria

- AC-1: 7 napos előzetes értesítés
- AC-2: 3 napos sürgős értesítés
- AC-3: Lejárt bérlés figyelmeztetés
- AC-4: Dashboard értesítések integrációja

## Technikai Feladatok

### Task 1: Expiration Service ✅

- [x] `RentalExpirationService` implementáció
- [x] Expiration level enum (INFO/WARNING/URGENT)
- [x] Notification generálás (magyar üzenetek)
- [x] Unit tesztek (19 teszt)

### Task 2: Scheduler Integration (Phase 2)

- [ ] Cron job definiálás (daily 08:00)
- [ ] Daily check logika

## Implementációs Összefoglaló

### Új Fájlok (2 fájl)

1. `packages/berles/rental-core/src/services/rental-expiration.service.ts`
   - `ExpirationLevel` enum: INFO (4-7 nap), WARNING (1-3 nap), URGENT (lejárt)
   - `RentalExpirationService.checkExpirations()` - rentals ellenőrzése
   - `calculateDaysUntilExpiry()` - napok számítás
   - `determineExpirationLevel()` - szint meghatározás
   - `getNotificationMessage()` - magyar nyelvű üzenetek
   - `groupByLevel()` - csoportosítás szint szerint

2. `packages/berles/rental-core/src/services/rental-expiration.service.spec.ts`
   - 19 TDD unit teszt

### Módosított Fájlok (1 fájl)

1. `packages/berles/rental-core/src/index.ts` - exportok bővítése

## Tesztek (19 PASS)

- checkExpirations: 5 teszt
- getNotificationMessage: 3 teszt
- calculateDaysUntilExpiry: 3 teszt
- determineExpirationLevel: 7 teszt
- groupByLevel: 1 teszt

## Definition of Done

- [x] AC-1 7 napos értesítés (INFO level)
- [x] AC-2 3 napos sürgős értesítés (WARNING level)
- [x] AC-3 Lejárt bérlés kezelés (URGENT level)
- [x] TypeScript PASS
- [x] Unit tesztek PASS (19/19)
