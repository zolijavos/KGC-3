# Story 16-5: Kaució könyvelés és riport

## Státusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 100% | Branches 100% | Functions 100%
**Tesztek:** 10 PASS (DepositReportService)

## Epic
Epic 16: Deposit Management (@kgc/rental-checkout)

## User Story

**Mint** könyvelő/boltvezető,
**szeretném** a kaució mozgásokról összesítő riportot kapni,
**hogy** követhessem a kaució egyenlegeket és a pénzügyi elszámolásokat.

## Acceptance Criteria

### AC1: Kaució összesítő
- [x] getSummary() - Aktív kauciók összesítése
- [x] totalCount, totalAmount kalkuláció
- [x] byStatus - Státusz szerinti bontás

### AC2: Kaució mozgás riport
- [x] getMovementReport(from, to) - Időszakra szűrés
- [x] collections - Kaució felvételek listája
- [x] releases - Kaució visszaadások listája
- [x] retentions - Visszatartások listája
- [x] summary - Összesített összegek és netChange

### AC3: Export
- [x] exportToJson() - JSON export formátum
- [x] Tenant-izolált adatok (tenantId paraméter)
- [x] getActiveDeposits() - Aktív kauciók lekérdezése

## Technical Notes

### Package
`@kgc/rental-checkout`

### Implementált komponensek
1. `DepositReportService` - Riport generálás
2. `IDepositSummary` - Összesítő interfész
3. `IDepositMovementReport` - Mozgás riport interfész
4. `IDepositReportRepository` - Repository interfész

### Metódusok
- `getSummary(tenantId)` - Kaució összesítő
- `getMovementReport(tenantId, from, to)` - Mozgás riport
- `getActiveDeposits(tenantId)` - Aktív kauciók
- `exportToJson(tenantId, from, to)` - JSON export

## Tasks

1. [x] Story file létrehozás
2. [x] DepositReportService létrehozás
3. [x] Aggregációs metódusok (getSummary, getMovementReport)
4. [x] Unit tesztek (10 teszt)
5. [x] Export frissítés (index.ts)

## Definition of Done

- [x] Minden AC teljesül
- [x] Unit tesztek PASS (10 teszt)
- [x] Sprint status: done

---

**Létrehozva:** 2026-01-17
**Package:** @kgc/rental-checkout
