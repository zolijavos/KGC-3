/**
 * @kgc/partners - Representative Repository
 * Epic 7: Story 7-2: Meghatalmazott kezelés
 *
 * Repository interface and token for Representative entity operations.
 * Handles delegate/representative management for partners.
 */

import { Injectable } from '@nestjs/common';
import type {
  CreateRepresentativeInput,
  RepresentativeValidationResult,
  UpdateRepresentativeInput,
} from '../dto/representative.dto';
import type {
  Representative,
  RepresentativeQuery,
  RepresentativeQueryResult,
} from '../types/partner.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const REPRESENTATIVE_REPOSITORY = Symbol('REPRESENTATIVE_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IRepresentativeRepository {
  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Query representatives with filters and pagination
   */
  query(params: RepresentativeQuery): Promise<RepresentativeQueryResult>;

  /**
   * Find representative by ID
   */
  findById(id: string, tenantId: string): Promise<Representative | null>;

  /**
   * Find all representatives for a partner
   */
  findByPartnerId(partnerId: string, tenantId: string): Promise<Representative[]>;

  /**
   * Find active representatives for a partner
   */
  findActiveByPartnerId(partnerId: string, tenantId: string): Promise<Representative[]>;

  /**
   * Create new representative
   */
  create(tenantId: string, data: CreateRepresentativeInput): Promise<Representative>;

  /**
   * Update existing representative
   */
  update(id: string, tenantId: string, data: UpdateRepresentativeInput): Promise<Representative>;

  /**
   * Delete representative (hard delete)
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Activate representative
   */
  activate(id: string, tenantId: string): Promise<Representative>;

  /**
   * Deactivate representative
   */
  deactivate(id: string, tenantId: string): Promise<Representative>;

  /**
   * Validate representative for specific action
   */
  validate(
    partnerId: string,
    representativeId: string,
    tenantId: string,
    action: 'rent' | 'return' | 'sign' | 'pay_cash'
  ): Promise<RepresentativeValidationResult>;

  /**
   * Check if representative has specific permission
   */
  hasPermission(
    id: string,
    tenantId: string,
    permission: 'canRent' | 'canReturn' | 'canSign' | 'canPayCash'
  ): Promise<boolean>;

  /**
   * Get representatives expiring soon
   */
  getExpiringSoon(tenantId: string, daysAhead?: number): Promise<Representative[]>;

  /**
   * Update permissions for representative
   */
  updatePermissions(
    id: string,
    tenantId: string,
    permissions: {
      canRent?: boolean;
      canReturn?: boolean;
      canSign?: boolean;
      canPayCash?: boolean;
    }
  ): Promise<Representative>;

  /**
   * Extend validity period
   */
  extendValidity(id: string, tenantId: string, validUntil: Date): Promise<Representative>;

  /**
   * Search representatives by name or ID number
   */
  search(
    tenantId: string,
    searchTerm: string,
    options?: {
      partnerId?: string;
      activeOnly?: boolean;
      limit?: number;
    }
  ): Promise<Representative[]>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemoryRepresentativeRepository implements IRepresentativeRepository {
  private representatives: Map<string, Representative> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.representatives.clear();
  }

  async query(params: RepresentativeQuery): Promise<RepresentativeQueryResult> {
    let results = Array.from(this.representatives.values()).filter(
      r => r.tenantId === params.tenantId
    );

    // Apply filters
    if (params.partnerId) {
      results = results.filter(r => r.partnerId === params.partnerId);
    }
    if (params.isActive !== undefined) {
      results = results.filter(r => r.isActive === params.isActive);
    }
    if (params.canRent !== undefined) {
      results = results.filter(r => r.canRent === params.canRent);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        r =>
          r.name.toLowerCase().includes(term) ||
          r.phone?.includes(term) ||
          r.email?.toLowerCase().includes(term) ||
          r.idNumber?.toLowerCase().includes(term)
      );
    }

    const total = results.length;

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { representatives: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<Representative | null> {
    const rep = this.representatives.get(id);
    if (!rep || rep.tenantId !== tenantId) return null;
    return rep;
  }

  async findByPartnerId(partnerId: string, tenantId: string): Promise<Representative[]> {
    return Array.from(this.representatives.values()).filter(
      r => r.partnerId === partnerId && r.tenantId === tenantId
    );
  }

  async findActiveByPartnerId(partnerId: string, tenantId: string): Promise<Representative[]> {
    const now = new Date();
    return Array.from(this.representatives.values()).filter(
      r =>
        r.partnerId === partnerId &&
        r.tenantId === tenantId &&
        r.isActive &&
        r.validFrom <= now &&
        (r.validUntil === null || r.validUntil >= now)
    );
  }

  async create(tenantId: string, data: CreateRepresentativeInput): Promise<Representative> {
    const now = new Date();
    const id = crypto.randomUUID();

    const representative: Representative = {
      id,
      tenantId,
      partnerId: data.partnerId,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      idNumber: data.idNumber ?? null,
      validFrom: data.validFrom ?? now,
      validUntil: data.validUntil ?? null,
      isActive: true,
      canRent: data.canRent ?? true,
      canReturn: data.canReturn ?? true,
      canSign: data.canSign ?? true,
      canPayCash: data.canPayCash ?? false,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.representatives.set(id, representative);
    return representative;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRepresentativeInput
  ): Promise<Representative> {
    const rep = await this.findById(id, tenantId);
    if (!rep) {
      throw new Error('Meghatalmazott nem található');
    }

    const updated: Representative = {
      ...rep,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.representatives.set(id, updated);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const rep = await this.findById(id, tenantId);
    if (!rep) {
      throw new Error('Meghatalmazott nem található');
    }
    this.representatives.delete(id);
  }

  async activate(id: string, tenantId: string): Promise<Representative> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<Representative> {
    return this.update(id, tenantId, { isActive: false });
  }

  async validate(
    partnerId: string,
    representativeId: string,
    tenantId: string,
    action: 'rent' | 'return' | 'sign' | 'pay_cash'
  ): Promise<RepresentativeValidationResult> {
    const rep = await this.findById(representativeId, tenantId);

    if (!rep || rep.partnerId !== partnerId) {
      return {
        isValid: false,
        representative: null,
        errorCode: 'NOT_FOUND',
        errorMessage: 'A meghatalmazott nem található',
      };
    }

    if (!rep.isActive) {
      return {
        isValid: false,
        representative: { id: rep.id, name: rep.name },
        errorCode: 'INACTIVE',
        errorMessage: 'A meghatalmazott inaktív',
      };
    }

    const now = new Date();
    if (rep.validFrom > now || (rep.validUntil && rep.validUntil < now)) {
      return {
        isValid: false,
        representative: { id: rep.id, name: rep.name },
        errorCode: 'EXPIRED',
        errorMessage: 'A meghatalmazás lejárt vagy még nem érvényes',
      };
    }

    const permissionMap: Record<string, keyof Representative> = {
      rent: 'canRent',
      return: 'canReturn',
      sign: 'canSign',
      pay_cash: 'canPayCash',
    };

    const permissionKey = permissionMap[action];
    if (permissionKey && !rep[permissionKey]) {
      return {
        isValid: false,
        representative: { id: rep.id, name: rep.name },
        errorCode: 'NO_PERMISSION',
        errorMessage: `A meghatalmazottnak nincs jogosultsága ehhez a művelethez: ${action}`,
      };
    }

    return {
      isValid: true,
      representative: { id: rep.id, name: rep.name },
    };
  }

  async hasPermission(
    id: string,
    tenantId: string,
    permission: 'canRent' | 'canReturn' | 'canSign' | 'canPayCash'
  ): Promise<boolean> {
    const rep = await this.findById(id, tenantId);
    if (!rep || !rep.isActive) return false;

    const now = new Date();
    if (rep.validFrom > now || (rep.validUntil && rep.validUntil < now)) {
      return false;
    }

    return rep[permission] === true;
  }

  async getExpiringSoon(tenantId: string, daysAhead = 30): Promise<Representative[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return Array.from(this.representatives.values()).filter(
      r =>
        r.tenantId === tenantId &&
        r.isActive &&
        r.validUntil !== null &&
        r.validUntil >= now &&
        r.validUntil <= futureDate
    );
  }

  async updatePermissions(
    id: string,
    tenantId: string,
    permissions: {
      canRent?: boolean;
      canReturn?: boolean;
      canSign?: boolean;
      canPayCash?: boolean;
    }
  ): Promise<Representative> {
    return this.update(id, tenantId, permissions);
  }

  async extendValidity(id: string, tenantId: string, validUntil: Date): Promise<Representative> {
    return this.update(id, tenantId, { validUntil });
  }

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { partnerId?: string; activeOnly?: boolean; limit?: number }
  ): Promise<Representative[]> {
    const term = searchTerm.toLowerCase();
    let results = Array.from(this.representatives.values()).filter(
      r =>
        r.tenantId === tenantId &&
        (r.name.toLowerCase().includes(term) ||
          r.phone?.includes(term) ||
          r.email?.toLowerCase().includes(term) ||
          r.idNumber?.toLowerCase().includes(term))
    );

    if (options?.partnerId) {
      results = results.filter(r => r.partnerId === options.partnerId);
    }
    if (options?.activeOnly !== false) {
      const now = new Date();
      results = results.filter(
        r => r.isActive && r.validFrom <= now && (r.validUntil === null || r.validUntil >= now)
      );
    }

    return results.slice(0, options?.limit ?? 10);
  }
}
