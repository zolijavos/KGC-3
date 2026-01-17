# Story 7-4: Partner Hitelkeret Kezelés

## Status: in_progress

**Started:** 2026-01-16

## User Story

**Mint** boltvezető
**Szeretnék** hitelkeretet beállítani partnernek
**Hogy** megbízható ügyfelek késleltetve fizethessenek

## Acceptance Criteria

- [ ] AC1: Hitelkeret beállítása partnerhez (BOLTVEZETO+ jogosultság)
- [ ] AC2: Aktuális egyenleg nyilvántartás
- [ ] AC3: Bérléskor hitelkeret ellenőrzés
- [ ] AC4: Figyelmeztetés limit közelítéskor (80%+)
- [ ] AC5: Hitelkeret tranzakciók logolása
- [ ] AC6: Hitelkeret módosítás audit

## Tasks

1. [ ] CreditLimit interface definiálása
2. [ ] CreditLimitService implementálása
3. [ ] Ellenőrzés és figyelmeztetések
4. [ ] Tranzakció logika
5. [ ] Unit tesztek (TDD - min. 15 tests)

## Technical Notes

- **Package**: @kgc/partner
- **FR Coverage**: FR28
- **TDD kötelező**: RED-GREEN-REFACTOR ciklus

## Definition of Done

- [ ] Unit tesztek PASS (70%+ coverage)
- [ ] TypeScript strict compliance
- [ ] Sprint status frissítve
