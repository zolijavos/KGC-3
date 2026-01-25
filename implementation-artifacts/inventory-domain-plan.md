# Inventory Domain Implementation Plan

> **Created:** 2026-01-23
> **Status:** IN PROGRESS
> **Phase:** BMAD Phase 4 - Implementation
> **Priority:** P0 - Critical Path

---

## Executive Summary

The Inventory domain has a complete service layer (221 unit tests passing) but is missing the persistence and API layers. This document tracks the implementation progress to complete the Inventory module.

### Quick Stats

| Layer                | Status      | Progress                |
| -------------------- | ----------- | ----------------------- |
| Service Layer        | ✅ Complete | 6/6 services, 221 tests |
| Repository Layer     | 🔴 Partial  | 1/5 repositories (20%)  |
| API Controller Layer | 🔴 Partial  | 1/5 controllers (20%)   |
| Prisma Schema        | 🟡 Partial  | 5/8 models              |
| E2E Tests            | 🔴 Missing  | 0/28 tests              |

---

## Current State Analysis

### ✅ What EXISTS

#### Service Layer (`packages/shared/inventory/src/services/`)

| Service              | Unit Tests    | Status         |
| -------------------- | ------------- | -------------- |
| inventory.service.ts | 56 tests      | ✅ Complete    |
| warehouse.service.ts | 27 tests      | ✅ Complete    |
| location.service.ts  | 32 tests      | ✅ Complete    |
| movement.service.ts  | 16 tests      | ✅ Complete    |
| tracking.service.ts  | 47 tests      | ✅ Complete    |
| alert.service.ts     | 43 tests      | ✅ Complete    |
| **TOTAL**            | **221 tests** | ✅ All Passing |

#### Interface Definitions (`packages/shared/inventory/src/interfaces/`)

| Interface            | Methods        | Status         |
| -------------------- | -------------- | -------------- |
| IInventoryRepository | 17 methods     | ✅ Defined     |
| IWarehouseRepository | 14 methods     | ✅ Defined     |
| ILocationRepository  | 13 methods     | ✅ Defined     |
| IMovementRepository  | 7 methods      | ✅ Defined     |
| IAlertRepository     | 14 methods     | ✅ Defined     |
| **TOTAL**            | **65 methods** | ✅ All Defined |

#### API Layer (`apps/kgc-api/src/modules/inventory/`)

| Component                      | Status                  |
| ------------------------------ | ----------------------- |
| inventory.module.ts            | ✅ Exists               |
| inventory.controller.ts        | ✅ Exists (8 endpoints) |
| prisma-inventory.repository.ts | ✅ Exists (17 methods)  |

#### Prisma Schema (`apps/kgc-api/prisma/schema.prisma`)

| Model         | Status      | Notes                                                    |
| ------------- | ----------- | -------------------------------------------------------- |
| Warehouse     | ✅ Exists   | Missing: type, city, postalCode, contact fields          |
| StockLocation | ✅ Exists   | Missing: kommando/polc/doboz, capacity, currentOccupancy |
| InventoryItem | ✅ Complete | All fields present                                       |
| StockMovement | ✅ Exists   | Enum mapping differs from interface                      |
| StockAlert    | ✅ Exists   | Missing: priority, status, snoozedUntil, deficit         |

---

### ❌ What's MISSING

#### Prisma Models (Need to CREATE)

| Model             | Purpose                           | Reference Interface    |
| ----------------- | --------------------------------- | ---------------------- |
| InventoryTransfer | Warehouse-to-warehouse transfers  | warehouse.interface.ts |
| TransferItem      | Items within a transfer           | warehouse.interface.ts |
| StockLevelSetting | Alert thresholds per product      | alert.interface.ts     |
| LocationStructure | K-P-D configuration per warehouse | location.interface.ts  |

#### Prisma Models (Need to EXTEND)

| Model         | Missing Fields                                                                               |
| ------------- | -------------------------------------------------------------------------------------------- |
| Warehouse     | type, city, postalCode, contactName, contactPhone, contactEmail, status                      |
| StockLocation | kommando, polc, doboz, capacity, currentOccupancy, isDeleted                                 |
| StockAlert    | priority, status, snoozedUntil, deficit, productName, warehouseName, details, lastNotifiedAt |

