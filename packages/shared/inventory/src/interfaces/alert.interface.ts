/**
 * @kgc/inventory - Stock Alert interfaces
 * Story 9-6: Minimum stock alert
 * Készlet minimum szint figyelmeztetések
 */

// ============================================
// ALERT TYPES
// ============================================

/**
 * Alert típus
 */
export type StockAlertType =
  | 'LOW_STOCK'           // Minimum szint alatt
  | 'OUT_OF_STOCK'        // Nulla készlet
  | 'OVERSTOCK'           // Túl sok készlet
  | 'EXPIRING_SOON'       // Hamarosan lejár (batch)
  | 'WARRANTY_EXPIRING';  // Garancia lejár (serial)

/**
 * Alert prioritás
 */
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Alert státusz
 */
export type AlertStatus =
  | 'ACTIVE'       // Aktív figyelmeztetés
  | 'ACKNOWLEDGED' // Tudomásul véve
  | 'RESOLVED'     // Megoldva
  | 'SNOOZED';     // Elhalasztva

// ============================================
// STOCK LEVEL SETTINGS
// ============================================

/**
 * Minimum készlet szint beállítás
 */
export interface StockLevelSetting {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Cikk ID */
  productId: string;

  /** Raktár ID (opcionális - ha null, minden raktárra vonatkozik) */
  warehouseId?: string;

  /** Minimum szint */
  minimumLevel: number;

  /** Újrarendelési pont (ennél kezdjük a rendelést) */
  reorderPoint: number;

  /** Újrarendelési mennyiség */
  reorderQuantity: number;

  /** Maximum szint (opcionális - overstock alert) */
  maximumLevel?: number;

  /** Mértékegység */
  unit: string;

  /** Lead time napokban (szállítási idő) */
  leadTimeDays?: number;

  /** Aktív-e */
  isActive: boolean;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Utolsó módosítás */
  updatedAt?: Date;
}

// ============================================
// STOCK ALERT
// ============================================

/**
 * Készlet figyelmeztetés
 */
export interface StockAlert {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Cikk ID */
  productId: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Cikk név (denormalizált) */
  productName?: string;

  /** Raktár név (denormalizált) */
  warehouseName?: string;

  /** Alert típus */
  type: StockAlertType;

  /** Prioritás */
  priority: AlertPriority;

  /** Státusz */
  status: AlertStatus;

  /** Aktuális mennyiség */
  currentQuantity: number;

  /** Minimum szint (amitől alert van) */
  minimumLevel: number;

  /** Eltérés (mennyivel van a minimum alatt) */
  deficit?: number;

  /** Mértékegység */
  unit: string;

  /** Üzenet */
  message: string;

  /** Részletes leírás */
  details?: string;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Tudomásul vétel dátuma */
  acknowledgedAt?: Date;

  /** Tudomásul vevő user */
  acknowledgedBy?: string;

  /** Megoldás dátuma */
  resolvedAt?: Date;

  /** Elhalasztva eddig */
  snoozedUntil?: Date;

  /** Utolsó értesítés ideje */
  lastNotifiedAt?: Date;
}

// ============================================
// ALERT SUMMARY
// ============================================

/**
 * Alert összesítés
 */
export interface AlertSummary {
  /** Aktív alert-ek száma */
  totalActive: number;

  /** Kritikus prioritású alert-ek */
  criticalCount: number;

  /** Magas prioritású alert-ek */
  highCount: number;

  /** Közepes prioritású alert-ek */
  mediumCount: number;

  /** Alacsony prioritású alert-ek */
  lowCount: number;

  /** Típus szerinti bontás */
  byType: Record<StockAlertType, number>;

  /** Raktár szerinti bontás */
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    count: number;
  }>;
}

// ============================================
// QUERY INTERFACES
// ============================================

/**
 * Stock level setting keresés
 */
export interface StockLevelSettingQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Cikk ID */
  productId?: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Csak aktívak */
  isActive?: boolean;

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Alert keresés szűrő
 */
export interface AlertQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Cikk ID */
  productId?: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Alert típus */
  type?: StockAlertType | StockAlertType[];

  /** Prioritás */
  priority?: AlertPriority | AlertPriority[];

  /** Státusz */
  status?: AlertStatus | AlertStatus[];

  /** Létrehozva után */
  createdAfter?: Date;

  /** Létrehozva előtt */
  createdBefore?: Date;

  /** Rendezés */
  sortBy?: 'createdAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Alert keresés eredmény
 */
export interface AlertQueryResult {
  alerts: StockAlert[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// STOCK CHECK RESULT
// ============================================

/**
 * Készlet ellenőrzés eredmény
 */
export interface StockCheckResult {
  /** Cikk ID */
  productId: string;

  /** Raktár ID */
  warehouseId?: string;

  /** Aktuális mennyiség */
  currentQuantity: number;

  /** Minimum szint */
  minimumLevel: number;

  /** Reorder pont */
  reorderPoint: number;

  /** Készlet szint státusz */
  levelStatus: 'NORMAL' | 'BELOW_REORDER' | 'BELOW_MINIMUM' | 'OUT_OF_STOCK' | 'OVERSTOCK';

  /** Szükséges rendelési mennyiség */
  suggestedReorderQuantity?: number;

  /** Alert szükséges-e */
  alertRequired: boolean;

  /** Javasolt prioritás */
  suggestedPriority?: AlertPriority;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

/**
 * Alert repository interface
 */
export interface IAlertRepository {
  // Stock Level Settings
  createStockLevelSetting(
    setting: Omit<StockLevelSetting, 'id' | 'createdAt'>,
  ): Promise<StockLevelSetting>;

  findStockLevelSettingById(
    id: string,
    tenantId: string,
  ): Promise<StockLevelSetting | null>;

  findStockLevelSettingByProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string,
  ): Promise<StockLevelSetting | null>;

  queryStockLevelSettings(
    query: StockLevelSettingQuery,
  ): Promise<{ items: StockLevelSetting[]; total: number }>;

  updateStockLevelSetting(
    id: string,
    tenantId: string,
    updates: Partial<Omit<StockLevelSetting, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<StockLevelSetting>;

  deleteStockLevelSetting(id: string, tenantId: string): Promise<void>;

  // Stock Alerts
  createAlert(alert: Omit<StockAlert, 'id' | 'createdAt'>): Promise<StockAlert>;

  findAlertById(id: string, tenantId: string): Promise<StockAlert | null>;

  findActiveAlertForProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string,
    type?: StockAlertType,
  ): Promise<StockAlert | null>;

  queryAlerts(query: AlertQuery): Promise<AlertQueryResult>;

  updateAlert(
    id: string,
    tenantId: string,
    updates: Partial<Omit<StockAlert, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<StockAlert>;

  getAlertSummary(tenantId: string): Promise<AlertSummary>;

  // Bulk operations
  resolveAlertsByProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string,
  ): Promise<number>;
}

/**
 * Repository injection token
 */
export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');
