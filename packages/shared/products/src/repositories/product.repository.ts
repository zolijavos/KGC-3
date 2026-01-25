/**
 * @kgc/products - Product Repository
 * Epic 8: Story 8-1: Cikk CRUD
 *
 * Repository interface and token for Product entity operations.
 * Implements multi-tenant queries with soft delete support.
 */

import { Injectable } from '@nestjs/common';
import type { CreateProductInput, UpdateProductInput } from '../dto/product.dto';
import type {
  Product,
  ProductQuery,
  ProductQueryResult,
  ProductStatus,
  ProductType,
} from '../types/product.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IProductRepository {
  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Query products with filters and pagination
   */
  query(params: ProductQuery): Promise<ProductQueryResult>;

  /**
   * Find product by ID
   */
  findById(id: string, tenantId: string): Promise<Product | null>;

  /**
   * Find product by SKU
   */
  findBySku(sku: string, tenantId: string): Promise<Product | null>;

  /**
   * Find product by barcode
   */
  findByBarcode(barcode: string, tenantId: string): Promise<Product | null>;

  /**
   * Find products by category
   */
  findByCategory(categoryId: string, tenantId: string): Promise<Product[]>;

  /**
   * Find products by supplier
   */
  findBySupplier(supplierId: string, tenantId: string): Promise<Product[]>;

  /**
   * Create new product
   */
  create(tenantId: string, data: CreateProductInput, createdBy: string): Promise<Product>;

  /**
   * Update existing product
   */
  update(
    id: string,
    tenantId: string,
    data: UpdateProductInput,
    updatedBy: string
  ): Promise<Product>;

  /**
   * Soft delete product
   */
  softDelete(id: string, tenantId: string): Promise<void>;

  /**
   * Restore soft deleted product
   */
  restore(id: string, tenantId: string): Promise<Product>;

  /**
   * Hard delete product (admin only)
   */
  hardDelete(id: string, tenantId: string): Promise<void>;

  /**
   * Update product status
   */
  updateStatus(
    id: string,
    tenantId: string,
    status: ProductStatus,
    updatedBy: string
  ): Promise<Product>;

  /**
   * Update product prices
   */
  updatePrices(
    id: string,
    tenantId: string,
    prices: {
      purchasePrice?: number | null;
      listPrice?: number | null;
      sellingPrice?: number | null;
    },
    updatedBy: string
  ): Promise<Product>;

  /**
   * Search products by name, SKU, or barcode
   */
  search(
    tenantId: string,
    searchTerm: string,
    options?: {
      type?: ProductType;
      categoryId?: string;
      activeOnly?: boolean;
      limit?: number;
    }
  ): Promise<Product[]>;

  /**
   * Get products with low stock
   */
  getLowStockProducts(tenantId: string): Promise<Product[]>;

  /**
   * Check if SKU exists
   */
  skuExists(sku: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Check if barcode exists
   */
  barcodeExists(barcode: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Generate next SKU
   */
  generateNextSku(tenantId: string, prefix?: string): Promise<string>;

  /**
   * Count products by status
   */
  countByStatus(tenantId: string): Promise<Record<ProductStatus, number>>;

  /**
   * Count products by type
   */
  countByType(tenantId: string): Promise<Record<ProductType, number>>;

  /**
   * Bulk update status
   */
  bulkUpdateStatus(
    ids: string[],
    tenantId: string,
    status: ProductStatus,
    updatedBy: string
  ): Promise<number>;

  /**
   * Get recently updated products
   */
  getRecent(tenantId: string, limit?: number): Promise<Product[]>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemoryProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map();
  private skuCounter: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.products.clear();
    this.skuCounter.clear();
  }

  async query(params: ProductQuery): Promise<ProductQueryResult> {
    let results = Array.from(this.products.values()).filter(p => p.tenantId === params.tenantId);

    // Apply filters
    if (!params.includeDeleted) {
      results = results.filter(p => !p.isDeleted);
    }
    if (params.type) {
      results = results.filter(p => p.type === params.type);
    }
    if (params.status) {
      results = results.filter(p => p.status === params.status);
    }
    if (params.categoryId) {
      results = results.filter(p => p.categoryId === params.categoryId);
    }
    if (params.supplierId) {
      results = results.filter(p => p.supplierId === params.supplierId);
    }
    if (params.brand) {
      results = results.filter(p => p.brand?.toLowerCase() === params.brand?.toLowerCase());
    }
    if (params.barcode) {
      results = results.filter(p => p.barcode === params.barcode);
    }
    if (params.sku) {
      results = results.filter(p => p.sku === params.sku);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    const total = results.length;

    // Sort
    if (params.sortBy) {
      results.sort((a, b) => {
        const aVal = a[params.sortBy!];
        const bVal = b[params.sortBy!];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return params.sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Paginate
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { products: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product || product.tenantId !== tenantId) return null;
    return product;
  }

  async findBySku(sku: string, tenantId: string): Promise<Product | null> {
    return (
      Array.from(this.products.values()).find(
        p => p.sku === sku && p.tenantId === tenantId && !p.isDeleted
      ) ?? null
    );
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<Product | null> {
    return (
      Array.from(this.products.values()).find(
        p => p.barcode === barcode && p.tenantId === tenantId && !p.isDeleted
      ) ?? null
    );
  }

  async findByCategory(categoryId: string, tenantId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      p => p.categoryId === categoryId && p.tenantId === tenantId && !p.isDeleted
    );
  }

  async findBySupplier(supplierId: string, tenantId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      p => p.supplierId === supplierId && p.tenantId === tenantId && !p.isDeleted
    );
  }

  async create(tenantId: string, data: CreateProductInput, createdBy: string): Promise<Product> {
    // H2 Fix: Validate SKU doesn't exist
    if (await this.skuExists(data.sku, tenantId)) {
      throw new Error(`A cikkszám már létezik: ${data.sku}`);
    }

    // H2 Fix: Validate barcode doesn't exist (if provided)
    if (data.barcode && (await this.barcodeExists(data.barcode, tenantId))) {
      throw new Error(`A vonalkód már létezik: ${data.barcode}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const product: Product = {
      id,
      tenantId,
      sku: data.sku,
      name: data.name,
      shortName: data.shortName ?? null,
      description: data.description ?? null,
      type: data.type ?? 'PRODUCT',
      status: data.status ?? 'ACTIVE',
      categoryId: data.categoryId ?? null,
      supplierId: data.supplierId ?? null,
      brand: data.brand ?? null,
      model: data.model ?? null,
      barcode: data.barcode ?? null,
      barcodeType: data.barcodeType ?? null,
      qrCode: data.qrCode ?? null,
      supplierSku: data.supplierSku ?? null,
      purchasePrice: data.purchasePrice ?? null,
      listPrice: data.listPrice ?? null,
      sellingPrice: data.sellingPrice ?? null,
      vatPercent: data.vatPercent ?? 27,
      unit: data.unit ?? 'db',
      packageSize: data.packageSize ?? 1,
      packageUnit: data.packageUnit ?? 'db',
      trackInventory: data.trackInventory ?? true,
      minStockLevel: data.minStockLevel ?? null,
      reorderPoint: data.reorderPoint ?? null,
      reorderQuantity: data.reorderQuantity ?? null,
      leadTimeDays: data.leadTimeDays ?? null,
      explodedDiagramId: null,
      explodedDiagramUrl: null,
      partNumber: null,
      weight: data.weight ?? null,
      length: data.length ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      imageUrl: data.imageUrl ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      images: data.images ?? [],
      notes: data.notes ?? null,
      createdBy,
      updatedBy: createdBy,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    };

    this.products.set(id, product);
    return product;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateProductInput,
    updatedBy: string
  ): Promise<Product> {
    const product = await this.findById(id, tenantId);
    if (!product) {
      throw new Error('Termék nem található');
    }

    const updated: Product = {
      ...product,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedBy,
      updatedAt: new Date(),
    };

    this.products.set(id, updated);
    return updated;
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const product = await this.findById(id, tenantId);
    if (!product) {
      throw new Error('Termék nem található');
    }

    this.products.set(id, {
      ...product,
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async restore(id: string, tenantId: string): Promise<Product> {
    const product = this.products.get(id);
    if (!product || product.tenantId !== tenantId) {
      throw new Error('Termék nem található');
    }

    const restored: Product = {
      ...product,
      isDeleted: false,
      deletedAt: null,
    };

    this.products.set(id, restored);
    return restored;
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    const product = await this.findById(id, tenantId);
    if (!product) {
      throw new Error('Termék nem található');
    }
    this.products.delete(id);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ProductStatus,
    updatedBy: string
  ): Promise<Product> {
    return this.update(id, tenantId, { status }, updatedBy);
  }

  async updatePrices(
    id: string,
    tenantId: string,
    prices: {
      purchasePrice?: number | null;
      listPrice?: number | null;
      sellingPrice?: number | null;
    },
    updatedBy: string
  ): Promise<Product> {
    return this.update(id, tenantId, prices, updatedBy);
  }

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { type?: ProductType; categoryId?: string; activeOnly?: boolean; limit?: number }
  ): Promise<Product[]> {
    const term = searchTerm.toLowerCase();
    let results = Array.from(this.products.values()).filter(
      p =>
        p.tenantId === tenantId &&
        !p.isDeleted &&
        (p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term))
    );

    if (options?.type) {
      results = results.filter(p => p.type === options.type);
    }
    if (options?.categoryId) {
      results = results.filter(p => p.categoryId === options.categoryId);
    }
    if (options?.activeOnly !== false) {
      results = results.filter(p => p.status === 'ACTIVE');
    }

    return results.slice(0, options?.limit ?? 10);
  }

  async getLowStockProducts(tenantId: string): Promise<Product[]> {
    // In real implementation, this would check actual inventory levels
    return Array.from(this.products.values()).filter(
      p =>
        p.tenantId === tenantId &&
        !p.isDeleted &&
        p.trackInventory &&
        p.minStockLevel !== null &&
        p.reorderPoint !== null
    );
  }

  async skuExists(sku: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.products.values()).some(
      p => p.sku === sku && p.tenantId === tenantId && !p.isDeleted && p.id !== excludeId
    );
  }

  async barcodeExists(barcode: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.products.values()).some(
      p => p.barcode === barcode && p.tenantId === tenantId && !p.isDeleted && p.id !== excludeId
    );
  }

  async generateNextSku(tenantId: string, prefix = 'SKU'): Promise<string> {
    const current = this.skuCounter.get(tenantId) ?? 0;
    const next = current + 1;
    this.skuCounter.set(tenantId, next);
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  async countByStatus(tenantId: string): Promise<Record<ProductStatus, number>> {
    const counts: Record<ProductStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      DISCONTINUED: 0,
      DRAFT: 0,
    };

    Array.from(this.products.values())
      .filter(p => p.tenantId === tenantId && !p.isDeleted)
      .forEach(p => {
        counts[p.status]++;
      });

    return counts;
  }

  async countByType(tenantId: string): Promise<Record<ProductType, number>> {
    const counts: Record<ProductType, number> = {
      PRODUCT: 0,
      RENTAL_EQUIPMENT: 0,
      PART: 0,
      CONSUMABLE: 0,
      SERVICE: 0,
    };

    Array.from(this.products.values())
      .filter(p => p.tenantId === tenantId && !p.isDeleted)
      .forEach(p => {
        counts[p.type]++;
      });

    return counts;
  }

  async bulkUpdateStatus(
    ids: string[],
    tenantId: string,
    status: ProductStatus,
    updatedBy: string
  ): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const product = await this.findById(id, tenantId);
      if (product) {
        await this.updateStatus(id, tenantId, status, updatedBy);
        count++;
      }
    }
    return count;
  }

  async getRecent(tenantId: string, limit = 10): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(p => p.tenantId === tenantId && !p.isDeleted)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }
}
