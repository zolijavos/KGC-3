# Értékesítés (Sales) Domain Implementation Plan

> **Created:** 2026-01-23
> **Status:** IN PROGRESS
> **Phase:** BMAD Phase 4 - Implementation
> **Priority:** P1 - High (Revenue Critical)
> **Dependencies:** Inventory domain, Partner domain, Service domain (for quotes from worksheets)

---

## Executive Summary

The Sales domain is the largest and most complex domain with 10 packages covering invoicing, POS, quotes, receipts, stock counting, margin analysis, and more. 6 packages are fully implemented with 241+ unit tests, while 4 packages are empty stubs. Like other domains, the persistence and API layers are completely missing.

### Quick Stats

| Layer                | Status     | Progress                  |
| -------------------- | ---------- | ------------------------- |
| Service Layer        | 🟡 Partial | 6/10 packages, 241+ tests |
| Repository Layer     | 🔴 Missing | 0% - interface-only       |
| API Controller Layer | 🔴 Missing | 0% - no controllers       |
| Prisma Schema        | 🔴 Missing | 0 models                  |
| E2E Tests            | 🔴 Missing | 0 tests                   |

---

## Package Structure

### 10 Packages in `/packages/aruhaz/`

| Package                | Purpose                                                 | Tests    | Status      |
| ---------------------- | ------------------------------------------------------- | -------- | ----------- |
| **@kgc/sales-invoice** | Invoice management - ÁFA, status workflow, RBAC, storno | 216      | ✅ Complete |
| **@kgc/sales-quote**   | Árajánlat - Quote generation, acceptance, export        | 25       | ✅ Complete |
| **@kgc/arres**         | Margin & pricing - Purchase price, margin calculation   | ~15      | ✅ Complete |
| **@kgc/bevetelezes**   | Goods receipt - Inbound logistics, avizo, discrepancies | ~10      | ✅ Complete |
| **@kgc/eladas**        | POS sales - Transactions, cash reconciliation           | ~10      | ✅ Complete |
| **@kgc/leltar**        | Stock count - Inventory counting, variances             | ~5       | ✅ Complete |
| **@kgc/sales-core**    | Core sales entities                                     | 0        | ❌ Empty    |
| **@kgc/sales-pos**     | POS integration                                         | 0        | ❌ Empty    |
| **@kgc/cikk**          | Product catalog                                         | 0        | ❌ Empty    |
| **TOTAL**              |                                                         | **241+** |             |

---

## Service Layer Details

### @kgc/sales-invoice (Invoicing)

**6 test files, 216 tests**

#### InvoiceService

| Method            | Story | Purpose                            |
| ----------------- | ----- | ---------------------------------- |
| `create()`        | 20-1  | Create invoice (DRAFT status)      |
| `findById()`      | 20-1  | Get invoice by ID                  |
| `findByNumber()`  | 20-1  | Get by invoice number              |
| `findMany()`      | 20-1  | Search with filters and pagination |
| `update()`        | 20-1  | Update (DRAFT only)                |
| `delete()`        | 20-1  | Delete (DRAFT only)                |
| `changeStatus()`  | 20-2  | Status transition with validation  |
| `issue()`         | 20-2  | DRAFT → ISSUED                     |
| `cancel()`        | 20-3  | Cancel with storno                 |
| `recordPayment()` | 20-4  | Record payment                     |

#### VatCalculatorService (Utility)

| Method                    | Purpose                      |
| ------------------------- | ---------------------------- |
| `getVatPercentage()`      | Get VAT rate percentage      |
| `calculateVatAmount()`    | Calculate VAT from net       |
| `calculateGrossAmount()`  | Net + VAT                    |
| `calculateNetFromGross()` | Reverse calculation          |
| `roundToHuf()`            | Hungarian rounding (Bankers) |
| `isValidVatRate()`        | Validate VAT rate            |

#### InvoiceCalculatorService

| Method                     | Purpose               |
| -------------------------- | --------------------- |
| `calculateItemAmount()`    | Line item calculation |
| `calculateInvoiceTotals()` | Summary totals        |

#### InvoiceStatusService

