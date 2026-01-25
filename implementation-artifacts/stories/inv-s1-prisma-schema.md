# Story INV-S1: Prisma Schema Extension

> **Epic:** Inventory Domain Completion
> **Priority:** P0 - BLOCKING
> **Status:** DONE
> **Assignee:** Dev Agent (Amelia)

---

## Summary

Extend the Prisma schema with missing Inventory domain models and fields to support the full inventory management functionality including transfers, stock level settings, and location structure.

---

## Acceptance Criteria

### AC1: Create InventoryTransfer Model

- [x] Create `InventoryTransfer` model with fields:
  - id (UUID, primary key)
  - tenantId (UUID, required)
  - transferCode (String, unique within tenant)
  - sourceWarehouseId (UUID, FK to Warehouse)
  - targetWarehouseId (UUID, FK to Warehouse)
  - status (TransferStatus enum)
  - reason (String, optional)
  - initiatedBy (UUID, required)
  - initiatedAt (DateTime, required)
  - completedBy (UUID, optional)
  - completedAt (DateTime, optional)
  - createdAt, updatedAt timestamps
- [x] Add relation to Warehouse (source and target)
- [x] Add composite unique constraint on [tenantId, transferCode]

### AC2: Create TransferItem Model

- [x] Create `TransferItem` model with fields:
  - id (UUID, primary key)
  - transferId (UUID, FK to InventoryTransfer)
  - inventoryItemId (UUID, FK to InventoryItem)
  - serialNumber (String, optional)
  - quantity (Int, required)
  - unit (String, required)
  - note (String, optional)
- [x] Add relation to InventoryTransfer and InventoryItem

### AC3: Create StockLevelSetting Model

- [x] Create `StockLevelSetting` model with fields:
  - id (UUID, primary key)
  - tenantId (UUID, required)
  - productId (UUID, required)
  - warehouseId (UUID, optional - null means all warehouses)
  - minimumLevel (Int, required)
  - reorderPoint (Int, required)
  - reorderQuantity (Int, required)
  - maximumLevel (Int, optional)
  - unit (String, required)
  - leadTimeDays (Int, optional)
  - isActive (Boolean, default true)
  - createdAt, updatedAt timestamps
- [x] Add unique constraint on [tenantId, productId, warehouseId]

### AC4: Create LocationStructure Model

- [x] Create `LocationStructure` model with fields:
  - id (UUID, primary key)
  - tenantId (UUID, required)
  - warehouseId (UUID, FK to Warehouse)
  - kommandoPrefix (String, default "K")
  - polcPrefix (String, default "P")
  - dobozPrefix (String, default "D")
  - separator (String, default "-")
  - maxKommando (Int, required)
  - maxPolcPerKommando (Int, required)
  - maxDobozPerPolc (Int, required)
  - createdAt, updatedAt timestamps
- [x] Add unique constraint on [tenantId, warehouseId]

### AC5: Extend Warehouse Model

- [x] Add `type` field (WarehouseType enum: MAIN, BRANCH, VIRTUAL, TRANSIT)
- [x] Add `status` field (WarehouseStatus enum: ACTIVE, INACTIVE, CLOSED)
- [x] Add `city` field (String, optional)
- [x] Add `postalCode` field (String, optional)
- [x] Add `contactName` field (String, optional)
- [x] Add `contactPhone` field (String, optional)
- [x] Add `contactEmail` field (String, optional)

### AC6: Extend StockLocation Model

- [x] Add `kommando` field (Int, required)
- [x] Add `polc` field (Int, required)
- [x] Add `doboz` field (Int, required)
- [x] Add `capacity` field (Int, optional)
- [x] Add `currentOccupancy` field (Int, default 0)
- [x] Add `status` field (LocationStatus enum: ACTIVE, INACTIVE, FULL)
- [x] Add `isDeleted` field (Boolean, default false)

### AC7: Extend StockAlert Model

- [x] Add `priority` field (AlertPriority enum: LOW, MEDIUM, HIGH, CRITICAL)
- [x] Add `status` field (AlertStatus enum: ACTIVE, ACKNOWLEDGED, RESOLVED, SNOOZED)
- [x] Add `deficit` field (Int, optional)
- [x] Add `productName` field (String, optional - denormalized)
- [x] Add `warehouseName` field (String, optional - denormalized)
- [x] Add `details` field (String, optional)
- [x] Add `snoozedUntil` field (DateTime, optional)
- [x] Add `lastNotifiedAt` field (DateTime, optional)

