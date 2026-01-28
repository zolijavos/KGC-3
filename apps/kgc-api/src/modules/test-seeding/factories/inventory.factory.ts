/**
 * Inventory Factory
 * Creates test inventory items with required dependencies for E2E tests.
 */

import {
  InventoryItemType,
  InventoryStatus,
  PrismaClient,
  ProductStatus,
  ProductType,
  WarehouseStatus,
  WarehouseType,
} from '@prisma/client';
import { SeedInventoryItemRequest, SeededInventoryItem } from '../types';

export class InventoryFactory {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Ensure a test warehouse exists for the tenant
   */
  async ensureWarehouse(testRunId: string, tenantId: string): Promise<string> {
    // Check if test warehouse already exists
    const existing = await this.prisma.warehouse.findFirst({
      where: {
        tenantId,
        code: `WH-TEST-${testRunId.substring(0, 8)}`,
      },
    });

    if (existing) return existing.id;

    // Create test warehouse
    const warehouse = await this.prisma.warehouse.create({
      data: {
        tenantId,
        code: `WH-TEST-${testRunId.substring(0, 8)}`,
        name: `Test Warehouse ${testRunId}`,
        type: WarehouseType.BRANCH,
        status: WarehouseStatus.ACTIVE,
        isDefault: true,
        isActive: true,
      },
    });

    return warehouse.id;
  }

  /**
   * Ensure a test product exists
   */
  async ensureProduct(
    testRunId: string,
    tenantId: string,
    userId: string,
    request?: SeedInventoryItemRequest
  ): Promise<string> {
    const timestamp = Date.now();
    const sku = request?.sku ?? `SKU-TEST-${testRunId.substring(0, 8)}-${timestamp}`;

    // Check if product already exists
    const existing = await this.prisma.product.findFirst({
      where: {
        tenantId,
        sku,
      },
    });

    if (existing) return existing.id;

    // Create test product
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        sku,
        name: request?.name ?? `Test Product ${timestamp}`,
        type: this.mapToProductType(request?.type),
        status: ProductStatus.ACTIVE,
        purchasePrice: request?.price ?? 1000,
        sellingPrice: request?.price ? request.price * 1.3 : 1300,
        vatPercent: 27,
        unit: 'db',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return product.id;
  }

  /**
   * Create a test inventory item
   */
  async create(
    testRunId: string,
    request: SeedInventoryItemRequest,
    userId: string
  ): Promise<SeededInventoryItem> {
    const timestamp = Date.now();

    // Ensure dependencies exist
    const warehouseId = await this.ensureWarehouse(testRunId, request.tenantId);
    const productId = await this.ensureProduct(testRunId, request.tenantId, userId, request);

    const item = await this.prisma.inventoryItem.create({
      data: {
        tenantId: request.tenantId,
        warehouseId,
        productId,
        type: this.mapToInventoryType(request.type),
        status: InventoryStatus.AVAILABLE,
        quantity: request.currentStock ?? 10,
        unit: 'db',
        minStockLevel: request.minStock ?? 5,
        maxStockLevel: 100,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        warehouse: true,
      },
    });

    // Get the product for SKU
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    return {
      id: item.id,
      sku: product?.sku ?? `UNKNOWN-${timestamp}`,
      name: product?.name ?? `Unknown Product`,
      tenantId: item.tenantId,
    };
  }

  /**
   * Cleanup inventory items by test run
   */
  async cleanup(testRunId: string): Promise<number> {
    // Find products created by test
    const products = await this.prisma.product.findMany({
      where: {
        sku: {
          contains: `TEST-${testRunId.substring(0, 8)}`,
        },
      },
    });

    if (products.length === 0) return 0;

    const productIds = products.map(p => p.id);

    // Delete inventory items first
    const itemsDeleted = await this.prisma.inventoryItem.deleteMany({
      where: {
        productId: { in: productIds },
      },
    });

    // Delete products
    await this.prisma.product.deleteMany({
      where: {
        id: { in: productIds },
      },
    });

    // Delete test warehouses
    await this.prisma.warehouse.deleteMany({
      where: {
        code: {
          contains: `TEST-${testRunId.substring(0, 8)}`,
        },
      },
    });

    return itemsDeleted.count;
  }

  private mapToInventoryType(type?: string): InventoryItemType {
    switch (type) {
      case 'RENTAL_EQUIPMENT':
        return InventoryItemType.RENTAL_EQUIPMENT;
      case 'PART':
        return InventoryItemType.PART;
      case 'CONSUMABLE':
        return InventoryItemType.CONSUMABLE;
      default:
        return InventoryItemType.PRODUCT;
    }
  }

  private mapToProductType(type?: string): ProductType {
    switch (type) {
      case 'RENTAL_EQUIPMENT':
        return ProductType.RENTAL_EQUIPMENT;
      case 'PART':
        return ProductType.PART;
      case 'CONSUMABLE':
        return ProductType.CONSUMABLE;
      default:
        return ProductType.PRODUCT;
    }
  }
}
