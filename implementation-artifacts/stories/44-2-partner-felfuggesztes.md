# Story 44-2: Partner felfüggesztés

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 44-2                              |
| **Epic**       | Epic 44 - Fizetési Emlékeztetők   |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 2                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 11                         |

## User Story

**Mint** boltvezető,
**Szeretném** automatikusan felfüggeszteni a tartósan nem fizető partnereket,
**Hogy** ne tudjanak újabb bérlést indítani amíg nem rendezik a tartozást.

## Acceptance Criteria

- AC-1: Automatikus felfüggesztés 45 nap után (3 emlékeztető után)
- AC-2: Felfüggesztett partner bérlés blokkolás hibaüzenettel
- AC-3: Manuális felfüggesztés feloldás audit logolással
- AC-4: VIP partner kivétel (csak értesítés, nincs auto-suspend)

## Technikai Feladatok

### Task 1: PartnerSuspensionService ✅

- [x] `suspend()` - partner felfüggesztése okkal
- [x] `unsuspend()` - felfüggesztés feloldása audit logolással
- [x] `checkCanStartRental()` - bérlés indítás guard
- [x] `checkSuspensionEligibility()` - jogosultság ellenőrzés
- [x] `notifyManager()` - VIP partner értesítés
- [x] VIP kivétel kezelés
- [x] Unit tesztek (15 teszt)

## Implementációs Összefoglaló

### Új Fájlok (2 fájl)

1. `packages/shared/partner/src/services/partner-suspension.service.ts`
   - Partner status: ACTIVE, SUSPENDED, INACTIVE
   - 45 nap threshold auto-suspend
   - VIP manual review
   - Audit log integration
   - Rental guard check

2. `packages/shared/partner/src/services/partner-suspension.service.spec.ts`
   - 15 TDD unit teszt

### Interfaces

```typescript
type PartnerStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
type PartnerCategory = 'RETAIL' | 'B2B' | 'VIP';

interface SuspensionResult {
  success: boolean;
  suspendedAt?: Date;
  requiresManualReview?: boolean;
  error?: string;
}

interface SuspensionCheckResult {
  canStart: boolean;
  reason?: string;
  outstandingAmount?: number;
}
```

## Tesztek (15 PASS)

- suspend: 4 teszt
- unsuspend: 4 teszt
- checkCanStartRental: 3 teszt
- checkSuspensionEligibility: 3 teszt
- notifyManager: 1 teszt

## Definition of Done

- [x] AC-1 Automatikus felfüggesztés 45 nap
- [x] AC-2 Bérlés blokkolás hibaüzenettel
- [x] AC-3 Manuális feloldás audit logolással
- [x] AC-4 VIP kivétel kezelés
- [x] TypeScript PASS
- [x] Unit tesztek PASS (15/15)