| Method                 | Purpose                     |
| ---------------------- | --------------------------- |
| `validateTransition()` | Validate status change      |
| `canTransition()`      | Check if transition allowed |

#### StornoService

| Method                 | Purpose |
| ---------------------- | ------- |
| Create storno invoices |
| Handle partial stornos |

#### RbacService

| Method                        | Purpose |
| ----------------------------- | ------- |
| RBAC for invoice visibility   |
| Confidential invoice handling |

**Invoice Status Flow:**

```
DRAFT → ISSUED → SENT → PARTIALLY_PAID → PAID
                   ↓
              CANCELLED
```

**Invoice Types:**

- STANDARD
- PROFORMA
- CORRECTION
- STORNO
- ADVANCE
- FINAL

**VAT Rates (Hungarian):**

- RATE_27 (27%)
- RATE_18 (18%)
- RATE_5 (5%)
- RATE_0 (0%)
- AAM (Alanyi adómentes)
- TAM (Tárgyi adómentes)
- EU, EUK, MAA

---

### @kgc/sales-quote (Árajánlat)

**4 test files, 25 tests**

#### QuoteService

| Method          | Story | Purpose       |
| --------------- | ----- | ------------- |
| `createQuote()` | 21-1  | Create quote  |
| `findById()`    | 21-1  | Get quote     |
| `findMany()`    | 21-1  | Search quotes |

#### QuoteAcceptanceService

| Method                                                | Purpose |
| ----------------------------------------------------- | ------- |
| Status transitions (DRAFT → SENT → ACCEPTED/REJECTED) |

#### QuoteExportService

| Method             | Purpose |
| ------------------ | ------- |
| Export to PDF, CSV |
| Email sending      |

#### ExplodedViewService

| Method                          | Purpose |
| ------------------------------- | ------- |
| Multi-level part explosions     |
| BOM handling for complex quotes |

**Quote Status Flow:**

```
DRAFT → SENT → ACCEPTED → CONVERTED
          ↓
       REJECTED
          ↓
       EXPIRED
```

---

### @kgc/arres (Margin & Pricing)

**2 test files**

#### MarginService

| Method                       | Purpose                    |
| ---------------------------- | -------------------------- |
| `calculateMargin()`          | Calculate product margin   |
| `calculateMargins()`         | Bulk margin calculation    |
| `getProductMarginSummary()`  | Margin summary per product |
| `getCategoryMarginSummary()` | Category-level margins     |
| `generateMarginReport()`     | Full margin report         |
| `exportMarginReport()`       | Export to CSV/XLSX/PDF     |
| `getTopProfitableProducts()` | Top performers             |
| `getLowMarginProducts()`     | Below threshold            |
| `getMarginTrend()`           | Margin over time           |

#### PurchasePriceService

| Method                      | Purpose                   |
| --------------------------- | ------------------------- |
| `recordPurchasePrice()`     | Record purchase price     |
| `getProductPurchasePrice()` | Get current price         |
| `getPurchasePriceHistory()` | Price history             |
| `getCurrentPrice()`         | With averaging method     |
| `compareSupplierPrices()`   | Supplier comparison       |
| `getPriceChangeAlerts()`    | Significant price changes |

---

### @kgc/bevetelezes (Goods Receipt)

**3 test files**

#### ReceiptService

| Method              | Purpose                       |
| ------------------- | ----------------------------- |
| `createReceipt()`   | Create goods receipt          |
| `completeReceipt()` | Complete and update inventory |
| `getReceiptById()`  | Get receipt                   |
| `getReceiptItems()` | Get receipt items             |
| `checkTolerance()`  | Discrepancy tolerance check   |

#### AvizoService

| Method                     | Purpose |
| -------------------------- | ------- |
| Inbound goods notification |
| Match with receipts        |

#### DiscrepancyService

| Method                          | Purpose |
| ------------------------------- | ------- |
| Receipt-avizo mismatch handling |
| Tolerance thresholds            |

**Receipt Status:**

- IN_PROGRESS
- DISCREPANCY
- COMPLETED

---

### @kgc/eladas (POS Sales)

