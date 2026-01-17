/**
 * @kgc/inventory - Movement Audit interfaces
 * Story 9-4: Készlet mozgás audit trail
 * Minden készlet mozgás rögzítése auditáláshoz
 */

// ============================================
// MOVEMENT TYPES
// ============================================

/**
 * Mozgás típus
 * - RECEIPT: Bevételezés (készlet növekedés)
 * - ISSUE: Kiadás (készlet csökkenés)
 * - TRANSFER_OUT: Átmozgatás - ki (forrás raktárból)
 * - TRANSFER_IN: Átmozgatás - be (cél raktárba)
 * - ADJUSTMENT: Korrekció (leltár eltérés)
 * - RETURN: Visszavétel (bérlésből, szervizből)
 * - SCRAP: Selejtezés
 * - RESERVATION: Foglalás
 * - RELEASE: Foglalás feloldás
 * - STATUS_CHANGE: Státusz változás
 */
export type MovementType =
  | 'RECEIPT'
  | 'ISSUE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'SCRAP'
  | 'RESERVATION'
  | 'RELEASE'
  | 'STATUS_CHANGE';

/**
 * Mozgás forrás modul
 */
export type MovementSourceModule =
  | 'INVENTORY'
  | 'RENTAL'
  | 'SERVICE'
  | 'SALES'
  | 'STOCK_COUNT'
  | 'TRANSFER'
  | 'MANUAL';

// ============================================
// MOVEMENT RECORD
// ============================================

/**
 * Készlet mozgás rekord (audit trail)
 */
export interface InventoryMovement {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Készlet tétel ID */
  inventoryItemId: string;

  /** Raktár ID (ahol a mozgás történt) */
  warehouseId: string;

  /** Cikk ID (denormalizált a gyorsabb query-hez) */
  productId: string;

  /** Mozgás típusa */
  type: MovementType;

  /** Forrás modul */
  sourceModule: MovementSourceModule;

  /** Hivatkozás ID (pl. transfer ID, rental ID, stb.) */
  referenceId?: string;

  /** Hivatkozás típus (pl. 'TRANSFER', 'RENTAL') */
  referenceType?: string;

  /** Mennyiség változás (pozitív: növekedés, negatív: csökkenés) */
  quantityChange: number;

  /** Előző mennyiség */
  previousQuantity: number;

  /** Új mennyiség */
  newQuantity: number;

  /** Mértékegység */
  unit: string;

  /** Előző státusz (ha státusz változás) */
  previousStatus?: string;

  /** Új státusz (ha státusz változás) */
  newStatus?: string;

  /** Előző helykód */
  previousLocationCode?: string;

  /** Új helykód */
  newLocationCode?: string;

  /** Serial number (ha egyedi tétel) */
  serialNumber?: string;

  /** Batch number (ha batch tracked) */
  batchNumber?: string;

  /** Költség/érték (ha releváns) */
  value?: number;

  /** Valuta */
  currency?: string;

  /** Indoklás/megjegyzés */
  reason?: string;

  /** Végrehajtó user ID */
  performedBy: string;

  /** Végrehajtás időpontja */
  performedAt: Date;

  /** Létrehozás dátuma */
  createdAt: Date;
}

// ============================================
// QUERY INTERFACE
// ============================================

/**
 * Mozgás keresés szűrő
 */
export interface MovementQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Készlet tétel ID */
  inventoryItemId?: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Cikk ID */
  productId?: string;

  /** Mozgás típus */
  type?: MovementType | MovementType[];

  /** Forrás modul */
  sourceModule?: MovementSourceModule;

  /** Hivatkozás ID */
  referenceId?: string;

  /** Serial number */
  serialNumber?: string;

  /** Batch number */
  batchNumber?: string;

  /** Végrehajtó */
  performedBy?: string;

  /** Dátum szűrő: kezdete */
  dateFrom?: Date;

  /** Dátum szűrő: vége */
  dateTo?: Date;

  /** Rendezés */
  sortBy?: 'performedAt' | 'createdAt' | 'quantityChange';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Mozgás keresés eredmény
 */
export interface MovementQueryResult {
  movements: InventoryMovement[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// AGGREGATION INTERFACES
// ============================================

/**
 * Mozgás összesítés (időszakra)
 */
export interface MovementSummary {
  /** Időszak kezdete */
  periodStart: Date;

  /** Időszak vége */
  periodEnd: Date;

  /** Bevételezések összesen */
  totalReceipts: number;

  /** Kiadások összesen */
  totalIssues: number;

  /** Transzferek ki */
  totalTransfersOut: number;

  /** Transzferek be */
  totalTransfersIn: number;

  /** Korrekciók (pozitív) */
  positiveAdjustments: number;

  /** Korrekciók (negatív) */
  negativeAdjustments: number;

  /** Selejtezések */
  totalScrapped: number;

  /** Nettó változás */
  netChange: number;
}

/**
 * Készlet előzmények (tétel szintű)
 */
export interface InventoryHistory {
  /** Készlet tétel ID */
  inventoryItemId: string;

  /** Serial number (ha van) */
  serialNumber?: string;

  /** Mozgások időrendben */
  movements: InventoryMovement[];

  /** Jelenlegi mennyiség */
  currentQuantity: number;

  /** Jelenlegi státusz */
  currentStatus: string;

  /** Jelenlegi helykód */
  currentLocationCode?: string;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

/**
 * Movement repository interface
 */
export interface IMovementRepository {
  /**
   * Mozgás rögzítése
   */
  create(
    movement: Omit<InventoryMovement, 'id' | 'createdAt'>,
  ): Promise<InventoryMovement>;

  /**
   * Több mozgás rögzítése (bulk)
   */
  createMany(
    movements: Array<Omit<InventoryMovement, 'id' | 'createdAt'>>,
  ): Promise<number>;

  /**
   * Mozgás lekérdezése
   */
  findById(id: string, tenantId: string): Promise<InventoryMovement | null>;

  /**
   * Mozgások lekérdezése szűrőkkel
   */
  query(query: MovementQuery): Promise<MovementQueryResult>;

  /**
   * Készlet előzmények
   */
  getHistory(
    inventoryItemId: string,
    tenantId: string,
    limit?: number,
  ): Promise<InventoryMovement[]>;

  /**
   * Mozgás összesítés
   */
  getSummary(
    tenantId: string,
    warehouseId: string | undefined,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MovementSummary>;

  /**
   * Utolsó mozgás egy tételhez
   */
  getLastMovement(
    inventoryItemId: string,
    tenantId: string,
  ): Promise<InventoryMovement | null>;
}

/**
 * Repository injection token
 */
export const MOVEMENT_REPOSITORY = Symbol('MOVEMENT_REPOSITORY');
