# Story 16-3: Kaució visszaadás

## Státusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 93.93% | Branches 86% | Functions 100%
**Tesztek:** 13 új teszt (összesen 40 DepositService tesztek)

## Epic
Epic 16: Deposit Management (@kgc/rental-checkout)

## User Story

**Mint** bolti eladó,
**szeretném** a bérlés sikeres lezárásakor a kauciót visszaadni az ügyfélnek,
**hogy** az ügyfél visszakapja a letétbe helyezett pénzét és a tranzakció lezáruljon.

## Acceptance Criteria

### AC1: Készpénz visszaadás
- [x] Kaució visszaadás készpénzben (ha készpénzzel fizette)
- [x] Összeg ellenőrzés (visszaadandó = felvett)
- [x] Státusz: COLLECTED → RELEASED

### AC2: Kártyás zárolás feloldás (MyPOS)
- [x] MyPOS HELD státuszú kaució feloldható
- [x] Státusz: HELD → RELEASED
- [x] MyPOS tranzakció ID audit logban

### AC3: Részleges visszaadás
- [x] releasePartial() metódus részleges visszatartáshoz
- [x] Visszatartott összeg validálás (nem lehet nagyobb mint kaució)
- [x] Indoklás kötelező (description)
- [x] Státusz: COLLECTED → PARTIALLY_RETAINED

### AC4: Validációk
- [x] Csak COLLECTED vagy HELD státuszú kaució adható vissza
- [x] PENDING státusz nem engedélyezett
- [x] RELEASED státusz nem engedélyezett (dupla visszaadás védelem)
- [x] Tenant-izolált műveletek

### AC5: Audit trail
- [x] `deposit_released` audit log
- [x] `deposit_partially_retained` audit log
- [x] Rögzített adatok: releasedAmount, previousStatus, paymentMethod, myposTransactionId

## Technical Notes

### Package
`@kgc/rental-checkout`

### Implementált metódusok
1. `DepositService.release(depositId, tenantId, userId)` - Teljes visszaadás
2. `DepositService.releasePartial(depositId, retainedAmount, description, tenantId, userId)` - Részleges

### Tesztek
- 13 új teszt a release funkcionalitáshoz
- Összesen 40 DepositService teszt

## Tasks

1. [x] Story file létrehozás
2. [x] **TDD RED**: Failing tesztek írása (13 teszt)
3. [x] **TDD GREEN**: release() implementálás
4. [x] **TDD GREEN**: releasePartial() implementálás
5. [x] Coverage ellenőrzés (>85%)
6. [x] Code review: Auto-pilot self-review PASS

## Definition of Done

- [x] Minden AC teljesül
- [x] Unit tesztek: 93%+ coverage
- [x] Code review APPROVED
- [x] Sprint status: done

---

**Létrehozva:** 2026-01-17
**Package:** @kgc/rental-checkout