**2 test files**

#### PosTransactionService

| Method                     | Purpose            |
| -------------------------- | ------------------ |
| `createTransaction()`      | Create empty cart  |
| `addItem()`                | Add item to cart   |
| `removeItem()`             | Remove item        |
| `updateItemQuantity()`     | Update quantity    |
| `applyItemDiscount()`      | Apply discount     |
| `addPayment()`             | Add payment        |
| `completeTransaction()`    | Finalize sale      |
| `cancelTransaction()`      | Cancel transaction |
| `getTransaction()`         | Get transaction    |
| `getDailyTransactions()`   | Daily report       |
| `checkStockAvailability()` | Stock check        |

#### CashReconciliationService

| Method                   | Purpose |
| ------------------------ | ------- |
| End-of-day cash counting |
| Variance reporting       |

**Transaction Status:**

- PENDING
- PROCESSING
- COMPLETED
- CANCELLED
- PARTIALLY_REFUNDED
- REFUNDED

**Payment Methods:**

- CASH
- CARD
- TRANSFER
- VOUCHER

---

### @kgc/leltar (Stock Count)

**1 test file**

#### StockCountService

| Method                 | Purpose                |
| ---------------------- | ---------------------- |
| `createStockCount()`   | Create count document  |
| `startStockCount()`    | Start counting         |
| `suspendStockCount()`  | Suspend count          |
| `resumeStockCount()`   | Resume count           |
| `getStockCount()`      | Get count              |
| `listStockCounts()`    | List counts            |
| `generateCountSheet()` | Generate count sheet   |
| `toggleStockFreeze()`  | Freeze stock movements |
| `cancelStockCount()`   | Cancel count           |

#### VarianceService

| Method               | Purpose |
| -------------------- | ------- |
| Variance calculation |
| Adjustment posting   |

**Stock Count Types:**

- FULL
- PARTIAL
- CYCLE
- RECOUNT

**Stock Count Status:**

- DRAFT
- IN_PROGRESS
- SUSPENDED
- COMPLETED
- CANCELLED

---

## What's MISSING

### Prisma Models (Need to CREATE)

