# Story 25.2: Szerviz kész - bérgép visszaáll

Status: done

---

## Story

**Mint** szervizes,
**szeretnék** a javított bérgépet visszavenni az eredeti státuszra,
**hogy** a bérgép újra kiadható legyen és a javítás dokumentált maradjon.

---

## Acceptance Criteria

### AC1: Return from service

- [x] Szervizből visszavétel csak IN_SERVICE státuszú bérgépnél lehetséges
- [x] Worksheet státusz ellenőrzés: COMPLETED vagy DELIVERED kell legyen
- [x] Dispatch record frissítése: returnedAt, returnedBy

### AC2: Status restoration

- [x] Bérgép státusz visszaállítása választható: AVAILABLE, RESERVED, RETIRED
- [x] Alapértelmezett: AVAILABLE (ha a javítás sikeres)
- [x] RETIRED opció javíthatatlan eszközhöz

### AC3: Notification

- [x] Értesítés küldés: EQUIPMENT_RETURNED_FROM_SERVICE típus
- [x] Értesítés tartalma: equipmentCode, worksheetNumber, newStatus

### AC4: Auto-complete on worksheet done

- [x] Munkalap lezárásakor automatikus visszavétel lehetőség
- [x] autoCompleteOnWorksheetDone() metódus
- [x] Automatikus AVAILABLE státusz beállítás

### AC5: Audit trail

- [x] Audit log bejegyzés: equipment_returned_from_service
- [x] Metadata: dispatchId, worksheetId, previousStatus, newStatus, serviceNotes

---

## Tasks / Subtasks

### Task 1: ServiceReturnService implementáció (AC: 1, 2, 3, 5) ✅

- [x] 1.1 `service-return.service.ts` - returnFromService() metódus
- [x] 1.2 Dispatch record validáció (létezik, nincs még visszavéve)
- [x] 1.3 Worksheet státusz ellenőrzés (COMPLETED/DELIVERED)
- [x] 1.4 Equipment státusz ellenőrzés (IN_SERVICE)
- [x] 1.5 Státusz frissítés a megadott értékre

### Task 2: Auto-complete funkció (AC: 4) ✅

- [x] 2.1 autoCompleteOnWorksheetDone() metódus
- [x] 2.2 Aktív dispatch keresés az equipment alapján
- [x] 2.3 Automatikus returnFromService() hívás

### Task 3: Notification interface (AC: 3) ✅

- [x] 3.1 INotificationService interface
- [x] 3.2 notify() hívás a return során

### Task 4: Unit tesztek (AC: all) ✅

- [x] 4.1 `service-return.service.spec.ts` - 9 teszt
- [x] 4.2 Sikeres visszavétel teszt
- [x] 4.3 Már visszavett equipment teszt
- [x] 4.4 Befejezetlen worksheet teszt
- [x] 4.5 Nem IN_SERVICE státuszú equipment teszt
- [x] 4.6 Auto-complete teszt
- [x] 4.7 RETIRED státuszra visszavétel teszt

---

## Test Results

| Test Suite                     | Tests | Status  |
| ------------------------------ | ----- | ------- |
| service-return.service.spec.ts | 9     | ✅ Pass |

Total: **9 tests passing**

---

## Technical Notes

- Package: `@kgc/bergep-szerviz`
- Location: `packages/integration/bergep-szerviz/`
- Dependencies: @nestjs/common, zod
- Status machine: IN_SERVICE → AVAILABLE/RESERVED/RETIRED

---

## Definition of Done

- [x] Acceptance criteria kielégítve
- [x] Unit tesztek írva és sikeresek
- [x] TypeScript strict mode hiba nincs
- [x] Notification implementálva
- [x] Audit trail implementálva
