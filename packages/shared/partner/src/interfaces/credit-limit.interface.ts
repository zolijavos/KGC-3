/**
 * Credit Limit (Hitelkeret) Interfaces
 * FR28: Partner credit limit kezelés
 */

/**
 * Hitelkeret státusz
 */
export type CreditLimitStatus = 'ACTIVE' | 'SUSPENDED' | 'EXCEEDED' | 'INACTIVE';

/**
 * Tranzakció típus
 */
export type CreditTransactionType =
  | 'CHARGE' // Terhelés (bérlés, vásárlás)
  | 'PAYMENT' // Befizetés
  | 'ADJUSTMENT' // Manuális korrekció
  | 'LIMIT_CHANGE'; // Limit változás

/**
 * Partner hitelkeret entitás
 */
export interface CreditLimit {
  id: string;
  partnerId: string;
  tenantId: string;

  // Limit adatok
  creditLimit: number; // Maximum hitelkeret (Ft)
  currentBalance: number; // Aktuális egyenleg (pozitív = tartozás)
  availableCredit: number; // Felhasználható keret (limit - balance)

  // Státusz
  status: CreditLimitStatus;

  // Figyelmeztetési küszöb
  warningThreshold: number; // Százalék (pl. 80)

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  approvedBy?: string; // Ki hagyta jóvá a hitelkeretet
  approvedAt?: Date;
  notes?: string;
}

/**
 * Hitelkeret beállítás input
 */
export interface SetCreditLimitInput {
  partnerId: string;
  tenantId: string;
  creditLimit: number;
  warningThreshold?: number; // Default: 80
  approvedBy: string;
  notes?: string;
}

/**
 * Hitelkeret tranzakció
 */
export interface CreditTransaction {
  id: string;
  creditLimitId: string;
  partnerId: string;
  tenantId: string;
  type: CreditTransactionType;
  amount: number; // Pozitív = terhelés, Negatív = befizetés
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceType?: string; // pl. 'RENTAL', 'INVOICE'
  referenceId?: string;
  createdAt: Date;
  createdBy: string;
}

/**
 * Hitelkeret ellenőrzés eredmény
 */
export interface CreditCheckResult {
  allowed: boolean;
  partnerId: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  requestedAmount: number;
  newBalance?: number; // Ha allowed
  warning?: CreditWarning;
  reason?: 'NO_CREDIT_LIMIT' | 'EXCEEDED' | 'SUSPENDED' | 'INACTIVE' | 'INSUFFICIENT';
}

/**
 * Hitelkeret figyelmeztetés
 */
export interface CreditWarning {
  type: 'NEAR_LIMIT' | 'AT_LIMIT' | 'OVER_LIMIT';
  message: string;
  currentUsagePercent: number;
}

/**
 * Terhelés input
 */
export interface ChargeInput {
  partnerId: string;
  tenantId: string;
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
}

/**
 * Befizetés input
 */
export interface PaymentInput {
  partnerId: string;
  tenantId: string;
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
}

/**
 * Hitelkeret repository interface
 */
export interface ICreditLimitRepository {
  /**
   * Hitelkeret létrehozása/beállítása
   */
  upsert(input: SetCreditLimitInput): Promise<CreditLimit>;

  /**
   * Hitelkeret keresése partner alapján
   */
  findByPartner(partnerId: string, tenantId: string): Promise<CreditLimit | null>;

  /**
   * Hitelkeret frissítése
   */
  update(id: string, tenantId: string, data: Partial<CreditLimit>): Promise<CreditLimit>;

  /**
   * Tranzakció mentése
   */
  saveTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction>;

  /**
   * Tranzakciók lekérdezése
   */
  getTransactions(partnerId: string, tenantId: string, limit?: number): Promise<CreditTransaction[]>;

  /**
   * Státusz változtatás
   */
  setStatus(partnerId: string, tenantId: string, status: CreditLimitStatus): Promise<CreditLimit>;
}

/**
 * Repository injection token
 */
export const CREDIT_LIMIT_REPOSITORY = Symbol('CREDIT_LIMIT_REPOSITORY');
