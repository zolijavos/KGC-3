# Story 44-1: Fizetési emlékeztetők

## Story Metaadatok

| Mező           | Érték                             |
| -------------- | --------------------------------- |
| **Story ID**   | 44-1                              |
| **Epic**       | Epic 44 - Fizetési Emlékeztetők   |
| **Prioritás**  | P1 - Magas                        |
| **Becsült SP** | 3                                 |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07) |
| **Sprint**     | Sprint 11                         |

## User Story

**Mint** boltvezető,
**Szeretném** automatikus fizetési emlékeztetőket küldeni a lejárt számlákra,
**Hogy** csökkentsem a kintlévőségeket.

## Acceptance Criteria

- AC-1: Első emlékeztető 7 nap késésnél (udvarias hangnem)
- AC-2: Második emlékeztető 14 nap késésnél (határozottabb)
- AC-3: Harmadik emlékeztető 30 nap késésnél (felfüggesztés figyelmeztetés)
- AC-4: Emlékeztető törlés számla befizetéskor

## Technikai Feladatok

### Task 1: PaymentReminderService ✅

- [x] `checkOverdueInvoices()` - lejárt számlák ellenőrzése
- [x] `sendReminder()` - emlékeztető küldése (FIRST/SECOND/FINAL)
- [x] `cancelReminders()` - emlékeztetők törlése fizetéskor
- [x] `getReminderHistory()` - emlékeztető előzmények
- [x] `getEmailTemplate()` - 3 szintű email sablon
- [x] `getDaysOverdue()` - késés napok számítás
- [x] `determineSuggestedLevel()` - javasolt szint meghatározás
- [x] Unit tesztek (20 teszt)

## Implementációs Összefoglaló

### Új Fájlok (2 fájl)

1. `packages/shared/partner/src/services/payment-reminder.service.ts`
   - Reminder levels: FIRST (7 nap), SECOND (14 nap), FINAL (30 nap)
   - Email templates magyar szöveggel
   - Duplicate prevention per level
   - Cancel on payment

2. `packages/shared/partner/src/services/payment-reminder.service.spec.ts`
   - 20 TDD unit teszt

### Interfaces

```typescript
type ReminderLevel = 'FIRST' | 'SECOND' | 'FINAL';

interface PaymentReminder {
  id: string;
  invoiceId: string;
  tenantId: string;
  level: ReminderLevel;
  sentAt: Date;
  status: 'SENT' | 'CANCELLED';
}

interface EmailTemplate {
  subject: string;
  body: string;
  tone: 'polite' | 'firm' | 'warning';
}
```

## Tesztek (20 PASS)

- checkOverdueInvoices: 4 teszt
- sendReminder: 4 teszt
- cancelReminders: 1 teszt
- getReminderHistory: 1 teszt
- getEmailTemplate: 3 teszt
- getDaysOverdue: 2 teszt
- determineSuggestedLevel: 5 teszt

## Definition of Done

- [x] AC-1 Első emlékeztető 7 nap
- [x] AC-2 Második emlékeztető 14 nap
- [x] AC-3 Harmadik emlékeztető 30 nap
- [x] AC-4 Emlékeztető törlés fizetéskor
- [x] TypeScript PASS
- [x] Unit tesztek PASS (20/20)
