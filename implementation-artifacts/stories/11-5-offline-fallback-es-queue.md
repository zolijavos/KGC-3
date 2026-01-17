# Story 11-5: Offline Fallback és Queue

**Epic:** Epic 11 - NAV Integration (@kgc/nav-online)
**Státusz:** ✅ DONE
**Implementálva:** 2026-01-16

## User Story

**As a** üzletvezető
**I want** offline fallback lehetőséget
**So that** NAV downtime ne állítsa le az üzletet.

## Acceptance Criteria

- [x] NAV API nem elérhető esetén queue-ba kerülnek a számlák
- [x] Automatikus újrapróbálkozás 5 percenként
- [x] Manuális retry trigger lehetőség
- [x] Queue statisztikák elérhetők
- [x] Max retry után MANUAL_REQUIRED státusz

## Technical Implementation

### Létrehozott fájlok

- `packages/integration/nav-online/src/services/invoice-queue.service.ts` - Queue szolgáltatás
- `packages/integration/nav-online/prisma/schema.prisma` - NavRetryQueue tábla

### Queue feldolgozás

```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async processQueue(): Promise<void> {
  // Pending elemek lekérése
  // Batch feldolgozás (10 elem)
  // Sikertelen elemek újraütemezése
}
```

### API Endpoints

- `GET /api/v1/nav/queue/stats` - Queue statisztikák
- `POST /api/v1/nav/queue/process` - Manuális feldolgozás trigger

### Megvalósított funkciók

1. **Queue hozzáadás** (`addToQueue`)
   - Prioritás támogatás
   - Duplikáció ellenőrzés

2. **Queue feldolgozás** (`processQueue`)
   - 5 percenként automatikus futás
   - Batch processing (10 elem)
   - Processing lock (párhuzamos futás megakadályozása)

3. **Sikertelen kezelés** (`handleFailedSubmission`)
   - Retry ütemezés exponential backoff-al
   - Max retry után MANUAL_REQUIRED
   - Boltvezető értesítés (TODO)

4. **Statisztikák** (`getQueueStats`)
   - Pending, processing, succeeded, failed count
   - Következő ütemezett feldolgozás

### Adatbázis séma

```prisma
model NavRetryQueue {
  id            String   @id @default(uuid())
  tenantId      String
  invoiceId     String
  priority      Int      @default(0)
  scheduledAt   DateTime
  attempts      Int      @default(0)
  maxAttempts   Int      @default(5)
  isProcessing  Boolean  @default(false)
  lastError     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Manuális Fallback Workflow (ADR-030)

1. API hiba detektálva (5x retry után is sikertelen)
2. Boltvezető értesítés (push notification + email)
3. Manuális számla opciók:
   - Számlázz.hu web felületen kiállít
   - Offline nyugta nyomtatás
   - Késleltetett beküldés (24h-n belül)
4. Manuális számla rögzítése az ERP-ben
