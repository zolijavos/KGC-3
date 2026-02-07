# Story 43-2: Könyvelői riportok

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 43-2                              |
| **Epic**       | Epic 43 - Könyvelői Integráció    |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 2                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 10                         |

## User Story

**Mint** könyvelő,
**Szeretném** letölteni a havi riportokat CSV és Excel formátumban,
**Hogy** be tudjam importálni a könyvelő szoftverbe.

## Acceptance Criteria

- AC-1: Számla riport CSV export (UTF-8 BOM Excel kompatibilis)
- AC-2: ÁFA analitika Excel export (3 munkalap)
- AC-3: Kaució egyenleg riport

## Technikai Feladatok

### Task 1: AccountingReportService ✅

- [x] `generateInvoiceCsv()` - számla CSV export
- [x] `generateVatExcel()` - ÁFA Excel export
- [x] `generateDepositReport()` - kaució egyenleg
- [x] `getFilename()` - fájlnév generálás
- [x] Unit tesztek (12 teszt)

## Implementációs Összefoglaló

### Új Fájlok (2 fájl)

1. `packages/shared/accounting/src/services/accounting-report.service.ts`
   - `generateInvoiceCsv()` - UTF-8 BOM encoding
   - `generateVatExcel()` - Összesítő, Részletes, NAV formátum worksheets
   - `generateDepositReport()` - nyitott kauciók listája
   - `getFilename()` - magyar fájlnevek

2. `packages/shared/accounting/src/services/accounting-report.service.spec.ts`
   - 12 TDD unit teszt

### Interfaces

```typescript
interface CsvExportOptions {
  tenantId: string;
  month: string; // YYYY-MM
  encoding: 'utf-8' | 'utf-8-bom';
}

interface ExcelExportOptions {
  tenantId: string;
  period: string; // YYYY-MM or YYYY-Q1
  format: 'xlsx' | 'xls';
}

interface DepositReportOptions {
  tenantId: string;
  format: 'csv' | 'xlsx' | 'pdf';
}
```

## Tesztek (12 PASS)

- generateInvoiceCsv: 4 teszt
- generateVatExcel: 3 teszt
- generateDepositReport: 3 teszt
- getFilename: 2 teszt

## Definition of Done

- [x] AC-1 CSV export UTF-8 BOM
- [x] AC-2 Excel export 3 worksheet
- [x] AC-3 Kaució egyenleg riport
- [x] TypeScript PASS
- [x] Unit tesztek PASS (12/12)
