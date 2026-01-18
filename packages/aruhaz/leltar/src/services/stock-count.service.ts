/**
 * Stock Count Service - Story 24.1: Leltár Indítás
 */

import { Inject } from '@nestjs/common';
import type {
  IStockCountService,
  IStockCount,
  IStockCountItem,
  ICreateStockCountInput,
  IStockCountFilter,
  StockCountStatus,
  StockCountType,
} from '../interfaces/stock-count.interface';
import { CreateStockCountSchema } from '../dto/stock-count.dto';

/**
 * Stock Count Repository interfész
 */
export interface IStockCountRepository {
  create(stockCount: IStockCount): Promise<IStockCount>;
  findById(id: string): Promise<IStockCount | null>;
  update(id: string, data: Partial<IStockCount>): Promise<IStockCount>;
  findByFilter(filter: IStockCountFilter): Promise<IStockCount[]>;
  generateCountNumber(tenantId: string): Promise<string>;
}

/**
 * Stock Count Item Repository interfész
 */
export interface IStockCountItemRepository {
  createBatch(items: IStockCountItem[]): Promise<IStockCountItem[]>;
  findByStockCountId(stockCountId: string): Promise<IStockCountItem[]>;
  update(id: string, data: Partial<IStockCountItem>): Promise<IStockCountItem>;
}

/**
 * Inventory Repository interfész (készlet lekérdezés)
 */
export interface IInventoryQueryRepository {
  getProductsForCount(
    warehouseId: string,
    categoryIds?: string[],
    zoneIds?: string[]
  ): Promise<IInventoryProduct[]>;
}