```prisma
// Invoice
model Invoice {
  id              String        @id @default(uuid())
  tenantId        String
  invoiceNumber   String        // KGC-YYYY-NNNN
  prefix          String
  sequenceNumber  Int
  type            InvoiceType
  status          InvoiceStatus
  partnerId       String
  partnerName     String
  partnerTaxNumber String?
  partnerAddress  String
  invoiceDate     DateTime
  fulfillmentDate DateTime
  dueDate         DateTime
  paidAt          DateTime?
  netAmount       Decimal
  vatAmount       Decimal
  grossAmount     Decimal
  paidAmount      Decimal       @default(0)
  currency        String        @default("HUF")
  navStatus       String?
  navTransactionId String?
  navSubmittedAt  DateTime?
  isConfidential  Boolean       @default(false)
  visibleToRoles  String[]
  cancelledAt     DateTime?
  cancelledBy     String?
  stornoOfId      String?       // Reference to original invoice
  createdBy       String
  createdAt       DateTime
  updatedAt       DateTime
}

model InvoiceItem {
  id          String   @id
  invoiceId   String
  productId   String?
  description String
  quantity    Decimal
  unit        String
  unitPrice   Decimal
  vatRate     VatRate
  netAmount   Decimal
  vatAmount   Decimal
  grossAmount Decimal
}

model InvoicePayment {
  id          String   @id
  invoiceId   String
  amount      Decimal
  reference   String?
  paidAt      DateTime
  recordedBy  String
}

// Quote
model Quote {
  id           String      @id
  tenantId     String
  quoteNumber  String
  worksheetId  String?
  partnerId    String
  status       QuoteStatus
  netTotal     Decimal
  vatAmount    Decimal
  grossTotal   Decimal
  validFrom    DateTime
  validUntil   DateTime
  customerNote String?
  internalNote String?
  convertedToInvoiceId String?
  createdBy    String
  createdAt    DateTime
  updatedAt    DateTime
}

model QuoteItem {
  id          String @id
  quoteId     String
  productId   String?
  description String
  quantity    Decimal
  unitPrice   Decimal
  vatRate     VatRate
  netAmount   Decimal
}

// POS Transaction
model PosTransaction {
  id                String            @id
  tenantId          String
  locationId        String
  registerId        String
  operatorId        String
  partnerId         String?
  transactionNumber String
  status            TransactionStatus
  netTotal          Decimal
  vatTotal          Decimal
  grossTotal        Decimal
  paidAmount        Decimal
  changeAmount      Decimal
  receiptNumber     String?
  navSubmitted      Boolean           @default(false)
  createdAt         DateTime
  completedAt       DateTime?
}

model PosTransactionItem {
  id            String @id
  transactionId String
  productId     String
  description   String
  quantity      Decimal
  unitPrice     Decimal
  vatRate       VatRate
  discountPercent Decimal?
  netAmount     Decimal
}

model PosPayment {
  id            String        @id
  transactionId String
  method        PaymentMethod
  amount        Decimal
  reference     String?
}

// Goods Receipt
model Receipt {
  id            String        @id
  tenantId      String
  receiptNumber String
  avizoId       String?
  supplierId    String
  receivedDate  DateTime
  status        ReceiptStatus
  hasDiscrepancy Boolean
  processedBy   String
  createdAt     DateTime
  completedAt   DateTime?
}

model ReceiptItem {
  id              String  @id
  receiptId       String
  productId       String
  expectedQuantity Decimal
  receivedQuantity Decimal
  unit            String
  discrepancy     Decimal
}

// Stock Count
model StockCount {
  id                String          @id
  tenantId          String
  countNumber       String
  type              StockCountType
  status            StockCountStatus
  warehouseId       String
  locationId        String?
  scheduledStartDate DateTime?
  scheduledEndDate  DateTime?
  actualStartDate   DateTime?
  actualEndDate     DateTime?
  stockFrozen       Boolean         @default(false)
  totalItems        Int
  countedItems      Int             @default(0)
  varianceCount     Int             @default(0)
  createdBy         String
  createdAt         DateTime
}

model StockCountItem {
  id             String @id
  stockCountId   String
  productId      String
  locationCode   String?
  expectedQuantity Decimal
  countedQuantity Decimal?
  variance       Decimal?
  countedBy      String?
  countedAt      DateTime?
}

// Purchase Price & Margin
model PurchasePriceRecord {
  id          String   @id
  tenantId    String
  productId   String
  supplierId  String
  unitPrice   Decimal
  currency    String
  validFrom   DateTime
  validUntil  DateTime?
  receiptId   String?
  createdBy   String
  createdAt   DateTime
}

model MarginReport {
  id              String   @id
  tenantId        String
  periodStart     DateTime
  periodEnd       DateTime
  totalRevenue    Decimal
  totalCost       Decimal
  totalMargin     Decimal
  averageMarginPercent Decimal
  generatedBy     String
  generatedAt     DateTime
}
```

### Repository Implementations (Need to CREATE)

| Repository                     | Methods     | Priority |
| ------------------------------ | ----------- | -------- |
| PrismaInvoiceRepository        | ~15 methods | P1       |
| PrismaQuoteRepository          | ~10 methods | P1       |
| PrismaPosTransactionRepository | ~12 methods | P1       |
| PrismaReceiptRepository        | ~8 methods  | P2       |
| PrismaStockCountRepository     | ~10 methods | P2       |
| PrismaPurchasePriceRepository  | ~8 methods  | P2       |
| PrismaMarginReportRepository   | ~5 methods  | P2       |

### API Controllers (Need to CREATE)

| Controller           | Endpoints     | Priority |
| -------------------- | ------------- | -------- |
| InvoiceController    | ~15 endpoints | P1       |
| QuoteController      | ~10 endpoints | P1       |
| PosController        | ~12 endpoints | P1       |
| ReceiptController    | ~8 endpoints  | P2       |
| StockCountController | ~10 endpoints | P2       |
| MarginController     | ~8 endpoints  | P2       |

---

## Expected REST Endpoints

### Invoice API

