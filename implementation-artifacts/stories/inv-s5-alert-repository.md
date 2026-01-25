# Story INV-S5: PrismaAlertRepository

> **Epic:** Inventory Domain Completion
> **Priority:** P2
> **Status:** DONE
> **Assignee:** Dev Agent (Amelia)
> **Dependencies:** INV-S1 (DONE), INV-S2 (DONE), INV-S3 (DONE), INV-S4 (DONE)

---

## Summary

Implement the `PrismaAlertRepository` that provides persistence for stock alerts and stock level settings. This repository implements the `IAlertRepository` interface defined in `@kgc/inventory`.

**Note:** The Prisma `AlertType` enum has fewer values than the interface. This implementation maps available types and handles the mismatch.

---

## Acceptance Criteria

### AC1: Stock Level Setting CRUD

- [ ] `createStockLevelSetting(setting)` creates a stock level setting
- [ ] `createStockLevelSetting` enforces unique constraint (productId + warehouseId)
- [ ] `findStockLevelSettingById(id, tenantId)` returns setting or null
- [ ] `findStockLevelSettingByProduct(productId, tenantId, warehouseId?)` finds by product
- [ ] `queryStockLevelSettings(query)` supports filtering and pagination
- [ ] `updateStockLevelSetting(id, tenantId, updates)` updates allowed fields
- [ ] `deleteStockLevelSetting(id, tenantId)` deletes the setting

### AC2: Alert CRUD

- [ ] `createAlert(alert)` creates an alert record
- [ ] `findAlertById(id, tenantId)` returns alert or null
- [ ] `findActiveAlertForProduct(productId, tenantId, warehouseId?, type?)` finds active alert
- [ ] `updateAlert(id, tenantId, updates)` updates alert fields

### AC3: Alert Query/Summary

- [ ] `queryAlerts(query)` supports filtering by type, priority, status
- [ ] `queryAlerts` supports sorting and pagination
- [ ] `getAlertSummary(tenantId)` returns counts by priority and type
- [ ] `resolveAlertsByProduct(productId, tenantId, warehouseId?)` bulk resolves alerts

### AC4: Unit Tests

- [ ] All 13 methods have unit tests
- [ ] Minimum 18 test cases
- [ ] Tests use mocked Prisma client
- [ ] All tests pass

---

## Technical Notes

### Files to Create

- `apps/kgc-api/src/modules/inventory/repositories/prisma-alert.repository.ts`
- `apps/kgc-api/src/modules/inventory/repositories/prisma-alert.repository.spec.ts`

### Schema-Interface Type Mapping

| Interface AlertType | Prisma AlertType | Notes                       |
| ------------------- | ---------------- | --------------------------- |
| LOW_STOCK           | LOW_STOCK        | Direct match                |
| OUT_OF_STOCK        | OUT_OF_STOCK     | Direct match                |
| OVERSTOCK           | LOW_STOCK        | Map to LOW_STOCK (fallback) |
| EXPIRING_SOON       | EXPIRING         | Rename                      |
| WARRANTY_EXPIRING   | EXPIRING         | Map to EXPIRING             |

### Interface Reference

```typescript
export interface IAlertRepository {
  // Stock Level Settings (6 methods)
  createStockLevelSetting(setting): Promise<StockLevelSetting>;
  findStockLevelSettingById(id, tenantId): Promise<StockLevelSetting | null>;
  findStockLevelSettingByProduct(
    productId,
    tenantId,
    warehouseId?
  ): Promise<StockLevelSetting | null>;
  queryStockLevelSettings(query): Promise<{ items; total }>;
  updateStockLevelSetting(id, tenantId, updates): Promise<StockLevelSetting>;
  deleteStockLevelSetting(id, tenantId): Promise<void>;

  // Stock Alerts (7 methods)
  createAlert(alert): Promise<StockAlert>;
  findAlertById(id, tenantId): Promise<StockAlert | null>;
  findActiveAlertForProduct(productId, tenantId, warehouseId?, type?): Promise<StockAlert | null>;
  queryAlerts(query): Promise<AlertQueryResult>;
  updateAlert(id, tenantId, updates): Promise<StockAlert>;
  getAlertSummary(tenantId): Promise<AlertSummary>;
  resolveAlertsByProduct(productId, tenantId, warehouseId?): Promise<number>;
}
```

---

## Tasks

- [ ] **Task 1:** Create repository file with class structure
- [ ] **Task 2:** Implement type mapping functions
- [ ] **Task 3:** Implement stock level setting methods (6)
- [ ] **Task 4:** Implement alert CRUD methods (4)
- [ ] **Task 5:** Implement queryAlerts with filters
- [ ] **Task 6:** Implement getAlertSummary
- [ ] **Task 7:** Implement resolveAlertsByProduct
- [ ] **Task 8:** Create unit test file
- [ ] **Task 9:** Verify all tests pass

---

## Definition of Done

- [ ] All 13 interface methods implemented
- [ ] All unit tests pass (minimum 18 tests)
- [ ] TypeScript compilation succeeds
- [ ] Code reviewed
- [ ] Repository exported from module

---

_Created: 2026-01-24_
