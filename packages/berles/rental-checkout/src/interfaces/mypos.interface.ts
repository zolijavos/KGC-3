/**
 * @kgc/rental-checkout - MyPOS Integration Interfaces
 * Story 16-2: MyPOS Pre-Authorization
 */

/**
 * MyPOS pre-authorization státuszok
 */
export enum MyPosTransactionStatus {
  /** Tranzakció elindítva, várakozás */
  PENDING = 'pending',
  /** Sikeres zárolás */
  AUTHORIZED = 'authorized',
  /** Zárolás feloldva (refund) */
  RELEASED = 'released',
  /** Zárolás levonva (capture) */
  CAPTURED = 'captured',
  /** Tranzakció elutasítva */
  DECLINED = 'declined',
  /** Hiba történt */
  ERROR = 'error',
  /** Lejárt (auto-release) */
  EXPIRED = 'expired',
}

/**
 * MyPOS hiba kódok
 */
export enum MyPosErrorCode {
  /** Nincs elég fedezet */
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  /** Kártya elutasítva */
  CARD_DECLINED = 'card_declined',
  /** Érvénytelen kártya */
  INVALID_CARD = 'invalid_card',
  /** Lejárt kártya */
  EXPIRED_CARD = 'expired_card',
  /** Hálózati hiba */
  NETWORK_ERROR = 'network_error',
  /** Timeout */
  TIMEOUT = 'timeout',
  /** Általános hiba */
  GENERAL_ERROR = 'general_error',
  /** Tranzakció nem található */
  TRANSACTION_NOT_FOUND = 'transaction_not_found',
  /** Érvénytelen összeg */
  INVALID_AMOUNT = 'invalid_amount',
}

/**
 * MyPOS pre-authorization request
 */
export interface IMyPosPreAuthRequest {
  /** Összeg (HUF, egész szám) */
  amount: number;
  /** Pénznem (default: HUF) */
  currency?: string;
  /** Leírás (megjelenik a kártyakivonaton) */
  description: string;
  /** Referencia ID (bérlés ID) */
  referenceId: string;
  /** Ügyfél email (opcionális, visszaigazoláshoz) */
  customerEmail?: string;
}

/**
 * MyPOS pre-authorization response
 */
export interface IMyPosPreAuthResponse {
  /** Sikeres-e a művelet */
  success: boolean;
  /** MyPOS tranzakció ID */
  transactionId?: string;
  /** Státusz */
  status: MyPosTransactionStatus;
  /** Authorization code (sikeres esetén) */
  authCode?: string;
  /** Hiba kód (sikertelen esetén) */
  errorCode?: MyPosErrorCode;
  /** Hiba üzenet */
  errorMessage?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * MyPOS capture (levonás) request
 */
export interface IMyPosCaptureRequest {
  /** Eredeti tranzakció ID */
  transactionId: string;
  /** Levonandó összeg (lehet részleges) */
  amount: number;
  /** Leírás */
  description?: string;
}

/**
 * MyPOS capture response
 */
export interface IMyPosCaptureResponse {
  /** Sikeres-e a művelet */
  success: boolean;
  /** Capture tranzakció ID */
  captureTransactionId?: string;
  /** Levont összeg */
  capturedAmount?: number;
  /** Státusz */
  status: MyPosTransactionStatus;
  /** Hiba kód */
  errorCode?: MyPosErrorCode;
  /** Hiba üzenet */
  errorMessage?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * MyPOS release (feloldás) request
 */
export interface IMyPosReleaseRequest {
  /** Eredeti tranzakció ID */
  transactionId: string;
  /** Leírás */
  description?: string;
}

/**
 * MyPOS release response
 */
export interface IMyPosReleaseResponse {
  /** Sikeres-e a művelet */
  success: boolean;
  /** Státusz */
  status: MyPosTransactionStatus;
  /** Feloldott összeg */
  releasedAmount?: number;
  /** Hiba kód */
  errorCode?: MyPosErrorCode;
  /** Hiba üzenet */
  errorMessage?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * MyPOS tranzakció lekérdezés response
 */
export interface IMyPosTransactionInfo {
  /** Tranzakció ID */
  transactionId: string;
  /** Státusz */
  status: MyPosTransactionStatus;
  /** Eredeti összeg */
  originalAmount: number;
  /** Levont összeg (ha van) */
  capturedAmount?: number;
  /** Referencia ID */
  referenceId: string;
  /** Létrehozás ideje */
  createdAt: Date;
  /** Utolsó módosítás */
  updatedAt: Date;
  /** Lejárat ideje */
  expiresAt?: Date;
}

/**
 * MyPOS Service Interface
 */
export interface IMyPosService {
  /**
   * Pre-authorization indítása (zárolás)
   */
  preAuthorize(request: IMyPosPreAuthRequest): Promise<IMyPosPreAuthResponse>;

  /**
   * Zárolás levonása (capture)
   */
  capture(request: IMyPosCaptureRequest): Promise<IMyPosCaptureResponse>;

  /**
   * Zárolás feloldása (release/void)
   */
  release(request: IMyPosReleaseRequest): Promise<IMyPosReleaseResponse>;

  /**
   * Tranzakció státusz lekérdezés
   */
  getTransaction(transactionId: string): Promise<IMyPosTransactionInfo | null>;

  /**
   * Kapcsolat ellenőrzése (health check)
   */
  healthCheck(): Promise<boolean>;
}

// ============================================
// Story 36-3: SALE+REFUND Flow (pre-auth nem támogatott)
// ============================================

/**
 * MyPOS SALE request (Story 36-3)
 * Azonnali terhelés pre-auth helyett
 */
export interface IMyPosSaleRequest {
  /** Összeg (HUF, egész szám) */
  amount: number;
  /** Pénznem (default: HUF) */
  currency?: string;
  /** Leírás (megjelenik a kártyakivonaton) */
  description: string;
  /** Referencia ID (bérlés/kaució ID) */
  referenceId: string;
  /** Ügyfél email (opcionális) */
  customerEmail?: string;
}

/**
 * MyPOS SALE response (Story 36-3)
 */
export interface IMyPosSaleResponse {
  /** Sikeres-e a művelet */
  success: boolean;
  /** MyPOS tranzakció ID */
  transactionId?: string;
  /** Státusz */
  status: MyPosTransactionStatus;
  /** Authorization code */
  authCode?: string;
  /** Hiba kód */
  errorCode?: MyPosErrorCode;
  /** Hiba üzenet */
  errorMessage?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * MyPOS REFUND request (Story 36-3)
 * Teljes vagy részleges visszautalás
 */
export interface IMyPosRefundRequest {
  /** Eredeti SALE tranzakció ID */
  originalTransactionId: string;
  /** Visszautalandó összeg (lehet részleges) */
  amount: number;
  /** Leírás */
  description?: string;
  /** Referencia ID */
  referenceId?: string;
  /** Visszautalás oka */
  reason?: string;
  /** Részleges visszautalás flag */
  isPartial?: boolean;
}

/**
 * MyPOS REFUND response (Story 36-3)
 */
export interface IMyPosRefundResponse {
  /** Sikeres-e a művelet */
  success: boolean;
  /** Refund tranzakció ID */
  refundTransactionId?: string;
  /** Visszautalt összeg */
  refundedAmount?: number;
  /** Státusz */
  status: MyPosTransactionStatus;
  /** Hiba kód */
  errorCode?: MyPosErrorCode;
  /** Hiba üzenet */
  errorMessage?: string;
  /** Timestamp */
  timestamp: Date;
}
