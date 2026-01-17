/**
 * @kgc/rental-checkout - Deposit (Kaució) interfaces
 * Epic 16: Deposit Management
 */

/**
 * Kaució státuszok lifecycle
 * pending → collected → (held | released | retained)
 */
export enum DepositStatus {
  /** Kaució létrehozva, fizetésre vár */
  PENDING = 'pending',
  /** Kaució beérkezett (készpénz vagy kártya) */
  COLLECTED = 'collected',
  /** Kaució visszatartva (MyPOS pre-auth) */
  HELD = 'held',
  /** Kaució visszaadva (bérlés sikeres lezárás) */
  RELEASED = 'released',
  /** Kaució visszatartva (sérülés, késedelem) */
  RETAINED = 'retained',
  /** Részleges visszatartás (sérülés levonva) */
  PARTIALLY_RETAINED = 'partially_retained',
}

/**
 * Kaució fizetési mód
 */
export enum DepositPaymentMethod {
  /** Készpénz */
  CASH = 'cash',
  /** Bankkártya (terminál) */
  CARD = 'card',
  /** MyPOS pre-authorization (zárolás) */
  MYPOS_PREAUTH = 'mypos_preauth',
  /** Átutalás */
  BANK_TRANSFER = 'bank_transfer',
}

/**
 * Kaució visszatartás oka
 */
export enum DepositRetentionReason {
  /** Bérgép sérülés */
  EQUIPMENT_DAMAGE = 'equipment_damage',
  /** Bérgép elvesztése */
  EQUIPMENT_LOST = 'equipment_lost',
  /** Késedelmi díj */
  LATE_FEE = 'late_fee',
  /** Tisztítási díj */
  CLEANING_FEE = 'cleaning_fee',
  /** Egyéb */
  OTHER = 'other',
}

/**
 * Kaució alap interfész
 */
export interface IDeposit {
  /** Egyedi azonosító (UUID) */
  id: string;
  /** Tenant ID (multi-tenant) */
  tenantId: string;
  /** Bérlés ID (kapcsolódó bérlés) */
  rentalId: string;
  /** Partner ID (aki fizeti) */
  partnerId: string;
  /** Kaució összeg (HUF) */
  amount: number;
  /** Aktuális státusz */
  status: DepositStatus;
  /** Fizetési mód */
  paymentMethod: DepositPaymentMethod;
  /** MyPOS tranzakció ID (ha MyPOS) */
  myposTransactionId?: string;
  /** Létrehozás időpontja */
  createdAt: Date;
  /** Utolsó módosítás */
  updatedAt: Date;
  /** Felvevő user ID */
  createdBy: string;
}

/**
 * Kaució felvétel input
 */
export interface IDepositCollectionInput {
  /** Bérlés ID */
  rentalId: string;
  /** Partner ID */
  partnerId: string;
  /** Kaució összeg (HUF) */
  amount: number;
  /** Fizetési mód */
  paymentMethod: DepositPaymentMethod;
  /** Megjegyzés (opcionális) */
  notes?: string;
}

/**
 * Kaució visszaadás input
 */
export interface IDepositReleaseInput {
  /** Kaució ID */
  depositId: string;
  /** Visszaadás módja (készpénz/kártya) */
  refundMethod: DepositPaymentMethod;
  /** Megjegyzés (opcionális) */
  notes?: string;
}

/**
 * Kaució visszatartás input
 */
export interface IDepositRetentionInput {
  /** Kaució ID */
  depositId: string;
  /** Visszatartás oka */
  reason: DepositRetentionReason;
  /** Visszatartott összeg (részleges esetén) */
  retainedAmount: number;
  /** Részletes indoklás */
  description: string;
  /** Kapcsolódó dokumentumok (pl. sérülés fotók) */
  attachments?: string[];
}

/**
 * Kaució kalkuláció eredménye
 */
export interface IDepositCalculationResult {
  /** Javasolt kaució összeg */
  suggestedAmount: number;
  /** Törzsvevő kedvezmény alkalmazva? */
  regularCustomerDiscount: boolean;
  /** Kaució szükséges? */
  depositRequired: boolean;
  /** Indoklás */
  reason: string;
}

/**
 * Kaució audit rekord
 */
export interface IDepositAuditRecord {
  /** Kaució ID */
  depositId: string;
  /** Művelet típus */
  action: 'created' | 'collected' | 'held' | 'released' | 'retained';
  /** Előző státusz */
  previousStatus?: DepositStatus;
  /** Új státusz */
  newStatus: DepositStatus;
  /** Összeg (ha változott) */
  amount?: number;
  /** Végrehajtó user */
  userId: string;
  /** Időpont */
  timestamp: Date;
  /** Megjegyzés */
  notes?: string;
}
