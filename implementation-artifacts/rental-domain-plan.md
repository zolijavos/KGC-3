# Bérlés (Rental) Domain Implementation Plan

> **Created:** 2026-01-23
> **Status:** IN PROGRESS
> **Phase:** BMAD Phase 4 - Implementation
> **Priority:** P1 - High (Revenue Critical)
> **Dependencies:** Inventory domain (partial), Partner domain

---

## Executive Summary

The Rental domain has a complete, mature service layer with 294 unit tests across 4 packages. Business logic is production-ready including pricing, late fees, deposits, contracts, and equipment management. However, the persistence layer (Prisma models, repositories) and API layer (controllers) are completely missing.

### Quick Stats

| Layer                | Status      | Progress              |
| -------------------- | ----------- | --------------------- |
| Service Layer        | ✅ Complete | 4 packages, 294 tests |
| Repository Layer     | 🔴 Missing  | 0% - interface-only   |
| API Controller Layer | 🔴 Missing  | 0% - no controllers   |
| Prisma Schema        | 🔴 Missing  | 0 models              |
| E2E Tests            | 🔴 Missing  | 0 tests               |

---

## Package Structure

### 4 Packages in `/packages/berles/`

| Package                  | Purpose                                                                       | Tests   | Status      |
| ------------------------ | ----------------------------------------------------------------------------- | ------- | ----------- |
| **@kgc/bergep**          | Bérgép törzs - Equipment catalog, status lifecycle, accessories               | 62      | ✅ Complete |
| **@kgc/rental-core**     | Rental operations - Checkout, pricing, returns, extensions, late fees         | 55      | ✅ Complete |
| **@kgc/rental-checkout** | Deposit management - MyPOS integration, kaució kezelés                        | 88      | ✅ Complete |
| **@kgc/rental-contract** | Contract management - Templates, PDF generation, digital signatures, archival | 89      | ✅ Complete |
| **TOTAL**                |                                                                               | **294** |             |

---

## Service Layer Details

### @kgc/bergep (Rental Equipment)

**RentalEquipmentService** - 62 tests

| Method                       | Story | Purpose                                          |
| ---------------------------- | ----- | ------------------------------------------------ |
| `create()`                   | 13-1  | Create new equipment                             |
| `update()`                   | 13-1  | Update equipment details                         |
| `findById()`                 | 13-1  | Get equipment by ID                              |
| `findMany()`                 | 13-1  | Search/filter equipment                          |
| `delete()`                   | 13-1  | Soft delete equipment                            |
| `changeStatus()`             | 13-2  | Status transitions (AVAILABLE→RENTED→IN_SERVICE) |
| `validateStatusTransition()` | 13-2  | Status validation                                |
| `scan()`                     | 13-3  | QR/Serial/Inventory code scanning                |
| `addAccessory()`             | 13-4  | Add accessory to equipment                       |
| `updateAccessory()`          | 13-4  | Update accessory                                 |
| `removeAccessory()`          | 13-4  | Remove accessory                                 |
| `getAccessories()`           | 13-4  | List accessories                                 |
| `verifyAccessoryChecklist()` | 13-4  | Verify checklist on return                       |
| `getHistory()`               | 13-5  | Equipment audit history                          |
| `addMaintenanceRecord()`     | 13-5  | Log maintenance                                  |
| `getMaintenanceRecords()`    | 13-5  | Maintenance history                              |
| `getMaintenanceAlerts()`     | 13-5  | Upcoming maintenance                             |
| `getStatistics()`            | -     | Equipment analytics                              |

**Enums:**

- `EquipmentStatus`: AVAILABLE, RENTED, IN_SERVICE, RESERVED, DECOMMISSIONED, MAINTENANCE_REQUIRED
- `EquipmentCategory`: POWER_TOOL, GARDEN, CONSTRUCTION, CLEANING, MACHINERY, HAND_TOOL, MEASUREMENT, SAFETY
- `EquipmentCondition`: EXCELLENT, GOOD, FAIR, POOR, NEEDS_REPAIR

---

### @kgc/rental-core (Rental Operations)

**RentalService** - 55 tests

