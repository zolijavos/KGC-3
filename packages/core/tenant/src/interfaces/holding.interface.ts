/**
 * Holding Interface Types
 * @kgc/tenant - Holding/subsidiary tenant structure
 */

import { Tenant } from './tenant.interface';

/**
 * Tenant hierarchy node
 */
export interface TenantHierarchyNode {
  tenant: Tenant;
  children: TenantHierarchyNode[];
  level: number;
}

/**
 * Tenant hierarchy (flat list)
 */
export interface TenantHierarchyFlat {
  tenantId: string;
  tenantName: string;
  parentTenantId: string | null;
  level: number;
  path: string[]; // [rootId, ..., parentId, tenantId]
}

/**
 * Holding overview
 */
export interface HoldingOverview {
  rootTenant: Tenant;
  totalTenants: number;
  activeTenants: number;
  maxDepth: number;
  hierarchy: TenantHierarchyNode;
}

/**
 * Set parent tenant DTO
 */
export interface SetParentTenantDto {
  tenantId: string;
  parentTenantId: string | null;
}

/**
 * Holding relationship
 */
export interface HoldingRelationship {
  childTenantId: string;
  parentTenantId: string;
  createdAt: Date;
}

/**
 * Cross-tenant query scope
 */
export interface CrossTenantScope {
  rootTenantId: string;
  includedTenantIds: string[];
  isHoldingWide: boolean;
}
