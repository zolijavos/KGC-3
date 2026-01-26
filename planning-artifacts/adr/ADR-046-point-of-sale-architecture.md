# ADR-046: Point of Sale (POS) Architektúra

**Dátum:** 2026-01-26
**Státusz:** Elfogadva
**Döntéshozók:** Architect, PM, Dev
**Kapcsolódó:** ADR-005 (MyPos), ADR-002 (Offline Strategy), ADR-010 (Micro-modules)

---

## Kontextus

A KGC ERP v7.0 rendszerben szükséges egy **bolti értékesítési modul (POS)**, amely támogatja:

- Termékek gyors értékesítését vonalkód/kézi kereséssel
- Többféle fizetési mód kezelését (készpénz, kártya, átutalás, vegyes)
- Napi pénztárzárást készpénz egyeztetéssel
- Offline működést PWA környezetben

### Üzleti követelmények

| Követelmény         | Leírás                                   |
| ------------------- | ---------------------------------------- |
| Tranzakció sebesség | < 5 másodperc teljes értékesítési ciklus |
| Offline támogatás   | Teljes funkcionalitás internet nélkül    |
| Fizetési módok      | Készpénz, MyPos kártya, átutalás, vegyes |
| Készlet integráció  | Real-time készletcsökkentés              |
| Számla generálás    | NAV Online kompatibilis számla/nyugta    |

---

## Döntés

### 1. Adatmodell

```prisma
/// POS Kassza Session - Napi nyitás/zárás
model CashRegisterSession {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid
  locationId       String   @map("location_id") @db.Uuid

  sessionNumber    String   @map("session_number") // KASSZA-YYYY-NNNN
  openedAt         DateTime @map("opened_at")
  closedAt         DateTime? @map("closed_at")

  openingBalance   Decimal  @map("opening_balance") @db.Decimal(12, 2)
  closingBalance   Decimal? @map("closing_balance") @db.Decimal(12, 2)
  expectedBalance  Decimal? @map("expected_balance") @db.Decimal(12, 2)
  variance         Decimal? @db.Decimal(12, 2) // Eltérés (closingBalance - expectedBalance)
  varianceNote     String?  @map("variance_note")

  openedBy         String   @map("opened_by") @db.Uuid
  closedBy         String?  @map("closed_by") @db.Uuid

  status           CashRegisterStatus @default(OPEN)

  transactions     SaleTransaction[]

  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("cash_register_sessions")
  @@index([tenantId, status])
  @@index([tenantId, locationId, openedAt])
}

enum CashRegisterStatus {
  OPEN
  SUSPENDED
  CLOSED
}

/// Értékesítési tranzakció
model SaleTransaction {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid
  sessionId        String   @map("session_id") @db.Uuid

  transactionNumber String  @map("transaction_number") // ELADAS-YYYY-NNNN

  // Vevő (opcionális - készpénzes vásárlásnál nem kötelező)
  customerId       String?  @map("customer_id") @db.Uuid
  customerName     String?  @map("customer_name")
  customerTaxNumber String? @map("customer_tax_number")

  // Összegek
  subtotal         Decimal  @db.Decimal(12, 2)
  taxAmount        Decimal  @map("tax_amount") @db.Decimal(12, 2)
  discountAmount   Decimal  @default(0) @map("discount_amount") @db.Decimal(12, 2)
  total            Decimal  @db.Decimal(12, 2)

  // Fizetés
  paymentStatus    PaymentStatus @default(PENDING) @map("payment_status")
  paidAmount       Decimal  @default(0) @map("paid_amount") @db.Decimal(12, 2)
  changeAmount     Decimal  @default(0) @map("change_amount") @db.Decimal(12, 2)

  // Számla kapcsolat
  invoiceId        String?  @map("invoice_id") @db.Uuid
  receiptNumber    String?  @map("receipt_number")

  // Státusz
  status           SaleStatus @default(IN_PROGRESS)
  voidedAt         DateTime? @map("voided_at")
  voidedBy         String?  @map("voided_by") @db.Uuid
  voidReason       String?  @map("void_reason")

  // Audit
  createdBy        String   @map("created_by") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at")
  completedAt      DateTime? @map("completed_at")

  // Kapcsolatok
  session          CashRegisterSession @relation(fields: [sessionId], references: [id])
  items            SaleItem[]
  payments         SalePayment[]

  @@map("sale_transactions")
  @@index([tenantId, sessionId])
  @@index([tenantId, status, createdAt])
  @@index([transactionNumber])
}

enum SaleStatus {
  IN_PROGRESS  // Kosár összeállítás alatt
  PENDING_PAYMENT // Fizetésre vár
  COMPLETED    // Befejezett
  VOIDED       // Sztornózott
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  REFUNDED
}

/// Értékesítési tétel
model SaleItem {
  id               String   @id @default(uuid()) @db.Uuid
  transactionId    String   @map("transaction_id") @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid

  productId        String   @map("product_id") @db.Uuid
  productCode      String   @map("product_code")
  productName      String   @map("product_name")

  quantity         Decimal  @db.Decimal(10, 3)
  unitPrice        Decimal  @map("unit_price") @db.Decimal(12, 2)
  taxRate          Decimal  @map("tax_rate") @db.Decimal(5, 2) // 27, 18, 5, 0
  discountPercent  Decimal  @default(0) @map("discount_percent") @db.Decimal(5, 2)

  lineSubtotal     Decimal  @map("line_subtotal") @db.Decimal(12, 2)
  lineTax          Decimal  @map("line_tax") @db.Decimal(12, 2)
  lineTotal        Decimal  @map("line_total") @db.Decimal(12, 2)

  // Készlet tracking
  inventoryDeducted Boolean @default(false) @map("inventory_deducted")
  warehouseId      String?  @map("warehouse_id") @db.Uuid

  transaction      SaleTransaction @relation(fields: [transactionId], references: [id])

  @@map("sale_items")
  @@index([transactionId])
  @@index([productId])
}

/// Fizetési rekord (vegyes fizetéshez)
model SalePayment {
  id               String   @id @default(uuid()) @db.Uuid
  transactionId    String   @map("transaction_id") @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid

  method           PaymentMethod
  amount           Decimal  @db.Decimal(12, 2)

  // Kártya fizetésnél
  cardTransactionId String? @map("card_transaction_id")
  cardLastFour     String?  @map("card_last_four")
  cardBrand        String?  @map("card_brand") // VISA, MC, etc.

  // Átutalásnál
  transferReference String? @map("transfer_reference")

  // Utalványnál
  voucherCode      String?  @map("voucher_code")

  receivedAt       DateTime @default(now()) @map("received_at")

  transaction      SaleTransaction @relation(fields: [transactionId], references: [id])

  @@map("sale_payments")
  @@index([transactionId])
}

enum PaymentMethod {
  CASH           // Készpénz
  CARD           // Bankkártya (MyPos)
  TRANSFER       // Átutalás
  VOUCHER        // Utalvány/kupon
  CREDIT         // Hitel (partner hitelkeret)
}
```

