/**
 * @kgc/partners - Partner Repository
 * Epic 7: Story 7-1: Partner CRUD magánszemély és cég
 *
 * Repository interface and token for Partner entity operations.
 * Implements multi-tenant queries with soft delete support.
 */

import { Injectable } from '@nestjs/common';
import type { CreatePartnerInput, UpdatePartnerInput } from '../dto/partner.dto';
import type {
  Partner,
  PartnerQuery,
  PartnerQueryResult,
  PartnerStatus,
  PartnerType,
} from '../types/partner.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const PARTNER_REPOSITORY = Symbol('PARTNER_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IPartnerRepository {
  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Query partners with filters and pagination
   */
  query(params: PartnerQuery): Promise<PartnerQueryResult>;

  /**
   * Find partner by ID
   */
  findById(id: string, tenantId: string): Promise<Partner | null>;

  /**
   * Find partner by code
   */
  findByCode(code: string, tenantId: string): Promise<Partner | null>;

  /**
   * Find partner by tax number
   */
  findByTaxNumber(taxNumber: string, tenantId: string): Promise<Partner | null>;

  /**
   * Find partner by phone number
   */
  findByPhone(phone: string, tenantId: string): Promise<Partner | null>;

  /**
   * Find partner by email
   */
  findByEmail(email: string, tenantId: string): Promise<Partner | null>;

  /**
   * Create new partner
   */
  create(tenantId: string, data: CreatePartnerInput, createdBy: string): Promise<Partner>;

  /**
   * Update existing partner
   */
  update(
    id: string,
    tenantId: string,
    data: UpdatePartnerInput,
    updatedBy: string
  ): Promise<Partner>;

  /**
   * Soft delete partner
   */
  softDelete(id: string, tenantId: string, deletedBy: string): Promise<void>;

  /**
   * Restore soft deleted partner
   */
  restore(id: string, tenantId: string): Promise<Partner>;

  /**
   * Hard delete partner (admin only)
   */
  hardDelete(id: string, tenantId: string): Promise<void>;

  /**
   * Update partner status
   */
  updateStatus(
    id: string,
    tenantId: string,
    status: PartnerStatus,
    updatedBy: string
  ): Promise<Partner>;

  /**
   * Blacklist partner
   */
  blacklist(id: string, tenantId: string, reason: string, blacklistedBy: string): Promise<Partner>;

  /**
   * Remove from blacklist
   */
  removeFromBlacklist(id: string, tenantId: string, updatedBy: string): Promise<Partner>;

  /**
   * Update credit limit
   */
  updateCreditLimit(
    id: string,
    tenantId: string,
    creditLimit: number,
    updatedBy: string
  ): Promise<Partner>;

  /**
   * Update current balance
   */
  updateBalance(id: string, tenantId: string, amount: number): Promise<Partner>;

  /**
   * Update loyalty tier
   */
  updateLoyaltyTier(
    id: string,
    tenantId: string,
    tierId: string | null,
    points: number
  ): Promise<Partner>;

  /**
   * Add loyalty points
   */
  addLoyaltyPoints(id: string, tenantId: string, points: number): Promise<Partner>;

  /**
   * Search partners by name, phone, or email
   */
  search(
    tenantId: string,
    searchTerm: string,
    options?: {
      type?: PartnerType;
      activeOnly?: boolean;
      limit?: number;
    }
  ): Promise<Partner[]>;

  /**
   * Get partners with credit balance
   */
  getPartnersWithBalance(
    tenantId: string,
    options?: {
      minBalance?: number;
      maxBalance?: number;
      overdueOnly?: boolean;
    }
  ): Promise<Partner[]>;

  /**
   * Check if partner code exists
   */
  codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Check if tax number exists
   */
  taxNumberExists(taxNumber: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Generate next partner code
   */
  generateNextCode(tenantId: string, prefix?: string): Promise<string>;

  /**
   * Count partners by status
   */
  countByStatus(tenantId: string): Promise<Record<PartnerStatus, number>>;

  /**
   * Get recently created partners
   */
  getRecent(tenantId: string, limit?: number): Promise<Partner[]>;

  /**
   * Get blacklisted partners
   */
  getBlacklisted(tenantId: string): Promise<Partner[]>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemoryPartnerRepository implements IPartnerRepository {
  private partners: Map<string, Partner> = new Map();
  private codeCounter: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.partners.clear();
    this.codeCounter.clear();
  }

  async query(params: PartnerQuery): Promise<PartnerQueryResult> {
    let results = Array.from(this.partners.values()).filter(p => p.tenantId === params.tenantId);

    // Apply filters
    if (!params.includeDeleted) {
      results = results.filter(p => !p.isDeleted);
    }
    if (params.type) {
      results = results.filter(p => p.type === params.type);
    }
    if (params.status) {
      results = results.filter(p => p.status === params.status);
    }
    if (params.loyaltyTierId) {
      results = results.filter(p => p.loyaltyTierId === params.loyaltyTierId);
    }
    if (params.city) {
      results = results.filter(p => p.city?.toLowerCase().includes(params.city!.toLowerCase()));
    }
    if (params.isBlacklisted !== undefined) {
      results = results.filter(p => (p.status === 'BLACKLISTED') === params.isBlacklisted);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.partnerCode.toLowerCase().includes(term) ||
          p.phone?.includes(term) ||
          p.email?.toLowerCase().includes(term)
      );
    }

    const total = results.length;

    // Sort
    if (params.sortBy) {
      results.sort((a, b) => {
        const aVal = a[params.sortBy!];
        const bVal = b[params.sortBy!];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return params.sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Paginate
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { partners: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<Partner | null> {
    const partner = this.partners.get(id);
    if (!partner || partner.tenantId !== tenantId) return null;
    return partner;
  }

  async findByCode(code: string, tenantId: string): Promise<Partner | null> {
    return (
      Array.from(this.partners.values()).find(
        p => p.partnerCode === code && p.tenantId === tenantId && !p.isDeleted
      ) ?? null
    );
  }

  async findByTaxNumber(taxNumber: string, tenantId: string): Promise<Partner | null> {
    return (
      Array.from(this.partners.values()).find(
        p => p.taxNumber === taxNumber && p.tenantId === tenantId && !p.isDeleted
      ) ?? null
    );
  }

  async findByPhone(phone: string, tenantId: string): Promise<Partner | null> {
    return (
      Array.from(this.partners.values()).find(
        p => p.phone === phone && p.tenantId === tenantId && !p.isDeleted
      ) ?? null
    );
  }

  async findByEmail(email: string, tenantId: string): Promise<Partner | null> {
    return (
      Array.from(this.partners.values()).find(
        p =>
          p.email?.toLowerCase() === email.toLowerCase() && p.tenantId === tenantId && !p.isDeleted
      ) ?? null
    );
  }

  async create(tenantId: string, data: CreatePartnerInput, createdBy: string): Promise<Partner> {
    // H2 Fix: Validate partner code doesn't exist
    if (await this.codeExists(data.partnerCode, tenantId)) {
      throw new Error(`A partner kód már létezik: ${data.partnerCode}`);
    }

    // H2 Fix: Validate tax number doesn't exist (if provided)
    if (data.taxNumber && (await this.taxNumberExists(data.taxNumber, tenantId))) {
      throw new Error(`Az adószám már létezik: ${data.taxNumber}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const partner: Partner = {
      id,
      tenantId,
      type: data.type ?? 'INDIVIDUAL',
      status: 'ACTIVE',
      partnerCode: data.partnerCode,
      taxNumber: data.taxNumber ?? null,
      euVatNumber: data.euVatNumber ?? null,
      name: data.name,
      companyName: data.companyName ?? null,
      contactName: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      phoneAlt: data.phoneAlt ?? null,
      country: data.country ?? null,
      postalCode: data.postalCode ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      addressAlt: data.addressAlt ?? null,
      birthDate: data.birthDate ?? null,
      idCardNumber: data.idCardNumber ?? null,
      drivingLicenseNo: data.drivingLicenseNo ?? null,
      creditLimit: data.creditLimit ?? null,
      currentBalance: 0,
      paymentTermDays: data.paymentTermDays ?? 0,
      defaultDiscountPc: data.defaultDiscountPc ?? 0,
      loyaltyTierId: null,
      loyaltyPoints: 0,
      tierCalculatedAt: null,
      blacklistReason: null,
      blacklistedAt: null,
      blacklistedBy: null,
      warningNote: data.warningNote ?? null,
      notes: data.notes ?? null,
      createdBy,
      updatedBy: createdBy,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    this.partners.set(id, partner);
    return partner;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePartnerInput,
    updatedBy: string
  ): Promise<Partner> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    const updated: Partner = {
      ...partner,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedBy,
      updatedAt: new Date(),
    };

    this.partners.set(id, updated);
    return updated;
  }

  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    this.partners.set(id, {
      ...partner,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    });
  }

  async restore(id: string, tenantId: string): Promise<Partner> {
    const partner = this.partners.get(id);
    if (!partner || partner.tenantId !== tenantId) {
      throw new Error('Partner nem található');
    }

    const restored: Partner = {
      ...partner,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    this.partners.set(id, restored);
    return restored;
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }
    this.partners.delete(id);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: PartnerStatus,
    updatedBy: string
  ): Promise<Partner> {
    return this.update(id, tenantId, { status }, updatedBy);
  }

  async blacklist(
    id: string,
    tenantId: string,
    reason: string,
    blacklistedBy: string
  ): Promise<Partner> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    const updated: Partner = {
      ...partner,
      status: 'BLACKLISTED',
      blacklistReason: reason,
      blacklistedAt: new Date(),
      blacklistedBy,
      updatedBy: blacklistedBy,
      updatedAt: new Date(),
    };

    this.partners.set(id, updated);
    return updated;
  }

  async removeFromBlacklist(id: string, tenantId: string, updatedBy: string): Promise<Partner> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    const updated: Partner = {
      ...partner,
      status: 'ACTIVE',
      blacklistReason: null,
      blacklistedAt: null,
      blacklistedBy: null,
      updatedBy,
      updatedAt: new Date(),
    };

    this.partners.set(id, updated);
    return updated;
  }

  async updateCreditLimit(
    id: string,
    tenantId: string,
    creditLimit: number,
    updatedBy: string
  ): Promise<Partner> {
    return this.update(id, tenantId, { creditLimit }, updatedBy);
  }

  async updateBalance(id: string, tenantId: string, amount: number): Promise<Partner> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    const updated: Partner = {
      ...partner,
      currentBalance: partner.currentBalance + amount,
      updatedAt: new Date(),
    };

    this.partners.set(id, updated);
    return updated;
  }

  async updateLoyaltyTier(
    id: string,
    tenantId: string,
    tierId: string | null,
    points: number
  ): Promise<Partner> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    const updated: Partner = {
      ...partner,
      loyaltyTierId: tierId,
      loyaltyPoints: points,
      tierCalculatedAt: new Date(),
      updatedAt: new Date(),
    };

    this.partners.set(id, updated);
    return updated;
  }

  async addLoyaltyPoints(id: string, tenantId: string, points: number): Promise<Partner> {
    const partner = await this.findById(id, tenantId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    const updated: Partner = {
      ...partner,
      loyaltyPoints: partner.loyaltyPoints + points,
      updatedAt: new Date(),
    };

    this.partners.set(id, updated);
    return updated;
  }

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { type?: PartnerType; activeOnly?: boolean; limit?: number }
  ): Promise<Partner[]> {
    const term = searchTerm.toLowerCase();
    let results = Array.from(this.partners.values()).filter(
      p =>
        p.tenantId === tenantId &&
        !p.isDeleted &&
        (p.name.toLowerCase().includes(term) ||
          p.partnerCode.toLowerCase().includes(term) ||
          p.phone?.includes(term) ||
          p.email?.toLowerCase().includes(term))
    );

    if (options?.type) {
      results = results.filter(p => p.type === options.type);
    }
    if (options?.activeOnly !== false) {
      results = results.filter(p => p.status === 'ACTIVE');
    }

    return results.slice(0, options?.limit ?? 10);
  }

  async getPartnersWithBalance(
    tenantId: string,
    options?: { minBalance?: number; maxBalance?: number; overdueOnly?: boolean }
  ): Promise<Partner[]> {
    return Array.from(this.partners.values()).filter(p => {
      if (p.tenantId !== tenantId || p.isDeleted) return false;
      if (options?.minBalance !== undefined && p.currentBalance < options.minBalance) return false;
      if (options?.maxBalance !== undefined && p.currentBalance > options.maxBalance) return false;
      return true;
    });
  }

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.partners.values()).some(
      p => p.partnerCode === code && p.tenantId === tenantId && !p.isDeleted && p.id !== excludeId
    );
  }

  async taxNumberExists(taxNumber: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.partners.values()).some(
      p =>
        p.taxNumber === taxNumber && p.tenantId === tenantId && !p.isDeleted && p.id !== excludeId
    );
  }

  async generateNextCode(tenantId: string, prefix = 'P'): Promise<string> {
    const current = this.codeCounter.get(tenantId) ?? 0;
    const next = current + 1;
    this.codeCounter.set(tenantId, next);
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  async countByStatus(tenantId: string): Promise<Record<PartnerStatus, number>> {
    const counts: Record<PartnerStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      BLACKLISTED: 0,
    };

    Array.from(this.partners.values())
      .filter(p => p.tenantId === tenantId && !p.isDeleted)
      .forEach(p => {
        counts[p.status]++;
      });

    return counts;
  }

  async getRecent(tenantId: string, limit = 10): Promise<Partner[]> {
    return Array.from(this.partners.values())
      .filter(p => p.tenantId === tenantId && !p.isDeleted)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getBlacklisted(tenantId: string): Promise<Partner[]> {
    return Array.from(this.partners.values()).filter(
      p => p.tenantId === tenantId && !p.isDeleted && p.status === 'BLACKLISTED'
    );
  }
}
