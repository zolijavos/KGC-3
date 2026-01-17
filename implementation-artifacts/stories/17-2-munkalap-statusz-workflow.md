# Story 17-2: Munkalap statusz workflow

## Statusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 100% | Branches 89.47% | Functions 100%
**Tesztek:** 43 PASS (WorksheetStateService)

## Epic
Epic 17: Work Orders (@kgc/service-worksheet)

## User Story

**Mint** szervizes,
**szeretnem** a munkalap statuszat valtoztatni a munkafolyamat soran,
**hogy** nyomon kovethetok legyenek a javitasi fazisok.

## Acceptance Criteria

### AC1: Valid atmenetek
- [x] FELVEVE -> FOLYAMATBAN, VARHATO, TOROLVE
- [x] FOLYAMATBAN -> KESZ, VARHATO
- [x] VARHATO -> FOLYAMATBAN
- [x] KESZ -> SZAMLAZANDO
- [x] SZAMLAZANDO -> LEZART

### AC2: Invalid atmenetek elutasitasa
- [x] 19 invalid atmenet tesztelve
- [x] "Ervenytelen statuszatmenet" hiba uzenet

### AC3: Terminal allapotok
- [x] LEZART - nincs tovabb atmenet
- [x] TOROLVE - nincs tovabb atmenet

### AC4: Convenience metodusok
- [x] startWork() - FELVEVE/VARHATO -> FOLYAMATBAN
- [x] markWaiting(reason) - -> VARHATO + indoklas
- [x] completeWork() - FOLYAMATBAN -> KESZ + completedAt
- [x] markForInvoicing() - KESZ -> SZAMLAZANDO
- [x] close() - SZAMLAZANDO -> LEZART

### AC5: Tenant izolacio es audit
- [x] Tenant ellenorzes minden atmeneten
- [x] Audit log minden statuszvaltozasnal
- [x] fromStatus/toStatus metaadat

## Technical Notes

### Package
`@kgc/service-worksheet`

### Implementalt komponensek
1. `WorksheetStateService` - State machine
2. `STATE_TRANSITIONS` - Transition map

### State Machine
```
FELVEVE -> FOLYAMATBAN -> KESZ -> SZAMLAZANDO -> LEZART
        -> VARHATO -----/
        -> TOROLVE (terminal)
```

### Metodusok
- `transition(worksheetId, toStatus, tenantId, userId)` - Altalanos atmenet
- `isValidTransition(fromStatus, toStatus)` - Ellenorzes
- `getNextStatuses(currentStatus)` - Lehetseges kovetkezo statuszok
- `startWork()`, `markWaiting()`, `completeWork()`, `markForInvoicing()`, `close()`

## Tasks

1. [x] TDD RED - 43 failing teszt
2. [x] TDD GREEN - WorksheetStateService implementacio
3. [x] Index export frissites
4. [x] Coverage ellenorzes

## Definition of Done

- [x] Minden AC teljesul
- [x] Unit tesztek PASS (43 teszt)
- [x] Coverage thresholds met
- [x] Sprint status: done

---

**Letrehozva:** 2026-01-17
**Package:** @kgc/service-worksheet
