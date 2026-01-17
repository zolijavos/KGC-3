/**
 * @kgc/inventory - Inventory Core interfaces
 * FR4-FR10: Készlet nyilvántartás alap
 */

// ============================================
// INVENTORY ITEM TYPES
// ============================================

/**
 * Készlet tétel típus
 * - PRODUCT: Eladható termék (cikk)
 * - RENTAL_EQUIPMENT: Bérelhető gép (bérgép)
 * - PART: Alkatrész (szerviz)
 * - CONSUMABLE: Fogyóeszköz
 */
export type InventoryItemType = 'PRODUCT' | 'RENTAL_EQUIPMENT' | 'PART' | 'CONSUMABLE';

/**
 * Készlet tétel státusz
 * - AVAILABLE: Elérhető, kiadható
 * - RESERVED: Foglalt (árajánlathoz, megrendeléshez)
 * - IN_TRANSIT: Szállítás alatt (raktárak között)
 * - IN_SERVICE: Szervizben
 * - SOLD: Eladva
 * - RENTED: Kiadva (bérlés)
 * - DAMAGED: Sérült
 * - LOST: Elveszett
 * - SCRAPPED: Selejtezve
 */
export type InventoryStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_TRANSIT'
  | 'IN_SERVICE'
  | 'SOLD'
  | 'RENTED'
  | 'DAMAGED'
  | 'LOST'
  | 'SCRAPPED';

// ============================================
// INVENTORY ITEM INTERFACE
// ============================================

/**
 * Készlet tétel - egyedi azonosítható elem
 */
export interface InventoryItem {
  /** Egyedi azonosító (UUID) */
  id: string;

  /** Tenant ID - multi-tenant izoláció */
  tenantId: string;

  /** Raktár ID - melyik raktárban van */
  warehouseId: string;

  /** Cikk ID - termékleírás referencia */
  productId: string;

  /** Tétel típusa */
  type: InventoryItemType;

  /** Aktuális státusz */
  status: InventoryStatus;

  /** Serial number (egyedi azonosító fizikai tételhez) */
  serialNumber?: string;

  /** Batch/Lot number (gyártási tétel azonosító) */
  batchNumber?: string;

  /** K-P-D helykód (Kommandó-Polc-Doboz) */
  locationCode?: string;

  /** Mennyiség (nem serial tracked tételekhez) */
  quantity: number;

  /** Mértékegység */
  unit: string;

  /** Minimális készlet szint (alert) */
  minStockLevel?: number;

  /** Maximális készlet szint */
  maxStockLevel?: number;

  /** Beszerzési ár (HUF) */
  purchasePrice?: number;

  /** Utolsó beszerzés dátuma */
  lastPurchaseDate?: Date;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Módosítás dátuma */
  updatedAt: Date;

  /** Létrehozó user ID */
  createdBy: string;

  /** Utolsó módosító user ID */
  updatedBy: string;

  /** Soft delete flag */
  isDeleted: boolean;

  /** Törlés dátuma */
  deletedAt?: Date;
}

// ============================================
// INVENTORY QUERY INTERFACE
// ============================================

/**
 * Készlet lekérdezés szűrő
 */
export interface InventoryQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Raktár ID szűrő */
  warehouseId?: string;

  /** Cikk ID szűrő */
  productId?: string;

  /** Típus szűrő */
  type?: InventoryItemType;

  /** Státusz szűrő */
  status?: InventoryStatus | InventoryStatus[];

  /** Serial number keresés */
  serialNumber?: string;

  /** Batch number keresés */
  batchNumber?: string;

  /** K-P-D helykód keresés (prefix match) */
  locationCode?: string;

  /** Minimum készlet alatt van-e */
  belowMinStock?: boolean;

  /** Szabad szöveges keresés (serial, batch, cikknév) */
  search?: string;

  /** Rendezés mező */
  sortBy?: 'createdAt' | 'updatedAt' | 'quantity' | 'locationCode';

  /** Rendezés irány */
  sortOrder?: 'asc' | 'desc';

  /** Lapozás - offset */
  offset?: number;

  /** Lapozás - limit */
  limit?: number;
}

