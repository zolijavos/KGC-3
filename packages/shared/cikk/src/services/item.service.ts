import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Item,
  ItemType,
  ItemStatus,
  CreateItemInput,
  UpdateItemInput,
  ItemFilterOptions,
  ItemListResponse,
  DEFAULT_VAT_RATE,
  DEFAULT_UNIT_OF_MEASURE,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../interfaces/item.interface';
import { ItemCodeGeneratorService } from './item-code-generator.service';
import { BarcodeService } from './barcode.service';

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Item entity type for audit logging
 */
const AUDIT_ENTITY_TYPE = 'ITEM';

/**
 * ItemService - Cikk CRUD operations
 * Story 8-1: Cikk CRUD
 *
 * Provides:
 * - Create item with auto code generation
 * - Get item by ID
 * - Update item
 * - Soft delete (status: INACTIVE)
 * - List items with filtering and pagination
 * - Find by barcode
 *
 * @kgc/cikk
 */
@Injectable()
export class ItemService {
  constructor(
    private readonly prisma: any, // PrismaService
    private readonly codeGeneratorService: ItemCodeGeneratorService,
    private readonly barcodeService: BarcodeService,
    private readonly auditService: any // AuditService
  ) {}

  /**
   * Valid Hungarian VAT rates
   */
  private static readonly VALID_VAT_RATES = [0, 5, 18, 27];

  /**
   * Create a new item
   *
   * @param tenantId - Tenant context
   * @param input - Item creation data
   * @param userId - User performing the action (for audit)
   * @returns Created item
   */
  async createItem(tenantId: string, input: CreateItemInput, userId: string): Promise<Item> {
    // Validate required fields
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('A cikk neve kötelező');
    }

    // Validate name length
    if (input.name.trim().length > 255) {
      throw new BadRequestException('A cikk neve maximum 255 karakter lehet');
    }

    // Validate listPrice for PRODUCT and PART types
    if (
      (input.itemType === ItemType.PRODUCT || input.itemType === ItemType.PART) &&
      (input.listPrice === undefined || input.listPrice === null)
    ) {
      throw new BadRequestException('Listaár kötelező termék és alkatrész típusnál');
    }

    // Validate price values
    if (input.listPrice !== undefined && input.listPrice !== null && input.listPrice < 0) {
      throw new BadRequestException('A listaár nem lehet negatív');
    }
    if (input.costPrice !== undefined && input.costPrice !== null && input.costPrice < 0) {
      throw new BadRequestException('A beszerzési ár nem lehet negatív');
    }

    // Validate VAT rate
    const vatRate = input.vatRate ?? DEFAULT_VAT_RATE;
    if (!ItemService.VALID_VAT_RATES.includes(vatRate)) {
      throw new BadRequestException(
        `Érvénytelen ÁFA kulcs: ${vatRate}%. Érvényes értékek: ${ItemService.VALID_VAT_RATES.join(', ')}%`
      );
    }

    // Handle code - generate or validate provided
    let code = input.code;
    if (code) {
      // Check if code already exists
      const existingByCode = await this.prisma.item.findFirst({
        where: { tenantId, code },
      });
      if (existingByCode) {
        throw new BadRequestException('A cikkszám már létezik');
      }
    } else {
      // Auto-generate code
      code = await this.codeGeneratorService.generateCode(input.itemType, tenantId);
    }

    // Validate barcode if provided
    if (input.barcode) {
      if (!this.barcodeService.validateEAN13(input.barcode)) {
        throw new BadRequestException('Érvénytelen EAN-13 vonalkód');
      }
      const isUnique = await this.barcodeService.isUnique(input.barcode, tenantId);
      if (!isUnique) {
        throw new BadRequestException('A vonalkód már létezik');
      }
    }

    // Create item
    const item = await this.prisma.item.create({
      data: {
        tenantId,
        code,
        name: input.name.trim(),
        description: input.description || null,
        itemType: input.itemType,
        status: ItemStatus.ACTIVE,
        listPrice: input.listPrice ?? null,
        costPrice: input.costPrice ?? null,
        vatRate,
        unitOfMeasure: input.unitOfMeasure ?? DEFAULT_UNIT_OF_MEASURE,
        barcode: input.barcode ?? null,
        alternativeBarcodes: input.alternativeBarcodes ?? [],
        categoryId: input.categoryId ?? null,
      },
    });

    // Audit log
    await this.auditService.logCreate({
      tenantId,
      userId,
      entityType: AUDIT_ENTITY_TYPE,
      entityId: item.id,
      after: item,
    });

