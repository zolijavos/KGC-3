/**
 * Category (Cikkcsoport) interfaces for @kgc/cikk
 * Story 8-2: Cikkcsoport Hierarchia
 */

/**
 * Category status - kategória állapotok
 */
export enum CategoryStatus {
  ACTIVE = 'ACTIVE', // Aktív
  INACTIVE = 'INACTIVE', // Soft deleted
}

/**
 * Category entity - Cikkcsoport
 */
export interface Category {
  id: string; // UUID
  tenantId: string; // FK to Tenant (RLS)
  code: string; // Kategória kód (unique per tenant)
  name: string; // Kategória neve
  description?: string | null; // Leírás
  status: CategoryStatus;

  // Hierarchy
  parentId?: string | null; // FK to parent Category
  path: string; // Materialized path: /root/parent/child
  depth: number; // Hierarchia mélység (0-4)

  // Virtual/Computed
  children?: Category[]; // Gyermek kategóriák
  parent?: Category | null; // Szülő kategória

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category with stats
 */
export interface CategoryWithStats extends Category {
  itemCount: number; // Közvetlen cikkek száma
  totalItemCount: number; // Al-kategóriákkal együtt
  activeItemCount: number; // Csak aktív cikkek
}

/**
 * Category tree node
 */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

/**
 * Create Category input
 * Note: undefined allowed for exactOptionalPropertyTypes compatibility
 */
export interface CreateCategoryInput {
  code: string;
  name: string;
  description?: string | undefined | null;
  parentId?: string | undefined | null;
}

/**
 * Update Category input
 * Note: undefined allowed for exactOptionalPropertyTypes compatibility
 */
export interface UpdateCategoryInput {
  name?: string | undefined;
  description?: string | null | undefined;
  parentId?: string | null | undefined;
  status?: CategoryStatus | undefined;
}

/**
 * Category filter options
 * Note: undefined allowed for exactOptionalPropertyTypes compatibility
 */
export interface CategoryFilterOptions {
  search?: string | undefined;
  parentId?: string | undefined;
  rootOnly?: boolean | undefined;
  includeInactive?: boolean | undefined;
  maxDepth?: number | undefined;
}

/**
 * Category stats response
 */
export interface CategoryStats {
  categoryId: string;
  itemCount: number;
  totalItemCount: number;
  activeItemCount: number;
}

/**
 * Hierarchy validation result
 */
export interface HierarchyValidationResult {
  valid: boolean;
  error?: string;
  depth?: number;
  path?: string;
}

/**
 * Constants
 */
export const MAX_CATEGORY_DEPTH = 5;
export const ROOT_PATH = '/';
