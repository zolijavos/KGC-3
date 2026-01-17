# Story 17-1: Munkalap CRUD

## Státusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 97.23% | Branches 88.57% | Functions 100%
**Tesztek:** 25 PASS (WorksheetService)

## Epic
Epic 17: Work Orders (@kgc/service-worksheet)

## User Story

**Mint** szervizes/eladó,
**szeretnék** munkalapot létrehozni, megtekinteni, módosítani és törölni,
**hogy** nyomon követhessem a beérkezett gépek javítási folyamatát.

## Acceptance Criteria

### AC1: Munkalap létrehozás
- [x] create() - FELVEVE státusszal indul
- [x] Munkalap szám generálás ML-YYYY-NNNN formátumban
- [x] Partner validáció (létezik-e)
- [x] Tenant izoláció ellenőrzés
- [x] Zod input validáció (device name min 2 char, stb.)

### AC2: Prioritás kezelés (FR93)
- [x] Szerződött partner automatikusan FRANCHISE prioritást kap
- [x] User felülírhatja magasabb prioritással (SURGOS)
- [x] Priority ranking: SURGOS > FELARAS > GARANCIALIS > FRANCHISE > NORMAL

### AC3: Munkalap lekérdezés
- [x] findById() tenant izolációval
- [x] findAll() szűrőkkel (status, type, dateFrom, dateTo, search)
- [x] Paginált eredmény (items, total, limit, offset)

### AC4: Munkalap frissítés
- [x] update() - diagnózis, leírás, stb. módosítás
- [x] Lezárt munkalap nem módosítható
- [x] Tenant izoláció

### AC5: Munkalap törlés
- [x] Soft delete (TOROLVE státusz)
- [x] Csak FELVEVE státuszból törölhető
- [x] Audit log

## Technical Notes

### Package
`@kgc/service-worksheet`

### Implementált komponensek
1. `WorksheetService` - CRUD műveletek
2. `IWorksheet` - Munkalap interfész
3. `CreateWorksheetSchema` / `UpdateWorksheetSchema` - Zod validáció
4. `WorksheetStatus` / `WorksheetPriority` - Enumerációk

### Metódusok
- `create(input, tenantId, userId)` - Munkalap létrehozás
- `findById(id, tenantId)` - Egy munkalap
- `findAll(tenantId, filter)` - Lista szűrőkkel
- `update(id, input, tenantId, userId)` - Frissítés
- `delete(id, tenantId, userId)` - Soft delete
- `generateWorksheetNumber(tenantId)` - ML-YYYY-NNNN

## Tasks

1. [x] Package setup (package.json, tsconfig, vitest)
2. [x] Interface és DTO létrehozás
3. [x] TDD RED - 25 failing teszt
4. [x] TDD GREEN - WorksheetService implementáció
5. [x] Coverage ellenőrzés (85%+ lines, 80%+ branches)

## Definition of Done

- [x] Minden AC teljesül
- [x] Unit tesztek PASS (25 teszt)
- [x] Coverage thresholds met
- [x] Sprint status: done

---

**Létrehozva:** 2026-01-17
**Package:** @kgc/service-worksheet
