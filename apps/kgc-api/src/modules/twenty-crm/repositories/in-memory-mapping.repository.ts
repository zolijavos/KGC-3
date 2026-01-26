/**
 * In-Memory Partner Mapping Repository
 * Epic 28: Twenty CRM Integration
 */

import { IPartnerMapping, IPartnerMappingRepository, SyncStatus } from '@kgc/twenty-crm';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryPartnerMappingRepository implements IPartnerMappingRepository {
  private mappings: Map<string, IPartnerMapping> = new Map();

  async create(data: Partial<IPartnerMapping>): Promise<IPartnerMapping> {
    const mapping: IPartnerMapping = {
      id: data.id || randomUUID(),
      tenantId: data.tenantId!,
      kgcPartnerId: data.kgcPartnerId!,
      crmPartnerId: data.crmPartnerId!,
      syncStatus: data.syncStatus || SyncStatus.PENDING,
      lastSyncedAt: data.lastSyncedAt,
      syncError: data.syncError,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mappings.set(mapping.id, mapping);
    return mapping;
  }

  async findById(id: string): Promise<IPartnerMapping | null> {
    return this.mappings.get(id) || null;
  }

  async findByKgcPartnerId(
    tenantId: string,
    kgcPartnerId: string
  ): Promise<IPartnerMapping | null> {
    for (const mapping of this.mappings.values()) {
      if (mapping.tenantId === tenantId && mapping.kgcPartnerId === kgcPartnerId) {
        return mapping;
      }
    }
    return null;
  }

  async findByCrmPartnerId(
    tenantId: string,
    crmPartnerId: string
  ): Promise<IPartnerMapping | null> {
    for (const mapping of this.mappings.values()) {
      if (mapping.tenantId === tenantId && mapping.crmPartnerId === crmPartnerId) {
        return mapping;
      }
    }
    return null;
  }

  async findByTenantId(tenantId: string): Promise<IPartnerMapping[]> {
    const result: IPartnerMapping[] = [];
    for (const mapping of this.mappings.values()) {
      if (mapping.tenantId === tenantId) {
        result.push(mapping);
      }
    }
    return result;
  }

  async update(id: string, data: Partial<IPartnerMapping>): Promise<IPartnerMapping> {
    const existing = this.mappings.get(id);
    if (!existing) {
      throw new Error('Mapping not found');
    }

    const updated: IPartnerMapping = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.mappings.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.mappings.delete(id);
  }

  // Helper for tests
  clear(): void {
    this.mappings.clear();
  }
}
