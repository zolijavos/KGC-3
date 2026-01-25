# Story INV-S3: PrismaLocationRepository

> **Epic:** Inventory Domain Completion
> **Priority:** P1
> **Status:** DONE
> **Assignee:** Dev Agent (Amelia)
> **Dependencies:** INV-S1 (DONE), INV-S2 (DONE)

---

## Summary

Implement the `PrismaLocationRepository` that provides persistence for location structures and location codes (K-P-D system). This repository implements the `ILocationRepository` interface defined in `@kgc/inventory`.

---

## Acceptance Criteria

### AC1: Structure CRUD Operations

- [ ] `createStructure(structure)` creates LocationStructure for warehouse
- [ ] `createStructure` throws on duplicate warehouse structure
- [ ] `getStructure(tenantId, warehouseId)` returns structure or null
- [ ] `updateStructure(id, tenantId, data)` updates allowed fields

### AC2: Location CRUD Operations

- [ ] `createLocation(location)` creates a single location with K-P-D values
- [ ] `createLocation` validates location doesn't already exist
- [ ] `createLocations(locations[])` bulk creates locations efficiently
- [ ] `createLocations` returns count of created locations
- [ ] `findByCode(code, tenantId, warehouseId)` finds by "K1-P2-D3" format
- [ ] `findById(id, tenantId)` returns location or null

### AC3: Location Query

- [ ] `query(query)` supports filtering by kommando, polc, status
- [ ] `query` supports availableOnly filter (non-full locations)
- [ ] `query` supports search by code
- [ ] `query` supports sorting (code, createdAt, currentOccupancy)
- [ ] `query` supports pagination and returns total count

### AC4: Location Update/Delete

- [ ] `updateLocation(id, tenantId, data)` updates status, description, capacity
- [ ] `updateOccupancy(id, tenantId, adjustment)` increments/decrements occupancy
- [ ] `updateOccupancy` updates status to FULL when capacity reached
- [ ] `updateOccupancy` updates status to ACTIVE when below capacity
- [ ] `deleteLocation(id, tenantId)` soft deletes (sets isDeleted=true)
- [ ] `deleteAllByWarehouse(tenantId, warehouseId)` soft deletes all warehouse locations

### AC5: Unit Tests

- [ ] All 12 methods have unit tests
- [ ] Minimum 15 test cases
- [ ] Tests use mocked Prisma client
- [ ] All tests pass

---

## Technical Notes

### Files to Create

- `apps/kgc-api/src/modules/inventory/repositories/prisma-location.repository.ts`
- `apps/kgc-api/src/modules/inventory/repositories/prisma-location.repository.spec.ts`

### Interface Reference

```typescript
// packages/shared/inventory/src/interfaces/location.interface.ts
export interface ILocationRepository {
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
}
```

### Prisma Models Used

- `LocationStructure` (from INV-S1)
- `StockLocation` (extended in INV-S1 with kommando, polc, doboz)

### Pattern Reference

Use `prisma-warehouse.repository.ts` as reference for:

- NestJS Injectable decorator
- PrismaService injection
- Error handling patterns
- Mapping functions (Prisma → Interface)
- tenantId validation pattern

---

## Tasks

- [ ] **Task 1:** Create repository file with class structure and constructor
- [ ] **Task 2:** Implement structure methods (createStructure, getStructure, updateStructure)
- [ ] **Task 3:** Implement createLocation and createLocations
- [ ] **Task 4:** Implement findByCode and findById
- [ ] **Task 5:** Implement query method with all filters
- [ ] **Task 6:** Implement updateLocation
- [ ] **Task 7:** Implement updateOccupancy with status auto-update
- [ ] **Task 8:** Implement deleteLocation and deleteAllByWarehouse
- [ ] **Task 9:** Create unit test file with all test cases
- [ ] **Task 10:** Verify all tests pass

---

## Definition of Done

- [ ] All 12 interface methods implemented
- [ ] All unit tests pass (minimum 15 tests)
- [ ] TypeScript compilation succeeds
- [ ] Code reviewed
- [ ] Repository exported from module

---

_Created: 2026-01-24_
