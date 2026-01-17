# Story 4-3: License Management

## Status: done

**Completed:** 2026-01-16
**Tests:** 27 passed (LicenseService)
**Coverage:** Part of @kgc/config package

## User Story

**Mint** rendszergazda
**Szeretnék** licensz kezelést
**Hogy** a tenant-ek csak a megvásárolt funkciókhoz férjenek hozzá

## Acceptance Criteria

- [x] AC1: LicenseService a licensz adatok kezelésére
- [x] AC2: Licensz típusok: TRIAL, BASIC, PRO, ENTERPRISE
- [x] AC3: Licensz validálás (lejárat, user limit, modul hozzáférés)
- [x] AC4: Licensz lejárat ellenőrzés grace period-dal (7 nap default)
- [x] AC5: Modul/feature engedélyezés licensz alapján (isModuleEnabled)

## Tasks

1. [x] License interface és típusok (license.interface.ts)
2. [x] LicenseService implementálása
3. [x] Licensz validáció logika (validateLicense, checkUserLimit, checkLocationLimit)
4. [x] Unit tesztek (TDD - 27 tests)

## Technical Notes

- **Package**: @kgc/config
- **TDD kötelező**: Licensz validáció, lejárat ellenőrzés
- **Grace period**: 7 nap a lejárat után
- **License types**: TRIAL (3 user), BASIC (10 user), PRO (50 user), ENTERPRISE (unlimited)

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage)
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