| Method                  | Story | Purpose                                        |
| ----------------------- | ----- | ---------------------------------------------- |
| `calculatePrice()`      | 14-2  | Pricing with tier logic (daily/weekly/monthly) |
| `checkout()`            | 14-1  | Create rental                                  |
| `confirmPickup()`       | 14-1  | Confirm pickup with deposit                    |
| `processReturn()`       | 14-4  | Return with late fee calculation               |
| `extendRental()`        | 14-5  | Extend rental period                           |
| `calculateLateFee()`    | 14-6  | Late fee (150% daily rate)                     |
| `waiveLateFees()`       | 14-6  | Fee waiver (role-based)                        |
| `checkOverdueRentals()` | 14-6  | Automated overdue detection                    |
| `createDiscountRule()`  | 14-3  | Create discount rule                           |
| `applyDiscount()`       | 14-3  | Apply discount to rental                       |
| `removeDiscount()`      | 14-3  | Remove discount                                |
| `cancel()`              | 14-7  | Cancel rental                                  |
| `addNote()`             | 14-7  | Add notes                                      |
| `getHistory()`          | 14-7  | Rental audit history                           |
| `findById()`            | -     | Get rental by ID                               |
| `findMany()`            | -     | Search rentals                                 |
| `getStatistics()`       | -     | Rental analytics                               |

**Enums:**

- `RentalStatus`: DRAFT, ACTIVE, EXTENDED, OVERDUE, RETURNED, CANCELLED, DISPUTED
- `PricingTier`: DAILY, WEEKLY, MONTHLY
- `DiscountType`: ROLE_BASED, VOLUME, PROMO_CODE, LOYALTY, CONTRACT, MANUAL

**Pricing Rules:**

- Daily/Weekly/Monthly tier logic
- VAT calculation (27% Hungary)
- Discount stacking with priority
- Late fee: 150% daily rate (default)
- Grace period: 2 hours
- Max late fee cap: 100% of rental amount

---

### @kgc/rental-checkout (Deposits)

**DepositService** - 59 tests

| Method                       | Story | Purpose                      |
| ---------------------------- | ----- | ---------------------------- |
| `calculateSuggestedAmount()` | 16-1  | Auto-calculate deposit       |
| `collect()`                  | 16-1  | Collect deposit (cash/card)  |
| `findById()`                 | 16-2  | Get deposit by ID            |
| `findByRentalId()`           | 16-2  | Get deposit for rental       |
| `release()`                  | 16-3  | Full deposit refund          |
| `releasePartial()`           | 16-3  | Partial refund               |
| `retain()`                   | 16-4  | Full retention (damage/loss) |
| `retainPartial()`            | 16-4  | Partial retention            |

**MyPosService** - 19 tests

- MyPOS terminal integration for card pre-authorization

**DepositReportService** - 10 tests

- Deposit analytics and reporting

**Deposit Calculation Rules:**

- Regular customers: 0 HUF (no deposit)
- New customers: 10% of equipment value
- Rounding: to nearest 1,000 HUF
- Min: 5,000 HUF
- Max: 500,000 HUF

---

### @kgc/rental-contract (Contracts)

**ContractService** - 14 tests

| Method                    | Story | Purpose                  |
| ------------------------- | ----- | ------------------------ |
| `generateContract()`      | 15-1  | Create from template     |
| `generatePdf()`           | 15-2  | Render PDF (pdf-lib)     |
| `signContract()`          | 15-3  | Record digital signature |
| `archiveContract()`       | 15-4  | Archive to S3/MinIO      |
| `getContractById()`       | 15-5  | Get contract             |
| `getContractByRentalId()` | 15-5  | Get contract for rental  |
| `listContracts()`         | 15-5  | List with filters        |
| `cancelContract()`        | 15-5  | Cancel draft/pending     |

**TemplateService** - 20 tests

- Template CRUD, variable substitution, validation

**PdfService** - 9 tests

- PDF generation with pdf-lib

**SignatureService** - 31 tests

- Digital signature handling

**ArchiveService** - 15 tests

- S3/MinIO archival (10-year retention)

**Contract Template Types:**

- RENTAL_STANDARD
- RENTAL_LONG_TERM
- RENTAL_CORPORATE
- DEPOSIT_AGREEMENT

---

## What's MISSING

### Prisma Models (Need to CREATE)

