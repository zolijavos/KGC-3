/**
 * Prisma Product Repository
 * Implements IProductRepository for PostgreSQL persistence
 * Epic 8: Story 8-1: Cikk CRUD
 */

import {
  CreateProductInput,
  IProductRepository,
  Product,
  ProductQuery,
  ProductQueryResult,
  ProductStatus,
  ProductType,
  UpdateProductInput,
} from '@kgc/products';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Product as PrismaProduct,
  ProductStatus as PrismaProductStatus,
  ProductType as PrismaProductType,
} from '@prisma/client';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma Product to domain interface
   */
  private toProductDomain(product: PrismaProduct): Product {
    return {
      id: product.id,
      tenantId: product.tenantId,
      sku: product.sku,
      name: product.name,
      shortName: product.shortName,
      description: product.description,
      type: product.type as ProductType,
      status: product.status as ProductStatus,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      brand: product.brand,
      model: product.model,
      barcode: product.barcode,
      barcodeType: product.barcodeType,
      qrCode: product.qrCode,
      supplierSku: product.supplierSku,
      purchasePrice: product.purchasePrice ? Number(product.purchasePrice) : null,
      listPrice: product.listPrice ? Number(product.listPrice) : null,
      sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : null,
      vatPercent: Number(product.vatPercent),
      unit: product.unit,
      packageSize: product.packageSize,
      packageUnit: product.packageUnit,
      trackInventory: product.trackInventory,
      minStockLevel: product.minStockLevel,
      reorderPoint: product.reorderPoint,
      reorderQuantity: product.reorderQuantity,
      leadTimeDays: product.leadTimeDays,
      explodedDiagramId: product.explodedDiagramId,
      explodedDiagramUrl: product.explodedDiagramUrl,
      partNumber: product.partNumber,
      weight: product.weight ? Number(product.weight) : null,
      length: product.length ? Number(product.length) : null,
      width: product.width ? Number(product.width) : null,
      height: product.height ? Number(product.height) : null,
      imageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl,
      images: product.images as string[],
      notes: product.notes,
      createdBy: product.createdBy,
      updatedBy: product.updatedBy,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      isDeleted: product.isDeleted,
      deletedAt: product.deletedAt,
    };
  }

  // ============================================
  // CLEAR (testing only)
  // ============================================

  clear(): void {
    // No-op: Database cleanup should be handled by test fixtures
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: ProductQuery): Promise<ProductQueryResult> {
    const where: Prisma.ProductWhereInput = {
      tenantId: params.tenantId,
    };

    if (!params.includeDeleted) {
      where.isDeleted = false;
    }
    if (params.type) {
      where.type = params.type as PrismaProductType;
    }
    if (params.status) {
      where.status = params.status as PrismaProductStatus;
    }
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }
    if (params.brand) {
      where.brand = { equals: params.brand, mode: 'insensitive' };
    }
    if (params.barcode) {
      where.barcode = params.barcode;
    }
    if (params.sku) {
      where.sku = params.sku;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
        { barcode: { contains: params.search } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderByField = params.sortBy ?? 'name';
    const orderByDir = params.sortOrder ?? 'asc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = { [orderByField]: orderByDir };

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map(p => this.toProductDomain(p)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    return product ? this.toProductDomain(product) : null;
  }

  async findBySku(sku: string, tenantId: string): Promise<Product | null> {
    const product = await this.prisma.product.findFirst({
      where: { sku, tenantId, isDeleted: false },
    });
    return product ? this.toProductDomain(product) : null;
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<Product | null> {
    const product = await this.prisma.product.findFirst({
      where: { barcode, tenantId, isDeleted: false },
    });
    return product ? this.toProductDomain(product) : null;
  }

  async findByCategory(categoryId: string, tenantId: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { categoryId, tenantId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
    return products.map(p => this.toProductDomain(p));
  }

  async findBySupplier(supplierId: string, tenantId: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { supplierId, tenantId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
    return products.map(p => this.toProductDomain(p));
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreateProductInput, createdBy: string): Promise<Product> {
    if (await this.skuExists(data.sku, tenantId)) {
      throw new Error(`SKU már létezik: ${data.sku}`);
    }
    if (data.barcode && (await this.barcodeExists(data.barcode, tenantId))) {
      throw new Error(`Vonalkód már létezik: ${data.barcode}`);
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        sku: data.sku,
        name: data.name,
        shortName: data.shortName ?? null,
        description: data.description ?? null,
        type: (data.type ?? 'PRODUCT') as PrismaProductType,
        status: (data.status ?? 'ACTIVE') as PrismaProductStatus,
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
      },
    });

    return this.toProductDomain(product);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateProductInput,
    updatedBy: string
  ): Promise<Product> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Termék nem található: ${id}`);
    }

    // H6 FIX: Validate barcode uniqueness on update
    if (data.barcode !== undefined && data.barcode !== existing.barcode) {
      if (data.barcode && (await this.barcodeExists(data.barcode, tenantId, id))) {
        throw new Error(`Vonalkód már létezik: ${data.barcode}`);
      }
    }

    // Note: Using generic object for updateMany since relation fields (categoryId, supplierId)
    // are not in ProductUpdateManyMutationInput but are valid in the raw data
    const updateData: Record<string, unknown> = {
      updatedBy,
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.shortName !== undefined) updateData.shortName = data.shortName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type as PrismaProductType;
    if (data.status !== undefined) updateData.status = data.status as PrismaProductStatus;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.barcodeType !== undefined) updateData.barcodeType = data.barcodeType;
    if (data.qrCode !== undefined) updateData.qrCode = data.qrCode;
    if (data.supplierSku !== undefined) updateData.supplierSku = data.supplierSku;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.listPrice !== undefined) updateData.listPrice = data.listPrice;
    if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
    if (data.vatPercent !== undefined) updateData.vatPercent = data.vatPercent;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.packageSize !== undefined) updateData.packageSize = data.packageSize;
    if (data.packageUnit !== undefined) updateData.packageUnit = data.packageUnit;
    if (data.trackInventory !== undefined) updateData.trackInventory = data.trackInventory;
    if (data.minStockLevel !== undefined) updateData.minStockLevel = data.minStockLevel;
    if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint;
    if (data.reorderQuantity !== undefined) updateData.reorderQuantity = data.reorderQuantity;
    if (data.leadTimeDays !== undefined) updateData.leadTimeDays = data.leadTimeDays;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.length !== undefined) updateData.length = data.length;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.ProductUpdateManyMutationInput,
    });

    if (result.count === 0) {
      throw new Error(`Termék frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Termék nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  async restore(id: string, tenantId: string): Promise<Product> {
    // H8 FIX: Check that product is actually deleted before restoring
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: true },
    });
    if (!product) {
      throw new Error(`Törölt termék nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Termék nem található: ${id}`);
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.product.deleteMany({
      where: { id, tenantId },
    });
  }

  // ============================================
  // STATUS & PRICE METHODS
  // ============================================

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

  // ============================================
  // SEARCH & QUERY HELPERS
  // ============================================

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { type?: ProductType; categoryId?: string; activeOnly?: boolean; limit?: number }
  ): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      isDeleted: false,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm } },
      ],
    };

    if (options?.type) {
      where.type = options.type as PrismaProductType;
    }
    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }
    if (options?.activeOnly !== false) {
      where.status = 'ACTIVE';
    }

    const products = await this.prisma.product.findMany({
      where,
      take: options?.limit ?? 10,
      orderBy: { name: 'asc' },
    });

    return products.map(p => this.toProductDomain(p));
  }

  async getLowStockProducts(tenantId: string): Promise<Product[]> {
    // Get products where inventory is below reorder point
    // This requires joining with InventoryItem table
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isDeleted: false,
        trackInventory: true,
        reorderPoint: { not: null },
      },
      include: {
        inventoryItems: {
          where: { isDeleted: false },
          select: { quantity: true },
        },
      },
    });

    // Filter products where total inventory is below reorder point
    return products
      .filter(p => {
        const totalQuantity = p.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
        return p.reorderPoint !== null && totalQuantity < p.reorderPoint;
      })
      .map(p => this.toProductDomain(p));
  }

  async skuExists(sku: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: {
        sku,
        tenantId,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return product !== null;
  }

  async barcodeExists(barcode: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: {
        barcode,
        tenantId,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return product !== null;
  }

  async generateNextSku(tenantId: string, prefix = 'SKU'): Promise<string> {
    const latestProduct = await this.prisma.product.findFirst({
      where: {
        tenantId,
        sku: { startsWith: prefix },
      },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    if (!latestProduct) {
      return `${prefix}000001`;
    }

    const numericPart = latestProduct.sku.slice(prefix.length);
    const nextNum = parseInt(numericPart, 10) + 1;
    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }

  async countByStatus(tenantId: string): Promise<Record<ProductStatus, number>> {
    const counts = await this.prisma.product.groupBy({
      by: ['status'],
      where: { tenantId, isDeleted: false },
      _count: { status: true },
    });

    const result: Record<ProductStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      DISCONTINUED: 0,
      DRAFT: 0,
    };

    for (const { status, _count } of counts) {
      result[status as ProductStatus] = _count.status;
    }

    return result;
  }

  async countByType(tenantId: string): Promise<Record<ProductType, number>> {
    const counts = await this.prisma.product.groupBy({
      by: ['type'],
      where: { tenantId, isDeleted: false },
      _count: { type: true },
    });

    const result: Record<ProductType, number> = {
      PRODUCT: 0,
      RENTAL_EQUIPMENT: 0,
      PART: 0,
      CONSUMABLE: 0,
      SERVICE: 0,
    };

    for (const { type, _count } of counts) {
      result[type as ProductType] = _count.type;
    }

    return result;
  }

  async bulkUpdateStatus(
    ids: string[],
    tenantId: string,
    status: ProductStatus,
    updatedBy: string
  ): Promise<number> {
    const result = await this.prisma.product.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        isDeleted: false,
      },
      data: {
        status: status as PrismaProductStatus,
        updatedBy,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async getRecent(tenantId: string, limit = 10): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return products.map(p => this.toProductDomain(p));
  }
}