/**
 * Készlet lekérdezés eredmény
 */
export interface InventoryQueryResult {
  items: InventoryItem[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// STOCK SUMMARY INTERFACE
// ============================================

/**
 * Készlet összesítés (FR4: Real-time készletállapot)
 */
export interface StockSummary {
  /** Tenant ID */
  tenantId: string;

  /** Raktár ID (opcionális - ha nincs, összes raktár) */
  warehouseId?: string;

  /** Cikk ID */
  productId: string;

  /** Cikk név (denormalizált) */
  productName: string;

  /** Összes mennyiség */
  totalQuantity: number;

  /** Elérhető mennyiség (AVAILABLE státuszú) */
  availableQuantity: number;

  /** Foglalt mennyiség (RESERVED) */
  reservedQuantity: number;

  /** Szállítás alatt (IN_TRANSIT) */
  inTransitQuantity: number;

  /** Szervizben (IN_SERVICE) */
  inServiceQuantity: number;

  /** Kiadva/Bérelve (RENTED) */
  rentedQuantity: number;

  /** Mértékegység */
  unit: string;

  /** Minimális készlet szint */
  minStockLevel?: number;

  /** Készlet szint státusz */
  stockLevelStatus: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';

  /** Utolsó frissítés */
  lastUpdated: Date;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

/**
 * Készlet repository interface - perzisztencia réteg
 */
export interface IInventoryRepository {
  /**
   * Új készlet tétel létrehozása
   */
  create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem>;

  /**
   * Készlet tétel lekérdezése ID alapján
   */
  findById(id: string, tenantId: string): Promise<InventoryItem | null>;

  /**
   * Készlet tétel lekérdezése serial number alapján
   */
  findBySerialNumber(serialNumber: string, tenantId: string): Promise<InventoryItem | null>;

  /**
   * Készlet tételek lekérdezése szűrőkkel
   */
  query(query: InventoryQuery): Promise<InventoryQueryResult>;

  /**
   * Készlet tétel frissítése
   */
  update(
    id: string,
    tenantId: string,
    data: Partial<
      Omit<InventoryItem, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>
    >,
  ): Promise<InventoryItem>;

  /**
   * Készlet tétel soft delete
   */
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;

  /**
   * Készlet tétel hard delete (GDPR)
   */
  hardDelete(id: string, tenantId: string): Promise<void>;

  /**
   * Készlet összesítés lekérdezése
   */
  getStockSummary(
    tenantId: string,
    productId: string,
    warehouseId?: string,
  ): Promise<StockSummary | null>;

  /**
   * Több cikk készlet összesítése
   */
  getStockSummaries(
    tenantId: string,
    warehouseId?: string,
    productIds?: string[],
  ): Promise<StockSummary[]>;

  /**
   * Minimum készlet alatt lévő tételek
   */
  findBelowMinStock(tenantId: string, warehouseId?: string): Promise<StockSummary[]>;

  /**
   * Mennyiség módosítás (atomi művelet)
   */
  adjustQuantity(
    id: string,
    tenantId: string,
    adjustment: number,
    updatedBy: string,
  ): Promise<InventoryItem>;

  /**
   * Bulk mennyiség módosítás
   *
   * FONTOS: Az implementációnak tranzakcióban kell végrehajtania az összes módosítást!
   * Race condition elkerülésére SELECT FOR UPDATE vagy optimistic locking használata ajánlott.
   * Ha bármelyik módosítás sikertelen, az egész tranzakciót vissza kell görgetni.
   *
   * @param adjustments Módosítások tömbje (id, tenantId, adjustment)
   * @param updatedBy Módosító user ID
   * @throws Error ha bármelyik tétel nem létezik vagy negatívba menne
   */
  bulkAdjustQuantity(
    adjustments: Array<{ id: string; tenantId: string; adjustment: number }>,
    updatedBy: string,
  ): Promise<void>;
}

/**
 * Repository injection token
 */
export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');