### 2. Package Struktúra (@kgc/sales-pos)

```
packages/aruhaz/sales-pos/
├── src/
│   ├── index.ts
│   ├── sales-pos.module.ts
│   │
│   ├── interfaces/
│   │   ├── session.interface.ts
│   │   ├── transaction.interface.ts
│   │   └── payment.interface.ts
│   │
│   ├── dto/
│   │   ├── session.dto.ts
│   │   ├── transaction.dto.ts
│   │   └── payment.dto.ts
│   │
│   ├── services/
│   │   ├── session.service.ts        # Kassza nyitás/zárás
│   │   ├── transaction.service.ts    # Értékesítési tranzakciók
│   │   ├── cart.service.ts           # Kosár kezelés
│   │   ├── payment.service.ts        # Fizetés feldolgozás
│   │   └── reconciliation.service.ts # Pénztárzárás egyeztetés
│   │
│   └── validators/
│       └── payment.validator.ts
```

### 3. Szolgáltatás Integráció

```
┌─────────────────────────────────────────────────────────────────┐
│                      POS TRANSACTION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────┐          │
│  │ Scan/    │──►│ @kgc/cikk   │──►│ Cart Service    │          │
│  │ Search   │   │ Product API │   │ (kosár kezelés) │          │
│  └──────────┘   └──────────────┘   └────────┬────────┘          │
│                                              │                   │
│                                              ▼                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   FIZETÉS FELDOLGOZÁS                     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  CASH ────────► POS Payment Service                       │   │
│  │  CARD ────────► @kgc/mypos (Pre-auth, Capture)           │   │
│  │  TRANSFER ───► Manuális referencia rögzítés               │   │
│  │  MIXED ──────► Több SalePayment rekord                    │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    POST-TRANSACTION                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  @kgc/inventory ◄──── Készlet csökkentés                 │   │
│  │  @kgc/sales-invoice ◄── Számla/nyugta generálás          │   │
│  │  @kgc/nav-online ◄──── NAV bejelentés (> 500.000 Ft)     │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Offline-First Stratégia

```typescript
// Offline queue a tranzakciókhoz
interface OfflineSaleTransaction {
  localId: string; // UUID generált offline
  transactionData: CreateSaleDto;
  createdAt: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncError?: string;
}