    return item;
  }

  /**
   * Get item by ID
   *
   * @param id - Item ID
   * @param tenantId - Tenant context
   * @returns Item or null
   */
  async getItemById(id: string, tenantId: string): Promise<Item | null> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen cikk ID formátum');
    }

    return this.prisma.item.findUnique({
      where: { id, tenantId },
    });
  }

  /**
   * Update item
   *
   * @param id - Item ID
   * @param tenantId - Tenant context
   * @param input - Update data
   * @param userId - User performing the action (for audit)
   * @returns Updated item
   */
  async updateItem(
    id: string,
    tenantId: string,
    input: UpdateItemInput,
    userId: string
  ): Promise<Item> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen cikk ID formátum');
    }

    // Find existing item
    const existingItem = await this.prisma.item.findUnique({
      where: { id, tenantId },
    });

    if (!existingItem) {
      throw new NotFoundException('Cikk nem található');
    }

    // Validate barcode if changed
    if (input.barcode !== undefined && input.barcode !== existingItem.barcode) {
      if (input.barcode !== null) {
        if (!this.barcodeService.validateEAN13(input.barcode)) {
          throw new BadRequestException('Érvénytelen EAN-13 vonalkód');
        }
        const isUnique = await this.barcodeService.isUnique(input.barcode, tenantId, id);
        if (!isUnique) {
          throw new BadRequestException('A vonalkód már létezik');
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.listPrice !== undefined) updateData.listPrice = input.listPrice;
    if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
    if (input.vatRate !== undefined) updateData.vatRate = input.vatRate;
    if (input.unitOfMeasure !== undefined) updateData.unitOfMeasure = input.unitOfMeasure;
    if (input.barcode !== undefined) updateData.barcode = input.barcode;
    if (input.alternativeBarcodes !== undefined)
      updateData.alternativeBarcodes = input.alternativeBarcodes;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.status !== undefined) updateData.status = input.status;

    // Update item
    const updatedItem = await this.prisma.item.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await this.auditService.logUpdate({
      tenantId,
      userId,
      entityType: AUDIT_ENTITY_TYPE,
      entityId: id,
      before: existingItem,
      after: updatedItem,
    });

    return updatedItem;
  }

  /**
   * Soft delete item (set status to INACTIVE)
   *
   * @param id - Item ID
   * @param tenantId - Tenant context
   * @param userId - User performing the action (for audit)
   * @returns Deleted item
   */
  async deleteItem(id: string, tenantId: string, userId: string): Promise<Item> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen cikk ID formátum');
    }

    // Find existing item
    const existingItem = await this.prisma.item.findUnique({
      where: { id, tenantId },
    });

    if (!existingItem) {
      throw new NotFoundException('Cikk nem található');
    }

    if (existingItem.status === ItemStatus.INACTIVE) {
      throw new BadRequestException('Cikk már törölve');
    }

    // Soft delete
    const deletedItem = await this.prisma.item.update({
      where: { id },
      data: { status: ItemStatus.INACTIVE },
    });

    // Audit log
    await this.auditService.logDelete({
      tenantId,
      userId,
      entityType: AUDIT_ENTITY_TYPE,
      entityId: id,
      before: existingItem,
    });

    return deletedItem;
  }

  /**
   * List items with filtering and pagination
   *
   * @param tenantId - Tenant context
   * @param filter - Filter options
   * @returns Paginated item list
   */
  async listItems(tenantId: string, filter: ItemFilterOptions): Promise<ItemListResponse> {
    const page = filter.page ?? DEFAULT_PAGE;
    const limit = Math.min(filter.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
    };

    // Exclude inactive by default
    if (!filter.includeInactive) {
      where.status = { not: ItemStatus.INACTIVE };
    }

    // Filter by status
    if (filter.status) {
      where.status = filter.status;
    }

    // Filter by itemType
    if (filter.itemType) {
      where.itemType = filter.itemType;
    }

    // Filter by categoryId
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }

    // Search by code, name, or barcode
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
        { barcode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Build order by
    const sortBy = filter.sortBy ?? 'name';
    const sortDirection = filter.sortDirection ?? 'asc';
    const orderBy = { [sortBy]: sortDirection };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find item by barcode
   *
   * @param barcode - Barcode to search
   * @param tenantId - Tenant context
   * @returns Item or null
   */
  async findByBarcode(barcode: string, tenantId: string): Promise<Item | null> {
    // Validate barcode input
    if (!barcode || barcode.trim() === '') {
      return null;
    }

    return this.prisma.item.findFirst({
      where: {
        tenantId,
        OR: [{ barcode }, { alternativeBarcodes: { has: barcode } }],
      },
    });
  }
}