```
GET    /api/v1/invoices               # List invoices
POST   /api/v1/invoices               # Create invoice
GET    /api/v1/invoices/:id           # Get invoice
PATCH  /api/v1/invoices/:id           # Update invoice
DELETE /api/v1/invoices/:id           # Delete (DRAFT only)
POST   /api/v1/invoices/:id/issue     # Issue invoice
POST   /api/v1/invoices/:id/send      # Send to customer
POST   /api/v1/invoices/:id/cancel    # Cancel (creates storno)
POST   /api/v1/invoices/:id/payment   # Record payment
GET    /api/v1/invoices/:id/pdf       # Download PDF
POST   /api/v1/invoices/:id/nav       # Submit to NAV
```

### Quote API

```
GET    /api/v1/quotes                 # List quotes
POST   /api/v1/quotes                 # Create quote
GET    /api/v1/quotes/:id             # Get quote
PATCH  /api/v1/quotes/:id             # Update quote
POST   /api/v1/quotes/:id/send        # Send to customer
POST   /api/v1/quotes/:id/accept      # Accept quote
POST   /api/v1/quotes/:id/reject      # Reject quote
POST   /api/v1/quotes/:id/convert     # Convert to invoice
GET    /api/v1/quotes/:id/pdf         # Download PDF
```

### POS API

```
POST   /api/v1/pos/transactions       # Create transaction
GET    /api/v1/pos/transactions/:id   # Get transaction
POST   /api/v1/pos/transactions/:id/items      # Add item
DELETE /api/v1/pos/transactions/:id/items/:itemId  # Remove item
POST   /api/v1/pos/transactions/:id/payment    # Add payment
POST   /api/v1/pos/transactions/:id/complete   # Complete sale
POST   /api/v1/pos/transactions/:id/cancel     # Cancel
GET    /api/v1/pos/daily-report       # Daily report
POST   /api/v1/pos/reconcile          # Cash reconciliation
```

### Receipt API

```
GET    /api/v1/receipts               # List receipts
POST   /api/v1/receipts               # Create receipt
GET    /api/v1/receipts/:id           # Get receipt
POST   /api/v1/receipts/:id/items     # Add item
POST   /api/v1/receipts/:id/complete  # Complete receipt
```

### Stock Count API

```
GET    /api/v1/stock-counts           # List counts
POST   /api/v1/stock-counts           # Create count
GET    /api/v1/stock-counts/:id       # Get count
POST   /api/v1/stock-counts/:id/start    # Start count
POST   /api/v1/stock-counts/:id/suspend  # Suspend
POST   /api/v1/stock-counts/:id/resume   # Resume
POST   /api/v1/stock-counts/:id/items    # Record count
POST   /api/v1/stock-counts/:id/complete # Complete
POST   /api/v1/stock-counts/:id/cancel   # Cancel
POST   /api/v1/stock-counts/:id/freeze   # Toggle freeze
```

### Margin API

```
GET    /api/v1/margins/products/:id   # Product margin
GET    /api/v1/margins/categories/:id # Category margin
POST   /api/v1/margins/report         # Generate report
GET    /api/v1/margins/top            # Top profitable
GET    /api/v1/margins/low            # Low margin products
GET    /api/v1/purchase-prices/:productId  # Get price
POST   /api/v1/purchase-prices        # Record price
```

---

## Story Breakdown

### SLS-S1: Prisma Schema - Invoice & Quote (P0 - BLOCKING)

- [ ] Create `Invoice` model with all fields
- [ ] Create `InvoiceItem` model
- [ ] Create `InvoicePayment` model
- [ ] Create `Quote` model
- [ ] Create `QuoteItem` model
- [ ] Add enums: InvoiceType, InvoiceStatus, QuoteStatus, VatRate

### SLS-S2: Prisma Schema - POS (P0 - BLOCKING)

- [ ] Create `PosTransaction` model
- [ ] Create `PosTransactionItem` model
- [ ] Create `PosPayment` model
- [ ] Add enums: TransactionStatus, PaymentMethod

### SLS-S3: Prisma Schema - Receipt & Stock Count (P0 - BLOCKING)

