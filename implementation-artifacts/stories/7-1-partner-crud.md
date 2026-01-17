# Story 7-1: Partner CRUD (Magánszemély és Cég)

## Status: done

**Completed:** 2026-01-16
**Tests:** 26 passed (PartnerService)
**Coverage:** 89.68% (partner.service.ts)

## User Story

**Mint** operátor
**Szeretnék** partnereket (ügyfeleket) rögzíteni
**Hogy** bérléshez/szervizhez azonosíthatók legyenek

## Acceptance Criteria

- [x] AC1: Partner CRUD műveletek (create, read, update, delete)
- [x] AC2: Két partner típus: INDIVIDUAL (magánszemély), COMPANY (cég)
- [x] AC3: Magánszemély: név, telefon, email, cím
- [x] AC4: Cég: cég név, adószám, cégjegyzékszám + kontakt személy
- [x] AC5: Duplikáció figyelmeztetés (telefon/email alapján)
- [x] AC6: Soft delete támogatás (GDPR)
- [x] AC7: Tenant-aware partner kezelés

## Tasks

1. [x] Partner interface-ek definiálása (partner.interface.ts)
2. [x] PartnerService implementálása (CRUD)
3. [x] Zod schema validáció (partner.dto.ts)
4. [x] Duplikáció detektálás
5. [x] Unit tesztek (TDD - 26 tests)
6. [x] Repository interface és injection token (PARTNER_REPOSITORY)

## Technical Notes

- **Package**: @kgc/partner
- **FR Coverage**: FR25, FR31, FR32
- **TDD kötelező**: RED-GREEN-REFACTOR ciklus
- **Multi-tenancy**: Automatikus tenant isolation

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage) ✅ 89.68%
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
