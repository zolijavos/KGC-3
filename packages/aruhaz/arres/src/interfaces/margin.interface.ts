/**
 * Margin interfaces - Story 23.2: Árrés Kalkuláció és Riport
 */

/**
 * Árrés típus
 */
export enum MarginType {
  /** Bruttó árrés */
  GROSS = 'GROSS',
  /** Nettó árrés */
  NET = 'NET',
}

/**
 * Árrés kalkuláció eredmény
 */
export interface IMarginCalculation {
  /** Cikk azonosító */
  productId: string;
  /** Beszerzési ár (nettó) */
  purchasePrice: number;
  /** Eladási ár (nettó) */
  sellingPrice: number;
  /** Árrés összeg */
  marginAmount: number;
  /** Árrés százalék */
  marginPercent: number;
  /** Felár százalék (markup) */
  markupPercent: number;
  /** Kalkuláció dátuma */
  calculatedAt: Date;
}

/**
 * Cikk árrés összesítő
 */
export interface IProductMarginSummary {
  /** Cikk azonosító */
  productId: string;
  /** Cikk neve */
  productName: string;
  /** Cikkcsoport azonosító */
  categoryId: string;
  /** Átlagos beszerzési ár */
  averagePurchasePrice: number;
  /** Aktuális eladási ár */
  currentSellingPrice: number;
  /** Árrés összeg */
  marginAmount: number;
  /** Árrés százalék */
  marginPercent: number;
  /** Eladott mennyiség (periódusban) */
  quantitySold: number;
  /** Összes árrés (periódusban) */
  totalMargin: number;
  /** Forgalom (periódusban) */
  revenue: number;
}

/**
 * Kategória árrés összesítő
 */
export interface ICategoryMarginSummary {
  /** Kategória azonosító */
  categoryId: string;
  /** Kategória neve */
  categoryName: string;
  /** Cikkek száma */
  productCount: number;
  /** Átlagos árrés százalék */
  averageMarginPercent: number;
  /** Összes árrés */
  totalMargin: number;
  /** Összes forgalom */
  totalRevenue: number;
  /** Összes beszerzési költség */
  totalCost: number;
}

/**
 * Időszaki árrés riport
 */
export interface IMarginReport {
  /** Riport azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Időszak kezdete */
  periodStart: Date;
  /** Időszak vége */
  periodEnd: Date;
  /** Összes forgalom */
  totalRevenue: number;
  /** Összes beszerzési költség */
  totalCost: number;
  /** Összes árrés */
  totalMargin: number;
  /** Átlagos árrés százalék */
  averageMarginPercent: number;
  /** Cikk összesítők */
  productSummaries: IProductMarginSummary[];
  /** Kategória összesítők */
  categorySummaries: ICategoryMarginSummary[];
  /** Generálás dátuma */
  generatedAt: Date;
}

/**
 * Margin Service interfész
 */
export interface IMarginService {
  /**
   * Árrés kalkuláció egy cikkre
   */
  calculateMargin(productId: string): Promise<IMarginCalculation>;

  /**
   * Batch árrés kalkuláció
   */
  calculateMargins(productIds: string[]): Promise<Map<string, IMarginCalculation>>;

  /**
   * Cikk árrés összesítő lekérdezése
   */
  getProductMarginSummary(
    productId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<IProductMarginSummary>;

  /**
   * Kategória árrés összesítő
   */
  getCategoryMarginSummary(
    categoryId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ICategoryMarginSummary>;

  /**
   * Árrés riport generálása
   */
  generateMarginReport(input: IMarginReportInput): Promise<IMarginReport>;

  /**
   * Árrés riport exportálása
   */
  exportMarginReport(
    reportId: string,
    format: 'CSV' | 'XLSX' | 'PDF'
  ): Promise<Buffer>;

  /**
   * Top N legjövedelmezőbb cikk
   */
  getTopProfitableProducts(
    limit: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<IProductMarginSummary[]>;

  /**
   * Legalacsonyabb árrésű cikkek (figyelmeztetés)
   */
  getLowMarginProducts(
    thresholdPercent: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<IProductMarginSummary[]>;

  /**
   * Árrés trend elemzés
   */
  getMarginTrend(
    productId: string,
    periodStart: Date,
    periodEnd: Date,
    granularity: 'DAY' | 'WEEK' | 'MONTH'
  ): Promise<IMarginTrendPoint[]>;
}

/**
 * Árrés riport input
 */
export interface IMarginReportInput {
  /** Tenant azonosító */
  tenantId: string;
  /** Időszak kezdete */
  periodStart: Date;
  /** Időszak vége */
  periodEnd: Date;
  /** Kategória szűrő (opcionális) */
  categoryId?: string | undefined;
  /** Telephely szűrő (opcionális) */
  locationId?: string | undefined;
  /** Csoportosítás */
  groupBy: 'PRODUCT' | 'CATEGORY' | 'SUPPLIER';
}

/**
 * Árrés trend pont
 */
export interface IMarginTrendPoint {
  /** Dátum */
  date: Date;
  /** Árrés százalék */
  marginPercent: number;
  /** Árrés összeg */
  marginAmount: number;
  /** Forgalom */
  revenue: number;
  /** Eladott mennyiség */
  quantitySold: number;
}
