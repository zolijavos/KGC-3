/**
 * Test Data Factories for Inventory Repository Tests
 * TEA Review Recommendation: P1 - Data factories for test maintainability
 */

// ============================================
// WAREHOUSE FACTORIES
// ============================================

export interface WarehouseData {
  tenantId: string;
  code: string;
  name: string;
  type: 'MAIN' | 'BRANCH' | 'VIRTUAL';
  status: 'ACTIVE' | 'INACTIVE';
  address?: string;
  city?: string;
  postalCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  isDefault: boolean;
  isDeleted: boolean;
}

let warehouseCounter = 0;
export const createWarehouseData = (overrides: Partial<WarehouseData> = {}): WarehouseData => ({
  tenantId: 'tenant-123',
  code: `WH-${String(++warehouseCounter).padStart(3, '0')}`,
  name: `Test Warehouse ${warehouseCounter}`,
  type: 'MAIN',
  status: 'ACTIVE',
  isDefault: false,
  isDeleted: false,
  ...overrides,
});

export interface PrismaWarehouseResult extends WarehouseData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

let warehouseIdCounter = 0;
export const createPrismaWarehouseResult = (
  overrides: Partial<PrismaWarehouseResult> = {}
): PrismaWarehouseResult => {
  const baseData = createWarehouseData();
  const result: PrismaWarehouseResult = {
    id: `wh-uuid-${++warehouseIdCounter}`,
    tenantId: baseData.tenantId,
    code: baseData.code,
    name: baseData.name,
    type: baseData.type,
    status: baseData.status,
    isDefault: baseData.isDefault,
    isDeleted: baseData.isDeleted,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...result, ...overrides };
};

// ============================================
// TRANSFER FACTORIES
// ============================================

export interface TransferData {
  tenantId: string;
  transferCode: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  initiatedBy: string;
  initiatedAt: Date;
  reason?: string;
  completedBy?: string;
  completedAt?: Date;
  items: TransferItemData[];
}

export interface TransferItemData {
  inventoryItemId: string;
  quantity: number;
  unit: string;
  serialNumber?: string;
  note?: string;
}

let transferCounter = 0;
export const createTransferData = (overrides: Partial<TransferData> = {}): TransferData => ({
  tenantId: 'tenant-123',
  transferCode: `TR-${String(++transferCounter).padStart(3, '0')}`,
  sourceWarehouseId: 'wh-1',
  targetWarehouseId: 'wh-2',
  status: 'PENDING',
  initiatedBy: 'user-1',
  initiatedAt: new Date(),
  items: [],
  ...overrides,
});

// ============================================
// LOCATION FACTORIES
// ============================================

export interface LocationData {
  tenantId: string;
  warehouseId: string;
  code: string;
  kommando: number;
  polc: number;
  doboz: number;
  status: 'ACTIVE' | 'INACTIVE' | 'FULL';
  description?: string;
  capacity?: number;
  currentOccupancy: number;
  isDeleted: boolean;
}

let locationCounter = 0;
export const createLocationData = (overrides: Partial<LocationData> = {}): LocationData => {
  locationCounter++;
  const k = Math.floor(locationCounter / 100) + 1;
  const p = Math.floor((locationCounter % 100) / 10) + 1;
  const d = (locationCounter % 10) + 1;
  return {
    tenantId: 'tenant-123',
    warehouseId: 'warehouse-456',
    code: `K${k}-P${p}-D${d}`,
    kommando: k,
    polc: p,
    doboz: d,
    status: 'ACTIVE',
    currentOccupancy: 0,
    isDeleted: false,
    ...overrides,
  };
};

export interface LocationStructureData {
  tenantId: string;
  warehouseId: string;
  kommandoPrefix: string;
  polcPrefix: string;
  dobozPrefix: string;
  separator: string;
  maxKommando: number;
  maxPolcPerKommando: number;
  maxDobozPerPolc: number;
}

