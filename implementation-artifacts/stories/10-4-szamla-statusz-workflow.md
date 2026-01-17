# Story 10-4: Számla Státusz Workflow

## Story Info
- **Epic**: 10 - Invoice Core
- **Package**: @kgc/sales-invoice
- **Status**: DONE
- **Methodology**: TDD (Test-Driven Development)

## Description
Számla státusz workflow és state machine implementálása TDD módszertannal.

## Acceptance Criteria
- [x] State machine definiálása számlákhoz
- [x] Érvényes átmenetek validálása
- [x] Érvénytelen átmenetek visszautasítása
- [x] Végállapotok kezelése (PAID, CANCELLED)
- [x] Részleges fizetés támogatása
- [x] Fizetés rögzítés workflow

## Implementation Details

### Created Files
- `packages/aruhaz/sales-invoice/src/services/invoice-status.ts` - State machine
- `packages/aruhaz/sales-invoice/tests/invoice-status.spec.ts` - 43 tesztek

### State Machine

```
DRAFT ──────────────────► ISSUED
                            │
                            ▼
                          SENT ──────► OVERDUE
                            │              │
                            ▼              │
                     PARTIALLY_PAID ◄──────┘
                            │
                            ▼
                          PAID ✓

ISSUED ─────► CANCELLED ✓
SENT ─────► CANCELLED ✓
```

### States
| Státusz | Leírás | Végállapot |
|---------|--------|------------|
| DRAFT | Piszkozat | Nem |
| ISSUED | Kiállított | Nem |
| SENT | Elküldött | Nem |
| PAID | Fizetve | Igen |
| PARTIALLY_PAID | Részben fizetve | Nem |
| OVERDUE | Lejárt | Nem |
| CANCELLED | Sztornózott | Igen |

### Valid Transitions
- DRAFT → ISSUED, CANCELLED
- ISSUED → SENT, CANCELLED
- SENT → PAID, PARTIALLY_PAID, OVERDUE, CANCELLED
- PARTIALLY_PAID → PAID, OVERDUE
- OVERDUE → PAID, PARTIALLY_PAID

## TDD Test Coverage
- **43 teszt** sikeresen fut
- Érvényes átmenetek minden lehetséges útvonalra
- Érvénytelen átmenetek visszautasítása
- Végállapot ellenőrzés
- Transition error handling

## Test Results
```
✓ tests/invoice-status.spec.ts (43 tests)
```

## Completed
- Date: 2026-01-17
- Developer: Claude AI (Epic Auto-Pilot)
