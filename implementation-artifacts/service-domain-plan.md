# Szerviz (Service) Domain Implementation Plan

> **Created:** 2026-01-23
> **Status:** IN PROGRESS
> **Phase:** BMAD Phase 4 - Implementation
> **Priority:** P1 - High (Core Business)
> **Dependencies:** Partner domain, Inventory domain (for parts)

---

## Executive Summary

The Service domain has 3 fully implemented packages with 201 unit tests covering worksheets, warranty claims, and service norma (Makita pricing standards). Two packages (service-core, service-parts) are empty stubs. The persistence and API layers are completely missing.

### Quick Stats

| Layer                | Status     | Progress                |
| -------------------- | ---------- | ----------------------- |
| Service Layer        | 🟡 Partial | 3/5 packages, 201 tests |
| Repository Layer     | 🔴 Missing | 0% - interface-only     |
| API Controller Layer | 🔴 Missing | 0% - no controllers     |
| Prisma Schema        | 🔴 Missing | 0 models                |
| E2E Tests            | 🔴 Missing | 0 tests                 |

---

## Package Structure

### 5 Packages in `/packages/szerviz/`

| Package                    | Purpose                                                              | Tests   | Status      |
| -------------------------- | -------------------------------------------------------------------- | ------- | ----------- |
| **@kgc/service-worksheet** | Munkalap management - CRUD, state machine, queue, rental integration | 137     | ✅ Complete |
| **@kgc/service-warranty**  | Warranty claims - Validation, supplier submission, settlement        | 35      | ✅ Complete |
| **@kgc/service-norma**     | Makita norma - Labor cost calculation, import, versioning            | 29      | ✅ Complete |
| **@kgc/service-core**      | Core service entities                                                | 0       | ❌ Empty    |
| **@kgc/service-parts**     | Alkatrész management                                                 | 0       | ❌ Empty    |
| **TOTAL**                  |                                                                      | **201** |             |

---

## Service Layer Details

### @kgc/service-worksheet (Munkalap)

**6 Services, 137 tests**

#### WorksheetService (25 tests)

| Method                      | Story | Purpose                                              |
| --------------------------- | ----- | ---------------------------------------------------- |
| `create()`                  | 17-1  | Create new worksheet with auto-number (ML-YYYY-NNNN) |
| `findById()`                | 17-1  | Fetch with tenant isolation                          |
| `findAll()`                 | 17-1  | Paginated search with filtering                      |
| `update()`                  | 17-1  | Update with validation & audit                       |
| `delete()`                  | 17-1  | Soft delete (sets status to TOROLVE)                 |
| `generateWorksheetNumber()` | 17-1  | Number generation logic                              |

#### DiagnosisService (12 tests)

| Method                      | Story | Purpose                        |
| --------------------------- | ----- | ------------------------------ |
| `addDiagnosis()`            | 17-3  | Create diagnosis for worksheet |
| `getDiagnosesByWorksheet()` | 17-3  | Retrieve all diagnoses         |
| `updateDiagnosis()`         | 17-3  | Update diagnosis               |
| `deleteDiagnosis()`         | 17-3  | Delete diagnosis               |

#### WorksheetStateService (43 tests)

| Method               | Story | Purpose                  |
| -------------------- | ----- | ------------------------ |
| `transition()`       | 17-4  | Handle state transitions |
| `startWork()`        | 17-4  | FELVEVE → FOLYAMATBAN    |
| `markWaiting()`      | 17-4  | → VARHATO                |
| `completeWork()`     | 17-4  | → KESZ                   |
| `markForInvoicing()` | 17-4  | → SZAMLAZANDO            |
| `close()`            | 17-4  | → LEZART                 |

#### WorksheetItemService (15 tests)

| Method               | Story | Purpose                               |
| -------------------- | ----- | ------------------------------------- |
| `addItem()`          | 17-2  | Add part (alkatrész) to worksheet     |
| `addLabor()`         | 17-2  | Add labor (munkadíj) cost             |
| `addStorageFee()`    | 17-2  | Add storage fees                      |
| `getItems()`         | 17-2  | Retrieve all items                    |
| `calculateSummary()` | 17-2  | Calculate totals (nettó, bruttó, ÁFA) |
| `removeItem()`       | 17-2  | Remove item                           |

#### WorksheetQueueService (23 tests)

