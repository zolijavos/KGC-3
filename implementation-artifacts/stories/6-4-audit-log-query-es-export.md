# Story 6-4: Audit Log Query és Export

## Status: done

**Completed:** 2026-01-16
**Tests:** 14 passed (AuditExportService)
**Coverage:** Part of @kgc/audit package

## User Story

**Mint** rendszergazda
**Szeretnék** audit naplókat lekérdezni és exportálni
**Hogy** NAV audithoz, franchise jelentésekhez és vita rendezéshez használhassam

## Acceptance Criteria

- [x] AC1: AuditExportService fejlett lekérdezési és export funkcionalitással
- [x] AC2: Teljes szövegű keresés audit bejegyzésekben (search metódus)
- [x] AC3: Export formátumok: JSON, CSV (exportToJson, exportToCsv)
- [x] AC4: Aggregációs lekérdezések (getAggregations - action/entityType/userId/date)
- [x] AC5: Daily summary és entity history lekérdezések

## Tasks

1. [x] AuditExportService implementáció
2. [x] Full-text search (search metódus)
3. [x] Export szolgáltatás (JSON, CSV)
4. [x] Aggregációs metódusok (getAggregations)
5. [x] Daily summary (getDailySummary)
6. [x] Entity history (getEntityHistory)
7. [x] Unit tesztek (TDD - 14 tests)

## Technical Notes

- **Package**: @kgc/audit
- **FR Coverage**: FR71
- **Export**: JSON (full data + metadata), CSV (táblázatos, escaped)
- **Aggregation**: Csoportosítás action/entityType/userId/date szerint
- **Search**: Case-insensitive, több mezőben keres

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage)
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