### AC8: Create New Enums

- [x] Create `TransferStatus` enum: PENDING, IN_TRANSIT, COMPLETED, CANCELLED
- [x] Create `WarehouseType` enum: MAIN, BRANCH, VIRTUAL, TRANSIT
- [x] Create `WarehouseStatus` enum: ACTIVE, INACTIVE, CLOSED
- [x] Create `LocationStatus` enum: ACTIVE, INACTIVE, FULL
- [x] Create `AlertPriority` enum: LOW, MEDIUM, HIGH, CRITICAL
- [x] Create `AlertStatus` enum: ACTIVE, ACKNOWLEDGED, RESOLVED, SNOOZED

### AC9: Migration

- [x] Generate Prisma migration with descriptive name
- [x] Migration applies successfully without errors
- [x] Existing data is preserved (if any)

### AC10: Validation

- [x] `pnpm db:generate` runs without errors (kgc-api)
- [x] TypeScript compilation succeeds
- [x] All existing tests still pass (221 inventory tests)

---

## Technical Notes

### File Modified

- `apps/kgc-api/prisma/schema.prisma`

### Reference Interfaces

- `packages/shared/inventory/src/interfaces/warehouse.interface.ts` - InventoryTransfer, TransferItem
- `packages/shared/inventory/src/interfaces/location.interface.ts` - LocationStructure, LocationCode
- `packages/shared/inventory/src/interfaces/alert.interface.ts` - StockLevelSetting, StockAlert extensions

### Naming Conventions

- Model names: PascalCase (e.g., `InventoryTransfer`)
- Field names: camelCase (e.g., `sourceWarehouseId`)
- Enum values: SCREAMING_SNAKE_CASE (e.g., `IN_TRANSIT`)
- Table names: snake_case via `@@map()` (e.g., `inventory_transfers`)
- Column names: snake_case via `@map()` (e.g., `source_warehouse_id`)

### Index Strategy

- Added indexes on frequently filtered fields (tenantId, status, type)
- Added indexes on foreign keys
- Added composite indexes for common query patterns (kommando, polc, doboz)

---

## Tasks

- [x] **Task 1:** Add new enums to schema (TransferStatus, WarehouseType, etc.)
- [x] **Task 2:** Create InventoryTransfer model
- [x] **Task 3:** Create TransferItem model
- [x] **Task 4:** Create StockLevelSetting model
- [x] **Task 5:** Create LocationStructure model
- [x] **Task 6:** Extend Warehouse model with new fields
- [x] **Task 7:** Extend StockLocation model with new fields
- [x] **Task 8:** Extend StockAlert model with new fields
- [x] **Task 9:** Add relations and indexes
- [x] **Task 10:** Generate and run migration
- [x] **Task 11:** Verify with `pnpm db:generate` and `pnpm typecheck`

---

## Definition of Done

- [x] All acceptance criteria met
- [x] Prisma schema compiles without errors
- [x] Migration generated and can be applied
- [x] Existing tests pass (221 tests)
- [ ] Code reviewed

---

## Implementation Summary

**Completed: 2026-01-23**

### New Models Added (4)

1. **InventoryTransfer** - Raktárközi átmozgatás kezelése
2. **TransferItem** - Átmozgatott tételek
3. **StockLevelSetting** - Készlet szint küszöbértékek
4. **LocationStructure** - K-P-D struktúra konfiguráció

### Models Extended (3)

1. **Warehouse** - type, status, city, postalCode, contact fields
2. **StockLocation** - kommando, polc, doboz, capacity, currentOccupancy, status, isDeleted
3. **StockAlert** - priority, status, deficit, productName, warehouseName, details, snoozedUntil, lastNotifiedAt

### New Enums Added (6)

- TransferStatus, WarehouseType, WarehouseStatus, LocationStatus, AlertPriority, AlertStatus

### Validation Results

- Prisma generate: SUCCESS
- TypeScript check: SUCCESS
- Inventory tests: 221/221 passed

---

_Created: 2026-01-23_
_Completed: 2026-01-23_
