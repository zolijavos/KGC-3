# Story 10-1: Számla CRUD

## Story Info
- **Epic**: 10 - Invoice Core
- **Package**: @kgc/sales-invoice
- **Status**: DONE
- **Methodology**: TDD (Test-Driven Development)

## Description
Számla alapvető CRUD műveletek implementálása TDD módszertannal.

## Acceptance Criteria
- [x] Számla létrehozása (create) működik
- [x] Számla lekérése ID alapján (findById)
- [x] Számla lekérése számlaszám alapján (findByNumber)
- [x] Számlák listázása szűrőkkel és lapozással (findMany)
- [x] Számla frissítése DRAFT státuszban (update)
- [x] Számla törlése DRAFT státuszban (delete)
- [x] Automatikus számlaszám generálás (prefix-év-sorszám)
- [x] Tétel összegek automatikus számítása
- [x] Fizetési határidő automatikus számítása

## Implementation Details

### Created Files
- `packages/aruhaz/sales-invoice/src/services/invoice.service.ts` - InvoiceService
- `packages/aruhaz/sales-invoice/src/interfaces/invoice.interface.ts` - Interfaces
- `packages/aruhaz/sales-invoice/tests/invoice.service.spec.ts` - 44 tesztek

### TDD Test Coverage
- **44 teszt** sikeresen fut
- Invoice létrehozás tesztek
- Számla típusok és prefix-ek tesztelése
- ÁFA kulcsok kezelése
- Confidential számlák kezelése
- Fizetési határidő számítás
- Kedvezmény számítás

## Test Results
```
✓ tests/invoice.service.spec.ts (44 tests)
```

## Completed
- Date: 2026-01-17
- Developer: Claude AI (Epic Auto-Pilot)