#### Repositories (Need to CREATE)

| Repository                     | Interface            | Methods        |
| ------------------------------ | -------------------- | -------------- |
| prisma-warehouse.repository.ts | IWarehouseRepository | 14 methods     |
| prisma-location.repository.ts  | ILocationRepository  | 13 methods     |
| prisma-movement.repository.ts  | IMovementRepository  | 7 methods      |
| prisma-alert.repository.ts     | IAlertRepository     | 14 methods     |
| **TOTAL**                      |                      | **48 methods** |

#### Controllers (Need to CREATE)

| Controller              | Endpoints         | Priority |
| ----------------------- | ----------------- | -------- |
| warehouse.controller.ts | ~8 endpoints      | P1       |
| location.controller.ts  | ~7 endpoints      | P1       |
| movement.controller.ts  | ~5 endpoints      | P2       |
| alert.controller.ts     | ~8 endpoints      | P2       |
| **TOTAL**               | **~28 endpoints** |          |

#### E2E Tests (Need to CREATE)

| Test Suite       | Test Count   | Priority |
| ---------------- | ------------ | -------- |
| inventory.e2e.ts | 8 tests      | P1       |
| warehouse.e2e.ts | 6 tests      | P1       |
| location.e2e.ts  | 5 tests      | P2       |
| movement.e2e.ts  | 4 tests      | P2       |
| alert.e2e.ts     | 5 tests      | P2       |
| **TOTAL**        | **28 tests** |          |

---

## Story Breakdown

### INV-S1: Prisma Schema Extension (BLOCKING!)

**Priority:** P0 - Must complete first
**Estimated Effort:** Medium
**Dependencies:** None

#### Acceptance Criteria

- [ ] **AC1:** Create `InventoryTransfer` model with fields:
  - id, tenantId, transferCode, sourceWarehouseId, targetWarehouseId
  - status (PENDING, IN_TRANSIT, COMPLETED, CANCELLED)
  - reason, initiatedBy, initiatedAt, completedBy, completedAt
  - createdAt, updatedAt

- [ ] **AC2:** Create `TransferItem` model with fields:
  - id, transferId, inventoryItemId, serialNumber, quantity, unit, note

- [ ] **AC3:** Create `StockLevelSetting` model with fields:
  - id, tenantId, productId, warehouseId (optional)
  - minimumLevel, reorderPoint, reorderQuantity, maximumLevel
  - unit, leadTimeDays, isActive, createdAt, updatedAt

- [ ] **AC4:** Create `LocationStructure` model with fields:
  - id, tenantId, warehouseId
  - kommandoPrefix, polcPrefix, dobozPrefix, separator
  - maxKommando, maxPolcPerKommando, maxDobozPerPolc
  - createdAt, updatedAt

- [ ] **AC5:** Extend `Warehouse` model with:
  - type (MAIN, BRANCH, VIRTUAL, TRANSIT)
  - city, postalCode, contactName, contactPhone, contactEmail
  - status (ACTIVE, INACTIVE, CLOSED)

- [ ] **AC6:** Extend `StockLocation` model with:
  - kommando (Int), polc (Int), doboz (Int)
  - capacity (Int, optional), currentOccupancy (Int, default 0)
  - isDeleted (Boolean, default false)

- [ ] **AC7:** Extend `StockAlert` model with:
  - priority (LOW, MEDIUM, HIGH, CRITICAL)
  - status (ACTIVE, ACKNOWLEDGED, RESOLVED, SNOOZED)
  - deficit (Int, optional), productName, warehouseName
  - details, snoozedUntil, lastNotifiedAt

- [ ] **AC8:** Create and run migration successfully
- [ ] **AC9:** Update Prisma enums to match interface types
- [ ] **AC10:** `pnpm db:generate` runs without errors

#### Technical Notes

```prisma
// New enums needed
enum WarehouseType { MAIN BRANCH VIRTUAL TRANSIT }
enum WarehouseStatus { ACTIVE INACTIVE CLOSED }
enum TransferStatus { PENDING IN_TRANSIT COMPLETED CANCELLED }
enum AlertPriority { LOW MEDIUM HIGH CRITICAL }
enum AlertStatus { ACTIVE ACKNOWLEDGED RESOLVED SNOOZED }
enum LocationStatus { ACTIVE INACTIVE FULL }
```

