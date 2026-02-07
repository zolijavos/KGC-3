# Story 43-3: Automatikus email riportok

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 43-3                              |
| **Epic**       | Epic 43 - Könyvelői Integráció    |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 1                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 10                         |

## User Story

**Mint** könyvelő,
**Szeretném** automatikusan megkapni a havi riportokat emailben,
**Hogy** ne kelljen minden hónapban belépnem a rendszerbe.

## Acceptance Criteria

- AC-1: Havi riport email küldés (scheduler)
- AC-2: Riport beállítások módosítása
- AC-3: Email küldés hiba kezelés (3 retry + admin értesítés)

## Technikai Feladatok

### Task 1: ReportSchedulerService ✅

- [x] `saveSettings()` - beállítások mentése email validációval
- [x] `getSettings()` - beállítások lekérdezése
- [x] `scheduleMonthlyReport()` - havi ütemezés
- [x] `sendReport()` - email küldés retry logikával
- [x] Admin értesítés sikertelen küldéskor
- [x] Unit tesztek (10 teszt)

## Implementációs Összefoglaló

### Új Fájlok (2 fájl)

1. `packages/shared/accounting/src/services/report-scheduler.service.ts`
   - `saveSettings()` - email validáció, napszám ellenőrzés
   - `scheduleMonthlyReport()` - következő futás dátum számítás
   - `sendReport()` - 3 retry, exponential backoff
   - Admin notifier integration

2. `packages/shared/accounting/src/services/report-scheduler.service.spec.ts`
   - 10 TDD unit teszt

### Interfaces

```typescript
interface EmailReportSettings {
  tenantId: string;
  email: string;
  enabled: boolean;
  format: 'csv' | 'xlsx' | 'pdf';
  reportTypes: ('invoices' | 'vat' | 'deposits')[];
  dayOfMonth: number; // 1-28
}

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  retryCount?: number;
  error?: string;
}
```

## Tesztek (10 PASS)

- saveSettings: 3 teszt
- getSettings: 2 teszt
- scheduleMonthlyReport: 2 teszt
- sendReport: 3 teszt (retry + admin notification)

## Definition of Done

- [x] AC-1 Havi riport email küldés
- [x] AC-2 Beállítások módosítása
- [x] AC-3 Retry logika + admin értesítés
- [x] TypeScript PASS
- [x] Unit tesztek PASS (10/10)
