/**
 * Blacklist (Tiltólista) Interfaces
 * FR30: Partner blacklist kezelés (fizetési problémák)
 */

/**
 * Blacklist státusz
 */
export type BlacklistStatus = 'ACTIVE' | 'RESOLVED' | 'APPEALED';

/**
 * Blacklist ok típusok
 */
export type BlacklistReason =
  | 'PAYMENT_DEFAULT' // Fizetési késedelem
  | 'DAMAGE_UNREPORTED' // Be nem jelentett károkozás
  | 'FRAUD_ATTEMPT' // Csalási kísérlet
  | 'CONTRACT_VIOLATION' // Szerződésszegés
  | 'OTHER';

/**
 * Blacklist bejegyzés
 */
export interface BlacklistEntry {
  id: string;
  partnerId: string;
  tenantId: string;
  reason: BlacklistReason;
  description: string;
  severity: 'WARNING' | 'BLOCKED'; // WARNING = figyelmeztetés, BLOCKED = tiltás
  status: BlacklistStatus;
  referenceType?: string; // pl. 'RENTAL', 'INVOICE'
  referenceId?: string;
  amount?: number; // Tartozás összege
  createdAt: Date;
  createdBy: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolveNote?: string;
}

/**
 * Blacklist létrehozás input
 */
export interface CreateBlacklistInput {
  partnerId: string;
  tenantId: string;
  reason: BlacklistReason;
  description: string;
  severity: 'WARNING' | 'BLOCKED';
  referenceType?: string;
  referenceId?: string;
  amount?: number;
  createdBy: string;
}

/**
 * Blacklist feloldás input
 */
export interface ResolveBlacklistInput {
  resolvedBy: string;
  resolveNote: string;
}

/**
 * Partner figyelmeztetések eredménye
 */
export interface PartnerWarnings {
  partnerId: string;
  hasActiveWarnings: boolean;
  isBlocked: boolean;
  warnings: BlacklistEntry[];
  totalDebt: number;
}

/**
 * Blacklist repository interface
 */
export interface IBlacklistRepository {
  create(input: CreateBlacklistInput): Promise<BlacklistEntry>;
  findById(id: string, tenantId: string): Promise<BlacklistEntry | null>;
  findByPartner(partnerId: string, tenantId: string): Promise<BlacklistEntry[]>;
  findActiveByPartner(partnerId: string, tenantId: string): Promise<BlacklistEntry[]>;
  resolve(id: string, tenantId: string, input: ResolveBlacklistInput): Promise<BlacklistEntry>;
  isBlocked(partnerId: string, tenantId: string): Promise<boolean>;
}

/**
 * Repository injection token
 */
export const BLACKLIST_REPOSITORY = Symbol('BLACKLIST_REPOSITORY');