---

### INV-S2: PrismaWarehouseRepository

**Priority:** P1
**Estimated Effort:** Large
**Dependencies:** INV-S1
**Interface:** `IWarehouseRepository` (14 methods)

#### Methods to Implement

- [ ] `create(warehouse)` → Warehouse
- [ ] `findById(id, tenantId)` → Warehouse | null
- [ ] `findByCode(code, tenantId)` → Warehouse | null
- [ ] `findDefault(tenantId)` → Warehouse | null
- [ ] `query(query: WarehouseQuery)` → WarehouseQueryResult
- [ ] `update(id, tenantId, data)` → Warehouse
- [ ] `delete(id, tenantId)` → void (soft delete)
- [ ] `createTransfer(transfer)` → InventoryTransfer
- [ ] `findTransferById(id, tenantId)` → InventoryTransfer | null
- [ ] `findTransferByCode(code, tenantId)` → InventoryTransfer | null
- [ ] `queryTransfers(query: TransferQuery)` → TransferQueryResult
- [ ] `updateTransfer(id, tenantId, data)` → InventoryTransfer
- [ ] `getCrossWarehouseStock(tenantId, productIds?)` → CrossWarehouseStockSummary[]
- [ ] `hasInventoryItems(warehouseId, tenantId)` → boolean

#### Unit Tests Required

- [ ] create: creates warehouse with all fields
- [ ] create: throws on duplicate code within tenant
- [ ] findById: returns null for non-existent
- [ ] findByCode: finds by unique code
- [ ] findDefault: returns default warehouse
- [ ] query: filters by type, status, city
- [ ] query: pagination works correctly
- [ ] update: updates allowed fields
- [ ] delete: soft deletes (sets isDeleted)
- [ ] createTransfer: creates with items
- [ ] findTransferById: includes items relation
- [ ] queryTransfers: filters by status, date range
- [ ] updateTransfer: updates status correctly
- [ ] getCrossWarehouseStock: aggregates across warehouses
- [ ] hasInventoryItems: returns true when items exist

---

### INV-S3: PrismaLocationRepository

**Priority:** P1
**Estimated Effort:** Medium
**Dependencies:** INV-S1
**Interface:** `ILocationRepository` (13 methods)

#### Methods to Implement

- [ ] `createStructure(structure)` → LocationStructure
- [ ] `getStructure(tenantId, warehouseId)` → LocationStructure | null
- [ ] `updateStructure(id, tenantId, data)` → LocationStructure
- [ ] `createLocation(location)` → LocationCode
- [ ] `createLocations(locations[])` → number (bulk insert)
- [ ] `findByCode(code, tenantId, warehouseId)` → LocationCode | null
- [ ] `findById(id, tenantId)` → LocationCode | null
- [ ] `query(query: LocationQuery)` → LocationQueryResult
- [ ] `updateLocation(id, tenantId, data)` → LocationCode
- [ ] `updateOccupancy(id, tenantId, adjustment)` → LocationCode
- [ ] `deleteLocation(id, tenantId)` → void (soft delete)
- [ ] `deleteAllByWarehouse(tenantId, warehouseId)` → number

#### Unit Tests Required

- [ ] createStructure: creates with K-P-D config
- [ ] getStructure: returns null if not configured
- [ ] createLocation: validates K-P-D format
- [ ] createLocations: bulk creates efficiently
- [ ] findByCode: finds "K1-P2-D3" format
- [ ] query: filters by kommando, polc
- [ ] query: availableOnly returns non-full locations
- [ ] updateOccupancy: increments/decrements correctly
- [ ] updateOccupancy: respects capacity limits
- [ ] deleteLocation: soft deletes
- [ ] deleteAllByWarehouse: cleans up all locations

---

### INV-S4: PrismaMovementRepository

**Priority:** P2
**Estimated Effort:** Small
**Dependencies:** INV-S1
**Interface:** `IMovementRepository` (7 methods)

