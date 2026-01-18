/**
 * Cash Reconciliation interfaces - Story 22.3: Napi Pénztárzárás
 */

import { PaymentMethod } from './pos-transaction.interface';

/**
 * Pénztár státusz
 */
export enum RegisterStatus {
  /** Zárva */
  CLOSED = 'CLOSED',
  /** Nyitva */
  OPEN = 'OPEN',
  /** Zárás alatt */
  CLOSING = 'CLOSING',
}

/**
 * Eltérés típus
 */
export enum VarianceType {
  /** Egyezik */
  MATCH = 'MATCH',
  /** Hiány */
  SHORTAGE = 'SHORTAGE',
  /** Többlet */
  OVERAGE = 'OVERAGE',
}

/**
 * Pénztár nyitás/zárás rekord
 */
export interface ICashRegisterSession {
  /** Egyedi azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Pénztárgép azonosító */
  registerId: string;
  /** Pénztár státusz */
  status: RegisterStatus;
  /** Nyitó operátor */
  openedByUserId: string;
  /** Záró operátor */
  closedByUserId?: string | undefined;
  /** Nyitó összeg (váltópénz) */
  openingFloat: number;
  /** Záró összeg (számolt) */
  closingCash?: number | undefined;
  /** Elvárt záró összeg */
  expectedCash?: number | undefined;
  /** Eltérés */
  variance?: number | undefined;
  /** Eltérés típus */
  varianceType?: VarianceType | undefined;
  /** Eltérés magyarázat */
  varianceExplanation?: string | undefined;
  /** Nyitás időpontja */
  openedAt: Date;
  /** Zárás időpontja */
  closedAt?: Date | undefined;
}

/**
 * Napi összesítő fizetési mód szerint
 */
export interface IDailyPaymentSummary {
  /** Fizetési mód */
  method: PaymentMethod;
  /** Tranzakciók száma */
  transactionCount: number;
  /** Összes összeg */
  totalAmount: number;
}

/**
 * Napi pénztárzárás riport
 */
export interface IDailyCashReport {
  /** Egyedi azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Pénztárgép azonosító */
  registerId: string;
  /** Dátum */
  reportDate: Date;
  /** Pénztár session */
  session: ICashRegisterSession;
  /** Tranzakciók száma */
  transactionCount: number;
  /** Nettó forgalom */
  netSales: number;
  /** ÁFA összeg */
  vatAmount: number;
  /** Bruttó forgalom */
  grossSales: number;
  /** Fizetési mód szerinti bontás */
  paymentSummary: IDailyPaymentSummary[];
  /** Visszáruk értéke */
  refundsTotal: number;
  /** Visszáruk száma */
  refundsCount: number;
  /** Törölt tranzakciók értéke */
  cancelledTotal: number;
  /** Törölt tranzakciók száma */
  cancelledCount: number;
  /** Készpénz eltérés */
  cashVariance: number;
  /** Eltérés típus */
  varianceType: VarianceType;
  /** Megjegyzések */
  notes?: string | undefined;
  /** Jóváhagyó (boltvezető) */
  approvedByUserId?: string | undefined;
  /** Jóváhagyás időpontja */
  approvedAt?: Date | undefined;
  /** Létrehozva */
  createdAt: Date;
}

/**
 * Címlet bontás (készpénz számoláshoz)
 */
export interface IDenominationCount {
  /** Címlet értéke (Ft) */
  denomination: number;
  /** Darabszám */
  count: number;
  /** Összes érték */
  total: number;
}

/**
 * Készpénz számolás input
 */
export interface ICashCountInput {
  /** Címletek */
  denominations: IDenominationCount[];
  /** Egyéb összeg (pl. érmék) */
  otherAmount?: number | undefined;
}

/**
 * Cash Reconciliation Service interfész
 */
export interface ICashReconciliationService {
  /**
   * Pénztár nyitás
   */
  openRegister(input: IOpenRegisterInput): Promise<ICashRegisterSession>;

  /**
   * Pénztár zárás kezdeményezése
   */
  initiateClosing(registerId: string, userId: string): Promise<ICashRegisterSession>;

  /**
   * Készpénz számolás rögzítése
   */
  recordCashCount(sessionId: string, input: ICashCountInput): Promise<ICashRegisterSession>;

  /**
   * Eltérés dokumentálása
   */
  documentVariance(sessionId: string, explanation: string): Promise<ICashRegisterSession>;

  /**
   * Pénztár zárás véglegesítése
   */
  completeClosing(sessionId: string): Promise<IDailyCashReport>;

  /**
   * Napi riport generálása
   */
  generateDailyReport(registerId: string, date: Date): Promise<IDailyCashReport>;

  /**
   * Aktuális session lekérdezése
   */
  getCurrentSession(registerId: string): Promise<ICashRegisterSession | null>;

  /**
   * Elvárt készpénz kalkulálása
   */
  calculateExpectedCash(sessionId: string): Promise<number>;

  /**
   * Riport jóváhagyása
   */
  approveReport(reportId: string, userId: string): Promise<IDailyCashReport>;

  /**
   * Havi összesítő
   */
  getMonthlySummary(registerId: string, year: number, month: number): Promise<{
    totalSales: number;
    totalTransactions: number;
    totalVariance: number;
    dailyReports: IDailyCashReport[];
  }>;
}

/**
 * Pénztár nyitás input
 */
export interface IOpenRegisterInput {
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Pénztárgép azonosító */
  registerId: string;
  /** Operátor azonosító */
  userId: string;
  /** Nyitó váltópénz */
  openingFloat: number;
}
