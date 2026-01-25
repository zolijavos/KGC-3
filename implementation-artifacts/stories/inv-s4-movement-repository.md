# Story INV-S4: PrismaMovementRepository

> **Epic:** Inventory Domain Completion
> **Priority:** P2
> **Status:** DONE
> **Assignee:** Dev Agent (Amelia)
> **Dependencies:** INV-S1 (DONE), INV-S2 (DONE), INV-S3 (DONE)

---

## Summary

Implement the `PrismaMovementRepository` that provides persistence for inventory movement audit trail. This repository implements the `IMovementRepository` interface defined in `@kgc/inventory`.

**Note:** The current Prisma `StockMovement` model has fewer fields than the interface. This implementation maps available fields and leaves some optional fields unset. A future schema migration should extend the model.

---

## Acceptance Criteria

### AC1: Movement CRUD Operations

- [ ] `create(movement)` creates a movement record
- [ ] `create` maps interface fields to Prisma model
- [ ] `createMany(movements[])` bulk creates movements efficiently
- [ ] `createMany` returns count of created records
- [ ] `findById(id, tenantId)` returns movement or null

### AC2: Movement Query

- [ ] `query(query)` supports filtering by type, warehouseId, productId
- [ ] `query` supports filtering by referenceId, dateFrom, dateTo
- [ ] `query` supports sorting (performedAt, createdAt, quantityChange)
- [ ] `query` supports pagination and returns total count

### AC3: Movement History/Summary

- [ ] `getHistory(inventoryItemId, tenantId, limit?)` returns movements in chronological order
- [ ] `getSummary(tenantId, warehouseId, periodStart, periodEnd)` aggregates by movement type
- [ ] `getLastMovement(inventoryItemId, tenantId)` returns most recent movement

### AC4: Unit Tests

- [ ] All 7 methods have unit tests
- [ ] Minimum 12 test cases
- [ ] Tests use mocked Prisma client
- [ ] All tests pass

---

## Technical Notes

### Files to Create

- `apps/kgc-api/src/modules/inventory/repositories/prisma-movement.repository.ts`
- `apps/kgc-api/src/modules/inventory/repositories/prisma-movement.repository.spec.ts`

### Schema Limitations

The current `StockMovement` Prisma model has fewer fields than `IMovementRepository`:

| Interface Field  | Prisma Field                  | Notes                                |
| ---------------- | ----------------------------- | ------------------------------------ |
| warehouseId      | fromWarehouseId/toWarehouseId | Use toWarehouseId or fromWarehouseId |
| productId        | -                             | Join via inventoryItem               |
| quantityChange   | quantity                      | Same concept                         |
| previousQuantity | -                             | Not stored                           |
| newQuantity      | -                             | Not stored                           |
| sourceModule     | -                             | Not stored                           |
| performedBy      | createdBy                     | Same concept                         |
| performedAt      | createdAt                     | Same concept                         |

### Interface Reference

```typescript
export interface IMovementRepository {
  create(movement): Promise<InventoryMovement>
  createMany(movements[]): Promise<number>
  findById(id, tenantId): Promise<InventoryMovement | null>
  query(query): Promise<MovementQueryResult>
  getHistory(inventoryItemId, tenantId, limit?): Promise<InventoryMovement[]>
  getSummary(tenantId, warehouseId, periodStart, periodEnd): Promise<MovementSummary>
  getLastMovement(inventoryItemId, tenantId): Promise<InventoryMovement | null>
}
```

---

## Tasks

- [ ] **Task 1:** Create repository file with class structure and constructor
- [ ] **Task 2:** Implement create and createMany
- [ ] **Task 3:** Implement findById
- [ ] **Task 4:** Implement query with filters and pagination
- [ ] **Task 5:** Implement getHistory
- [ ] **Task 6:** Implement getSummary
- [ ] **Task 7:** Implement getLastMovement
- [ ] **Task 8:** Create unit test file
- [ ] **Task 9:** Verify all tests pass

---

## Definition of Done

- [ ] All 7 interface methods implemented
- [ ] All unit tests pass (minimum 12 tests)
- [ ] TypeScript compilation succeeds
- [ ] Code reviewed
- [ ] Repository exported from module

---

_Created: 2026-01-24_