| Method                      | Story | Purpose                       |
| --------------------------- | ----- | ----------------------------- |
| `getQueuePosition()`        | 17-5  | Get position in service queue |
| `getQueue()`                | 17-5  | Get all worksheets in queue   |
| `getNextWorksheet()`        | 17-5  | Get next job by priority      |
| `getWorksheetsByPriority()` | 17-5  | Filter by priority            |
| `getQueueStats()`           | 17-5  | Queue statistics              |

#### WorksheetRentalService (19 tests)

| Method                     | Story | Purpose                         |
| -------------------------- | ----- | ------------------------------- |
| `linkToRental()`           | 17-6  | Associate worksheet with rental |
| `unlinkFromRental()`       | 17-6  | Unlink from rental              |
| `getWorksheetsByRental()`  | 17-6  | Get worksheets for rental       |
| `getWorksheetWithRental()` | 17-6  | Get full worksheet with rental  |
| `createFromRentalDamage()` | 17-6  | Create from rental damage       |
| `hasOpenWorksheets()`      | 17-6  | Check if open worksheets exist  |

**Worksheet Status Flow:**

```
FELVEVE → FOLYAMATBAN → KESZ → SZAMLAZANDO → LEZART
    ↓         ↓
 TOROLVE   VARHATO
```

**Priority Ranking:**

1. SURGOS (Urgent)
2. FELARAS (Premium)
3. GARANCIALIS (Warranty)
4. FRANCHISE (Franchise)
5. NORMAL (Standard)

---

### @kgc/service-warranty (Warranty Claims)

**2 Services, 35 tests**

#### WarrantyClaimService (18 tests)

| Method                          | Story | Purpose                                 |
| ------------------------------- | ----- | --------------------------------------- |
| `createClaim()`                 | 19-2  | Create warranty claim (validates dates) |
| `getClaimById()`                | 19-2  | Retrieve claim by ID                    |
| `getClaimsByWorksheet()`        | 19-2  | Get claims for worksheet                |
| `getClaimsByStatus()`           | 19-3  | Filter by status                        |
| `getClaimsBySupplier()`         | 19-3  | Filter by supplier                      |
| `updateClaimStatus()`           | 19-3  | Update status with validation           |
| `submitClaim()`                 | 19-3  | Submit to supplier                      |
| `approveClaim()`                | 19-3  | Mark as approved                        |
| `rejectClaim()`                 | 19-3  | Mark as rejected                        |
| `cancelClaim()`                 | 19-3  | Cancel claim                            |
| `settleClaim()`                 | 19-4  | Mark as paid/settled                    |
| `getClaimSummary()`             | 19-4  | Report summary                          |
| `getPendingClaims()`            | 19-4  | Get unsent claims                       |
| `getAwaitingResponseClaims()`   | 19-4  | Get submitted, pending                  |
| `getAwaitingSettlementClaims()` | 19-4  | Get approved, not settled               |

#### WarrantyCheckService (17 tests)

| Method                    | Story | Purpose                       |
| ------------------------- | ----- | ----------------------------- |
| `checkWarranty()`         | 19-1  | Complex warranty validation   |
| `getDeviceWarrantyInfo()` | 19-1  | Retrieve device warranty info |
| `checkWarrantySimple()`   | 19-1  | Simple warranty validation    |

**Warranty Claim Status Flow:**

```
PENDING → SUBMITTED → APPROVED → SETTLED
              ↓           ↓
          REJECTED    CANCELLED
```

**Supported Suppliers:**

- MAKITA
- STIHL
- HUSQVARNA
- BOSCH
- DEWALT
- MILWAUKEE
- HIKOKI
- OTHER

---

### @kgc/service-norma (Makita Norma)

**3 Services, 29 tests**

#### NormaImportService (10 tests)

| Method                                          | Purpose |
| ----------------------------------------------- | ------- |
| Import Makita norma pricing tables              |
| Manage norma versions (DRAFT, ACTIVE, ARCHIVED) |
| Handle error tracking per row                   |

#### NormaLaborService (10 tests)

| Method                 | Purpose                    |
| ---------------------- | -------------------------- |
| `calculateLaborCost()` | Calculate from norma hours |
| `findNormaByCode()`    | Lookup norma item by code  |
| `searchNormaCodes()`   | Search norma catalog       |

#### NormaVersionService (9 tests)

