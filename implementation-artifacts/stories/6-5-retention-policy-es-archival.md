# Story 6-5: Retention Policy és Archival

## Status: done

**Completed:** 2026-01-16
**Tests:** 16 passed (RetentionPolicyService)
**Coverage:** Part of @kgc/audit package

## User Story

**Mint** rendszergazda
**Szeretnék** automatikus adatmegőrzési és archiválási szabályokat
**Hogy** a régi audit naplók ne terheljenek a rendszert de megmaradjanak audit célokra

## Acceptance Criteria

- [x] AC1: RetentionPolicyService létrehozása megőrzési szabályok kezelésére
- [x] AC2: Konfigurálható megőrzési idő (default: 2 év aktív, 5 év archív)
- [x] AC3: Automatikus archiválás cold storage-ba (archiveOldEntries)
- [x] AC4: Archive metadata kezelés (archív batch-ek nyilvántartása)
- [x] AC5: Archív adatok visszatöltése audit célra (restoreArchive)

## Tasks

1. [x] RetentionPolicy interface-ek definiálása (retention.interface.ts)
2. [x] RetentionPolicyService implementálása
3. [x] Archive batch kezelés (listArchiveBatches)
4. [x] Archive restore funkció (restoreArchive)
5. [x] Cleanup expired (cleanupExpired)
6. [x] Statistics (getStatistics)
7. [x] Unit tesztek (TDD - 16 tests)

## Technical Notes

- **Package**: @kgc/audit
- **FR Coverage**: FR72
- **Active retention**: 730 nap (2 év hot storage)
- **Archive retention**: 1825 nap (5 év cold storage)
- **Archive format**: JSON batch files (compressable)

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage)
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
