# Story 16-4: Kaució visszatartás sérülés

## Státusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 93.75% | Branches 84.84% | Functions 100%
**Tesztek:** 19 új teszt (összesen 59 DepositService tesztek)

## Epic
Epic 16: Deposit Management (@kgc/rental-checkout)

## User Story

**Mint** bolti eladó,
**szeretném** a bérgép sérülése vagy elvesztése esetén a kauciót visszatartani,
**hogy** a bolt kártalanítva legyen a berendezés sérüléseiért vagy elvesztéséért.

## Acceptance Criteria

### AC1: Teljes visszatartás
- [x] retain() metódus teljes visszatartáshoz
- [x] Visszatartás ok (DepositRetentionReason) kötelező
- [x] Leírás/description kötelező
- [x] Státusz: COLLECTED → RETAINED

### AC2: Részleges visszatartás
- [x] retainPartial() metódus részleges visszatartáshoz
- [x] Visszatartott összeg validálás
- [x] Visszatartott összeg nem lehet negatív
- [x] Státusz: COLLECTED → PARTIALLY_RETAINED

### AC3: Kártyás kaució (HELD státusz)
- [x] HELD státuszból is működik (MyPOS pre-auth)
- [x] MyPOS tranzakció ID audit logban

### AC4: Visszatartási okok
- [x] EQUIPMENT_DAMAGE - Bérgép sérülés
- [x] EQUIPMENT_LOST - Bérgép elvesztése
- [x] LATE_FEE - Késedelmi díj
- [x] CLEANING_FEE - Tisztítási díj
- [x] OTHER - Egyéb

### AC5: Audit és dokumentáció
- [x] `deposit_retained` audit log (teljes)
- [x] `deposit_partially_retained` audit log (részleges)
- [x] Rögzített: reason, description, amounts, previousStatus

## Technical Notes

### Package
`@kgc/rental-checkout`

### Implementált metódusok
1. `DepositService.retain(depositId, reason, description, tenantId, userId)` - Teljes
2. `DepositService.retainPartial(depositId, retainedAmount, reason, description, tenantId, userId)` - Részleges

### Tesztek
- 19 új teszt a retain funkcionalitáshoz
- Összesen 59 DepositService teszt

## Tasks

1. [x] Story file létrehozás
2. [x] **TDD RED**: Failing tesztek írása (19 teszt)
3. [x] **TDD GREEN**: retain() implementálás
4. [x] **TDD GREEN**: retainPartial() implementálás
5. [x] Coverage ellenőrzés (>85%)
6. [x] Code review: Auto-pilot self-review PASS

## Definition of Done

- [x] Minden AC teljesül
- [x] Unit tesztek: 93%+ coverage
- [x] Sprint status: done

---

**Létrehozva:** 2026-01-17
**Package:** @kgc/rental-checkout
