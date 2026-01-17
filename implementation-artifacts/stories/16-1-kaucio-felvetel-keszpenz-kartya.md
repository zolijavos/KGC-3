# Story 16-1: Kaució felvétel (készpénz/kártya)

## Státusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 95.04% | Branches 88.23% | Functions 100%
**Tesztek:** 27 PASS

## Epic
Epic 16: Deposit Management (@kgc/rental-checkout)

## User Story

**Mint** bolti eladó,
**szeretném** a bérlés indításakor kauciót felvenni készpénzben vagy bankkártyával,
**hogy** biztosítékunk legyen a bérgép visszahozatalára és megfelelő állapotára.

## Acceptance Criteria

### AC1: Kaució összeg meghatározása
- [ ] A rendszer automatikusan javasolja a kaució összeget a bérgép értéke alapján
- [ ] Törzsvevőknél (regular customer) a kaució 0 Ft vagy csökkentett
- [ ] Új ügyfeleknek teljes kaució szükséges
- [ ] A javasolt összeg felülírható megfelelő jogosultsággal

### AC2: Készpénzes kaució felvétel
- [ ] Készpénzes fizetési mód kiválasztható
- [ ] Összeg rögzítése HUF-ban (egész szám)
- [ ] Bizonylat generálása a kaució átvételéről
- [ ] Státusz: pending → collected

### AC3: Bankkártyás kaució felvétel
- [ ] Kártyás fizetési mód kiválasztható (terminál)
- [ ] Tranzakció azonosító rögzítése
- [ ] Státusz: pending → collected
- [ ] Sikertelen tranzakció kezelése

### AC4: Validációk
- [ ] Kaució összeg: 0 - 1.000.000 Ft között
- [ ] Fizetési mód: cash | card kötelező
- [ ] Bérlés ID: érvényes és aktív bérlés
- [ ] Partner ID: érvényes partner

### AC5: Audit trail
- [ ] Minden kaució művelet naplózásra kerül
- [ ] Rögzített adatok: user, timestamp, művelet, összeg
- [ ] Tenant-izolált audit log

## Technical Notes

### Package
`@kgc/rental-checkout`

### Dependencies
- `@kgc/rental-core` - Bérlés kapcsolat
- `@kgc/audit` - Audit log
- `@kgc/common` - Shared utilities

### Tesztelési Stratégia
- **TDD**: KÖTELEZŐ (8 pont - pénzügyi + biztonsági)
- **ATDD**: KÖTELEZŐ (kritikus checkout flow)
- **Property-based**: Ajánlott (deposit calculation)

### Fő komponensek
1. `DepositService.collect()` - Kaució felvétel
2. `DepositService.calculateSuggestedAmount()` - Összeg kalkuláció
3. `deposit.dto.ts` - Validációs sémák (Zod)
4. `deposit.interface.ts` - Típusok

## Tasks

1. [x] Package struktúra létrehozása
2. [x] Interface és DTO definíciók
3. [ ] **TDD RED**: Failing tesztek írása
4. [ ] **TDD GREEN**: DepositService implementálás
5. [ ] **TDD REFACTOR**: Kód tisztítás
6. [ ] Integration tesztek
7. [ ] Code review
8. [ ] Story lezárás

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Unit tesztek: 85%+ coverage
- [ ] Integration tesztek PASS
- [ ] Code review APPROVED
- [ ] Dokumentáció frissítve
- [ ] Sprint status: done

---

**Létrehozva:** 2026-01-17
**Package:** @kgc/rental-checkout
