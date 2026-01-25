/**
 * @kgc/partners - Partner Types
 * Epic 7: Partner Management
 */

// ============================================
// ENUMS
// ============================================

export const PartnerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMPANY: 'COMPANY',
} as const;

export type PartnerType = (typeof PartnerType)[keyof typeof PartnerType];

export const PartnerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLACKLISTED: 'BLACKLISTED',
} as const;

export type PartnerStatus = (typeof PartnerStatus)[keyof typeof PartnerStatus];

// ============================================
// ENTITY TYPES
// ============================================

export interface Partner {
  id: string;
  tenantId: string;
  type: PartnerType;
  status: PartnerStatus;

  // Azonosítók
  partnerCode: string;
  taxNumber: string | null;
  euVatNumber: string | null;

  // Alapadatok
  name: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  phoneAlt: string | null;

  // Cím adatok
  country: string | null;
  postalCode: string | null;
  city: string | null;
  address: string | null;
  addressAlt: string | null;

  // Személyes adatok (magánszemélyeknek)
  birthDate: Date | null;
  idCardNumber: string | null;
  drivingLicenseNo: string | null;

  // Hitelkeret és fizetési feltételek
  creditLimit: number | null;
  currentBalance: number;
  paymentTermDays: number;
  defaultDiscountPc: number;

  // Törzsvendég rendszer
  loyaltyTierId: string | null;
  loyaltyPoints: number;
  tierCalculatedAt: Date | null;

  // Blacklist/figyelmeztetés
  blacklistReason: string | null;
  blacklistedAt: Date | null;
  blacklistedBy: string | null;
  warningNote: string | null;

  // Megjegyzések
  notes: string | null;

  // Audit
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  // Relations (optional for queries)
  loyaltyTier?: LoyaltyTier | null;
  representatives?: Representative[];
}

export interface Representative {
  id: string;
  tenantId: string;
  partnerId: string;

  // Alapadatok
  name: string;
  phone: string | null;
  email: string | null;
  idNumber: string | null;

  // Érvényesség
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;

  // Jogosultságok
  canRent: boolean;
  canReturn: boolean;
  canSign: boolean;
  canPayCash: boolean;

  notes: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations
  partner?: Partner;
}

export interface LoyaltyTier {
  id: string;
  tenantId: string;

  tierCode: string;
  tierName: string;
  minTransactions: number;
  minSpend: number | null;
  discountPercent: number;
  benefits: unknown[];
  badgeColor: string | null;
  sortOrder: number;
  isActive: boolean;

  createdAt: Date;

  // Relations
  partners?: Partner[];
}

export interface LoyaltyHistory {
  id: string;
  tenantId: string;
  partnerId: string;

  oldTierId: string | null;
  newTierId: string | null;
  reason: string;
  pointsAtChange: number;
  transactionsAtChange: number;
  spendAtChange: number | null;

  changedAt: Date;
  changedBy: string | null;
}

// ============================================
// QUERY TYPES
// ============================================

export interface PartnerQuery {
  tenantId: string;
  type?: PartnerType;
  status?: PartnerStatus;
  loyaltyTierId?: string;
  search?: string;
  city?: string;
  hasCredit?: boolean;
  isBlacklisted?: boolean;
  minBalance?: number;
  maxBalance?: number;
  sortBy?: 'name' | 'partnerCode' | 'createdAt' | 'currentBalance' | 'loyaltyPoints';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface PartnerQueryResult {
  partners: Partner[];
  total: number;
  offset: number;
  limit: number;
}

export interface RepresentativeQuery {
  tenantId: string;
  partnerId?: string;
  isActive?: boolean;
  canRent?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface RepresentativeQueryResult {
  representatives: Representative[];
  total: number;
  offset: number;
  limit: number;
}

export interface LoyaltyTierQuery {
  tenantId: string;
  isActive?: boolean;
  tierCode?: string;
}

export interface LoyaltyTierQueryResult {
  tiers: LoyaltyTier[];
  total: number;
}
