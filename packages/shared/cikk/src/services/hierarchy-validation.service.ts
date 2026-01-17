import { Injectable } from '@nestjs/common';
import { MAX_CATEGORY_DEPTH } from '../interfaces/category.interface';

/**
 * Depth validation result
 */
export interface DepthValidationResult {
  valid: boolean;
  depth: number;
  error?: string;
}

/**
 * Path calculation result
 */
export interface PathCalculationResult {
  path: string;
  depth: number;
}

/**
 * Category ancestor data
 */
export interface CategoryAncestor {
  id: string;
  parentId: string | null;
  name: string;
}

/**
 * HierarchyValidationService - Category hierarchy validation
 * Story 8-2: Cikkcsoport Hierarchia - AC2
 *
 * Provides:
 * - Max depth validation (5 levels)
 * - Circular reference detection
 * - Materialized path calculation
 * - Ancestor chain retrieval
 *
 * @kgc/cikk
 */
@Injectable()
export class HierarchyValidationService {
  constructor(private readonly prisma: any) {}

  /**
   * Validate if adding a child to the parent would exceed max depth
   *
   * @param parentId - Parent category ID (null for root)
   * @param tenantId - Tenant context
   * @returns Validation result with calculated depth
   */
  async validateMaxDepth(
    parentId: string | null,
    tenantId: string
  ): Promise<DepthValidationResult> {
    // Root category has depth 0
    if (!parentId) {
      return { valid: true, depth: 0 };
    }

    // Get parent category
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId, tenantId },
    });

    if (!parent) {
      return {
        valid: false,
        depth: 0,
        error: 'A szülő kategória nem található',
      };
    }

    // Calculate new depth (parent depth + 1)
    const newDepth = parent.depth + 1;

    // Check if exceeds max depth
    if (newDepth >= MAX_CATEGORY_DEPTH) {
      return {
        valid: false,
        depth: newDepth,
        error: `A kategória mélysége meghaladja a maximális ${MAX_CATEGORY_DEPTH} szintet`,
      };
    }

    return { valid: true, depth: newDepth };
  }

  /**
   * Detect if moving a category to a new parent would create a circular reference
   *
   * @param categoryId - Category being moved
   * @param newParentId - Target parent ID
   * @param tenantId - Tenant context
   * @returns true if circular reference detected
   */
  async detectCircularReference(
    categoryId: string,
    newParentId: string,
    tenantId: string
  ): Promise<boolean> {
    // Self-reference is always circular
    if (categoryId === newParentId) {
      return true;
    }

    // Walk up the ancestor chain of newParentId
    // If we find categoryId, it's a circular reference
    let currentId: string | null = newParentId;

    while (currentId) {
      const current: { id: string; parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId, tenantId },
          select: { id: true, parentId: true },
        });

      if (!current) {
        break;
      }

      // If the parent of current is the category we're trying to move,
      // that means newParentId is a descendant of categoryId → circular!
      if (current.parentId === categoryId) {
        return true;
      }

      currentId = current.parentId;
    }

    return false;
  }

  /**
   * Calculate materialized path for a category
   *
   * @param parentId - Parent category ID (null for root)
   * @param tenantId - Tenant context
   * @returns Path and depth
   */
  async calculatePath(
    parentId: string | null,
    tenantId: string
  ): Promise<PathCalculationResult> {
    // Root category
    if (!parentId) {
      return { path: '/', depth: 0 };
    }

    // Get parent category
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId, tenantId },
      select: { code: true, path: true, depth: true },
    });

    if (!parent) {
      return { path: '/', depth: 0 };
    }

    // Calculate new path: parent's path + parent's code
    // Handle root path specially to avoid double slash
    const basePath = parent.path === '/' ? '' : parent.path;
    const newPath = `${basePath}/${parent.code}`;
    const newDepth = parent.depth + 1;

    return { path: newPath, depth: newDepth };
  }

  /**
   * Get all ancestors of a category from leaf to root
   *
   * @param categoryId - Category ID
   * @param tenantId - Tenant context
   * @returns Array of ancestors (closest first, root last)
   */
  async getAncestors(
    categoryId: string,
    tenantId: string
  ): Promise<CategoryAncestor[]> {
    const ancestors: CategoryAncestor[] = [];

    // Get the starting category
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, tenantId },
      select: { id: true, parentId: true, name: true },
    });

    if (!category || !category.parentId) {
      return ancestors;
    }

    // Walk up the tree
    let currentId: string | null = category.parentId;

    while (currentId) {
      const current = await this.prisma.category.findUnique({
        where: { id: currentId, tenantId },
        select: { id: true, parentId: true, name: true },
      });

      if (!current) {
        break;
      }

      ancestors.push({
        id: current.id,
        parentId: current.parentId,
        name: current.name,
      });

      currentId = current.parentId;
    }

    return ancestors;
  }
}
