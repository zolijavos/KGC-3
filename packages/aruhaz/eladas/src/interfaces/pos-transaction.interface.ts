/**
 * POS Transaction interfaces - Story 22.1: Értékesítés Kasszából
 */

/**
 * Tranzakció státusz
 */
export enum TransactionStatus {
  /** Aktív kosár, még nem fizetett */
  PENDING = 'PENDING',
  /** Fizetés folyamatban */
  PROCESSING = 'PROCESSING',
  /** Sikeres tranzakció */
  COMPLETED = 'COMPLETED',
  /** Visszavonva */
  CANCELLED = 'CANCELLED',
  /** Részben visszáruzott */
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  /** Teljesen visszáruzott */
  REFUNDED = 'REFUNDED',
}

/**
 * Fizetési mód
 */
export enum PaymentMethod {
  /** Készpénz */
  CASH = 'CASH',
  /** Bankkártya */
  CARD = 'CARD',
  /** Átutalás */
  TRANSFER = 'TRANSFER',
  /** Utalvány */
  VOUCHER = 'VOUCHER',
}

/**
 * Kosár tétel
 */
export interface ICartItem {
  /** Egyedi tétel azonosító */
  id: string;
  /** Cikk azonosító */
  productId: string;
  /** Cikk neve */
  productName: string;
  /** Cikkszám */
  sku: string;
  /** Vonalkód */
  barcode?: string | undefined;
  /** Mennyiség */
  quantity: number;
  /** Egységár (nettó) */
  unitPrice: number;
  /** ÁFA kulcs (%) */
  vatRate: number;
  /** Kedvezmény (%) */
  discountPercent: number;
  /** Tétel nettó összeg */
  netAmount: number;
  /** Tétel ÁFA összeg */
  vatAmount: number;
  /** Tétel bruttó összeg */
  grossAmount: number;
}

/**
 * Fizetés tétel (vegyes fizetéshez)
 */
export interface IPaymentItem {
  /** Egyedi fizetés azonosító */
  id: string;
  /** Fizetési mód */
  method: PaymentMethod;
  /** Összeg */
  amount: number;
  /** Referencia (kártya tranzakció ID, utalvány kód, stb.) */
  reference?: string | undefined;
  /** Fizetés időpontja */
  paidAt: Date;
}

/**
 * POS Tranzakció entitás
 */
export interface IPosTransaction {
  /** Egyedi azonosító */
  id: string;
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Pénztárgép azonosító */
  registerId: string;
  /** Tranzakció szám */
  transactionNumber: string;
  /** Operátor (felhasználó) azonosító */
  operatorId: string;
  /** Partner azonosító (opcionális) */
  partnerId?: string | undefined;
  /** Kosár tételek */
  items: ICartItem[];
  /** Fizetések */
  payments: IPaymentItem[];
  /** Tranzakció státusz */
  status: TransactionStatus;
  /** Nettó összeg */
  netTotal: number;
  /** ÁFA összeg */
  vatTotal: number;
  /** Bruttó összeg */
  grossTotal: number;
  /** Fizetett összeg */
  paidAmount: number;
  /** Visszajáró */
  changeAmount: number;
  /** Számla/nyugta szám */
  receiptNumber?: string | undefined;
  /** NAV átküldve */
  navSubmitted: boolean;
  /** Megjegyzés */
  notes?: string | undefined;
  /** Létrehozva */
  createdAt: Date;
  /** Lezárva */
  completedAt?: Date | undefined;
}

/**
 * Készlet foglalás eredmény
 */
export interface IStockReservation {
  /** Sikeres foglalás */
  success: boolean;
  /** Foglalt termékek */
  reserved: Array<{ productId: string; quantity: number }>;
  /** Nem elérhető termékek */
  unavailable: Array<{ productId: string; requestedQty: number; availableQty: number }>;
}

/**
 * POS Transaction Service interfész
 */
export interface IPosTransactionService {
  /**
   * Új tranzakció létrehozása (üres kosár)
   */
  createTransaction(input: ICreateTransactionInput): Promise<IPosTransaction>;

  /**
   * Termék hozzáadása kosárhoz (scan/keresés)
   */
  addItem(transactionId: string, input: IAddItemInput): Promise<IPosTransaction>;

  /**
   * Tétel eltávolítása kosárból
   */
  removeItem(transactionId: string, itemId: string): Promise<IPosTransaction>;

  /**
   * Tétel mennyiség módosítása
   */
  updateItemQuantity(transactionId: string, itemId: string, quantity: number): Promise<IPosTransaction>;

  /**
   * Kedvezmény alkalmazása tételre
   */
  applyItemDiscount(transactionId: string, itemId: string, discountPercent: number): Promise<IPosTransaction>;

  /**
   * Fizetés hozzáadása
   */
  addPayment(transactionId: string, input: IAddPaymentInput): Promise<IPosTransaction>;

  /**
   * Tranzakció lezárása
   */
  completeTransaction(transactionId: string): Promise<IPosTransaction>;

  /**
   * Tranzakció visszavonása
   */
  cancelTransaction(transactionId: string, reason: string): Promise<IPosTransaction>;

  /**
   * Tranzakció lekérdezése
   */
  getTransaction(transactionId: string): Promise<IPosTransaction | null>;

  /**
   * Napi tranzakciók lekérdezése
   */
  getDailyTransactions(registerId: string, date: Date): Promise<IPosTransaction[]>;

  /**
   * Készlet foglalás ellenőrzés
   */
  checkStockAvailability(items: Array<{ productId: string; quantity: number }>): Promise<IStockReservation>;
}

/**
 * Tranzakció létrehozás input
 */
export interface ICreateTransactionInput {
  /** Tenant azonosító */
  tenantId: string;
  /** Telephely azonosító */
  locationId: string;
  /** Pénztárgép azonosító */
  registerId: string;
  /** Operátor azonosító */
  operatorId: string;
  /** Partner azonosító (opcionális) */
  partnerId?: string | undefined;
}

/**
 * Tétel hozzáadás input
 */
export interface IAddItemInput {
  /** Cikk azonosító VAGY vonalkód */
  productId?: string | undefined;
  /** Vonalkód (scan) */
  barcode?: string | undefined;
  /** Mennyiség */
  quantity: number;
}

/**
 * Fizetés hozzáadás input
 */
export interface IAddPaymentInput {
  /** Fizetési mód */
  method: PaymentMethod;
  /** Összeg */
  amount: number;
  /** Referencia (kártya tranzakció ID, stb.) */
  reference?: string | undefined;
}