```prisma
// Rental Equipment
model RentalEquipment {
  id                String            @id @default(uuid())
  tenantId          String
  code              String            // Unique within tenant
  name              String
  category          EquipmentCategory
  status            EquipmentStatus
  condition         EquipmentCondition
  serialNumber      String?
  barcode           String?
  qrCode            String?
  dailyRate         Decimal
  weeklyRate        Decimal
  monthlyRate       Decimal
  replacementValue  Decimal
  purchaseDate      DateTime?
  lastMaintenanceAt DateTime?
  nextMaintenanceAt DateTime?
  // ... relations
}

model EquipmentAccessory {
  id          String @id
  equipmentId String
  name        String
  isRequired  Boolean
  // ...
}

model EquipmentMaintenanceRecord {
  id          String @id
  equipmentId String
  type        MaintenanceType
  performedAt DateTime
  performedBy String
  notes       String?
  cost        Decimal?
}

// Rental Core
model Rental {
  id              String       @id @default(uuid())
  tenantId        String
  rentalNumber    String       // Auto-generated
  partnerId       String
  equipmentId     String
  status          RentalStatus
  startDate       DateTime
  expectedEndDate DateTime
  actualEndDate   DateTime?
  pricingTier     PricingTier
  baseAmount      Decimal
  discountAmount  Decimal
  vatAmount       Decimal
  totalAmount     Decimal
  lateFeeAmount   Decimal?
  depositId       String?
  contractId      String?
  // ... relations
}

model RentalExtension {
  id             String @id
  rentalId       String
  previousEndDate DateTime
  newEndDate     DateTime
  additionalAmount Decimal
  createdBy      String
  createdAt      DateTime
}

model AppliedDiscount {
  id         String       @id
  rentalId   String
  type       DiscountType
  value      Decimal
  percentage Decimal?
}

model DiscountRule {
  id           String       @id
  tenantId     String
  name         String
  type         DiscountType
  value        Decimal
  isActive     Boolean
  validFrom    DateTime?
  validUntil   DateTime?
}

// Deposits
model Deposit {
  id             String        @id
  tenantId       String
  rentalId       String
  amount         Decimal
  status         DepositStatus
  paymentMethod  PaymentMethod
  collectedAt    DateTime?
  collectedBy    String?
  releasedAt     DateTime?
  releasedBy     String?
  retainedAmount Decimal?
  retentionReason String?
}

// Contracts
model Contract {
  id           String         @id
  tenantId     String
  rentalId     String
  templateId   String
  status       ContractStatus
  pdfPath      String?
  signedAt     DateTime?
  signedBy     String?
  archivedAt   DateTime?
  archivePath  String?
}

model ContractTemplate {
  id        String               @id
  tenantId  String
  type      ContractTemplateType
  name      String
  content   String               // HTML with variables
  isActive  Boolean
  version   Int
}
```

### Repository Implementations (Need to CREATE)

| Repository                       | Methods     | Interface Location         |
| -------------------------------- | ----------- | -------------------------- |
| PrismaRentalEquipmentRepository  | ~18 methods | bergep/interfaces          |
| PrismaRentalRepository           | ~17 methods | rental-core/interfaces     |
| PrismaDepositRepository          | ~8 methods  | rental-checkout/interfaces |
| PrismaContractRepository         | ~10 methods | rental-contract/interfaces |
| PrismaContractTemplateRepository | ~6 methods  | rental-contract/interfaces |

### API Controllers (Need to CREATE)

| Controller                 | Endpoints     | Priority |
| -------------------------- | ------------- | -------- |
| RentalEquipmentController  | ~12 endpoints | P1       |
| RentalController           | ~15 endpoints | P1       |
| DepositController          | ~8 endpoints  | P1       |
| ContractController         | ~10 endpoints | P2       |
| ContractTemplateController | ~6 endpoints  | P2       |

---

## Expected REST Endpoints

### Rental Equipment API