| Method                | Purpose |
| --------------------- | ------- |
| Manage norma versions |
| Track effective dates |
| Import history        |

---

## What's MISSING

### Prisma Models (Need to CREATE)

```prisma
// Worksheet Core
model Worksheet {
  id               String           @id @default(uuid())
  tenantId         String
  worksheetNumber  String           // ML-YYYY-NNNN
  type             WorksheetType
  status           WorksheetStatus
  priority         WorksheetPriority
  partnerId        String
  deviceName       String
  deviceBrand      String?
  deviceModel      String?
  deviceSerialNumber String?
  faultDescription String
  receivedAt       DateTime
  promisedDate     DateTime?
  completedAt      DateTime?
  closedAt         DateTime?
  rentalId         String?          // Optional link to rental
  createdBy        String
  createdAt        DateTime
  updatedAt        DateTime
}

model WorksheetItem {
  id           String          @id
  worksheetId  String
  type         WorksheetItemType // PART, LABOR, STORAGE
  productId    String?         // For parts
  description  String
  quantity     Decimal
  unitPrice    Decimal
  vatRate      VatRate
  netAmount    Decimal
  vatAmount    Decimal
  grossAmount  Decimal
}

model Diagnosis {
  id           String   @id
  worksheetId  String
  symptom      String
  cause        String?
  solution     String?
  createdBy    String
  createdAt    DateTime
}

// Warranty
model WarrantyClaim {
  id             String              @id
  tenantId       String
  worksheetId    String
  supplier       WarrantySupplier
  warrantyType   WarrantyType
  status         WarrantyClaimStatus
  claimNumber    String?             // Supplier reference
  deviceSerial   String
  purchaseDate   DateTime
  warrantyExpiry DateTime
  claimAmount    Decimal?
  approvedAmount Decimal?
  submittedAt    DateTime?
  respondedAt    DateTime?
  settledAt      DateTime?
  rejectionReason String?
  createdBy      String
  createdAt      DateTime
}

// Norma
model NormaVersion {
  id           String            @id
  tenantId     String
  name         String
  status       NormaVersionStatus
  effectiveFrom DateTime?
  effectiveTo  DateTime?
  importedAt   DateTime
  importedBy   String
  itemCount    Int
}

model NormaItem {
  id          String @id
  versionId   String
  normaCode   String
  description String
  normaHours  Decimal
  hourlyRate  Decimal
  laborCost   Decimal
}
```

### Repository Implementations (Need to CREATE)

| Repository                    | Methods     | Interface Location           |
| ----------------------------- | ----------- | ---------------------------- |
| PrismaWorksheetRepository     | ~12 methods | service-worksheet/interfaces |
| PrismaDiagnosisRepository     | ~5 methods  | service-worksheet/interfaces |
| PrismaWorksheetItemRepository | ~6 methods  | service-worksheet/interfaces |
| PrismaWarrantyClaimRepository | ~15 methods | service-warranty/interfaces  |
| PrismaNormaVersionRepository  | ~8 methods  | service-norma/interfaces     |
| PrismaNormaItemRepository     | ~5 methods  | service-norma/interfaces     |

### API Controllers (Need to CREATE)

| Controller               | Endpoints     | Priority |
| ------------------------ | ------------- | -------- |
| WorksheetController      | ~15 endpoints | P1       |
| DiagnosisController      | ~5 endpoints  | P1       |
| WorksheetItemController  | ~6 endpoints  | P1       |
| WorksheetQueueController | ~5 endpoints  | P1       |
| WarrantyClaimController  | ~12 endpoints | P2       |
| NormaController          | ~8 endpoints  | P2       |

---

## Expected REST Endpoints

### Worksheet API

```
GET    /api/v1/worksheets              # List worksheets
POST   /api/v1/worksheets              # Create worksheet
GET    /api/v1/worksheets/:id          # Get worksheet
PATCH  /api/v1/worksheets/:id          # Update worksheet
DELETE /api/v1/worksheets/:id          # Soft delete
POST   /api/v1/worksheets/:id/start    # Start work
POST   /api/v1/worksheets/:id/complete # Complete work
POST   /api/v1/worksheets/:id/invoice  # Mark for invoicing
POST   /api/v1/worksheets/:id/close    # Close worksheet
GET    /api/v1/worksheets/:id/items    # List items
POST   /api/v1/worksheets/:id/items    # Add item
DELETE /api/v1/worksheets/:id/items/:itemId  # Remove item
GET    /api/v1/worksheets/:id/diagnoses     # List diagnoses
POST   /api/v1/worksheets/:id/diagnoses     # Add diagnosis
```

