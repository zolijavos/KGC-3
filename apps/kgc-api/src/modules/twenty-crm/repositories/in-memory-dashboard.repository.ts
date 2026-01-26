/**
 * In-Memory Dashboard Config Repository
 * Epic 28: Twenty CRM Integration
 */

import { IDashboardConfig, IDashboardConfigRepository } from '@kgc/twenty-crm';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryDashboardConfigRepository implements IDashboardConfigRepository {
  private configs: Map<string, IDashboardConfig> = new Map();

  async create(data: Partial<IDashboardConfig>): Promise<IDashboardConfig> {
    const config: IDashboardConfig = {
      id: data.id || randomUUID(),
      tenantId: data.tenantId!,
      name: data.name!,
      crmDashboardId: data.crmDashboardId!,
      embedUrl: data.embedUrl!,
      width: data.width || '100%',
      height: data.height || '600px',
      refreshInterval: data.refreshInterval,
      permissions: data.permissions || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(config.id, config);
    return config;
  }

  async findById(id: string): Promise<IDashboardConfig | null> {
    return this.configs.get(id) || null;
  }

  async findByTenantId(tenantId: string): Promise<IDashboardConfig[]> {
    const result: IDashboardConfig[] = [];
    for (const config of this.configs.values()) {
      if (config.tenantId === tenantId) {
        result.push(config);
      }
    }
    return result;
  }

  async findActiveByTenantId(tenantId: string): Promise<IDashboardConfig[]> {
    const result: IDashboardConfig[] = [];
    for (const config of this.configs.values()) {
      if (config.tenantId === tenantId && config.isActive) {
        result.push(config);
      }
    }
    return result;
  }

  async update(id: string, data: Partial<IDashboardConfig>): Promise<IDashboardConfig> {
    const existing = this.configs.get(id);
    if (!existing) {
      throw new Error('Dashboard config not found');
    }

    const updated: IDashboardConfig = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.configs.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.configs.delete(id);
  }

  // Helper for tests
  clear(): void {
    this.configs.clear();
  }
}