- [ ] Create `Receipt` model
- [ ] Create `ReceiptItem` model
- [ ] Create `StockCount` model
- [ ] Create `StockCountItem` model
- [ ] Add enums: ReceiptStatus, StockCountType, StockCountStatus

### SLS-S4: Prisma Schema - Margin & Pricing (P0 - BLOCKING)

- [ ] Create `PurchasePriceRecord` model
- [ ] Create `MarginReport` model
- [ ] Run migration

### SLS-S5: PrismaInvoiceRepository (P1)

- [ ] Implement 15 methods
- [ ] Handle invoice number generation (KGC-YYYY-NNNN)
- [ ] Handle storno linking
- [ ] Add unit tests

### SLS-S6: PrismaQuoteRepository (P1)

- [ ] Implement 10 methods
- [ ] Handle quote number generation
- [ ] Handle conversion to invoice
- [ ] Add unit tests

### SLS-S7: PrismaPosTransactionRepository (P1)

- [ ] Implement 12 methods
- [ ] Handle transaction number generation
- [ ] Handle stock reservation
- [ ] Add unit tests

### SLS-S8: PrismaReceiptRepository (P2)

- [ ] Implement 8 methods
- [ ] Handle inventory updates
- [ ] Add unit tests

### SLS-S9: PrismaStockCountRepository (P2)

- [ ] Implement 10 methods
- [ ] Handle count sheet generation
- [ ] Handle variance calculation
- [ ] Add unit tests

### SLS-S10: PrismaPricingRepository (P2)

- [ ] Implement purchase price repository (8 methods)
- [ ] Implement margin report repository (5 methods)
- [ ] Add unit tests

### SLS-S11: Invoice & Quote Controllers (P1)

- [ ] Create InvoiceController
- [ ] Create QuoteController
- [ ] Add DTOs with validation
- [ ] Add Swagger documentation

### SLS-S12: POS Controller (P1)

- [ ] Create PosController
- [ ] Add DTOs with validation
- [ ] Handle stock integration

### SLS-S13: Supporting Controllers (P2)

- [ ] Create ReceiptController
- [ ] Create StockCountController
- [ ] Create MarginController
- [ ] Add DTOs

### SLS-S14: SalesModule Registration (P1)

- [ ] Create SalesModule (umbrella)
- [ ] Create InvoiceModule
- [ ] Create QuoteModule
- [ ] Create PosModule
- [ ] Register all repositories
- [ ] Register all controllers
- [ ] Add to app.module.ts

### SLS-S15: E2E Tests (P2)

- [ ] Invoice full lifecycle
- [ ] Storno flow
- [ ] Quote to invoice conversion
- [ ] POS transaction flow
- [ ] Stock count flow
- [ ] Receipt completion with inventory update

---

## File Structure

```
apps/kgc-api/src/modules/sales/
├── sales.module.ts                       ❌ Create
├── invoice/
│   ├── invoice.module.ts                 ❌ Create
│   ├── controllers/
│   │   └── invoice.controller.ts         ❌ Create
│   ├── dto/
│   │   └── invoice.dto.ts                ❌ Create
│   └── repositories/
│       └── prisma-invoice.repository.ts  ❌ Create
├── quote/
│   ├── quote.module.ts                   ❌ Create
│   ├── controllers/
│   │   └── quote.controller.ts           ❌ Create
│   ├── dto/
│   │   └── quote.dto.ts                  ❌ Create
│   └── repositories/
│       └── prisma-quote.repository.ts    ❌ Create
├── pos/
│   ├── pos.module.ts                     ❌ Create
│   ├── controllers/
│   │   └── pos.controller.ts             ❌ Create
│   ├── dto/
│   │   └── pos.dto.ts                    ❌ Create
│   └── repositories/
│       └── prisma-pos-transaction.repository.ts ❌ Create
├── receipt/
│   ├── receipt.module.ts                 ❌ Create
│   ├── controllers/
│   │   └── receipt.controller.ts         ❌ Create
│   └── repositories/
│       └── prisma-receipt.repository.ts  ❌ Create
├── stock-count/
│   ├── stock-count.module.ts             ❌ Create
│   ├── controllers/
│   │   └── stock-count.controller.ts     ❌ Create
│   └── repositories/
│       └── prisma-stock-count.repository.ts ❌ Create
└── margin/
    ├── margin.module.ts                  ❌ Create
    ├── controllers/
    │   └── margin.controller.ts          ❌ Create
    └── repositories/
        ├── prisma-purchase-price.repository.ts ❌ Create
        └── prisma-margin-report.repository.ts  ❌ Create
```

