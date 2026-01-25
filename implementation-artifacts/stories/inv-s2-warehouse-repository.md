# Story INV-S2: PrismaWarehouseRepository

> **Epic:** Inventory Domain Completion
> **Priority:** P1
> **Status:** DONE
> **Assignee:** Dev Agent (Amelia)
> **Dependencies:** INV-S1 (DONE)

---

## Summary

Implement the `PrismaWarehouseRepository` that provides persistence for warehouses and inter-warehouse transfers. This repository implements the `IWarehouseRepository` interface defined in `@kgc/inventory`.

---

## Acceptance Criteria

### AC1: Basic Warehouse CRUD Operations

- [ ] `create(warehouse)` creates a new warehouse with all fields
- [ ] `create` throws on duplicate code within same tenant
- [ ] `findById(id, tenantId)` returns warehouse or null
- [ ] `findByCode(code, tenantId)` returns warehouse by unique code
- [ ] `findDefault(tenantId)` returns the default warehouse (isDefault=true)
- [ ] Only one warehouse can be default per tenant

### AC2: Warehouse Query

- [ ] `query(query)` supports filtering by type, status, city
- [ ] `query` supports search by name/code
- [ ] `query` supports sorting (name, code, createdAt)
- [ ] `query` supports pagination (offset, limit)
- [ ] `query` returns total count for pagination

### AC3: Warehouse Update/Delete

- [ ] `update(id, tenantId, data)` updates allowed fields
- [ ] `update` sets new default and clears old default
- [ ] `delete(id, tenantId)` soft deletes (sets isDeleted=true)
- [ ] Cannot delete warehouse with inventory items (hasInventoryItems check)

### AC4: Transfer Operations

- [ ] `createTransfer(transfer)` creates transfer with items
- [ ] Transfer code is unique within tenant
- [ ] `findTransferById(id, tenantId)` includes items relation
- [ ] `findTransferByCode(code, tenantId)` finds by unique code
- [ ] `queryTransfers(query)` filters by status, date range, warehouses
- [ ] `queryTransfers` supports pagination

### AC5: Transfer Status Updates

- [ ] `updateTransfer(id, tenantId, data)` updates status and metadata
- [ ] Status transitions: PENDING → IN_TRANSIT → COMPLETED
- [ ] Status transition: PENDING → CANCELLED
- [ ] completedBy and completedAt set on COMPLETED status

### AC6: Cross-Warehouse Operations

- [ ] `getCrossWarehouseStock(tenantId)` aggregates stock across all warehouses
- [ ] `getCrossWarehouseStock(tenantId, productIds)` filters by products
- [ ] Returns breakdown per warehouse with available quantity
- [ ] `hasInventoryItems(warehouseId, tenantId)` returns true if items exist

### AC7: Unit Tests

- [ ] All 14 methods have unit tests
- [ ] Minimum 15 test cases
- [ ] Tests use mocked Prisma client
- [ ] All tests pass

---

## Technical Notes

### File to Create

- `apps/kgc-api/src/modules/inventory/repositories/prisma-warehouse.repository.ts`
- `apps/kgc-api/src/modules/inventory/repositories/prisma-warehouse.repository.spec.ts`

### Interface Reference

```typescript
// packages/shared/inventory/src/interfaces/warehouse.interface.ts
export interface IWarehouseRepository {
  create(warehouse): Promise<Warehouse>;
  findById(id, tenantId): Promise<Warehouse | null>;
  findByCode(code, tenantId): Promise<Warehouse | null>;
  findDefault(tenantId): Promise<Warehouse | null>;
  query(query): Promise<WarehouseQueryResult>;
  update(id, tenantId, data): Promise<Warehouse>;
  delete(id, tenantId): Promise<void>;
  createTransfer(transfer): Promise<InventoryTransfer>;
  findTransferById(id, tenantId): Promise<InventoryTransfer | null>;
  findTransferByCode(code, tenantId): Promise<InventoryTransfer | null>;
  queryTransfers(query): Promise<TransferQueryResult>;
  updateTransfer(id, tenantId, data): Promise<InventoryTransfer>;
  getCrossWarehouseStock(tenantId, productIds?): Promise<CrossWarehouseStockSummary[]>;
  hasInventoryItems(warehouseId, tenantId): Promise<boolean>;
}
```

### Prisma Models Used

- `Warehouse` (with extended fields from INV-S1)
- `InventoryTransfer`
- `TransferItem`
- `InventoryItem` (for hasInventoryItems check)

### Pattern Reference

Use existing `prisma-inventory.repository.ts` as reference for:

- NestJS Injectable decorator
- PrismaService injection
- Error handling patterns
- Mapping functions (Prisma → Interface)

### Naming Conventions

- Class: `PrismaWarehouseRepository`
- File: `prisma-warehouse.repository.ts`
- Test: `prisma-warehouse.repository.spec.ts`

---

## Tasks

- [ ] **Task 1:** Create repository file with class structure and constructor
- [ ] **Task 2:** Implement basic CRUD (create, findById, findByCode, findDefault)
- [ ] **Task 3:** Implement query method with all filters
- [ ] **Task 4:** Implement update and delete methods
- [ ] **Task 5:** Implement createTransfer with items
- [ ] **Task 6:** Implement transfer query methods
- [ ] **Task 7:** Implement updateTransfer with status transitions
- [ ] **Task 8:** Implement getCrossWarehouseStock
- [ ] **Task 9:** Implement hasInventoryItems
- [ ] **Task 10:** Create unit test file with all test cases
- [ ] **Task 11:** Verify all tests pass

---

## Definition of Done

- [ ] All 14 interface methods implemented
- [ ] All unit tests pass (minimum 15 tests)
- [ ] TypeScript compilation succeeds
- [ ] Code reviewed
- [ ] Repository exported from module

---

_Created: 2026-01-24_
