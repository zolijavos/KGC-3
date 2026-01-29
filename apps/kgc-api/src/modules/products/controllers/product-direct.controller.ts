/**
 * Direct Product Controller - Directly queries Prisma for product data
 * Provides REST API endpoints for Product management
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaClient, Product as PrismaProduct } from '@prisma/client';

interface SupplierDTO {
  id: string;
  name: string;
  code: string;
}

interface ProductDTO {
  id: string;
  status: 'active' | 'inactive' | 'discontinued';
  category: string;
  categoryId?: string;
  sku: string;
  barcode?: string;
  manufacturerCode?: string;
  name: string;
  shortName?: string;
  description?: string;
  brand?: string;
  model?: string;
  purchasePrice: number;
  sellingPriceNet: number;
  sellingPriceGross: number;
  vatRate: number;
  marginPercent: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel: number;
  reorderQuantity: number;
  location?: string;
  supplier?: SupplierDTO;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  rentalDailyRate?: number;
  rentalWeeklyRate?: number;
  rentalMonthlyRate?: number;
  rentalDepositAmount?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface ProductListMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

type ProductWithRelations = PrismaProduct & {
  category?: { id: string; name: string; code: string } | null;
  supplier?: { id: string; name: string; code: string } | null;
};

@ApiTags('products')
@ApiBearerAuth()
@Controller('products-direct')
export class ProductDirectController {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  @Get()
  @ApiOperation({ summary: 'List products directly from database' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Product list with pagination' })
  async list(
    @Headers('X-Tenant-ID') tenantId: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<{
    data: ProductDTO[];
    meta: ProductListMeta;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: Record<string, unknown> = { tenantId, isDeleted: false };

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: pageSizeNum,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Get inventory for products
    const productIds = products.map(p => p.id);
    const inventoryMap = await this.getInventoryMap(tenantId, productIds);

    let data: ProductDTO[] = products.map(product =>
      this.toDTO(product as ProductWithRelations, inventoryMap.get(product.id))
    );

    // Filter low stock if requested (after getting inventory)
    if (lowStock === 'true') {
      data = data.filter(p => p.stockQuantity < p.minStockLevel);
    }

    return {
      data,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: skip + products.length < total,
      },
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get product statistics' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiResponse({ status: 200, description: 'Product statistics' })
  async getStats(@Headers('X-Tenant-ID') tenantId: string): Promise<{
    data: {
      total: number;
      active: number;
      lowStock: number;
      outOfStock: number;
      totalValue: number;
    };
  }> {
    const [total, active] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isDeleted: false } }),
      this.prisma.product.count({ where: { tenantId, isDeleted: false, status: 'ACTIVE' } }),
    ]);

    // Get inventory stats
    const inventoryStats = await this.prisma.inventoryItem.aggregate({
      where: { tenantId },
      _sum: { quantity: true },
    });

    // Get low stock count
    const lowStockProducts = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN inventory_items i ON p.id = i.product_id AND p.tenant_id = i.tenant_id
      WHERE p.tenant_id = ${tenantId}::uuid
        AND p.is_deleted = false
        AND p.min_stock_level IS NOT NULL
        AND COALESCE(i.quantity, 0) < p.min_stock_level
    `;

    const outOfStockProducts = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN inventory_items i ON p.id = i.product_id AND p.tenant_id = i.tenant_id
      WHERE p.tenant_id = ${tenantId}::uuid
        AND p.is_deleted = false
        AND COALESCE(i.quantity, 0) = 0
    `;

    return {
      data: {
        total,
        active,
        lowStock: Number(lowStockProducts[0]?.count ?? 0),
        outOfStock: Number(outOfStockProducts[0]?.count ?? 0),
        totalValue: Number(inventoryStats._sum?.quantity ?? 0), // Simplified - would need price calculation
      },
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get product categories' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiResponse({ status: 200, description: 'Category list' })
  async getCategories(@Headers('X-Tenant-ID') tenantId: string): Promise<{
    data: Array<{ id: string; name: string; code: string; parentId?: string }>;
  }> {
    const categories = await this.prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });

    return {
      data: categories.map(cat => {
        const item: { id: string; name: string; code: string; parentId?: string } = {
          id: cat.id,
          name: cat.name,
          code: cat.code,
        };
        if (cat.parentId) item.parentId = cat.parentId;
        return item;
      }),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID directly from database' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getById(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ data: ProductDTO }> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${id}`);
    }

    const inventoryMap = await this.getInventoryMap(tenantId, [id]);
    return { data: this.toDTO(product as ProductWithRelations, inventoryMap.get(id)) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(
    @Headers('X-Tenant-ID') tenantId: string,
    @Body()
    body: {
      sku: string;
      name: string;
      shortName?: string;
      description?: string;
      categoryId?: string;
      brand?: string;
      model?: string;
      barcode?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      vatPercent?: number;
      unit?: string;
      minStockLevel?: number;
      reorderQuantity?: number;
    }
  ): Promise<{ data: ProductDTO }> {
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        sku: body.sku,
        name: body.name,
        shortName: body.shortName ?? null,
        description: body.description ?? null,
        categoryId: body.categoryId ?? null,
        brand: body.brand ?? null,
        model: body.model ?? null,
        barcode: body.barcode ?? null,
        purchasePrice: body.purchasePrice ?? null,
        sellingPrice: body.sellingPrice ?? null,
        vatPercent: body.vatPercent ?? 27,
        unit: body.unit ?? 'db',
        minStockLevel: body.minStockLevel ?? null,
        reorderQuantity: body.reorderQuantity ?? null,
        status: 'ACTIVE',
        createdBy: 'system',
        updatedBy: 'system',
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    return { data: this.toDTO(product as ProductWithRelations, undefined) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async update(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
      name?: string;
      shortName?: string;
      description?: string;
      categoryId?: string;
      brand?: string;
      model?: string;
      barcode?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      vatPercent?: number;
      minStockLevel?: number;
      reorderQuantity?: number;
    }
  ): Promise<{ data: ProductDTO }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Product not found: ${id}`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.shortName !== undefined) updateData.shortName = body.shortName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = body.purchasePrice;
    if (body.sellingPrice !== undefined) updateData.sellingPrice = body.sellingPrice;
    if (body.vatPercent !== undefined) updateData.vatPercent = body.vatPercent;
    if (body.minStockLevel !== undefined) updateData.minStockLevel = body.minStockLevel;
    if (body.reorderQuantity !== undefined) updateData.reorderQuantity = body.reorderQuantity;

    await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    const updated = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    const inventoryMap = await this.getInventoryMap(tenantId, [id]);
    return { data: this.toDTO(updated as ProductWithRelations, inventoryMap.get(id)) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete product' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async delete(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Product not found: ${id}`);
    }

    await this.prisma.product.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  private async getInventoryMap(
    tenantId: string,
    productIds: string[]
  ): Promise<Map<string, { quantity: number; reserved: number }>> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });

    const map = new Map<string, { quantity: number; reserved: number }>();
    for (const item of items) {
      const existing = map.get(item.productId) ?? { quantity: 0, reserved: 0 };
      map.set(item.productId, {
        quantity: existing.quantity + item.quantity,
        reserved: 0, // Reserved quantity would need to be tracked differently
      });
    }
    return map;
  }

  private toDTO(
    product: ProductWithRelations,
    inventory?: { quantity: number; reserved: number }
  ): ProductDTO {
    // Map Prisma status to frontend status
    const statusMap: Record<string, 'active' | 'inactive' | 'discontinued'> = {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      DISCONTINUED: 'discontinued',
    };

    const purchasePrice = Number(product.purchasePrice ?? 0);
    const sellingPriceNet = Number(product.sellingPrice ?? product.listPrice ?? 0);
    const vatRate = Number(product.vatPercent);
    const sellingPriceGross = Math.round(sellingPriceNet * (1 + vatRate / 100));
    const marginPercent =
      purchasePrice > 0
        ? Math.round(((sellingPriceNet - purchasePrice) / purchasePrice) * 1000) / 10
        : 0;

    const stockQuantity = inventory?.quantity ?? 0;
    const reservedQuantity = inventory?.reserved ?? 0;

    const result: ProductDTO = {
      id: product.id,
      status: statusMap[product.status] ?? 'active',
      category: product.category?.code ?? 'other',
      sku: product.sku,
      name: product.name,
      purchasePrice,
      sellingPriceNet,
      sellingPriceGross,
      vatRate,
      marginPercent,
      stockQuantity,
      reservedQuantity,
      availableQuantity: stockQuantity - reservedQuantity,
      minStockLevel: product.minStockLevel ?? 0,
      reorderQuantity: product.reorderQuantity ?? 0,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    // Set optional properties conditionally
    if (product.categoryId) result.categoryId = product.categoryId;
    if (product.barcode) result.barcode = product.barcode;
    if (product.shortName) result.shortName = product.shortName;
    if (product.description) result.description = product.description;
    if (product.brand) result.brand = product.brand;
    if (product.model) result.model = product.model;
    if (product.imageUrl) result.imageUrl = product.imageUrl;
    if (product.thumbnailUrl) result.thumbnailUrl = product.thumbnailUrl;
    if (product.createdBy) result.createdBy = product.createdBy;
    if (product.supplierSku) result.manufacturerCode = product.supplierSku;

    return result;
  }
}