#### Methods to Implement

- [ ] `create(movement)` → InventoryMovement
- [ ] `createMany(movements[])` → number (bulk insert)
- [ ] `findById(id, tenantId)` → InventoryMovement | null
- [ ] `query(query: MovementQuery)` → MovementQueryResult
- [ ] `getHistory(inventoryItemId, tenantId, limit?)` → InventoryMovement[]
- [ ] `getSummary(tenantId, warehouseId, periodStart, periodEnd)` → MovementSummary
- [ ] `getLastMovement(inventoryItemId, tenantId)` → InventoryMovement | null

#### Unit Tests Required

- [ ] create: records all movement fields
- [ ] create: captures previousQuantity and newQuantity
- [ ] createMany: bulk inserts efficiently
- [ ] query: filters by type, date range
- [ ] query: filters by referenceId
- [ ] getHistory: returns chronological order
- [ ] getSummary: aggregates by movement type
- [ ] getLastMovement: returns most recent

---

### INV-S5: PrismaAlertRepository

**Priority:** P2
**Estimated Effort:** Large
**Dependencies:** INV-S1
**Interface:** `IAlertRepository` (14 methods)

#### Methods to Implement

**Stock Level Settings:**

- [ ] `createStockLevelSetting(setting)` → StockLevelSetting
- [ ] `findStockLevelSettingById(id, tenantId)` → StockLevelSetting | null
- [ ] `findStockLevelSettingByProduct(productId, tenantId, warehouseId?)` → StockLevelSetting | null
- [ ] `queryStockLevelSettings(query)` → { items, total }
- [ ] `updateStockLevelSetting(id, tenantId, updates)` → StockLevelSetting
- [ ] `deleteStockLevelSetting(id, tenantId)` → void

**Stock Alerts:**

- [ ] `createAlert(alert)` → StockAlert
- [ ] `findAlertById(id, tenantId)` → StockAlert | null
- [ ] `findActiveAlertForProduct(productId, tenantId, warehouseId?, type?)` → StockAlert | null
- [ ] `queryAlerts(query: AlertQuery)` → AlertQueryResult
- [ ] `updateAlert(id, tenantId, updates)` → StockAlert
- [ ] `getAlertSummary(tenantId)` → AlertSummary
- [ ] `resolveAlertsByProduct(productId, tenantId, warehouseId?)` → number

#### Unit Tests Required

- [ ] createStockLevelSetting: validates minimumLevel < reorderPoint
- [ ] findStockLevelSettingByProduct: warehouse-specific vs global
- [ ] createAlert: sets priority based on deficit
- [ ] findActiveAlertForProduct: excludes resolved/snoozed
- [ ] queryAlerts: filters by priority, status
- [ ] updateAlert: transitions status correctly
- [ ] getAlertSummary: counts by type and priority
- [ ] resolveAlertsByProduct: bulk resolves

---

### INV-S6: API Controllers

**Priority:** P1
**Estimated Effort:** Large
**Dependencies:** INV-S2, INV-S3, INV-S4, INV-S5

#### WarehouseController Endpoints

| Method | Endpoint                         | Description      |
| ------ | -------------------------------- | ---------------- |
| GET    | /api/v1/warehouses               | List warehouses  |
| GET    | /api/v1/warehouses/:id           | Get warehouse    |
| POST   | /api/v1/warehouses               | Create warehouse |
| PATCH  | /api/v1/warehouses/:id           | Update warehouse |
| DELETE | /api/v1/warehouses/:id           | Delete warehouse |
| POST   | /api/v1/warehouses/transfers     | Create transfer  |
| GET    | /api/v1/warehouses/transfers/:id | Get transfer     |
| PATCH  | /api/v1/warehouses/transfers/:id | Update transfer  |

#### LocationController Endpoints

| Method | Endpoint                                 | Description         |
| ------ | ---------------------------------------- | ------------------- |
| GET    | /api/v1/locations                        | List locations      |
| GET    | /api/v1/locations/:id                    | Get location        |
| POST   | /api/v1/locations                        | Create location     |
| POST   | /api/v1/locations/bulk                   | Bulk create         |
| PATCH  | /api/v1/locations/:id                    | Update location     |
| DELETE | /api/v1/locations/:id                    | Delete location     |
| GET    | /api/v1/locations/structure/:warehouseId | Get K-P-D structure |

