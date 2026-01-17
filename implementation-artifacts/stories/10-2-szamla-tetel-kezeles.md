# Story 10-2: Számla Tétel Kezelés

## Story Info
- **Epic**: 10 - Invoice Core
- **Package**: @kgc/sales-invoice
- **Status**: DONE
- **Methodology**: TDD (Test-Driven Development)

## Description
Számla tétel kezelés és ÁFA kalkuláció implementálása TDD módszertannal.

## Acceptance Criteria
- [x] Tétel összeg számítás (nettó, ÁFA, bruttó)
- [x] Magyar ÁFA kulcsok támogatása (27%, 18%, 5%, 0%, AAM, TAM, EU, EUK, MAA)
- [x] Kedvezmény kezelés (százalékos)
- [x] Számla összesítők kalkulációja
- [x] ÁFA bontás kulcsonként
- [x] HUF kerekítés (bankers rounding)

## Implementation Details

### Created Files
- `packages/aruhaz/sales-invoice/src/services/vat-calculator.ts` - ÁFA kalkulátor
- `packages/aruhaz/sales-invoice/src/services/invoice-calculator.ts` - Tétel kalkulátor
- `packages/aruhaz/sales-invoice/tests/vat-calculator.spec.ts` - 32 tesztek
- `packages/aruhaz/sales-invoice/tests/invoice-calculator.spec.ts` - 19 tesztek

### TDD Test Coverage
- **51 teszt** összesen (32 + 19)
- ÁFA százalék lekérdezés
- ÁFA összeg számítás
- Bruttó összeg számítás
- HUF kerekítés (bankers rounding)
- Property-based testing (fast-check)
- Kedvezmény alkalmazás
- Számla összesítők
- ÁFA bontás

### VAT Rates Supported
| Kulcs | Százalék | Leírás |
|-------|----------|--------|
| RATE_27 | 27% | Általános ÁFA |
| RATE_18 | 18% | Kedvezményes |
| RATE_5 | 5% | Kedvezményes |
| RATE_0 | 0% | Mentes |
| AAM | 0% | Alanyi adómentes |
| TAM | 0% | Tárgyi adómentes |
| EU | 0% | EU közösségi |
| EUK | 0% | EU közösségi szolgáltatás |
| MAA | 0% | Mentes az adó alól |

## Test Results
```
✓ tests/vat-calculator.spec.ts (32 tests)
✓ tests/invoice-calculator.spec.ts (19 tests)
```

## Completed
- Date: 2026-01-17
- Developer: Claude AI (Epic Auto-Pilot)
