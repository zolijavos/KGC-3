/**
 * Count Recording interfaces - Story 24.2: Leltár Rögzítés
 */

import type { IStockCountItem } from './stock-count.interface';

/**
 * Számlálás mód
 */
export enum CountingMode {
  /** Kézi bevitel */
  MANUAL = 'MANUAL',
  /** Vonalkód scan */
  BARCODE_SCAN = 'BARCODE_SCAN',
  /** QR kód scan */
  QR_SCAN = 'QR_SCAN',
  /** RFID scan */
  RFID_SCAN = 'RFID_SCAN',
}

/**
 * Számláló felhasználó session
 */
export interface ICounterSession {
  /** Egyedi azonosító */
  id: string;
  /** Leltár azonosító */
  stockCountId: string;
  /** Felhasználó azonosító */
  userId: string;
  /** Felhasználó neve */
  userName: string;
  /** Aktív-e */
  isActive: boolean;
  /** Kiosztott zóna/terület */
  assignedZone?: string | undefined;
  /** Számlált tételek száma */
  itemsCounted: number;
  /** Kezdés időpontja */
  startedAt: Date;
  /** Utolsó aktivitás */
  lastActivityAt: Date;
  /** Befejezés időpontja */
  endedAt?: Date | undefined;
}

/**
 * Számlálás rögzítés input
 */
export interface IRecordCountInput {
  /** Leltár tétel azonosító */
  itemId: string;
  /** Számlált mennyiség */
  countedQuantity: number;
  /** Számláló felhasználó */
  userId: string;
  /** Számlálás módja */
  mode: CountingMode;
  /** Scan kód (ha scan-el) */
  scannedCode?: string | undefined;
  /** Megjegyzés */
  notes?: string | undefined;
}

/**
 * Batch számlálás input (több tétel egyszerre)
 */
export interface IBatchCountInput {
  /** Leltár azonosító */
  stockCountId: string;
  /** Számláló felhasználó */
  userId: string;
  /** Tételek */
  items: Array<{
    /** Cikk azonosító VAGY vonalkód */
    productId?: string | undefined;
    barcode?: string | undefined;
    /** Számlált mennyiség */
    countedQuantity: number;
    /** Helykód */
    locationCode?: string | undefined;
  }>;
}

/**
 * Számlálás statisztika
 */
export interface ICountingProgress {
  /** Leltár azonosító */
  stockCountId: string;
  /** Összes tétel */
  totalItems: number;
  /** Számlált tételek */
  countedItems: number;
  /** Újraszámlálásra váró */
  pendingRecountItems: number;
  /** Eltérés nélküli tételek */
  matchingItems: number;
  /** Eltéréses tételek */
  varianceItems: number;
  /** Százalékos készültség */
  completionPercent: number;
  /** Aktív számlálók */
  activeCounters: number;
}

/**
 * Count Recording Service interfész
 */
export interface ICountRecordingService {
  /**
   * Számláló session indítása
   */
  startCounterSession(
    stockCountId: string,
    userId: string,
    assignedZone?: string
  ): Promise<ICounterSession>;

  /**
   * Számláló session befejezése
   */
  endCounterSession(sessionId: string): Promise<ICounterSession>;

  /**
   * Aktív sessionök lekérdezése
   */
  getActiveSessions(stockCountId: string): Promise<ICounterSession[]>;

  /**
   * Számlálás rögzítése
   */
  recordCount(input: IRecordCountInput): Promise<IStockCountItem>;

  /**
   * Batch számlálás rögzítése
   */
  recordBatchCount(input: IBatchCountInput): Promise<IStockCountItem[]>;

  /**
   * Tétel keresése vonalkóddal
   */
  findItemByBarcode(
    stockCountId: string,
    barcode: string
  ): Promise<IStockCountItem | null>;

  /**
   * Számlálás visszavonása
   */
  undoCount(itemId: string, userId: string): Promise<IStockCountItem>;

  /**
   * Újraszámlálás megjelölése
   */
  markForRecount(itemId: string, reason: string): Promise<IStockCountItem>;

  /**
   * Számláló tételek lekérdezése
   */
  getCountItems(
    stockCountId: string,
    filter: ICountItemFilter
  ): Promise<IStockCountItem[]>;

  /**
   * Számlálás progress lekérdezése
   */
  getCountingProgress(stockCountId: string): Promise<ICountingProgress>;
}

/**
 * Tétel szűrő
 */
export interface ICountItemFilter {
  /** Csak számlálatlan */
  uncountedOnly?: boolean | undefined;
  /** Csak eltéréses */
  varianceOnly?: boolean | undefined;
  /** Csak újraszámlálásra váró */
  recountOnly?: boolean | undefined;
  /** Zóna/helykód */
  locationCode?: string | undefined;
  /** Kategória */
  categoryId?: string | undefined;
  /** Keresés (név, cikkszám) */
  search?: string | undefined;
}