export interface IInventoryProduct {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string | undefined;
  locationCode: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(event: string, entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * Stock Count Service implementáció
 */
export class StockCountService implements IStockCountService {
  constructor(
    @Inject('STOCK_COUNT_REPOSITORY')
    private readonly repository: IStockCountRepository,
    @Inject('STOCK_COUNT_ITEM_REPOSITORY')
    private readonly itemRepository: IStockCountItemRepository,
    @Inject('INVENTORY_QUERY_REPOSITORY')
    private readonly inventoryRepository: IInventoryQueryRepository,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Leltár létrehozása
   */
  async createStockCount(input: ICreateStockCountInput): Promise<IStockCount> {
    const validated = CreateStockCountSchema.parse(input);

    const countNumber = await this.repository.generateCountNumber(validated.tenantId);

    const stockCount: IStockCount = {
      id: crypto.randomUUID(),
      tenantId: validated.tenantId,
      locationId: validated.locationId,
      warehouseId: validated.warehouseId,
      countNumber,
      type: validated.type as StockCountType,
      status: 'DRAFT' as StockCountStatus,
      name: validated.name,
      scheduledStartDate: validated.scheduledStartDate,
      scheduledEndDate: validated.scheduledEndDate,
      stockFrozen: validated.freezeStock ?? false,
      responsibleUserId: validated.responsibleUserId,
      categoryIds: validated.categoryIds,
      zoneIds: validated.zoneIds,
      totalItems: 0,
      countedItems: 0,
      varianceCount: 0,
      notes: validated.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await this.repository.create(stockCount);

    await this.auditService.log(
      'STOCK_COUNT_CREATED',
      'StockCount',
      created.id,
      { countNumber, type: validated.type, name: validated.name }
    );

    return created;
  }

  /**
   * Leltár indítása
   */
  async startStockCount(stockCountId: string): Promise<IStockCount> {
    const stockCount = await this.repository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    if (stockCount.status !== 'DRAFT') {
      throw new Error('Csak DRAFT státuszú leltár indítható');
    }

    // Leltárív generálása
    await this.generateCountSheet(stockCountId);

    const updated = await this.repository.update(stockCountId, {
      status: 'IN_PROGRESS' as StockCountStatus,
      actualStartDate: new Date(),
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'STOCK_COUNT_STARTED',
      'StockCount',
      stockCountId,
      { countNumber: stockCount.countNumber }
    );

    return updated;
  }

  /**
   * Leltár felfüggesztése
   */
  async suspendStockCount(stockCountId: string, reason: string): Promise<IStockCount> {
    const stockCount = await this.repository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    if (stockCount.status !== 'IN_PROGRESS') {
      throw new Error('Csak IN_PROGRESS státuszú leltár függeszthető fel');
    }

    const updated = await this.repository.update(stockCountId, {
      status: 'SUSPENDED' as StockCountStatus,
      notes: `${stockCount.notes ?? ''}\nFelfüggesztve: ${reason}`,
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'STOCK_COUNT_SUSPENDED',
      'StockCount',
      stockCountId,
      { reason }
    );

    return updated;
  }

  /**
   * Leltár folytatása
   */
  async resumeStockCount(stockCountId: string): Promise<IStockCount> {
    const stockCount = await this.repository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    if (stockCount.status !== 'SUSPENDED') {
      throw new Error('Csak SUSPENDED státuszú leltár folytatható');
    }

    const updated = await this.repository.update(stockCountId, {
      status: 'IN_PROGRESS' as StockCountStatus,
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'STOCK_COUNT_RESUMED',
      'StockCount',
      stockCountId,
      {}
    );

    return updated;
  }

  /**
   * Leltár lekérdezése
   */
  async getStockCount(stockCountId: string): Promise<IStockCount | null> {
    return this.repository.findById(stockCountId);
  }

  /**
   * Leltárak listázása
   */
  async listStockCounts(filter: IStockCountFilter): Promise<IStockCount[]> {
    return this.repository.findByFilter(filter);
  }

  /**
   * Leltárív generálása
   */
  async generateCountSheet(stockCountId: string): Promise<IStockCountItem[]> {
    const stockCount = await this.repository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    // Készlet lekérdezése
    const products = await this.inventoryRepository.getProductsForCount(
      stockCount.warehouseId,
      stockCount.categoryIds,
      stockCount.zoneIds
    );

    // Leltárív tételek létrehozása
    const items: IStockCountItem[] = products.map((product) => ({
      id: crypto.randomUUID(),
      stockCountId,
      productId: product.productId,
      productName: product.productName,
      sku: product.sku,
      barcode: product.barcode,
      locationCode: product.locationCode,
      bookQuantity: product.quantity,
      recountRequired: false,
    }));

    const created = await this.itemRepository.createBatch(items);

    // Leltár frissítése
    await this.repository.update(stockCountId, {
      totalItems: created.length,
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'COUNT_SHEET_GENERATED',
      'StockCount',
      stockCountId,
      { itemCount: created.length }
    );

    return created;
  }

  /**
   * Készlet fagyasztás be/ki
   */
  async toggleStockFreeze(stockCountId: string, freeze: boolean): Promise<IStockCount> {
    const stockCount = await this.repository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    if (stockCount.status === 'COMPLETED' || stockCount.status === 'CANCELLED') {
      throw new Error('Lezárt leltáron nem módosítható a fagyasztás');
    }

    const updated = await this.repository.update(stockCountId, {
      stockFrozen: freeze,
      updatedAt: new Date(),
    });

    await this.auditService.log(
      freeze ? 'STOCK_FROZEN' : 'STOCK_UNFROZEN',
      'StockCount',
      stockCountId,
      {}
    );

    return updated;
  }

  /**
   * Leltár visszavonása
   */
  async cancelStockCount(stockCountId: string, reason: string): Promise<IStockCount> {
    const stockCount = await this.repository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    if (stockCount.status === 'COMPLETED' || stockCount.status === 'CANCELLED') {
      throw new Error('Lezárt vagy visszavont leltár nem vonható vissza');
    }

    const updated = await this.repository.update(stockCountId, {
      status: 'CANCELLED' as StockCountStatus,
      stockFrozen: false,
      notes: `${stockCount.notes ?? ''}\nVisszavonva: ${reason}`,
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'STOCK_COUNT_CANCELLED',
      'StockCount',
      stockCountId,
      { reason }
    );

    return updated;
  }
}
