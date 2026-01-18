/**
 * Stock Count interfaces - Epic 24: Stock Count (Leltár)
 */

/**
 * Leltár státusz
 */
export enum StockCountStatus {
  /** Tervezés alatt */
  DRAFT = 'DRAFT',
  /** Aktív leltározás */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Felfüggesztve */
  SUSPENDED = 'SUSPENDED',
  /** Ellenőrzésre vár */
  PENDING_REVIEW = 'PENDING_REVIEW',
  /** Lezárva, korrekció várakozik */
  PENDING_ADJUSTMENT = 'PENDING_ADJUSTMENT',
  /** Befejezve */
  COMPLETED = 'COMPLETED',
  /** Visszavonva */
  CANCELLED = 'CANCELLED',
}

/**
 * Leltár típus
 */
export enum StockCountType {
  /** Teljes leltár */
  FULL = 'FULL',
  /** Részleltár (kategória) */
  PARTIAL_CATEGORY = 'PARTIAL_CATEGORY',
  /** Részleltár (zóna) */
  PARTIAL_ZONE = 'PARTIAL_ZONE',
  /** Ciklikus leltár (ABC) */
  CYCLE = 'CYCLE',
  /** Eseti leltár */
  SPOT = 'SPOT',
}

/**
 * Leltár entitás
 */
export interface IStockCount {
  /** Egyedi azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Raktár azonosító */
  warehouseId: string;
  /** Leltár szám */
  countNumber: string;
  /** Leltár típus */
  type: StockCountType;
  /** Státusz */
  status: StockCountStatus;
  /** Név/leírás */
  name: string;
  /** Tervezett kezdés */
  scheduledStartDate: Date;
  /** Tervezett befejezés */
  scheduledEndDate: Date;
  /** Tényleges kezdés */
  actualStartDate?: Date | undefined;
  /** Tényleges befejezés */
  actualEndDate?: Date | undefined;
  /** Készlet fagyasztás aktív */
  stockFrozen: boolean;
  /** Felelős felhasználó */
  responsibleUserId: string;
  /** Kategória szűrő (részleltár) */
  categoryIds?: string[] | undefined;
  /** Zóna szűrő (részleltár) */
  zoneIds?: string[] | undefined;
  /** Leltár tételek száma */
  totalItems: number;
  /** Számlált tételek száma */
  countedItems: number;
  /** Eltérések száma */
  varianceCount: number;
  /** Megjegyzés */
  notes?: string | undefined;
  /** Létrehozva */
  createdAt: Date;
  /** Módosítva */
  updatedAt: Date;
}

/**
 * Leltárív tétel
 */
export interface IStockCountItem {
  /** Egyedi azonosító */
  id: string;
  /** Leltár azonosító */
  stockCountId: string;
  /** Cikk azonosító */
  productId: string;
  /** Cikk neve */
  productName: string;
  /** Cikkszám */
  sku: string;
  /** Vonalkód */
  barcode?: string | undefined;
  /** Helykód (K-P-D) */
  locationCode: string;
  /** Könyv szerinti mennyiség */
  bookQuantity: number;
  /** Számlált mennyiség */
  countedQuantity?: number | undefined;
  /** Eltérés */
  variance?: number | undefined;
  /** Eltérés érték (Ft) */
  varianceValue?: number | undefined;
  /** Számolta (felhasználó ID) */
  countedByUserId?: string | undefined;
  /** Számlálás időpontja */
  countedAt?: Date | undefined;
  /** Újraszámlálás szükséges */
  recountRequired: boolean;
  /** Megjegyzés */
  notes?: string | undefined;
}

/**
 * Stock Count Service interfész
 */
export interface IStockCountService {
  /**
   * Leltár létrehozása
   */
  createStockCount(input: ICreateStockCountInput): Promise<IStockCount>;

  /**
   * Leltár indítása
   */
  startStockCount(stockCountId: string): Promise<IStockCount>;

  /**
   * Leltár felfüggesztése
   */
  suspendStockCount(stockCountId: string, reason: string): Promise<IStockCount>;

  /**
   * Leltár folytatása
   */
  resumeStockCount(stockCountId: string): Promise<IStockCount>;

  /**
   * Leltár lekérdezése
   */
  getStockCount(stockCountId: string): Promise<IStockCount | null>;

  /**
   * Leltárak listázása
   */
  listStockCounts(filter: IStockCountFilter): Promise<IStockCount[]>;

  /**
   * Leltárív generálása
   */
  generateCountSheet(stockCountId: string): Promise<IStockCountItem[]>;

  /**
   * Készlet fagyasztás be/ki
   */
  toggleStockFreeze(stockCountId: string, freeze: boolean): Promise<IStockCount>;

  /**
   * Leltár visszavonása
   */
  cancelStockCount(stockCountId: string, reason: string): Promise<IStockCount>;
}

/**
 * Leltár létrehozás input
 */
export interface ICreateStockCountInput {
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Raktár azonosító */
  warehouseId: string;
  /** Leltár típus */
  type: StockCountType;
  /** Név/leírás */
  name: string;
  /** Tervezett kezdés */
  scheduledStartDate: Date;
  /** Tervezett befejezés */
  scheduledEndDate: Date;
  /** Készlet fagyasztás */
  freezeStock?: boolean | undefined;
  /** Felelős felhasználó */
  responsibleUserId: string;
  /** Kategória szűrő (részleltár) */
  categoryIds?: string[] | undefined;
  /** Zóna szűrő (részleltár) */
  zoneIds?: string[] | undefined;
  /** Megjegyzés */
  notes?: string | undefined;
}

/**
 * Leltár szűrő
 */
export interface IStockCountFilter {
  /** Tenant azonosító */
  tenantId?: string | undefined;
  /** Telephely azonosító */
  locationId?: string | undefined;
  /** Státusz */
  status?: StockCountStatus | undefined;
  /** Típus */
  type?: StockCountType | undefined;
  /** Kezdő dátum */
  dateFrom?: Date | undefined;
  /** Záró dátum */
  dateTo?: Date | undefined;
}
