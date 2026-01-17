# Story 8-3: Beszállító Kapcsolat és Import

## Story Info

| Mező | Érték |
|------|-------|
| **Epic** | Epic 8 - Product Catalog (@kgc/cikk) |
| **Story ID** | 8-3-beszallito-kapcsolat-es-import |
| **Státusz** | in-progress |
| **Package** | @kgc/cikk (packages/shared/cikk/) |
| **Prioritás** | P0 - MVP |
| **Becslés** | M (8-16 óra) |
| **Függőségek** | Story 8-1 (Cikk CRUD) |

## User Story

**As a** admin,
**I want** beszállítókat és termékeiket kezelni,
**So that** beszerzés követhető legyen.

## Acceptance Criteria

### AC1: Beszállító CRUD és Cikk Kapcsolat

**Given** beszállító (Makita, Stihl, Hikoki)
**When** beszállító létrehozva vagy cikkhez rendelve
**Then** beszállító-cikk kapcsolat létrejön
**And** egy cikknek több beszállítója lehet
**And** beszállító inaktiválható (soft delete)

### AC2: Beszerzési Ár Tracking

**Given** cikk-beszállító kapcsolat
**When** beszerzési ár változik
**Then** új ár rekord létrejön timestamppel
**And** ár history lekérdezhető
**And** aktuális beszerzési ár automatikusan frissül

### AC3: CSV Import Támogatás

**Given** CSV fájl beszállítói termékekkel
**When** import futtatva
**Then** új cikkek létrejönnek
**And** meglévő cikkek frissülnek (merge by barcode/supplier_code)
**And** import log elérhető
**And** hibás sorok jelölve

## Technical Tasks

### Task 1: Prisma Schema Extension

```prisma
model Supplier {
  id          String         @id @default(uuid())
  tenantId    String         @map("tenant_id")
  code        String         @db.VarChar(50)   // MAKITA, STIHL, HIKOKI
  name        String         @db.VarChar(255)
  description String?        @db.Text
  contactName String?        @map("contact_name") @db.VarChar(255)
  email       String?        @db.VarChar(255)
  phone       String?        @db.VarChar(50)
  website     String?        @db.VarChar(255)
  status      SupplierStatus @default(ACTIVE)

  // Relations
  supplierItems SupplierItem[]

  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  @@unique([tenantId, code], name: "supplier_tenant_code_unique")
  @@index([tenantId])
  @@index([status])
  @@map("suppliers")
}

model SupplierItem {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  supplierId      String   @map("supplier_id")
  itemId          String   @map("item_id")
  supplierCode    String   @map("supplier_code") @db.VarChar(100) // Beszállító cikkszám
  costPrice       Decimal  @map("cost_price") @db.Decimal(12, 2)
  currency        String   @default("HUF") @db.VarChar(3)
  leadTimeDays    Int?     @map("lead_time_days") // Szállítási idő napokban
  minOrderQty     Int?     @map("min_order_qty")  // Minimum rendelési mennyiség
  isPrimary       Boolean  @default(false) @map("is_primary") // Elsődleges beszállító

  // Relations
  supplier        Supplier @relation(fields: [supplierId], references: [id])
  item            Item     @relation(fields: [itemId], references: [id])
  priceHistory    SupplierItemPriceHistory[]

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, supplierId, itemId], name: "supplier_item_unique")
  @@unique([tenantId, supplierId, supplierCode], name: "supplier_code_unique")
  @@index([tenantId])
  @@index([itemId])
  @@map("supplier_items")
}

model SupplierItemPriceHistory {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  supplierItemId  String   @map("supplier_item_id")
  costPrice       Decimal  @map("cost_price") @db.Decimal(12, 2)
  currency        String   @default("HUF") @db.VarChar(3)
  effectiveFrom   DateTime @default(now()) @map("effective_from")
  source          String?  @db.VarChar(50) // MANUAL, CSV_IMPORT, API_SYNC

  // Relations
  supplierItem    SupplierItem @relation(fields: [supplierItemId], references: [id])

  createdAt       DateTime @default(now()) @map("created_at")

  @@index([tenantId])
  @@index([supplierItemId])
  @@index([effectiveFrom])
  @@map("supplier_item_price_history")
}

enum SupplierStatus {
  ACTIVE
  INACTIVE
}
```

