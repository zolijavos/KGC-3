# Story 42-1: Több gép szerződés csomagok

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 42-1                              |
| **Epic**       | Epic 42 - Bérlési Bővítések       |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 3                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 10                         |

## User Story

**Mint** eladó,
**Szeretném** több bérgépet egy szerződésre tenni,
**Hogy** a nagyobb bérlők egyszerre vihessék a gépeket.

## Acceptance Criteria

- AC-1: Egy szerződés több gépet tartalmazhat
- AC-2: Kaució az összesített gépértékre számolódik
- AC-3: Részleges visszavétel lehetséges (gépenkénti)
- AC-4: Szerződés csak az utolsó gép visszavételekor zárul le

## Technikai Feladatok

### Task 1: Domain Model Bővítés ✅

- [x] `RentalContractItem` interface
- [x] `MultiEquipmentContractService` implementáció
- [x] Unit tesztek (19 teszt)

### Task 2: API Endpoint (Phase 2)

- [ ] `POST /rental-contracts/multi` - több gépes szerződés
- [ ] `PATCH /rental-contracts/:id/items/:itemId/return` - részleges visszavétel
- [ ] Controller tesztek

### Task 3: Kaució Aggregáció ✅

- [x] Összesített gépérték számítás
- [x] Kaució szolgáltatás bővítés (calculateDeposit)

## Implementációs Összefoglaló

### Új Fájlok (3 fájl)

1. `packages/berles/rental-contract/src/interfaces/multi-equipment-contract.interface.ts`
   - `RentalContractItem` interface
   - `MultiEquipmentContract` extends Contract
   - `ContractItemStatus` enum (RENTED/RETURNED/OVERDUE)
   - DTOs: Create, Return, DepositCalculation

2. `packages/berles/rental-contract/src/services/multi-equipment-contract.service.ts`
   - `createMultiEquipmentContract()` - több gépes szerződés
   - `returnItem()` - részleges visszavétel
   - `calculateDeposit()` - aggregált kaució
   - `getRemainingItems()` - még bérelt gépek

3. `packages/berles/rental-contract/src/services/multi-equipment-contract.service.spec.ts`
   - 19 TDD unit teszt

### Módosított Fájlok (1 fájl)

1. `packages/berles/rental-contract/src/index.ts` - exportok bővítése

## Tesztek (19 PASS)

- createMultiEquipmentContract: 5 teszt
- returnItem: 7 teszt
- calculateDeposit: 3 teszt
- getContractById: 3 teszt
- getRemainingItems: 1 teszt

## Definition of Done

- [x] AC-1 több gép egy szerződésen
- [x] AC-2 aggregált kaució számítás
- [x] AC-3 részleges visszavétel működik
- [x] AC-4 szerződés lezárás logika
- [x] TypeScript PASS
- [x] Unit tesztek PASS (19/19)
