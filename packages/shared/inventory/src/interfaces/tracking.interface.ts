/**
 * @kgc/inventory - Serial Number & Batch Tracking interfaces
 * Story 9-5: Serial number és batch tracking
 * Egyedi azonosítás és batch nyomon követés
 */

// ============================================
// SERIAL NUMBER TYPES
// ============================================

/**
 * Serial number státusz
 */
export type SerialNumberStatus =
  | 'AVAILABLE'      // Raktáron, elérhető
  | 'RESERVED'       // Foglalt
  | 'RENTED'         // Bérbe adva
  | 'IN_SERVICE'     // Szervizben
  | 'SOLD'           // Eladva
  | 'DAMAGED'        // Sérült
  | 'LOST'           // Elveszett
  | 'SCRAPPED';      // Selejtezett

/**
 * Serial number rekord
 * Egyedi készlet tételek nyomon követése
 */
export interface SerialNumber {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Serial number érték */
  serialNumber: string;

  /** Cikk ID */
  productId: string;

  /** Készlet tétel ID (ha raktáron) */
  inventoryItemId?: string;

  /** Aktuális raktár ID */
  warehouseId?: string;

  /** Aktuális helykód */
  locationCode?: string;

  /** Státusz */
  status: SerialNumberStatus;

  /** Manufacturer serial number (gyári szám) */
  manufacturerSerialNumber?: string;

  /** Gyártási dátum */
  manufacturingDate?: Date;

  /** Szavatosság lejárata */
  warrantyExpiryDate?: Date;

  /** Beszerzési dátum */
  purchaseDate?: Date;

  /** Beszerzési ár */
  purchasePrice?: number;

  /** Aktuális érték */
  currentValue?: number;

  /** Megjegyzés */
  note?: string;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Utolsó módosítás */
  updatedAt?: Date;
}

// ============================================
// BATCH TYPES
// ============================================

/**
 * Batch státusz
 */
export type BatchStatus =
  | 'ACTIVE'          // Aktív, felhasználható
  | 'QUARANTINE'      // Karantén
  | 'EXPIRED'         // Lejárt
  | 'RECALLED'        // Visszahívott
  | 'DEPLETED';       // Kimerült

/**
 * Batch rekord
 * Tétel csoportok nyomon követése (pl. gyártási sorozat)
 */
export interface Batch {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Batch number érték */
  batchNumber: string;

  /** Cikk ID */
  productId: string;

  /** Aktuális raktár ID */
  warehouseId?: string;

  /** Státusz */
  status: BatchStatus;

  /** Eredeti mennyiség */
  originalQuantity: number;

  /** Aktuális mennyiség */
  currentQuantity: number;

  /** Mértékegység */
  unit: string;

  /** Gyártási dátum */
  manufacturingDate?: Date;

  /** Lejárati dátum */
  expiryDate?: Date;

  /** Beszállító batch száma */
  supplierBatchNumber?: string;

  /** Beszállító ID */
  supplierId?: string;

  /** Beszerzési dátum */
  receivedDate?: Date;

  /** Beszerzési ár (egységár) */
  unitCost?: number;

  /** Megjegyzés */
  note?: string;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Utolsó módosítás */
  updatedAt?: Date;
}

// ============================================
// QUERY INTERFACES
// ============================================

/**
 * Serial number keresés szűrő
 */
export interface SerialNumberQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Serial number (részleges egyezés) */
  serialNumber?: string;

  /** Exact match for serial number */
  serialNumberExact?: string;

  /** Cikk ID */
  productId?: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Státusz */
  status?: SerialNumberStatus | SerialNumberStatus[];

  /** Garanciaidő szűrő */
  warrantyExpiringBefore?: Date;
  warrantyExpiringAfter?: Date;

  /** Rendezés */
  sortBy?: 'serialNumber' | 'createdAt' | 'status' | 'warrantyExpiryDate';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Serial number keresés eredmény
 */
export interface SerialNumberQueryResult {
  items: SerialNumber[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Batch keresés szűrő
 */
export interface BatchQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Batch number (részleges egyezés) */
  batchNumber?: string;

  /** Exact match for batch number */
  batchNumberExact?: string;

  /** Cikk ID */
  productId?: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Beszállító ID */
  supplierId?: string;

  /** Státusz */
  status?: BatchStatus | BatchStatus[];

  /** Lejárat szűrő */
  expiringBefore?: Date;
  expiringAfter?: Date;

  /** Minimum mennyiség */
  minQuantity?: number;

  /** Rendezés */
  sortBy?: 'batchNumber' | 'createdAt' | 'expiryDate' | 'currentQuantity';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Batch keresés eredmény
 */
export interface BatchQueryResult {
  items: Batch[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

/**
 * Tracking repository interface
 */
export interface ITrackingRepository {
  // Serial Number Methods
  createSerialNumber(
    serialNumber: Omit<SerialNumber, 'id' | 'createdAt'>,
  ): Promise<SerialNumber>;

  findSerialNumberById(id: string, tenantId: string): Promise<SerialNumber | null>;

  findSerialNumberByValue(
    serialNumber: string,
    tenantId: string,
  ): Promise<SerialNumber | null>;

  querySerialNumbers(query: SerialNumberQuery): Promise<SerialNumberQueryResult>;

  updateSerialNumber(
    id: string,
    tenantId: string,
    updates: Partial<Omit<SerialNumber, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<SerialNumber>;

  serialNumberExists(serialNumber: string, tenantId: string): Promise<boolean>;

  getExpiringWarranties(
    tenantId: string,
    beforeDate: Date,
    limit?: number,
  ): Promise<SerialNumber[]>;

  // Batch Methods
  createBatch(batch: Omit<Batch, 'id' | 'createdAt'>): Promise<Batch>;

  findBatchById(id: string, tenantId: string): Promise<Batch | null>;

  findBatchByNumber(batchNumber: string, tenantId: string): Promise<Batch | null>;

  queryBatches(query: BatchQuery): Promise<BatchQueryResult>;

  updateBatch(
    id: string,
    tenantId: string,
    updates: Partial<Omit<Batch, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<Batch>;

  adjustBatchQuantity(
    id: string,
    tenantId: string,
    quantityChange: number,
  ): Promise<Batch>;

  batchExists(batchNumber: string, tenantId: string): Promise<boolean>;

  getExpiringBatches(
    tenantId: string,
    beforeDate: Date,
    limit?: number,
  ): Promise<Batch[]>;

  getLowStockBatches(
    tenantId: string,
    minQuantityThreshold: number,
    limit?: number,
  ): Promise<Batch[]>;
}

/**
 * Repository injection token
 */
export const TRACKING_REPOSITORY = Symbol('TRACKING_REPOSITORY');
