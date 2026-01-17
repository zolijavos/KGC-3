/**
 * Loyalty Card (Törzsvendég Kártya) Interfaces
 * FR27: Törzsvendég kártya rendszer (loyalty)
 * FR33: Partner azonosítás scan-nel
 */

/**
 * Kártya státusz
 */
export type LoyaltyCardStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'REPLACED';

/**
 * Kártya típus
 */
export type LoyaltyCardType = 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Törzsvendég kártya entitás
 */
export interface LoyaltyCard {
  id: string;
  partnerId: string;
  tenantId: string;

  // Kártya azonosítók
  cardNumber: string; // Egyedi kártyaszám (vonalkód)
  qrCode: string; // QR kód tartalma

  // Kártya részletek
  type: LoyaltyCardType;
  status: LoyaltyCardStatus;
  issuedAt: Date;
  expiresAt?: Date; // Ha nincs, akkor határozatlan

  // Pontrendszer
  points: number;
  lifetimePoints: number; // Összes megszerzett pont

  // Használat
  lastUsedAt?: Date;
  usageCount: number;

  // Csere tracking
  replacedById?: string; // Új kártya ID ha cserélték
  replacesId?: string; // Előző kártya ID

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

/**
 * Kártya kiállítás input
 */
export interface IssueLoyaltyCardInput {
  partnerId: string;
  tenantId: string;
  type?: LoyaltyCardType;
  expiresAt?: Date;
  initialPoints?: number;
  createdBy: string;
  notes?: string;
}

/**
 * Pont tranzakció típus
 */
export type PointTransactionType = 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE' | 'TRANSFER';

/**
 * Pont tranzakció
 */
export interface PointTransaction {
  id: string;
  cardId: string;
  tenantId: string;
  type: PointTransactionType;
  points: number; // Pozitív = szerzés, Negatív = levonás
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceType?: string; // pl. 'RENTAL', 'SERVICE', 'PURCHASE'
  referenceId?: string; // Kapcsolódó tranzakció ID
  createdAt: Date;
  createdBy: string;
}

/**
 * Kártya használat log
 */
export interface CardUsageLog {
  id: string;
  cardId: string;
  tenantId: string;
  usedAt: Date;
  action: 'SCAN' | 'REDEEM' | 'CHECK';
  locationId?: string; // Melyik boltban
  operatorId: string; // Ki scannelte
  successful: boolean;
  failureReason?: string;
}

/**
 * Kártya csere input
 */
export interface ReplaceCardInput {
  oldCardId: string;
  tenantId: string;
  reason: 'LOST' | 'DAMAGED' | 'STOLEN' | 'UPGRADE' | 'EXPIRED';
  newType?: LoyaltyCardType;
  transferPoints?: boolean; // Pontok átvitele
  createdBy: string;
}

/**
 * Pont módosítás input
 */
export interface AdjustPointsInput {
  cardId: string;
  tenantId: string;
  points: number; // Pozitív vagy negatív
  type: PointTransactionType;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
}

/**
 * Kártya keresés eredmény (scan)
 */
export interface CardLookupResult {
  found: boolean;
  card?: LoyaltyCard;
  partner?: {
    id: string;
    name: string;
    type: string;
  };
  greeting?: string; // Személyes üdvözlés
  warnings?: string[]; // Figyelmeztetések (lejárt, blokkolt, stb.)
}

/**
 * Kártya repository interface
 */
export interface ILoyaltyCardRepository {
  /**
   * Kártya kiállítása
   */
  issue(input: IssueLoyaltyCardInput, cardNumber: string, qrCode: string): Promise<LoyaltyCard>;

  /**
   * Kártya keresése ID alapján
   */
  findById(id: string, tenantId: string): Promise<LoyaltyCard | null>;

  /**
   * Kártya keresése kártyaszám alapján
   */
  findByCardNumber(cardNumber: string, tenantId: string): Promise<LoyaltyCard | null>;

  /**
   * Kártya keresése QR kód alapján
   */
  findByQrCode(qrCode: string, tenantId: string): Promise<LoyaltyCard | null>;

  /**
   * Partner kártyáinak listázása
   */
  findByPartner(partnerId: string, tenantId: string): Promise<LoyaltyCard[]>;

  /**
   * Kártya frissítése
   */
  update(id: string, tenantId: string, data: Partial<LoyaltyCard>): Promise<LoyaltyCard>;

  /**
   * Kártya státusz változtatás
   */
  setStatus(id: string, tenantId: string, status: LoyaltyCardStatus): Promise<LoyaltyCard>;

  /**
   * Pont tranzakció mentése
   */
  savePointTransaction(transaction: Omit<PointTransaction, 'id'>): Promise<PointTransaction>;

  /**
   * Pont tranzakciók lekérdezése
   */
  getPointTransactions(cardId: string, tenantId: string, limit?: number): Promise<PointTransaction[]>;

  /**
   * Használat logolása
   */
  logUsage(log: Omit<CardUsageLog, 'id'>): Promise<CardUsageLog>;

  /**
   * Kártyaszám létezik-e
   */
  cardNumberExists(cardNumber: string, tenantId: string): Promise<boolean>;

  /**
   * Aktív kártya keresése partnerhez
   */
  findActiveByPartner(partnerId: string, tenantId: string): Promise<LoyaltyCard | null>;
}

/**
 * Repository injection token
 */
export const LOYALTY_CARD_REPOSITORY = Symbol('LOYALTY_CARD_REPOSITORY');
