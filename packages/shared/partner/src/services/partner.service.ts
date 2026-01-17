/**
 * Partner Service
 * FR25: Partner (ügyfél) törzs CRUD (magánszemély és cég)
 * FR31: Partner merge/duplicate detection
 * FR32: GDPR compliance: cascade delete
 */
import { Injectable, Inject } from '@nestjs/common';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';
import type {
  Partner,
  PartnerStatus,
  CreatePartnerInput,
  UpdatePartnerInput,
  PartnerQueryOptions,
  PartnerQueryResult,
  CreatePartnerResult,
  DuplicateWarning,
  IPartnerRepository,
} from '../interfaces/partner.interface';

@Injectable()
export class PartnerService {
  constructor(
    @Inject(PARTNER_REPOSITORY)
    private readonly repository: IPartnerRepository
  ) {}

  /**
   * Partner létrehozása duplikáció ellenőrzéssel
   */
  async create(input: CreatePartnerInput): Promise<CreatePartnerResult> {
    // Validálás
    this.validateCreateInput(input);

    // Duplikáció keresés
    const duplicateWarnings = await this.checkForDuplicates(input);

    // Partner létrehozása
    const partner = await this.repository.create(input);

    return {
      partner,
      duplicateWarnings,
    };
  }

  /**
   * Partner keresése ID alapján
   */
  async findById(id: string, tenantId: string): Promise<Partner | null> {
    return this.repository.findById(id, tenantId);
  }

  /**
   * Partner frissítése
   */
  async update(id: string, tenantId: string, input: UpdatePartnerInput): Promise<Partner> {
    const existing = await this.repository.findById(id, tenantId);

    if (!existing) {
      throw new Error('Partner not found');
    }

    if (existing.status === 'DELETED') {
      throw new Error('Cannot update deleted partner');
    }

    return this.repository.update(id, tenantId, input);
  }

  /**
   * Partner törlése (soft delete)
   */
  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const existing = await this.repository.findById(id, tenantId);

    if (!existing) {
      throw new Error('Partner not found');
    }

    await this.repository.delete(id, tenantId, deletedBy);
  }

  /**
   * Partner végleges törlése (hard delete - GDPR)
   */
  async hardDelete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findById(id, tenantId);

    if (!existing) {
      throw new Error('Partner not found');
    }

    if (existing.status !== 'DELETED') {
      throw new Error('Partner must be soft-deleted before hard delete');
    }

    await this.repository.hardDelete(id, tenantId);
  }

  /**
   * Partner keresés
   */
  async query(options: PartnerQueryOptions): Promise<PartnerQueryResult> {
    return this.repository.query(options);
  }

  /**
   * Partner szám
   */
  async count(tenantId: string, options?: { status?: PartnerStatus }): Promise<number> {
    return this.repository.count(tenantId, options);
  }

  /**
   * Duplikáció keresés
   */
  async findDuplicates(
    tenantId: string,
    criteria: {
      email?: string;
      phone?: string;
      taxNumber?: string;
    }
  ): Promise<Partner[]> {
    return this.repository.findDuplicates(tenantId, criteria);
  }

  /**
   * Partner státusz változtatás
   */
  async setStatus(
    id: string,
    tenantId: string,
    status: PartnerStatus,
    updatedBy: string
  ): Promise<Partner> {
    const existing = await this.repository.findById(id, tenantId);

    if (!existing) {
      throw new Error('Partner not found');
    }

    if (existing.status === 'DELETED') {
      throw new Error('Cannot change status of deleted partner');
    }

    return this.repository.update(id, tenantId, { status, updatedBy });
  }

  /**
   * Input validálás
   */
  private validateCreateInput(input: CreatePartnerInput): void {
    // Név validálás
    if (!input.name || input.name.length < 2) {
      throw new Error('Név minimum 2 karakter');
    }

    // Cég esetén adószám kötelező
    if (input.type === 'COMPANY' && !input.taxNumber) {
      throw new Error('Cég típusú partner esetén az adószám megadása kötelező');
    }
  }

  /**
   * Duplikáció ellenőrzés
   */
  private async checkForDuplicates(input: CreatePartnerInput): Promise<DuplicateWarning[]> {
    const warnings: DuplicateWarning[] = [];

    const criteria: { email?: string; phone?: string; taxNumber?: string } = {};

    if (input.email) {
      criteria.email = input.email;
    }
    if (input.phone) {
      criteria.phone = input.phone;
    }
    if (input.taxNumber) {
      criteria.taxNumber = input.taxNumber;
    }

    // Ha nincs mit keresni, nincs duplikáció
    if (Object.keys(criteria).length === 0) {
      return warnings;
    }

    const duplicates = await this.repository.findDuplicates(input.tenantId, criteria);

    for (const duplicate of duplicates) {
      if (input.email && duplicate.email === input.email) {
        warnings.push({
          field: 'email',
          value: input.email,
          existingPartnerId: duplicate.id,
          existingPartnerName: duplicate.name,
        });
      }

      if (input.phone && duplicate.phone === input.phone) {
        warnings.push({
          field: 'phone',
          value: input.phone,
          existingPartnerId: duplicate.id,
          existingPartnerName: duplicate.name,
        });
      }

      if (input.taxNumber && duplicate.taxNumber === input.taxNumber) {
        warnings.push({
          field: 'taxNumber',
          value: input.taxNumber,
          existingPartnerId: duplicate.id,
          existingPartnerName: duplicate.name,
        });
      }
    }

    return warnings;
  }
}
