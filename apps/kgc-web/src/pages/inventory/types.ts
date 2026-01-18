// Inventory types

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export enum MovementType {
  IN = 'IN', // Bevételezés
  OUT = 'OUT', // Kiadás
  ADJUSTMENT = 'ADJUSTMENT', // Korrekció
  TRANSFER = 'TRANSFER', // Áthelyezés
  RETURN = 'RETURN', // Visszavétel
}

export enum ItemCategory {
  POWER_TOOL = 'POWER_TOOL', // Elektromos szerszám
  HAND_TOOL = 'HAND_TOOL', // Kéziszerszám
  ACCESSORY = 'ACCESSORY', // Tartozék
  CONSUMABLE = 'CONSUMABLE', // Fogyóeszköz
  WORKWEAR = 'WORKWEAR', // Munkaruha
  SPARE_PART = 'SPARE_PART', // Alkatrész
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category: ItemCategory;
  brand?: string;
  unit: string;

  // Stock levels
  currentStock: number;
  reservedStock: number; // Foglalt (bérléshez, rendeléshez)
  availableStock: number; // Elérhető = current - reserved
  minStock: number; // Minimum készlet (figyelmeztetés)
  maxStock: number; // Maximum készlet

  // Pricing
  purchasePrice: number; // Beszerzési ár
  sellingPrice: number; // Eladási ár
  rentalPriceDaily?: number; // Napi bérleti díj
  vatRate: number;

  // Location
  warehouseId: string;
  warehouseName: string;
  location?: string; // Polc/hely

  // Status
  status: StockStatus;
  isRentable: boolean;
  isSellable: boolean;

  // Dates
  lastStockUpdate: string;
  lastInventoryCheck?: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string; // Hivatkozás (rendelés, munkalap, stb.)
  note?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  isDefault: boolean;
}