---

## Empty Packages (Future Work)

### @kgc/sales-core

- Core sales entities
- Shared DTOs
- Common sales utilities

### @kgc/sales-pos

- POS terminal integration
- Card payment processing
- Receipt printing

### @kgc/cikk (Product Catalog)

- Product master data
- Categories
- Pricing rules

---

## Dependencies

### Depends On (Must be ready first)

- **Partner Domain** - All sales reference partners
- **Inventory Domain** - Stock management for POS, receipts
- **Service Domain** - Quotes can reference worksheets

### Depended By

- **NAV Integration** - Invoices submit to NAV Online
- **Reporting** - Financial reports use invoice data

### Cross-Domain Links

- **Rental Domain** - Invoices for rental transactions
- **Service Domain** - Invoices from worksheets

---

## Execution Order

```
Phase 1: Schema (BLOCKING)
├── SLS-S1: Invoice & Quote schema
├── SLS-S2: POS schema
├── SLS-S3: Receipt & Stock Count schema
└── SLS-S4: Margin schema
    ↓ pnpm db:migrate

Phase 2: Core Repositories (PARALLEL)
├── SLS-S5: Invoice repository
├── SLS-S6: Quote repository
└── SLS-S7: POS repository
    ↓

Phase 3: Supporting Repositories (PARALLEL)
├── SLS-S8: Receipt repository
├── SLS-S9: Stock Count repository
└── SLS-S10: Pricing repository
    ↓

Phase 4: API Layer
├── SLS-S11: Invoice & Quote controllers
├── SLS-S12: POS controller
├── SLS-S13: Supporting controllers
└── SLS-S14: Module registration
    ↓

Phase 5: Testing
└── SLS-S15: E2E tests
```

---

## Progress Tracking

| Story   | Status  | Started | Completed |
| ------- | ------- | ------- | --------- |
| SLS-S1  | ⬜ TODO |         |           |
| SLS-S2  | ⬜ TODO |         |           |
| SLS-S3  | ⬜ TODO |         |           |
| SLS-S4  | ⬜ TODO |         |           |
| SLS-S5  | ⬜ TODO |         |           |
| SLS-S6  | ⬜ TODO |         |           |
| SLS-S7  | ⬜ TODO |         |           |
| SLS-S8  | ⬜ TODO |         |           |
| SLS-S9  | ⬜ TODO |         |           |
| SLS-S10 | ⬜ TODO |         |           |
| SLS-S11 | ⬜ TODO |         |           |
| SLS-S12 | ⬜ TODO |         |           |
| SLS-S13 | ⬜ TODO |         |           |
| SLS-S14 | ⬜ TODO |         |           |
| SLS-S15 | ⬜ TODO |         |           |

---

## External Service Dependencies

| Interface         | Provider         | Used By                                       |
| ----------------- | ---------------- | --------------------------------------------- |
| IPartnerService   | Partner module   | InvoiceService, QuoteService, PosService      |
| IInventoryService | Inventory module | PosService, ReceiptService, StockCountService |
| IWorksheetService | Service module   | QuoteService (from worksheet)                 |
| IAuditService     | Audit module     | All services                                  |
| INavService       | NAV integration  | InvoiceService                                |
| IPrinterService   | Printing module  | PosService                                    |

---

## NAV Online Integration Notes

Invoices must be submitted to Hungarian NAV system:

- Standard invoices: Required submission
- Storno invoices: Correction submission
- Fields: navStatus, navTransactionId, navSubmittedAt
- Requires @kgc/nav-online package integration

---

_Last Updated: 2026-01-23_
_Document Version: 1.0_