#### MovementController Endpoints

| Method | Endpoint                          | Description      |
| ------ | --------------------------------- | ---------------- |
| GET    | /api/v1/movements                 | List movements   |
| GET    | /api/v1/movements/:id             | Get movement     |
| GET    | /api/v1/movements/history/:itemId | Get item history |
| GET    | /api/v1/movements/summary         | Get summary      |
| POST   | /api/v1/movements                 | Record movement  |

#### AlertController Endpoints

| Method | Endpoint                       | Description    |
| ------ | ------------------------------ | -------------- |
| GET    | /api/v1/alerts                 | List alerts    |
| GET    | /api/v1/alerts/:id             | Get alert      |
| GET    | /api/v1/alerts/summary         | Get summary    |
| POST   | /api/v1/alerts/:id/acknowledge | Acknowledge    |
| POST   | /api/v1/alerts/:id/snooze      | Snooze         |
| POST   | /api/v1/alerts/:id/resolve     | Resolve        |
| GET    | /api/v1/alerts/settings        | List settings  |
| POST   | /api/v1/alerts/settings        | Create setting |

---

### INV-S7: InventoryModule Extension

**Priority:** P1
**Estimated Effort:** Small
**Dependencies:** INV-S2, INV-S3, INV-S4, INV-S5, INV-S6

#### Acceptance Criteria

- [ ] Register all 4 new repositories as providers
- [ ] Register all 4 new controllers
- [ ] Configure dependency injection tokens
- [ ] Export services for other modules
- [ ] Update module imports

#### Code Changes

```typescript
// inventory.module.ts updates needed:
@Module({
  imports: [PrismaModule],
  controllers: [
    InventoryController, // ✅ Exists
    WarehouseController, // ❌ Add
    LocationController, // ❌ Add
    MovementController, // ❌ Add
    AlertController, // ❌ Add
  ],
  providers: [
    // Repositories
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository }, // ✅
    { provide: WAREHOUSE_REPOSITORY, useClass: PrismaWarehouseRepository }, // ❌ Add
    { provide: LOCATION_REPOSITORY, useClass: PrismaLocationRepository }, // ❌ Add
    { provide: MOVEMENT_REPOSITORY, useClass: PrismaMovementRepository }, // ❌ Add
    { provide: ALERT_REPOSITORY, useClass: PrismaAlertRepository }, // ❌ Add

    // Services (from @kgc/inventory)
    InventoryService,
    WarehouseService,
    LocationService,
    MovementService,
    AlertService,
    TrackingService,
  ],
  exports: [InventoryService, WarehouseService, LocationService, MovementService, AlertService],
})
export class InventoryModule {}
```

---

### INV-S8: E2E Test Suite

**Priority:** P2
**Estimated Effort:** Medium
**Dependencies:** INV-S6, INV-S7

#### Test Structure

```
apps/kgc-api/test/
├── inventory/
│   ├── inventory.e2e.ts      # 8 tests
│   ├── warehouse.e2e.ts      # 6 tests
│   ├── location.e2e.ts       # 5 tests
│   ├── movement.e2e.ts       # 4 tests
│   └── alert.e2e.ts          # 5 tests
└── fixtures/
    └── inventory.fixtures.ts  # Test data
```

#### Critical Test Scenarios

**Inventory E2E:**

- [ ] Create inventory item with serial number
- [ ] Create batch tracked item
- [ ] Update item status (AVAILABLE → RESERVED)
- [ ] Search by serial number
- [ ] Filter by warehouse and status
- [ ] Soft delete item
- [ ] Bulk status update
- [ ] Concurrent update handling

**Warehouse E2E:**

- [ ] Create warehouse with all fields
- [ ] Set default warehouse
- [ ] Create transfer between warehouses
- [ ] Complete transfer flow (PENDING → IN_TRANSIT → COMPLETED)
- [ ] Cancel transfer
- [ ] Get cross-warehouse stock summary

**Location E2E:**