### Task 2: Supplier Service (TDD)

**Fájlok:**
- `src/services/supplier.service.ts`
- `src/services/supplier.service.spec.ts`
- `src/interfaces/supplier.interface.ts`
- `src/dto/create-supplier.dto.ts`
- `src/dto/update-supplier.dto.ts`

**Metódusok:**
- `createSupplier(tenantId, input, userId): Promise<Supplier>`
- `getSupplierById(id, tenantId): Promise<Supplier | null>`
- `getSuppliers(tenantId, filter): Promise<SupplierListResponse>`
- `updateSupplier(id, tenantId, input, userId): Promise<Supplier>`
- `deleteSupplier(id, tenantId, userId): Promise<Supplier>` (soft delete)

### Task 3: SupplierItem Service (TDD)

**Fájlok:**
- `src/services/supplier-item.service.ts`
- `src/services/supplier-item.service.spec.ts`

**Metódusok:**
- `linkItemToSupplier(tenantId, input, userId): Promise<SupplierItem>`
- `updateSupplierItem(id, tenantId, input, userId): Promise<SupplierItem>`
- `unlinkItemFromSupplier(id, tenantId, userId): Promise<void>`
- `getSupplierItems(supplierId, tenantId): Promise<SupplierItem[]>`
- `getItemSuppliers(itemId, tenantId): Promise<SupplierItem[]>`
- `setPrimarySupplier(supplierItemId, tenantId, userId): Promise<SupplierItem>`

### Task 4: Price History Service (TDD)

**Fájlok:**
- `src/services/price-history.service.ts`
- `src/services/price-history.service.spec.ts`

**Metódusok:**
- `recordPriceChange(supplierItemId, newPrice, source, tenantId): Promise<void>`
- `getPriceHistory(supplierItemId, tenantId, dateRange?): Promise<PriceHistory[]>`
- `getCurrentPrice(supplierItemId, tenantId): Promise<Decimal>`

### Task 5: CSV Import Service (TDD)

**Fájlok:**
- `src/services/csv-import.service.ts`
- `src/services/csv-import.service.spec.ts`

**Metódusok:**
- `importSupplierItems(tenantId, supplierId, csvContent, options): Promise<ImportResult>`
- `validateCsvRow(row, rowIndex): ValidationResult`
- `parsePrice(value): Decimal`

**CSV Formátum:**
```csv
supplier_code,barcode,name,description,cost_price,list_price,category_code,unit
MA-123456,5900000001234,Fúrógép XYZ,Profi fúrógép,45000,89900,POWER-TOOLS,db
```

### Task 6: Supplier Controller

**Endpoints:**
- `POST /api/v1/suppliers` - Create supplier
- `GET /api/v1/suppliers` - List suppliers
- `GET /api/v1/suppliers/:id` - Get supplier
- `PATCH /api/v1/suppliers/:id` - Update supplier
- `DELETE /api/v1/suppliers/:id` - Delete supplier
- `POST /api/v1/suppliers/:id/items` - Link item to supplier
- `GET /api/v1/suppliers/:id/items` - Get supplier items
- `POST /api/v1/suppliers/:id/import` - Import CSV

## Definition of Done

- [ ] Prisma schema updated with Supplier, SupplierItem, PriceHistory
- [ ] SupplierService unit tests passing (minimum 10 tesztek)
- [ ] SupplierItemService unit tests passing (minimum 8 tesztek)
- [ ] PriceHistoryService unit tests passing (minimum 5 tesztek)
- [ ] CsvImportService unit tests passing (minimum 8 tesztek)
- [ ] SupplierController endpoints working
- [ ] All exports added to index.ts
- [ ] TypeScript compilation without errors
- [ ] Test coverage > 85%
- [ ] Code review passed

## Dependencies

- Story 8-1: Cikk CRUD (Item entity must exist)

## Notes

- A beszállítói API integrációk (Makita, Stihl, Hikoki) külön epic-ben lesznek (Post-MVP)
- CSV import az egyszerűbb, azonnal szükséges megoldás
- Árváltozás history fontos a beszerzési döntésekhez
