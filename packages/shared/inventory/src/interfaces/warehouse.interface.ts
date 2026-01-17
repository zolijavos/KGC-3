/**
 * @kgc/inventory - Warehouse interfaces
 * Story 9-3: Multi-warehouse támogatás
 * FR9: Raktárak közötti átmozgatás
 */

// ============================================
// WAREHOUSE TYPES
// ============================================

/**
 * Raktár típus
 * - MAIN: Központi raktár
 * - BRANCH: Fiók raktár (bolt)
 * - VIRTUAL: Virtuális raktár (szervizben lévő gépek)
 * - TRANSIT: Tranzit (szállítás alatt)
 */
export type WarehouseType = 'MAIN' | 'BRANCH' | 'VIRTUAL' | 'TRANSIT';

/**
 * Raktár státusz
 */
export type WarehouseStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

/**
 * Transfer státusz
 */
export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

// ============================================
// WAREHOUSE ENTITY
// ============================================

/**
 * Raktár entitás
 */
export interface Warehouse {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID - multi-tenant izoláció */
  tenantId: string;

  /** Raktár kód (egyedi a tenant-en belül) */
  code: string;

  /** Raktár név */
  name: string;

  /** Raktár típus */
  type: WarehouseType;

  /** Státusz */
  status: WarehouseStatus;

  /** Cím */
  address?: string;

  /** Város */
  city?: string;

  /** Irányítószám */
  postalCode?: string;

  /** Kapcsolattartó neve */
  contactName?: string;

  /** Kapcsolattartó telefonszáma */
  contactPhone?: string;

  /** Kapcsolattartó emailje */
  contactEmail?: string;

  /** Alapértelmezett raktár-e */
  isDefault: boolean;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Módosítás dátuma */
  updatedAt: Date;

  /** Soft delete */
  isDeleted: boolean;
}

// ============================================
// TRANSFER ENTITY
// ============================================

/**
 * Készlet átmozgatás (raktárak között)
 */
export interface InventoryTransfer {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Átmozgatás azonosító kód */
  transferCode: string;

  /** Forrás raktár ID */
  sourceWarehouseId: string;

  /** Cél raktár ID */
  targetWarehouseId: string;

  /** Státusz */
  status: TransferStatus;

  /** Indoklás/megjegyzés */
  reason?: string;

  /** Kezdeményező user ID */
  initiatedBy: string;

  /** Kezdeményezés dátuma */
  initiatedAt: Date;

  /** Lezáró user ID (ha befejezett) */
  completedBy?: string;

  /** Lezárás dátuma */
  completedAt?: Date;

  /** Átmozott tételek */
  items: TransferItem[];

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Módosítás dátuma */
  updatedAt: Date;
}

/**
 * Átmozgatott tétel
 */
export interface TransferItem {
  /** Készlet tétel ID */
  inventoryItemId: string;

  /** Serial number (ha van) */
  serialNumber?: string;

  /** Mennyiség */
  quantity: number;

  /** Mértékegység */
  unit: string;

  /** Megjegyzés */
  note?: string;
}

// ============================================
// QUERY INTERFACES
// ============================================

/**
 * Raktár keresés szűrő
 */
export interface WarehouseQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Típus szűrő */
  type?: WarehouseType | WarehouseType[];

  /** Státusz szűrő */
  status?: WarehouseStatus;

  /** Város szűrő */
  city?: string;

  /** Szabad szöveges keresés */
  search?: string;

  /** Rendezés */
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Raktár keresés eredmény
 */
export interface WarehouseQueryResult {
  warehouses: Warehouse[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Transfer keresés szűrő
 */
export interface TransferQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Forrás raktár ID */
  sourceWarehouseId?: string;

  /** Cél raktár ID */
  targetWarehouseId?: string;

  /** Státusz */
  status?: TransferStatus | TransferStatus[];

  /** Kezdeményező */
  initiatedBy?: string;

  /** Dátum szűrő: kezdete */
  dateFrom?: Date;

  /** Dátum szűrő: vége */
  dateTo?: Date;

  /** Rendezés */
  sortBy?: 'initiatedAt' | 'completedAt' | 'status';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Transfer keresés eredmény
 */
export interface TransferQueryResult {
  transfers: InventoryTransfer[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// CROSS-WAREHOUSE STOCK SUMMARY
// ============================================

/**
 * Készlet összesítés több raktáron keresztül
 */
export interface CrossWarehouseStockSummary {
  /** Cikk ID */
  productId: string;

  /** Cikk név */
  productName: string;

  /** Mértékegység */
  unit: string;

  /** Összes mennyiség (minden raktár) */
  totalQuantity: number;

  /** Raktárak szerinti bontás */
  warehouseBreakdown: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    quantity: number;
    availableQuantity: number;
  }>;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

/**
 * Warehouse repository interface
 */
export interface IWarehouseRepository {
  /**
   * Raktár létrehozása
   */
  create(
    warehouse: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Warehouse>;

  /**
   * Raktár lekérdezése ID alapján
   */
  findById(id: string, tenantId: string): Promise<Warehouse | null>;

  /**
   * Raktár lekérdezése kód alapján
   */
  findByCode(code: string, tenantId: string): Promise<Warehouse | null>;

  /**
   * Alapértelmezett raktár lekérdezése
   */
  findDefault(tenantId: string): Promise<Warehouse | null>;

  /**
   * Raktárak lekérdezése szűrőkkel
   */
  query(query: WarehouseQuery): Promise<WarehouseQueryResult>;

  /**
   * Raktár frissítése
   */
  update(
    id: string,
    tenantId: string,
    data: Partial<Omit<Warehouse, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<Warehouse>;

  /**
   * Raktár soft delete
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Transfer létrehozása
   */
  createTransfer(
    transfer: Omit<InventoryTransfer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<InventoryTransfer>;

  /**
   * Transfer lekérdezése
   */
  findTransferById(id: string, tenantId: string): Promise<InventoryTransfer | null>;

  /**
   * Transfer lekérdezése kód alapján
   */
  findTransferByCode(code: string, tenantId: string): Promise<InventoryTransfer | null>;

  /**
   * Transfer-ek lekérdezése
   */
  queryTransfers(query: TransferQuery): Promise<TransferQueryResult>;

  /**
   * Transfer frissítése
   */
  updateTransfer(
    id: string,
    tenantId: string,
    data: Partial<Omit<InventoryTransfer, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<InventoryTransfer>;

  /**
   * Cross-warehouse stock summary
   */
  getCrossWarehouseStock(
    tenantId: string,
    productIds?: string[],
  ): Promise<CrossWarehouseStockSummary[]>;

  /**
   * Ellenőrzi, hogy van-e készlet tétel a raktárban
   * @param warehouseId Raktár ID
   * @param tenantId Tenant ID
   * @returns true ha van legalább egy aktív készlet tétel
   */
  hasInventoryItems(warehouseId: string, tenantId: string): Promise<boolean>;
}

/**
 * Repository injection token
 */
export const WAREHOUSE_REPOSITORY = Symbol('WAREHOUSE_REPOSITORY');