- [ ] Create K-P-D structure
- [ ] Bulk create locations
- [ ] Validate location code format
- [ ] Update occupancy
- [ ] Delete all locations by warehouse

**Movement E2E:**

- [ ] Record IN movement
- [ ] Record OUT movement
- [ ] Get movement history
- [ ] Get movement summary by period

**Alert E2E:**

- [ ] Create stock level setting
- [ ] Trigger low stock alert
- [ ] Acknowledge alert
- [ ] Snooze alert
- [ ] Resolve alert

---

## Execution Plan

### Phase 1: Schema (BLOCKING)

```
┌─────────────────────────────────────────┐
│  INV-S1: Prisma Schema Extension        │
│  ⏱️ Must complete before Phase 2        │
│  📋 10 Acceptance Criteria              │
└─────────────────────────────────────────┘
                    ↓
            pnpm db:generate
            pnpm db:migrate
                    ↓
```

### Phase 2: Repositories (PARALLEL)

```
┌───────────────────┬───────────────────┐
│ INV-S2: Warehouse │ INV-S3: Location  │
│ (14 methods)      │ (13 methods)      │
├───────────────────┼───────────────────┤
│ INV-S4: Movement  │ INV-S5: Alert     │
│ (7 methods)       │ (14 methods)      │
└───────────────────┴───────────────────┘
         ↓ All 4 can run in parallel ↓
```

### Phase 3: API Layer

```
┌───────────────────────────────────────────┐
│  INV-S6: Controllers (28 endpoints)       │
│  INV-S7: Module Registration              │
│  ⏱️ Depends on all Phase 2 completion     │
└───────────────────────────────────────────┘
                    ↓
```

### Phase 4: Testing

```
┌───────────────────────────────────────────┐
│  INV-S8: E2E Test Suite (28 tests)        │
│  ⏱️ Depends on Phase 3 completion         │
└───────────────────────────────────────────┘
```

---

## File Structure Reference

```
apps/kgc-api/
├── prisma/
│   └── schema.prisma              # ⚠️ Extend (INV-S1)
│
├── src/modules/inventory/
│   ├── inventory.module.ts        # ⚠️ Extend (INV-S7)
│   ├── inventory.controller.ts    # ✅ Exists
│   ├── warehouse.controller.ts    # ❌ Create (INV-S6)
│   ├── location.controller.ts     # ❌ Create (INV-S6)
│   ├── movement.controller.ts     # ❌ Create (INV-S6)
│   ├── alert.controller.ts        # ❌ Create (INV-S6)
│   │
│   ├── dto/
│   │   ├── inventory.dto.ts       # ✅ Exists
│   │   ├── warehouse.dto.ts       # ❌ Create (INV-S6)
│   │   ├── location.dto.ts        # ❌ Create (INV-S6)
│   │   ├── movement.dto.ts        # ❌ Create (INV-S6)
│   │   └── alert.dto.ts           # ❌ Create (INV-S6)
│   │
│   └── repositories/
│       ├── prisma-inventory.repository.ts    # ✅ Exists
│       ├── prisma-warehouse.repository.ts    # ❌ Create (INV-S2)
│       ├── prisma-location.repository.ts     # ❌ Create (INV-S3)
│       ├── prisma-movement.repository.ts     # ❌ Create (INV-S4)
│       └── prisma-alert.repository.ts        # ❌ Create (INV-S5)
│
└── test/inventory/
    ├── inventory.e2e.ts           # ❌ Create (INV-S8)
    ├── warehouse.e2e.ts           # ❌ Create (INV-S8)
    ├── location.e2e.ts            # ❌ Create (INV-S8)
    ├── movement.e2e.ts            # ❌ Create (INV-S8)
    └── alert.e2e.ts               # ❌ Create (INV-S8)
```

---

## Interface Quick Reference

### IWarehouseRepository (14 methods)