export const createLocationStructureData = (
  overrides: Partial<LocationStructureData> = {}
): LocationStructureData => ({
  tenantId: 'tenant-123',
  warehouseId: 'warehouse-456',
  kommandoPrefix: 'K',
  polcPrefix: 'P',
  dobozPrefix: 'D',
  separator: '-',
  maxKommando: 10,
  maxPolcPerKommando: 5,
  maxDobozPerPolc: 20,
  ...overrides,
});

// ============================================
// MOVEMENT FACTORIES
// ============================================

export interface MovementData {
  tenantId: string;
  inventoryItemId: string;
  warehouseId: string;
  productId: string;
  type:
    | 'RECEIPT'
    | 'ISSUE'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'ADJUSTMENT'
    | 'RESERVATION'
    | 'RELEASE';
  sourceModule: 'MANUAL' | 'TRANSFER' | 'RENTAL' | 'SALE' | 'SERVICE' | 'ADJUSTMENT';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  unit: string;
  previousLocationCode?: string;
  newLocationCode?: string;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  performedBy: string;
  performedAt: Date;
}

let movementCounter = 0;
export const createMovementData = (overrides: Partial<MovementData> = {}): MovementData => ({
  tenantId: 'tenant-123',
  inventoryItemId: `item-${++movementCounter}`,
  warehouseId: 'wh-1',
  productId: 'prod-1',
  type: 'RECEIPT',
  sourceModule: 'MANUAL',
  quantityChange: 10,
  previousQuantity: 0,
  newQuantity: 10,
  unit: 'db',
  performedBy: 'user-1',
  performedAt: new Date(),
  ...overrides,
});

// ============================================
// ALERT FACTORIES
// ============================================

export interface StockLevelSettingData {
  tenantId: string;
  productId: string;
  warehouseId?: string;
  minimumLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  maximumLevel?: number;
  unit: string;
  leadTimeDays?: number;
  isActive: boolean;
}

let settingCounter = 0;
export const createStockLevelSettingData = (
  overrides: Partial<StockLevelSettingData> = {}
): StockLevelSettingData => ({
  tenantId: 'tenant-123',
  productId: `prod-${++settingCounter}`,
  minimumLevel: 10,
  reorderPoint: 20,
  reorderQuantity: 50,
  unit: 'db',
  isActive: true,
  ...overrides,
});

export interface AlertData {
  tenantId: string;
  productId: string;
  warehouseId: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING' | 'OVERSTOCK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED';
  currentQuantity: number;
  minimumLevel: number;
  unit: string;
  message: string;
  inventoryItemId: string;
}

let alertCounter = 0;
export const createAlertData = (overrides: Partial<AlertData> = {}): AlertData => ({
  tenantId: 'tenant-123',
  productId: `prod-${++alertCounter}`,
  warehouseId: 'wh-789',
  type: 'LOW_STOCK',
  priority: 'HIGH',
  status: 'ACTIVE',
  currentQuantity: 5,
  minimumLevel: 10,
  unit: 'db',
  message: 'Low stock alert',
  inventoryItemId: `inv-item-${alertCounter}`,
  ...overrides,
});

// ============================================
// INVENTORY ITEM FACTORIES
// ============================================

export interface InventoryItemData {
  tenantId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'AVAILABLE' | 'RESERVED' | 'IN_TRANSIT' | 'IN_SERVICE' | 'RENTED' | 'DAMAGED';
  unit: string;
  serialNumber?: string;
  batchNumber?: string;
  locationCode?: string;
}

let inventoryCounter = 0;
export const createInventoryItemData = (
  overrides: Partial<InventoryItemData> = {}
): InventoryItemData => ({
  tenantId: 'tenant-123',
  productId: `prod-${++inventoryCounter}`,
  warehouseId: 'wh-1',
  quantity: 10,
  status: 'AVAILABLE',
  unit: 'db',
  ...overrides,
});

// ============================================
// RESET FUNCTION FOR TEST ISOLATION
// ============================================

export const resetFactoryCounters = (): void => {
  warehouseCounter = 0;
  warehouseIdCounter = 0;
  transferCounter = 0;
  locationCounter = 0;
  movementCounter = 0;
  settingCounter = 0;
  alertCounter = 0;
  inventoryCounter = 0;
};
