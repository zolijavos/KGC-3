/**
 * @kgc/partners - Partner Management Package
 * Epic 7: Partner Management
 *
 * Provides partner, representative, and loyalty tier management
 * with multi-tenant support for the KGC ERP system.
 */

// ============================================
// TYPES
// ============================================

export * from './types/partner.types';

// ============================================
// DTOs
// ============================================

export * from './dto/loyalty.dto';
export * from './dto/partner.dto';
export * from './dto/representative.dto';

// ============================================
// REPOSITORIES
// ============================================

export {
  InMemoryPartnerRepository,
  PARTNER_REPOSITORY,
  type IPartnerRepository,
} from './repositories/partner.repository';

export {
  InMemoryRepresentativeRepository,
  REPRESENTATIVE_REPOSITORY,
  type IRepresentativeRepository,
} from './repositories/representative.repository';

export {
  InMemoryLoyaltyTierRepository,
  LOYALTY_TIER_REPOSITORY,
  type ILoyaltyTierRepository,
} from './repositories/loyalty.repository';