### Queue API

```
GET    /api/v1/worksheets/queue        # Get service queue
GET    /api/v1/worksheets/queue/next   # Get next worksheet
GET    /api/v1/worksheets/queue/stats  # Queue statistics
```

### Warranty API

```
GET    /api/v1/warranty-claims         # List claims
POST   /api/v1/warranty-claims         # Create claim
GET    /api/v1/warranty-claims/:id     # Get claim
POST   /api/v1/warranty-claims/:id/submit   # Submit to supplier
POST   /api/v1/warranty-claims/:id/approve  # Mark approved
POST   /api/v1/warranty-claims/:id/reject   # Mark rejected
POST   /api/v1/warranty-claims/:id/settle   # Settle claim
GET    /api/v1/warranty-claims/pending      # Pending claims
GET    /api/v1/warranty-claims/summary      # Claims summary
GET    /api/v1/warranty/check               # Check warranty status
```

### Norma API

```
GET    /api/v1/norma/versions          # List versions
POST   /api/v1/norma/import            # Import norma
GET    /api/v1/norma/versions/:id      # Get version
POST   /api/v1/norma/versions/:id/activate   # Activate version
GET    /api/v1/norma/search            # Search norma codes
POST   /api/v1/norma/calculate-labor   # Calculate labor cost
```

---

## Story Breakdown

### SRV-S1: Prisma Schema - Worksheet (P0 - BLOCKING)

- [ ] Create `Worksheet` model with all fields
- [ ] Create `WorksheetItem` model
- [ ] Create `Diagnosis` model
- [ ] Create `WorksheetHistoryEntry` model
- [ ] Add enums: WorksheetType, WorksheetStatus, WorksheetPriority, WorksheetItemType
- [ ] Create indexes for queue and filtering

### SRV-S2: Prisma Schema - Warranty (P0 - BLOCKING)

- [ ] Create `WarrantyClaim` model
- [ ] Create `WarrantyClaimHistory` model
- [ ] Add enums: WarrantyClaimStatus, WarrantySupplier, WarrantyType

### SRV-S3: Prisma Schema - Norma (P0 - BLOCKING)

- [ ] Create `NormaVersion` model
- [ ] Create `NormaItem` model
- [ ] Add enums: NormaVersionStatus
- [ ] Run migration

### SRV-S4: PrismaWorksheetRepository (P1)

- [ ] Implement 12 methods from interface
- [ ] Add unit tests
- [ ] Handle worksheet number generation
- [ ] Handle status transitions

### SRV-S5: PrismaDiagnosisRepository (P1)

- [ ] Implement 5 methods
- [ ] Add unit tests

### SRV-S6: PrismaWorksheetItemRepository (P1)

- [ ] Implement 6 methods
- [ ] Add unit tests
- [ ] Handle calculations

### SRV-S7: PrismaWarrantyClaimRepository (P2)

- [ ] Implement 15 methods
- [ ] Add unit tests
- [ ] Handle claim number generation

### SRV-S8: PrismaNormaRepository (P2)

- [ ] Implement version repository (8 methods)
- [ ] Implement item repository (5 methods)
- [ ] Add unit tests
- [ ] Handle bulk import

### SRV-S9: Worksheet Controllers (P1)

- [ ] Create WorksheetController
- [ ] Create DiagnosisController
- [ ] Create WorksheetItemController
- [ ] Create WorksheetQueueController
- [ ] Add DTOs with validation
- [ ] Add Swagger documentation

### SRV-S10: Warranty & Norma Controllers (P2)

- [ ] Create WarrantyClaimController
- [ ] Create NormaController
- [ ] Add DTOs with validation

### SRV-S11: ServiceModule Registration (P1)

- [ ] Create ServiceWorksheetModule
- [ ] Create ServiceWarrantyModule
- [ ] Create ServiceNormaModule
- [ ] Register all repositories
- [ ] Register all controllers
- [ ] Add to app.module.ts

### SRV-S12: E2E Tests (P2)

- [ ] Worksheet full lifecycle
- [ ] Queue management
- [ ] Warranty claim flow
- [ ] Norma calculation

---

## File Structure

