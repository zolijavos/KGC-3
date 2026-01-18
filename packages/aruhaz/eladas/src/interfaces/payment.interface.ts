/**
 * Payment interfaces - Story 22.2: Fizetési Módok
 */

import { PaymentMethod } from './pos-transaction.interface';

/**
 * Kártya típus
 */
export enum CardType {
  /** Visa */
  VISA = 'VISA',
  /** Mastercard */
  MASTERCARD = 'MASTERCARD',
  /** Maestro */
  MAESTRO = 'MAESTRO',
  /** American Express */
  AMEX = 'AMEX',
  /** Egyéb */
  OTHER = 'OTHER',
}

/**
 * Fizetés státusz
 */
export enum PaymentStatus {
  /** Függőben */
  PENDING = 'PENDING',
  /** Feldolgozás alatt */
  PROCESSING = 'PROCESSING',
  /** Sikeres */
  COMPLETED = 'COMPLETED',
  /** Sikertelen */
  FAILED = 'FAILED',
  /** Visszautasított */
  DECLINED = 'DECLINED',
  /** Visszavonva */
  REFUNDED = 'REFUNDED',
}

/**
 * Készpénz fizetés részletek
 */
export interface ICashPaymentDetails {
  /** Kapott készpénz */
  receivedAmount: number;
  /** Visszajáró */
  changeAmount: number;
  /** Címletek részletezése (opcionális) */
  denominations?: Record<number, number> | undefined;
}

/**
 * Kártya fizetés részletek
 */
export interface ICardPaymentDetails {
  /** Kártya típus */
  cardType: CardType;
  /** Utolsó 4 számjegy */
  lastFourDigits: string;
  /** Terminál azonosító */
  terminalId: string;
  /** Tranzakció azonosító (MyPOS) */
  transactionId: string;
  /** Engedélyezési kód */
  authorizationCode: string;
  /** Érintéses fizetés */
  contactless: boolean;
}

/**
 * Átutalás fizetés részletek
 */
export interface ITransferPaymentDetails {
  /** Bankszámlaszám */
  accountNumber: string;
  /** Közlemény */
  reference: string;
  /** Várható beérkezés */
  expectedDate: Date;
}

/**
 * Utalvány fizetés részletek
 */
export interface IVoucherPaymentDetails {
  /** Utalvány kód */
  voucherCode: string;
  /** Utalvány típus */
  voucherType: string;
  /** Eredeti érték */
  originalValue: number;
  /** Felhasznált érték */
  usedValue: number;
  /** Maradék érték */
  remainingValue: number;
}

/**
 * Fizetési tranzakció entitás
 */
export interface IPaymentTransaction {
  /** Egyedi azonosító */
  id: string;
  /** POS tranzakció azonosító */
  posTransactionId: string;
  /** Fizetési mód */
  method: PaymentMethod;
  /** Összeg */
  amount: number;
  /** Státusz */
  status: PaymentStatus;
  /** Készpénz részletek */
  cashDetails?: ICashPaymentDetails | undefined;
  /** Kártya részletek */
  cardDetails?: ICardPaymentDetails | undefined;
  /** Átutalás részletek */
  transferDetails?: ITransferPaymentDetails | undefined;
  /** Utalvány részletek */
  voucherDetails?: IVoucherPaymentDetails | undefined;
  /** Hiba üzenet (sikertelen esetén) */
  errorMessage?: string | undefined;
  /** Létrehozva */
  createdAt: Date;
  /** Feldolgozva */
  processedAt?: Date | undefined;
}

/**
 * Vegyes fizetés összesítő
 */
export interface IMixedPaymentSummary {
  /** Összes fizetendő */
  totalAmount: number;
  /** Fizetett készpénz */
  cashPaid: number;
  /** Fizetett kártyával */
  cardPaid: number;
  /** Fizetett átutalással */
  transferPaid: number;
  /** Fizetett utalvánnyal */
  voucherPaid: number;
  /** Összesen fizetve */
  totalPaid: number;
  /** Hátralék */
  remainingAmount: number;
  /** Visszajáró (készpénz túlfizetés) */
  changeAmount: number;
}

/**
 * Payment Service interfész
 */
export interface IPaymentService {
  /**
   * Készpénz fizetés feldolgozása
   */
  processCashPayment(
    transactionId: string,
    amount: number,
    receivedAmount: number
  ): Promise<IPaymentTransaction>;

  /**
   * Kártya fizetés indítása (MyPOS)
   */
  initiateCardPayment(
    transactionId: string,
    amount: number,
    terminalId: string
  ): Promise<IPaymentTransaction>;

  /**
   * Kártya fizetés callback (MyPOS válasz)
   */
  handleCardPaymentCallback(
    paymentId: string,
    success: boolean,
    details: Partial<ICardPaymentDetails>
  ): Promise<IPaymentTransaction>;

  /**
   * Átutalás rögzítése
   */
  recordTransferPayment(
    transactionId: string,
    amount: number,
    details: ITransferPaymentDetails
  ): Promise<IPaymentTransaction>;

  /**
   * Utalvány beváltása
   */
  redeemVoucher(
    transactionId: string,
    voucherCode: string
  ): Promise<IPaymentTransaction>;

  /**
   * Vegyes fizetés összesítő
   */
  getMixedPaymentSummary(transactionId: string): Promise<IMixedPaymentSummary>;

  /**
   * Fizetés visszavonása
   */
  refundPayment(paymentId: string, reason: string): Promise<IPaymentTransaction>;
}

/**
 * MyPOS integráció interfész
 */
export interface IMyPosIntegration {
  /**
   * Terminál státusz ellenőrzés
   */
  checkTerminalStatus(terminalId: string): Promise<{ online: boolean; lastSeen: Date }>;

  /**
   * Fizetés indítása
   */
  initiatePayment(terminalId: string, amount: number, reference: string): Promise<{ transactionId: string }>;

  /**
   * Pre-authorization (kaució)
   */
  preAuthorize(terminalId: string, amount: number, reference: string): Promise<{ authorizationId: string }>;

  /**
   * Pre-authorization capture
   */
  capturePreAuth(authorizationId: string, amount: number): Promise<ICardPaymentDetails>;

  /**
   * Pre-authorization release
   */
  releasePreAuth(authorizationId: string): Promise<void>;

  /**
   * Visszatérítés
   */
  refund(transactionId: string, amount: number): Promise<ICardPaymentDetails>;
}