```
GET    /api/v1/equipment              # List equipment
POST   /api/v1/equipment              # Create equipment
GET    /api/v1/equipment/:id          # Get equipment
PATCH  /api/v1/equipment/:id          # Update equipment
DELETE /api/v1/equipment/:id          # Delete equipment
POST   /api/v1/equipment/:id/scan     # Scan equipment
PATCH  /api/v1/equipment/:id/status   # Change status
GET    /api/v1/equipment/:id/accessories    # List accessories
POST   /api/v1/equipment/:id/accessories    # Add accessory
GET    /api/v1/equipment/:id/maintenance    # Maintenance history
POST   /api/v1/equipment/:id/maintenance    # Log maintenance
```

### Rental API

```
GET    /api/v1/rentals                # List rentals
POST   /api/v1/rentals                # Create rental (checkout)
GET    /api/v1/rentals/:id            # Get rental
PATCH  /api/v1/rentals/:id            # Update rental
POST   /api/v1/rentals/:id/pickup     # Confirm pickup
POST   /api/v1/rentals/:id/return     # Process return
POST   /api/v1/rentals/:id/extend     # Extend rental
POST   /api/v1/rentals/:id/cancel     # Cancel rental
GET    /api/v1/rentals/:id/calculate  # Calculate pricing
POST   /api/v1/rentals/:id/discount   # Apply discount
DELETE /api/v1/rentals/:id/discount   # Remove discount
GET    /api/v1/rentals/:id/history    # Rental history
GET    /api/v1/rentals/overdue        # List overdue rentals
GET    /api/v1/rentals/statistics     # Rental analytics
```

### Deposit API

```
GET    /api/v1/deposits               # List deposits
POST   /api/v1/deposits               # Collect deposit
GET    /api/v1/deposits/:id           # Get deposit
POST   /api/v1/deposits/:id/release   # Release deposit
POST   /api/v1/deposits/:id/retain    # Retain deposit
GET    /api/v1/rentals/:id/deposit    # Get deposit for rental
```

### Contract API

```
GET    /api/v1/contracts              # List contracts
POST   /api/v1/contracts              # Generate contract
GET    /api/v1/contracts/:id          # Get contract
GET    /api/v1/contracts/:id/pdf      # Download PDF
POST   /api/v1/contracts/:id/sign     # Sign contract
POST   /api/v1/contracts/:id/archive  # Archive contract
POST   /api/v1/contracts/:id/cancel   # Cancel contract
GET    /api/v1/contract-templates     # List templates
POST   /api/v1/contract-templates     # Create template
```

---

## Story Breakdown

### RNT-S1: Prisma Schema - Rental Equipment (P0 - BLOCKING)

- [ ] Create `RentalEquipment` model with all fields
- [ ] Create `EquipmentAccessory` model
- [ ] Create `EquipmentMaintenanceRecord` model
- [ ] Create `EquipmentHistoryEntry` model
- [ ] Add enums: EquipmentStatus, EquipmentCategory, EquipmentCondition, MaintenanceType
- [ ] Create indexes for common queries

### RNT-S2: Prisma Schema - Rental Core (P0 - BLOCKING)

- [ ] Create `Rental` model with all fields
- [ ] Create `RentalExtension` model
- [ ] Create `AppliedDiscount` model
- [ ] Create `DiscountRule` model
- [ ] Create `RentalHistoryEntry` model
- [ ] Add enums: RentalStatus, PricingTier, DiscountType

### RNT-S3: Prisma Schema - Deposits & Contracts (P0 - BLOCKING)

- [ ] Create `Deposit` model
- [ ] Create `Contract` model
- [ ] Create `ContractTemplate` model
- [ ] Create `ContractSignature` model
- [ ] Add enums: DepositStatus, ContractStatus, ContractTemplateType
- [ ] Run migration

### RNT-S4: PrismaRentalEquipmentRepository (P1)

- [ ] Implement 18 methods from interface
- [ ] Add unit tests (18+ tests)
- [ ] Handle tenant isolation
- [ ] Handle soft delete

### RNT-S5: PrismaRentalRepository (P1)

- [ ] Implement 17 methods from interface
- [ ] Add unit tests (17+ tests)
- [ ] Handle rental number generation (BRL-YYYY-NNNN)
- [ ] Handle status transitions

### RNT-S6: PrismaDepositRepository (P1)

- [ ] Implement 8 methods from interface
- [ ] Add unit tests (8+ tests)
- [ ] Handle payment method tracking

### RNT-S7: PrismaContractRepository (P2)

