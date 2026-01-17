import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { Tenant, TenantStatus } from '../interfaces/tenant.interface';
import {
  TenantHierarchyNode,
  TenantHierarchyFlat,
  HoldingOverview,
  CrossTenantScope,
} from '../interfaces/holding.interface';

/**
 * HoldingService - Holding/subsidiary tenant structure management
 * @kgc/tenant - Holding infrastructure
 *
 * Felelősségek:
 * - Parent-child tenant kapcsolatok kezelése
 * - Hierarchia lekérdezések
 * - Cross-tenant scope CENTRAL_ADMIN-nak
 * - Holding szintű aggregációk
 */
@Injectable()
export class HoldingService {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Set parent tenant for a child tenant
   */
  async setParentTenant(
    tenantId: string,
    parentTenantId: string | null
  ): Promise<boolean> {
    // Validate parent exists if not null
    if (parentTenantId) {
      await this.tenantService.getTenantById(parentTenantId);

      // Prevent circular reference
      if (parentTenantId === tenantId) {
        throw new BadRequestException('Tenant nem lehet saját maga szülője');
      }

      // Check if parent would create a cycle
      const isDescendant = await this.isDescendantOf(parentTenantId, tenantId);
      if (isDescendant) {
        throw new BadRequestException('Körkörös hierarchia nem engedélyezett');
      }
    }

    await this.tenantService.updateTenant(tenantId, {
      parentTenantId,
    });

    return true;
  }

  /**
   * Get all direct child tenants for a parent
   */
  async getChildTenants(parentTenantId: string): Promise<Tenant[]> {
    const result = await this.tenantService.listTenants({
      parentTenantId,
      limit: 100,
      page: 1,
      includeInactive: false,
    });

    return result.data;
  }

  /**
   * Get parent tenant
   */
  async getParentTenant(tenantId: string): Promise<Tenant | null> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return null;
    }

    if (!tenant.parentTenantId) {
      return null;
    }

    return this.tenantService.getTenantById(tenant.parentTenantId);
  }

  /**
   * Get the root tenant of the holding structure
   */
  async getHoldingRoot(tenantId: string): Promise<Tenant> {
    let current = await this.tenantService.getTenantById(tenantId);
    if (!current) {
      throw new BadRequestException('Tenant nem található');
    }

    while (current.parentTenantId) {
      const parent = await this.tenantService.getTenantById(current.parentTenantId);
      if (!parent) {
        break;
      }
      current = parent;
    }

    return current;
  }

  /**
   * Check if a tenant is a descendant of another tenant
   */
  async isDescendantOf(tenantId: string, ancestorId: string): Promise<boolean> {
    let current = await this.tenantService.getTenantById(tenantId);
    if (!current) {
      return false;
    }

    while (current.parentTenantId) {
      if (current.parentTenantId === ancestorId) {
        return true;
      }
      const parent = await this.tenantService.getTenantById(current.parentTenantId);
      if (!parent) {
        break;
      }
      current = parent;
    }

    return false;
  }

  /**
   * Get full tenant hierarchy as a tree
   */
  async getTenantHierarchy(
    tenantId: string,
    level: number = 0
  ): Promise<TenantHierarchyNode> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new BadRequestException('Tenant nem található');
    }
    const children = await this.getChildTenants(tenantId);

    return {
      tenant,
      level,
      children: await Promise.all(
        children.map((child) => this.getTenantHierarchy(child.id, level + 1))
      ),
    };
  }

  /**
   * Get tenant hierarchy as flat list
   */
  async getTenantHierarchyFlat(
    tenantId: string,
    path: string[] = []
  ): Promise<TenantHierarchyFlat[]> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return [];
    }
    const currentPath = [...path, tenantId];

    const result: TenantHierarchyFlat[] = [
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        parentTenantId: tenant.parentTenantId,
        level: path.length,
        path: currentPath,
      },
    ];

    const children = await this.getChildTenants(tenantId);
    for (const child of children) {
      const childResults = await this.getTenantHierarchyFlat(child.id, currentPath);
      result.push(...childResults);
    }

    return result;
  }

  /**
   * Get holding overview with stats
   */
  async getHoldingOverview(rootTenantId: string): Promise<HoldingOverview> {
    const rootTenant = await this.tenantService.getTenantById(rootTenantId);
    if (!rootTenant) {
      throw new BadRequestException('Root tenant nem található');
    }
    const hierarchy = await this.getTenantHierarchy(rootTenantId);

    // Count tenants and calculate stats
    const countTenants = (node: TenantHierarchyNode): {
      total: number;
      active: number;
      maxDepth: number;
    } => {
      let total = 1;
      let active = node.tenant.status === TenantStatus.ACTIVE ? 1 : 0;
      let maxDepth = node.level;

      for (const child of node.children) {
        const childStats = countTenants(child);
        total += childStats.total;
        active += childStats.active;
        maxDepth = Math.max(maxDepth, childStats.maxDepth);
      }

      return { total, active, maxDepth };
    };

    const stats = countTenants(hierarchy);

    return {
      rootTenant,
      totalTenants: stats.total,
      activeTenants: stats.active,
      maxDepth: stats.maxDepth,
      hierarchy,
    };
  }

  /**
   * Get cross-tenant scope for CENTRAL_ADMIN
   */
  async getCrossTenantScope(rootTenantId: string): Promise<CrossTenantScope> {
    const flatHierarchy = await this.getTenantHierarchyFlat(rootTenantId);

    return {
      rootTenantId,
      includedTenantIds: flatHierarchy.map((t) => t.tenantId),
      isHoldingWide: true,
    };
  }

  /**
   * Get all descendant tenant IDs
   */
  async getAllDescendantIds(tenantId: string): Promise<string[]> {
    const flatHierarchy = await this.getTenantHierarchyFlat(tenantId);
    return flatHierarchy.map((t) => t.tenantId).filter((id) => id !== tenantId);
  }
}
