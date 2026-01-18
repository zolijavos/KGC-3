/**
 * Variance interfaces - Story 24.3: Leltár Eltérés és Korrekció
 */

/**
 * Eltérés típus
 */
export enum VarianceType {
  /** Hiány */
  SHORTAGE = 'SHORTAGE',
  /** Többlet */
  OVERAGE = 'OVERAGE',
  /** Egyezik */
  MATCH = 'MATCH',
}

/**
 * Korrekció státusz
 */
export enum AdjustmentStatus {
  /** Jóváhagyásra vár */
  PENDING = 'PENDING',
  /** Jóváhagyva */
  APPROVED = 'APPROVED',
  /** Elutasítva */
  REJECTED = 'REJECTED',
  /** Végrehajtva */
  APPLIED = 'APPLIED',
}

/**
 * Eltérés ok kategória
 */
export enum VarianceReasonCategory {
  /** Adminisztrációs hiba */
  ADMIN_ERROR = 'ADMIN_ERROR',
  /** Lopás/sérülés */
  THEFT_DAMAGE = 'THEFT_DAMAGE',
  /** Mérési hiba */
  MEASUREMENT_ERROR = 'MEASUREMENT_ERROR',
  /** Rossz bevételezés */
  RECEIPT_ERROR = 'RECEIPT_ERROR',
  /** Rossz kiadás */
  DISPATCH_ERROR = 'DISPATCH_ERROR',
  /** Természetes veszteség */
  NATURAL_LOSS = 'NATURAL_LOSS',
  /** Ismeretlen */
  UNKNOWN = 'UNKNOWN',
  /** Egyéb */
  OTHER = 'OTHER',
}

/**
 * Eltérés részletek
 */
export interface IVarianceDetail {
  /** Leltár tétel azonosító */
  itemId: string;
  /** Cikk azonosító */
  productId: string;
  /** Cikk neve */
  productName: string;
  /** Cikkszám */
  sku: string;
  /** Helykód */
  locationCode: string;
  /** Könyv szerinti mennyiség */
  bookQuantity: number;
  /** Számlált mennyiség */
  countedQuantity: number;
  /** Eltérés mennyiség */
  variance: number;
  /** Eltérés típus */
  varianceType: VarianceType;
  /** Egységár */
  unitPrice: number;
  /** Eltérés értéke */
  varianceValue: number;
  /** Ok kategória */
  reasonCategory?: VarianceReasonCategory | undefined;
  /** Ok részletes leírás */
  reasonDescription?: string | undefined;
  /** Korrekció státusz */
  adjustmentStatus: AdjustmentStatus;
}

/**
 * Korrekció rekord
 */
export interface IStockAdjustment {
  /** Egyedi azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Leltár azonosító */
  stockCountId: string;
  /** Korrekció szám */
  adjustmentNumber: string;
  /** Státusz */
  status: AdjustmentStatus;
  /** Korrekciós tételek száma */
  itemCount: number;
  /** Összes eltérés érték */
  totalVarianceValue: number;
  /** Létrehozta */
  createdByUserId: string;
  /** Jóváhagyta */
  approvedByUserId?: string | undefined;
  /** Végrehajtotta */
  appliedByUserId?: string | undefined;
  /** Létrehozva */
  createdAt: Date;
  /** Jóváhagyva */
  approvedAt?: Date | undefined;
  /** Végrehajtva */
  appliedAt?: Date | undefined;
  /** Elutasítás oka */
  rejectionReason?: string | undefined;
}

/**
 * Eltérés összesítő
 */
export interface IVarianceSummary {
  /** Leltár azonosító */
  stockCountId: string;
  /** Összes eltérés (tétel) */
  totalVarianceItems: number;
  /** Hiány tételek */
  shortageItems: number;
  /** Többlet tételek */
  overageItems: number;
  /** Összes hiány érték */
  totalShortageValue: number;
  /** Összes többlet érték */
  totalOverageValue: number;
  /** Nettó eltérés érték */
  netVarianceValue: number;
  /** Ok szerinti bontás */
  byReason: Array<{
    reason: VarianceReasonCategory;
    count: number;
    value: number;
  }>;
}

/**
 * Variance Service interfész
 */
export interface IVarianceService {
  /**
   * Eltérések lekérdezése
   */
  getVariances(stockCountId: string): Promise<IVarianceDetail[]>;

  /**
   * Eltérés ok dokumentálása
   */
  documentVarianceReason(
    itemId: string,
    category: VarianceReasonCategory,
    description: string
  ): Promise<IVarianceDetail>;

  /**
   * Eltérés összesítő
   */
  getVarianceSummary(stockCountId: string): Promise<IVarianceSummary>;

  /**
   * Korrekció létrehozása
   */
  createAdjustment(stockCountId: string, userId: string): Promise<IStockAdjustment>;

  /**
   * Korrekció jóváhagyása
   */
  approveAdjustment(adjustmentId: string, userId: string): Promise<IStockAdjustment>;

  /**
   * Korrekció elutasítása
   */
  rejectAdjustment(
    adjustmentId: string,
    userId: string,
    reason: string
  ): Promise<IStockAdjustment>;

  /**
   * Korrekció végrehajtása (készlet módosítás)
   */
  applyAdjustment(adjustmentId: string, userId: string): Promise<IStockAdjustment>;

  /**
   * Korrekció lekérdezése
   */
  getAdjustment(adjustmentId: string): Promise<IStockAdjustment | null>;

  /**
   * Leltár lezárása (összes korrekció végrehajtva)
   */
  completeStockCount(stockCountId: string, userId: string): Promise<void>;

  /**
   * Eltérés export (CSV/Excel)
   */
  exportVariances(
    stockCountId: string,
    format: 'CSV' | 'XLSX'
  ): Promise<Buffer>;
}