```
apps/kgc-api/src/modules/service/
├── service.module.ts                     ❌ Create
├── worksheet/
│   ├── worksheet.module.ts               ❌ Create
│   ├── controllers/
│   │   ├── worksheet.controller.ts       ❌ Create
│   │   ├── diagnosis.controller.ts       ❌ Create
│   │   ├── worksheet-item.controller.ts  ❌ Create
│   │   └── worksheet-queue.controller.ts ❌ Create
│   ├── dto/
│   │   ├── worksheet.dto.ts              ❌ Create
│   │   ├── diagnosis.dto.ts              ❌ Create
│   │   └── worksheet-item.dto.ts         ❌ Create
│   └── repositories/
│       ├── prisma-worksheet.repository.ts      ❌ Create
│       ├── prisma-diagnosis.repository.ts      ❌ Create
│       └── prisma-worksheet-item.repository.ts ❌ Create
├── warranty/
│   ├── warranty.module.ts                ❌ Create
│   ├── controllers/
│   │   └── warranty-claim.controller.ts  ❌ Create
│   ├── dto/
│   │   └── warranty-claim.dto.ts         ❌ Create
│   └── repositories/
│       └── prisma-warranty-claim.repository.ts ❌ Create
└── norma/
    ├── norma.module.ts                   ❌ Create
    ├── controllers/
    │   └── norma.controller.ts           ❌ Create
    ├── dto/
    │   └── norma.dto.ts                  ❌ Create
    └── repositories/
        ├── prisma-norma-version.repository.ts ❌ Create
        └── prisma-norma-item.repository.ts    ❌ Create
```

---

## Empty Packages (Future Work)

### @kgc/service-core

Currently empty. Should contain:

- Common service entities
- Shared DTOs
- Service configuration

### @kgc/service-parts

Currently empty. Should contain:

- Parts catalog management
- Parts ordering
- Parts inventory tracking

---

## Dependencies

### Depends On (Must be ready first)

- **Partner Domain** - Worksheets reference partners
- **Inventory Domain** - Parts from inventory

### Depended By (Blocks these)

- **Sales Domain** - Invoices from worksheets

### Cross-Domain Links

- **Rental Domain** - WorksheetRentalService links worksheets to rentals

---

## Execution Order

```
Phase 1: Schema (BLOCKING)
├── SRV-S1: Worksheet schema
├── SRV-S2: Warranty schema
└── SRV-S3: Norma schema
    ↓ pnpm db:migrate

Phase 2: Core Repositories (PARALLEL)
├── SRV-S4: Worksheet repository
├── SRV-S5: Diagnosis repository
└── SRV-S6: WorksheetItem repository
    ↓

Phase 3: Secondary Repositories (PARALLEL)
├── SRV-S7: Warranty repository
└── SRV-S8: Norma repository
    ↓

Phase 4: API Layer
├── SRV-S9: Worksheet controllers
├── SRV-S10: Warranty/Norma controllers
└── SRV-S11: Module registration
    ↓

Phase 5: Testing
└── SRV-S12: E2E tests
```

---

## Progress Tracking

| Story   | Status  | Started | Completed |
| ------- | ------- | ------- | --------- |
| SRV-S1  | ⬜ TODO |         |           |
| SRV-S2  | ⬜ TODO |         |           |
| SRV-S3  | ⬜ TODO |         |           |
| SRV-S4  | ⬜ TODO |         |           |
| SRV-S5  | ⬜ TODO |         |           |
| SRV-S6  | ⬜ TODO |         |           |
| SRV-S7  | ⬜ TODO |         |           |
| SRV-S8  | ⬜ TODO |         |           |
| SRV-S9  | ⬜ TODO |         |           |
| SRV-S10 | ⬜ TODO |         |           |
| SRV-S11 | ⬜ TODO |         |           |
| SRV-S12 | ⬜ TODO |         |           |

---

## External Service Dependencies

| Interface              | Provider         | Used By                |
| ---------------------- | ---------------- | ---------------------- |
| IPartnerService        | Partner module   | WorksheetService       |
| IRentalService         | Rental module    | WorksheetRentalService |
| IInventoryService      | Inventory module | WorksheetItemService   |
| IAuditService          | Audit module     | All services           |
| IDeviceRegistryService | Product module   | WarrantyCheckService   |

---

_Last Updated: 2026-01-23_
_Document Version: 1.0_
