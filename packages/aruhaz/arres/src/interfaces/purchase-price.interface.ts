/**
 * Purchase Price interfaces - Story 23.1: Beszerzési Ár Tracking
 */

/**
 * Átlagolási módszer
 */
export enum PriceAveragingMethod {
  /** Utolsó beszerzési ár */
  LAST = 'LAST',
  /** Mozgó átlag */
  MOVING_AVERAGE = 'MOVING_AVERAGE',
  /** Súlyozott átlag */
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
  /** FIFO */
  FIFO = 'FIFO',
}

/**
 * Beszerzési ár rekord
 */
export interface IPurchasePriceRecord {
  /** Egyedi azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Cikk azonosító */
  productId: string;
  /** Beszállító azonosító */
  supplierId: string;
  /** Bevételezés azonosító */
  receiptId: string;
  /** Egységár (nettó) */
  unitPrice: number;
  /** Mennyiség */
  quantity: number;
  /** Pénznem */
  currency: string;
  /** Bevételezés dátuma */
  receiptDate: Date;
  /** Létrehozva */
  createdAt: Date;
}

/**
 * Cikk aktuális beszerzési ár
 */
export interface IProductPurchasePrice {
  /** Cikk azonosító */
  productId: string;
  /** Utolsó beszerzési ár */
  lastPrice: number;
  /** Átlagos beszerzési ár */
  averagePrice: number;
  /** Súlyozott átlag ár */
  weightedAveragePrice: number;
  /** Minimum beszerzési ár (historikus) */
  minPrice: number;
  /** Maximum beszerzési ár (historikus) */
  maxPrice: number;
  /** Utolsó beszállító */
  lastSupplierId: string;
  /** Utolsó bevételezés dátuma */
  lastReceiptDate: Date;
  /** Összes bevételezett mennyiség */
  totalQuantityReceived: number;
  /** Beszerzések száma */
  purchaseCount: number;
}

/**
 * Beszerzési ár history
 */
export interface IPurchasePriceHistory {
  /** Cikk azonosító */
  productId: string;
  /** Ár rekordok */
  records: IPurchasePriceRecord[];
  /** Ár változás trend (%) */
  priceTrend: number;
  /** Átlagos ár változás periódusban */
  averagePriceChange: number;
}

/**
 * Purchase Price Service interfész
 */
export interface IPurchasePriceService {
  /**
   * Beszerzési ár rögzítése bevételezéskor
   */
  recordPurchasePrice(input: IRecordPurchasePriceInput): Promise<IPurchasePriceRecord>;

  /**
   * Cikk aktuális beszerzési ára
   */
  getProductPurchasePrice(productId: string): Promise<IProductPurchasePrice | null>;

  /**
   * Cikk beszerzési ár history
   */
  getPurchasePriceHistory(
    productId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<IPurchasePriceHistory>;

  /**
   * Aktuális beszerzési ár adott metódussal
   */
  getCurrentPrice(
    productId: string,
    method: PriceAveragingMethod
  ): Promise<number>;

  /**
   * Beszállító árak összehasonlítása
   */
  compareSupplierPrices(productId: string): Promise<ISupplierPriceComparison[]>;

  /**
   * Batch beszerzési ár lekérdezés
   */
  getProductPurchasePrices(productIds: string[]): Promise<Map<string, IProductPurchasePrice>>;

  /**
   * Ár változás riasztások
   */
  getPriceChangeAlerts(
    thresholdPercent: number
  ): Promise<IPriceChangeAlert[]>;
}

/**
 * Beszerzési ár rögzítés input
 */
export interface IRecordPurchasePriceInput {
  /** Tenant azonosító */
  tenantId: string;
  /** Cikk azonosító */
  productId: string;
  /** Beszállító azonosító */
  supplierId: string;
  /** Bevételezés azonosító */
  receiptId: string;
  /** Egységár */
  unitPrice: number;
  /** Mennyiség */
  quantity: number;
  /** Pénznem (alapértelmezett: HUF) */
  currency?: string | undefined;
  /** Bevételezés dátuma */
  receiptDate: Date;
}

/**
 * Beszállító ár összehasonlítás
 */
export interface ISupplierPriceComparison {
  /** Beszállító azonosító */
  supplierId: string;
  /** Beszállító neve */
  supplierName: string;
  /** Utolsó ár */
  lastPrice: number;
  /** Átlag ár */
  averagePrice: number;
  /** Utolsó beszerzés dátuma */
  lastPurchaseDate: Date;
  /** Beszerzések száma */
  purchaseCount: number;
}

/**
 * Ár változás riasztás
 */
export interface IPriceChangeAlert {
  /** Cikk azonosító */
  productId: string;
  /** Cikk neve */
  productName: string;
  /** Előző ár */
  previousPrice: number;
  /** Új ár */
  newPrice: number;
  /** Változás (%) */
  changePercent: number;
  /** Beszállító */
  supplierId: string;
  /** Dátum */
  date: Date;
}
