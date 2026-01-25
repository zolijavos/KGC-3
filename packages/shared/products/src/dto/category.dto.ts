/**
 * @kgc/products - Category DTOs with Zod validation
 * Epic 8: Story 8-2: Cikkcsoport hierarchia
 */

import { z } from 'zod';

// ============================================
// CREATE CATEGORY DTO
// ============================================

export const CreateCategorySchema = z.object({
  /** Kategória kód (egyedi tenant-en belül) */
  code: z
    .string()
    .min(1, { message: 'A kategória kód kötelező' })
    .max(50, { message: 'A kategória kód maximum 50 karakter' })
    .toUpperCase(),

  /** Kategória neve */
  name: z
    .string()
    .min(1, { message: 'A kategória név kötelező' })
    .max(255, { message: 'A kategória név maximum 255 karakter' }),

  /** Leírás */
  description: z.string().max(500).optional(),

  /** Szülő kategória ID */
  parentId: z.string().uuid().optional(),

  /** Kép URL */
  imageUrl: z.string().url().optional(),

  /** Rendezési sorrend */
  sortOrder: z.number().int().min(0).default(0),

  /** Aktív-e */
  isActive: z.boolean().default(true),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// ============================================
// UPDATE CATEGORY DTO
// ============================================

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// ============================================
// MOVE CATEGORY DTO
// ============================================

export const MoveCategorySchema = z.object({
  /** Áthelyezendő kategória ID */
  categoryId: z.string().uuid({ message: 'Érvénytelen kategória ID' }),

  /** Új szülő kategória ID (null = gyökérszint) */
  newParentId: z.string().uuid().nullable(),
});

export type MoveCategoryInput = z.infer<typeof MoveCategorySchema>;

// ============================================
// REORDER CATEGORIES DTO
// ============================================

export const ReorderCategoriesSchema = z.object({
  /** Kategóriák új sorrendje */
  categoryOrders: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1),
});

export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>;

// ============================================
// CATEGORY TREE RESULT
// ============================================

export interface CategoryTreeNode {
  id: string;
  code: string;
  name: string;
  level: number;
  path: string;
  productCount: number;
  isActive: boolean;
  children: CategoryTreeNode[];
}