- [ ] Implement 10 methods from interface
- [ ] Implement template repository (6 methods)
- [ ] Add unit tests (16+ tests)

### RNT-S8: API Controllers (P1)

- [ ] Create RentalEquipmentController (~12 endpoints)
- [ ] Create RentalController (~15 endpoints)
- [ ] Create DepositController (~8 endpoints)
- [ ] Create DTOs with validation
- [ ] Add Swagger documentation

### RNT-S9: Contract Controllers (P2)

- [ ] Create ContractController (~10 endpoints)
- [ ] Create ContractTemplateController (~6 endpoints)
- [ ] Add DTOs with validation

### RNT-S10: RentalModule Registration (P1)

- [ ] Create RentalModule
- [ ] Register all repositories
- [ ] Register all controllers
- [ ] Export services
- [ ] Add to app.module.ts

### RNT-S11: E2E Tests (P2)

- [ ] Rental checkout flow (create → pickup → return)
- [ ] Extension flow
- [ ] Late fee calculation
- [ ] Deposit collection/release
- [ ] Contract generation/signing
- [ ] Equipment CRUD

---

## File Structure

```
apps/kgc-api/src/modules/rental/
├── rental.module.ts                      ❌ Create
├── controllers/
│   ├── rental-equipment.controller.ts    ❌ Create
│   ├── rental.controller.ts              ❌ Create
│   ├── deposit.controller.ts             ❌ Create
│   ├── contract.controller.ts            ❌ Create
│   └── contract-template.controller.ts   ❌ Create
├── dto/
│   ├── rental-equipment.dto.ts           ❌ Create
│   ├── rental.dto.ts                     ❌ Create
│   ├── deposit.dto.ts                    ❌ Create
│   └── contract.dto.ts                   ❌ Create
└── repositories/
    ├── prisma-rental-equipment.repository.ts  ❌ Create
    ├── prisma-rental.repository.ts            ❌ Create
    ├── prisma-deposit.repository.ts           ❌ Create
    └── prisma-contract.repository.ts          ❌ Create
```

---

## Dependencies

### Depends On (Must be ready first)

- **Inventory Domain** - Equipment links to inventory items
- **Partner Domain** - Rentals reference partners

### Depended By (Blocks these)

- **Szerviz Domain** - Worksheets can link to rentals
- **Sales Domain** - Invoices reference rental transactions

---

## Execution Order

```
Phase 1: Schema (BLOCKING)
├── RNT-S1: Equipment schema
├── RNT-S2: Rental core schema
└── RNT-S3: Deposit/Contract schema
    ↓ pnpm db:migrate

Phase 2: Repositories (PARALLEL)
├── RNT-S4: Equipment repository
├── RNT-S5: Rental repository
├── RNT-S6: Deposit repository
└── RNT-S7: Contract repository
    ↓

Phase 3: API Layer
├── RNT-S8: Core controllers
├── RNT-S9: Contract controllers
└── RNT-S10: Module registration
    ↓

Phase 4: Testing
└── RNT-S11: E2E tests
```

---

## Progress Tracking

| Story   | Status  | Started | Completed |
| ------- | ------- | ------- | --------- |
| RNT-S1  | ⬜ TODO |         |           |
| RNT-S2  | ⬜ TODO |         |           |
| RNT-S3  | ⬜ TODO |         |           |
| RNT-S4  | ⬜ TODO |         |           |
| RNT-S5  | ⬜ TODO |         |           |
| RNT-S6  | ⬜ TODO |         |           |
| RNT-S7  | ⬜ TODO |         |           |
| RNT-S8  | ⬜ TODO |         |           |
| RNT-S9  | ⬜ TODO |         |           |
| RNT-S10 | ⬜ TODO |         |           |
| RNT-S11 | ⬜ TODO |         |           |

---

## External Service Dependencies

Services expect these via dependency injection:

| Interface           | Provider         | Used By                       |
| ------------------- | ---------------- | ----------------------------- |
| IPartnerService     | Partner module   | RentalService, DepositService |
| IInventoryService   | Inventory module | RentalEquipmentService        |
| IAuditService       | Audit module     | All services                  |
| IFileStorageService | Storage module   | ArchiveService                |

---

_Last Updated: 2026-01-23_
_Document Version: 1.0_
