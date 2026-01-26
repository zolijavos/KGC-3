/**
 * In-Memory Tenant Repository
 * Epic 27: Story 27-3 - Cross-Tenant Riportok
 */

import { ITenantRepository } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';

interface TenantInfo {
  id: string;
  name: string;
}

@Injectable()
export class InMemoryTenantRepository implements ITenantRepository {
  private tenants: Map<string, TenantInfo> = new Map([
    ['tenant-1', { id: 'tenant-1', name: 'Budapest - Központ' }],
    ['tenant-2', { id: 'tenant-2', name: 'Debrecen' }],
    ['tenant-3', { id: 'tenant-3', name: 'Szeged' }],
    ['tenant-4', { id: 'tenant-4', name: 'Pécs' }],
    ['tenant-5', { id: 'tenant-5', name: 'Győr' }],
  ]);

  async findById(id: string): Promise<TenantInfo | null> {
    return this.tenants.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<TenantInfo[]> {
    return ids.map(id => this.tenants.get(id)).filter((t): t is TenantInfo => t !== undefined);
  }

  // Test helper
  addTenant(tenant: TenantInfo): void {
    this.tenants.set(tenant.id, tenant);
  }

  clear(): void {
    this.tenants.clear();
  }
}