```typescript
create(warehouse): Promise<Warehouse>
findById(id, tenantId): Promise<Warehouse | null>
findByCode(code, tenantId): Promise<Warehouse | null>
findDefault(tenantId): Promise<Warehouse | null>
query(query): Promise<WarehouseQueryResult>
update(id, tenantId, data): Promise<Warehouse>
delete(id, tenantId): Promise<void>
createTransfer(transfer): Promise<InventoryTransfer>
findTransferById(id, tenantId): Promise<InventoryTransfer | null>
findTransferByCode(code, tenantId): Promise<InventoryTransfer | null>
queryTransfers(query): Promise<TransferQueryResult>
updateTransfer(id, tenantId, data): Promise<InventoryTransfer>
getCrossWarehouseStock(tenantId, productIds?): Promise<CrossWarehouseStockSummary[]>
hasInventoryItems(warehouseId, tenantId): Promise<boolean>
```

### ILocationRepository (13 methods)

```typescript
createStructure(structure): Promise<LocationStructure>
getStructure(tenantId, warehouseId): Promise<LocationStructure | null>
updateStructure(id, tenantId, data): Promise<LocationStructure>
createLocation(location): Promise<LocationCode>
createLocations(locations[]): Promise<number>
findByCode(code, tenantId, warehouseId): Promise<LocationCode | null>
findById(id, tenantId): Promise<LocationCode | null>
query(query): Promise<LocationQueryResult>
updateLocation(id, tenantId, data): Promise<LocationCode>
updateOccupancy(id, tenantId, adjustment): Promise<LocationCode>
deleteLocation(id, tenantId): Promise<void>
deleteAllByWarehouse(tenantId, warehouseId): Promise<number>
```

### IMovementRepository (7 methods)

```typescript
create(movement): Promise<InventoryMovement>
createMany(movements[]): Promise<number>
findById(id, tenantId): Promise<InventoryMovement | null>
query(query): Promise<MovementQueryResult>
getHistory(inventoryItemId, tenantId, limit?): Promise<InventoryMovement[]>
getSummary(tenantId, warehouseId, periodStart, periodEnd): Promise<MovementSummary>
getLastMovement(inventoryItemId, tenantId): Promise<InventoryMovement | null>
```

### IAlertRepository (14 methods)

```typescript
// Stock Level Settings
createStockLevelSetting(setting): Promise<StockLevelSetting>
findStockLevelSettingById(id, tenantId): Promise<StockLevelSetting | null>
findStockLevelSettingByProduct(productId, tenantId, warehouseId?): Promise<StockLevelSetting | null>
queryStockLevelSettings(query): Promise<{ items, total }>
updateStockLevelSetting(id, tenantId, updates): Promise<StockLevelSetting>
deleteStockLevelSetting(id, tenantId): Promise<void>

// Stock Alerts
createAlert(alert): Promise<StockAlert>
findAlertById(id, tenantId): Promise<StockAlert | null>
findActiveAlertForProduct(productId, tenantId, warehouseId?, type?): Promise<StockAlert | null>
queryAlerts(query): Promise<AlertQueryResult>
updateAlert(id, tenantId, updates): Promise<StockAlert>
getAlertSummary(tenantId): Promise<AlertSummary>
resolveAlertsByProduct(productId, tenantId, warehouseId?): Promise<number>
```

---

## Progress Tracking

### Overall Progress

| Story  | Status  | Started | Completed |
| ------ | ------- | ------- | --------- |
| INV-S1 | ⬜ TODO |         |           |
| INV-S2 | ⬜ TODO |         |           |
| INV-S3 | ⬜ TODO |         |           |
| INV-S4 | ⬜ TODO |         |           |
| INV-S5 | ⬜ TODO |         |           |
| INV-S6 | ⬜ TODO |         |           |
| INV-S7 | ⬜ TODO |         |           |
| INV-S8 | ⬜ TODO |         |           |

**Legend:** ⬜ TODO | 🔄 IN PROGRESS | ✅ DONE | ❌ BLOCKED

---

## Notes

- All interface definitions are in `packages/shared/inventory/src/interfaces/`
- Follow TDD: Write tests first, then implementation
- Use existing `prisma-inventory.repository.ts` as reference pattern
- All repositories must handle multi-tenancy (tenantId filtering)
- Controllers must use DTOs with class-validator decorators
- Follow ADR-001 for RLS patterns
- Follow ADR-032 for RBAC on endpoints

---

_Last Updated: 2026-01-23_
_Document Version: 1.0_
