# Story 25.1: Bérgép szervizbe küldés automatizálás

Status: done

---

## Story

**Mint** telephelyvezető,
**szeretnék** bérgépet automatikusan szervizbe küldeni munkalap létrehozásával,
**hogy** a hibás bérgépek javítása gördülékenyen elinduljon és nyomon követhető legyen.

---

## Acceptance Criteria

### AC1: Dispatch to service

- [x] Bérgép szervizbe küldhető ha státusza: AVAILABLE, RESERVED, MAINTENANCE
- [x] Nem küldhető szervizbe ha: RENTED, IN_SERVICE, RETIRED
- [x] Automatikus munkalap létrehozás a dispatch során
- [x] Munkalap típusok támogatása: REPAIR, MAINTENANCE, INSPECTION, WARRANTY

### AC2: Equipment status transition

- [x] Bérgép státusz automatikusan IN_SERVICE-re vált
- [x] Előző státusz eltárolása a visszaállításhoz
- [x] lastServiceDate frissítése

### AC3: Dispatch record

- [x] ServiceDispatch rekord létrehozása: equipmentId, worksheetId, reason, notes
- [x] Aktív dispatch ellenőrzés (max 1 aktív dispatch/bérgép)
- [x] Dispatch history lekérdezés

### AC4: Warranty handling

- [x] isWarranty flag támogatás a dispatch-nél
- [x] Munkalap is_warranty mezője beállítódik

### AC5: Audit trail

- [x] Audit log bejegyzés: equipment_dispatched_to_service
- [x] Metadata: worksheetId, worksheetNumber, reason, previousStatus

---

## Tasks / Subtasks

### Task 1: Interfaces és DTOs (AC: 1, 2, 3, 4) ✅

- [x] 1.1 `bergep-szerviz.interface.ts` - IEquipment, IWorksheet, IServiceDispatch, IServiceReturn
- [x] 1.2 `bergep-szerviz.dto.ts` - DispatchToServiceDto, ReturnFromServiceDto Zod sémák
- [x] 1.3 EquipmentStatus, WorksheetStatus, ServiceDispatchReason enums

### Task 2: Repository interfaces (AC: 3) ✅

- [x] 2.1 IEquipmentRepository - findById, update
- [x] 2.2 IWorksheetRepository - create, findById, getNextNumber
- [x] 2.3 IServiceDispatchRepository - create, findById, findByEquipmentId, findActiveByEquipmentId, update

### Task 3: EquipmentDispatchService implementáció (AC: 1, 2, 3, 4, 5) ✅

- [x] 3.1 `equipment-dispatch.service.ts` - dispatchToService() metódus
- [x] 3.2 Státusz validáció (RENTED, IN_SERVICE, RETIRED nem küldhető)
- [x] 3.3 Aktív dispatch ellenőrzés
- [x] 3.4 Munkalap létrehozás (worksheetNumber generálással)
- [x] 3.5 Equipment status frissítés IN_SERVICE-re
- [x] 3.6 getActiveDispatch(), getDispatchHistory() metódusok

### Task 4: Unit tesztek (AC: all) ✅

- [x] 4.1 `equipment-dispatch.service.spec.ts` - 9 teszt
- [x] 4.2 Sikeres dispatch teszt
- [x] 4.3 Hibás státuszok tesztje (RENTED, IN_SERVICE, RETIRED)
- [x] 4.4 Aktív dispatch teszt
- [x] 4.5 Tenant mismatch teszt
- [x] 4.6 Warranty worksheet teszt

### Task 5: Module és exports (AC: all) ✅

- [x] 5.1 `bergep-szerviz.module.ts` - NestJS modul
- [x] 5.2 `index.ts` - Public exports

---

## Test Results

| Test Suite                         | Tests | Status  |
| ---------------------------------- | ----- | ------- |
| equipment-dispatch.service.spec.ts | 9     | ✅ Pass |

Total: **9 tests passing**

---

## Technical Notes

- Package: `@kgc/bergep-szerviz`
- Location: `packages/integration/bergep-szerviz/`
- Dependencies: @nestjs/common, zod
- Status machine: AVAILABLE/RESERVED/MAINTENANCE → IN_SERVICE

---

## Definition of Done

- [x] Acceptance criteria kielégítve
- [x] Unit tesztek írva és sikeresek
- [x] TypeScript strict mode hiba nincs
- [x] Audit trail implementálva
