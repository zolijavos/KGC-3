# Story 10-5: Sztornó Számla

## Story Info
- **Epic**: 10 - Invoice Core
- **Package**: @kgc/sales-invoice
- **Status**: DONE
- **Methodology**: TDD (Test-Driven Development)

## Description
Sztornó számla létrehozás és részleges sztornó implementálása TDD módszertannal.

## Acceptance Criteria
- [x] Teljes sztornó számla létrehozása
- [x] Negatív összegek a sztornó számlán
- [x] Eredeti számla referencia tárolása
- [x] Részleges sztornó támogatása
- [x] Sztornózható státuszok validálása
- [x] Kötelező indoklás megkövetelése
- [x] STO- prefix a sztornó számlákhoz

## Implementation Details

### Created Files
- `packages/aruhaz/sales-invoice/src/services/storno.service.ts` - StornoService
- `packages/aruhaz/sales-invoice/tests/storno.service.spec.ts` - 27 tesztek

### Stornable Statuses
| Státusz | Sztornózható |
|---------|-------------|
| DRAFT | ❌ Nem (törlés helyett) |
| ISSUED | ✅ Igen |
| SENT | ✅ Igen |
| PAID | ✅ Igen |
| PARTIALLY_PAID | ✅ Igen |
| OVERDUE | ✅ Igen |
| CANCELLED | ❌ Nem |

### Non-Stornable Types
- STORNO (már sztornó számla)
- PROFORMA (díjbekérő)

### API Methods
```typescript
canStorno(status: InvoiceStatus, type: InvoiceType): boolean
createStorno(originalId: string, userId: string, reason: string): Promise<IInvoice>
createPartialStorno(originalId: string, userId: string, reason: string, items: PartialStornoItem[]): Promise<IInvoice>
```

## TDD Test Coverage
- **27 teszt** sikeresen fut
- Teljes sztornó létrehozás
- Negatív összegek validálása
- Státusz validáció
- Indoklás kötelezőség
- Részleges sztornó
- Mennyiség limit validálás

## Test Results
```
✓ tests/storno.service.spec.ts (27 tests)
```

## Completed
- Date: 2026-01-17
- Developer: Claude AI (Epic Auto-Pilot)
