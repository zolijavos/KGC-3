# Story 43-1: Könyvelői API végpontok

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 43-1                              |
| **Epic**       | Epic 43 - Könyvelői Integráció    |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 2                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 10                         |

## User Story

**Mint** könyvelő,
**Szeretném** API-n keresztül lekérni a számla és tranzakció adatokat,
**Hogy** automatikusan tudjam importálni a könyvelő szoftverbe.

## Acceptance Criteria

- AC-1: Számlák lekérdezése időszakra (from/to paraméterek)
- AC-2: Tranzakciók lekérdezése (deposit in/out, invoice payment)
- AC-3: ÁFA összesítő lekérdezés kulcsonként
- AC-4: API key authentication

## Technikai Feladatok

### Task 1: AccountingService ✅

- [x] `AccountingService.getInvoices()` - számlák lekérdezése
- [x] `AccountingService.getTransactions()` - tranzakciók lekérdezése
- [x] `AccountingService.getVatSummary()` - ÁFA összesítő
- [x] API key validation logika
- [x] Unit tesztek (16 teszt)

## Implementációs Összefoglaló

### Új Package

`packages/shared/accounting/` - @kgc/accounting

### Új Fájlok (3 fájl)

1. `packages/shared/accounting/src/services/accounting.service.ts`
   - `getInvoices(query)` - számlák időszakra, tenant szűréssel
   - `getTransactions(query)` - tranzakciók típus szűréssel
   - `getVatSummary(query)` - ÁFA bontás kulcs szerint
   - `isValidApiKeyFormat()` - API key formátum validáció
   - `validateApiKey()` - teljes API key ellenőrzés

2. `packages/shared/accounting/src/services/accounting.service.spec.ts`
   - 16 TDD unit teszt

3. `packages/shared/accounting/src/index.ts` - exportok

### Interfaces

```typescript
interface InvoiceQueryDto {
  tenantId: string;
  from: Date;
  to: Date;
}

interface TransactionQueryDto {
  tenantId: string;
  from: Date;
  to: Date;
  type?: TransactionType;
}

interface VatSummaryQueryDto {
  tenantId: string;
  month: string; // YYYY-MM
}

type TransactionType = 'DEPOSIT_IN' | 'DEPOSIT_OUT' | 'INVOICE_PAYMENT' | 'REFUND';
```

## Tesztek (16 PASS)

- getInvoices: 5 teszt
- getTransactions: 5 teszt
- getVatSummary: 4 teszt
- API key validation: 2 teszt

## Definition of Done

- [x] AC-1 Számlák lekérdezése időszakra
- [x] AC-2 Tranzakciók lekérdezése
- [x] AC-3 ÁFA összesítő
- [x] AC-4 API key authentication
- [x] TypeScript PASS
- [x] Unit tesztek PASS (16/16)