// IndexedDB tárolás
const OFFLINE_STORES = {
  PENDING_TRANSACTIONS: 'pending_transactions',
  LOCAL_CART: 'local_cart',
  PRODUCT_CACHE: 'product_cache',
  SESSION_STATE: 'session_state',
};

// Sync stratégia
// 1. Tranzakció offline rögzítés → lokális sorszám (OFFLINE-NNNN)
// 2. Online szinkron → szerver sorszám (ELADAS-YYYY-NNNN)
// 3. Számla generálás → csak online módban
// 4. Készlet → offline tranzakcióknál "reserved" státusz, sync után véglegesítés
```

### 5. Kassza Session Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                   KASSZA SESSION LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Reggel]                                                       │
│      │                                                          │
│      ▼                                                          │
│  ┌────────────────┐                                             │
│  │ openSession()  │ ◄── openingBalance (készpénz számolás)     │
│  │ status: OPEN   │                                             │
│  └───────┬────────┘                                             │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────┐                                             │
│  │ Tranzakciók    │ ◄── CASH +/-, CARD (nincs készpénz hatás)  │
│  │ rögzítése      │                                             │
│  └───────┬────────┘                                             │
│          │                                                       │
│          ▼ [Nap végén]                                          │
│  ┌────────────────┐                                             │
│  │ closeSession() │                                             │
│  │                │                                             │
│  │ 1. closingBalance (fizikai készpénz)                        │
│  │ 2. expectedBalance számítás                                  │
│  │    = openingBalance + CASH bevételek - CASH visszajáró      │
│  │ 3. variance = closingBalance - expectedBalance              │
│  │ 4. Ha variance != 0 → varianceNote kötelező                 │
│  │                │                                             │
│  │ status: CLOSED │                                             │
│  └────────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6. API Endpoints

```typescript
// Session management
POST   /api/v1/pos/sessions                    // Kassza nyitás
GET    /api/v1/pos/sessions/current            // Aktív session
POST   /api/v1/pos/sessions/:id/suspend        // Felfüggesztés
POST   /api/v1/pos/sessions/:id/resume         // Folytatás
POST   /api/v1/pos/sessions/:id/close          // Zárás

// Transaction management
POST   /api/v1/pos/transactions                // Új tranzakció
GET    /api/v1/pos/transactions/:id            // Tranzakció lekérés
POST   /api/v1/pos/transactions/:id/items      // Tétel hozzáadás
DELETE /api/v1/pos/transactions/:id/items/:itemId  // Tétel törlés
PATCH  /api/v1/pos/transactions/:id/items/:itemId  // Tétel módosítás

// Payment
POST   /api/v1/pos/transactions/:id/payments   // Fizetés rögzítés
POST   /api/v1/pos/transactions/:id/complete   // Tranzakció lezárás
POST   /api/v1/pos/transactions/:id/void       // Sztornó

// Reports
GET    /api/v1/pos/sessions/:id/summary        // Session összesítő
GET    /api/v1/pos/reports/daily               // Napi riport
```

---

## Következmények

### Pozitív

- Teljes offline támogatás PWA-ban
- Vegyes fizetés támogatása (készpénz + kártya)
- Készlet real-time frissítés
- NAV Online kompatibilis számla generálás
- Kassza egyeztetés audit trail-lel

### Negatív

- Offline tranzakciók számla generálása csak sync után
- Készlet "reserved" állapot kezelése komplexitást ad

### Technikai adósság

- [ ] Offline készlet conflict resolution finomhangolás
- [ ] Kártya visszatérítés (void) flow MyPos-szal
- [ ] Nyugta nyomtató integráció (POS printer API)

---

## Implementációs terv

| Story | Scope                        | Függőség                  |
| ----- | ---------------------------- | ------------------------- |
| 22-1  | Session + Cart + Transaction | @kgc/inventory, @kgc/cikk |
| 22-2  | Payment (CASH, CARD, MIXED)  | @kgc/mypos                |
| 22-3  | Reconciliation + Reports     | 22-1, 22-2                |
