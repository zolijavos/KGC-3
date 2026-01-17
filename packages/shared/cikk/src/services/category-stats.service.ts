import { Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus } from '../interfaces/item.interface';

/**
 * Category statistics response
 */
export interface CategoryStatsResponse {
  categoryId: string;
  itemCount: number;
  totalItemCount: number;
  activeItemCount: number;
}

/**
 * CategoryStatsService - Category statistics calculations
 * Story 8-2: Cikkcsoport Hierarchia - AC5
 *
 * Provides:
 * - Item count for category
 * - Total item count (including subcategories)
 * - Active item count
 * - Descendant category IDs
 *
 * @kgc/cikk
 */
@Injectable()
export class CategoryStatsService {
  constructor(private readonly prisma: any) {}

  /**
   * Get statistics for a category
   *
   * @param categoryId - Category ID
   * @param tenantId - Tenant context
   * @returns Category statistics
   */
  async getStats(categoryId: string, tenantId: string): Promise<CategoryStatsResponse> {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Kategória nem található');
    }

    // Get all descendant category IDs
    const descendantIds = await this.getAllDescendantIds(categoryId, tenantId);
    const allCategoryIds = [categoryId, ...descendantIds];

    // Get direct item count
    const itemCount = await this.prisma.item.count({
      where: {
        categoryId,
        tenantId,
      },
    });

    // Get total item count (including subcategories)
    const totalItemCount = await this.prisma.item.count({
      where: {
        categoryId: { in: allCategoryIds },
        tenantId,
      },
    });

    // Get active item count
    const activeItemCount = await this.prisma.item.count({
      where: {
        categoryId: { in: allCategoryIds },
        tenantId,
        status: ItemStatus.ACTIVE,
      },
    });

    return {
      categoryId,
      itemCount,
      totalItemCount,
      activeItemCount,
    };
  }

  /**
   * Get count of active items in a category
   *
   * @param categoryId - Category ID
   * @param tenantId - Tenant context
   * @returns Active item count
   */
  async getActiveItemCount(categoryId: string, tenantId: string): Promise<number> {
    return this.prisma.item.count({
      where: {
        categoryId,
        tenantId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Get all descendant category IDs recursively
   *
   * @param categoryId - Parent category ID
   * @param tenantId - Tenant context
   * @returns Array of descendant category IDs
   */
  async getAllDescendantIds(categoryId: string, tenantId: string): Promise<string[]> {
    const descendants: string[] = [];

    // Get direct children
    const children = await this.prisma.category.findMany({
      where: {
        parentId: categoryId,
        tenantId,
      },
      select: { id: true },
    });

    for (const child of children) {
      descendants.push(child.id);
      // Recursively get grandchildren
      const grandchildren = await this.getAllDescendantIds(child.id, tenantId);
      descendants.push(...grandchildren);
    }

    return descendants;
  }
}
