# Story 7-3: Törzsvendég Kártya Rendszer

## Status: done

**Completed:** 2026-01-16
**Tests:** 20 passed (LoyaltyCardService)
**Coverage:** 90.9% (loyalty-card.service.ts)

## User Story

**Mint** visszatérő ügyfél
**Szeretnék** törzsvendég kártyát kapni
**Hogy** gyorsabban azonosíthassanak és élvezhessem az előnyöket

## Acceptance Criteria

- [x] AC1: Törzsvendég kártya CRUD (kiállítás, deaktiválás, csere)
- [x] AC2: Egyedi kártyakód generálás (vonalkód/QR)
- [x] AC3: Kártya scan → Partner betöltés (scanCard)
- [x] AC4: Loyalty pontok nyilvántartása (adjustPoints)
- [x] AC5: Személyes üdvözlés lehetősége (generateGreeting)
- [x] AC6: Kártya előzmények (getPointHistory, logUsage)

## Tasks

1. [x] LoyaltyCard interface definiálása
2. [x] LoyaltyCardService implementálása
3. [x] Kártyakód generálás (vonalkód + QR)
4. [x] Pontrendszer logika
5. [x] Unit tesztek (TDD - 20 tests)

## Technical Notes

- **Package**: @kgc/partner
- **FR Coverage**: FR27, FR33
- **TDD kötelező**: RED-GREEN-REFACTOR ciklus

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage) ✅ 90.9%
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
