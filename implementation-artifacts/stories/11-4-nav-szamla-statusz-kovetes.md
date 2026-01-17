# Story 11-4: NAV Számla Státusz Követés

**Epic:** Epic 11 - NAV Integration (@kgc/nav-online)
**Státusz:** ✅ DONE
**Implementálva:** 2026-01-16

## User Story

**As a** könyvelő
**I want** NAV beküldés státuszát látni
**So that** tudjam, mely számlák vannak elfogadva.

## Acceptance Criteria

- [x] NAV státusz lekérdezés implementálva
- [x] Státusz: PENDING, SUBMITTED, ACCEPTED, REJECTED
- [x] NAV transaction ID tárolva
- [x] API endpoint a státusz lekérdezésre

## Technical Implementation

### Státusz enum

```typescript
enum InvoiceStatus {
  PENDING = 'PENDING',           // Várakozik küldésre
  SENT = 'SENT',                 // Elküldve, válaszra vár
  SUCCESS = 'SUCCESS',           // Sikeres, NAV-hoz beküldve
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_PERMANENT = 'FAILED_PERMANENT',
  MANUAL_REQUIRED = 'MANUAL_REQUIRED',
  CANCELLED = 'CANCELLED',
}
```

### API Endpoints

- `GET /api/v1/nav/invoices/:invoiceNumber/status` - Státusz lekérdezés
- Response: `{ success, navTransactionId, navStatus }`

### Megvalósított funkciók

1. **Státusz lekérdezés** (`getInvoiceStatus`)
   - Számlázz.hu API hívás
   - NAV válasz feldolgozás

2. **NAV Service orchestráció**
   - Automatikus státusz frissítés
   - Transaction ID mentés

### Kapcsolódó fájlok

- `packages/integration/nav-online/src/services/nav.service.ts`
- `packages/integration/nav-online/src/nav.controller.ts`
- `packages/integration/nav-online/src/interfaces/invoice.interface.ts`

## Tesztek

- Státusz lekérdezés teszt
- API response validáció
