/**
 * SupplierItemService - Beszállító-Cikk kapcsolat kezelése
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  type LinkItemToSupplierInput,
  type SupplierItem,
  type SupplierItemWithRelations,
  type UpdateSupplierItemInput,
  DEFAULT_CURRENCY,
  PriceChangeSource,
} from '../interfaces/supplier.interface';
import type { PrismaClient } from '../prisma';

/**
 * Audit logger interface
 */
interface AuditLogger {
  log(entry: {
    action: string;
    tenantId: string;
    userId: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }): void | Promise<void>;
}

/**
 * Validation constants
 */
const MAX_SUPPLIER_CODE_LENGTH = 100;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupplierItemService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Link an item to a supplier
   */
  async linkItemToSupplier(
    tenantId: string,
    input: LinkItemToSupplierInput,
    userId: string
  ): Promise<SupplierItem> {
    // Validate supplierCode
    if (!input.supplierCode || input.supplierCode.trim() === '') {
      throw new BadRequestException('A beszállítói cikkszám kötelező');
    }
    if (input.supplierCode.trim().length > MAX_SUPPLIER_CODE_LENGTH) {
      throw new BadRequestException(
        `A beszállítói cikkszám maximum ${MAX_SUPPLIER_CODE_LENGTH} karakter lehet`
      );
    }

    // Validate costPrice
    if (input.costPrice < 0) {
      throw new BadRequestException('A beszerzési ár nem lehet negatív');
    }

    // Validate leadTimeDays if provided
    if (input.leadTimeDays !== undefined && input.leadTimeDays !== null && input.leadTimeDays < 0) {
      throw new BadRequestException('A szállítási idő nem lehet negatív');
    }

    // Validate minOrderQty if provided
    if (input.minOrderQty !== undefined && input.minOrderQty !== null && input.minOrderQty < 1) {
      throw new BadRequestException('A minimum rendelési mennyiség legalább 1 kell legyen');
    }

    // Verify supplier exists
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: input.supplierId, tenantId },
    });

    if (!supplier) {
      throw new BadRequestException('Beszállító nem található');
    }

    // Verify item exists
    const item = await this.prisma.item.findFirst({
      where: { id: input.itemId, tenantId },
    });

    if (!item) {
      throw new BadRequestException('Cikk nem található');
    }

    // Check if link already exists
    const existingLink = await this.prisma.supplierItem.findFirst({
      where: {
        tenantId,
        supplierId: input.supplierId,
        itemId: input.itemId,
      },
    });

    if (existingLink) {
      throw new BadRequestException('Cikk-beszállító kapcsolat már létezik');
    }

    // If setting as primary, clear other primary flags for this item
    if (input.isPrimary) {
      await this.prisma.supplierItem.updateMany({
        where: {
          tenantId,
          itemId: input.itemId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const currency = input.currency ?? DEFAULT_CURRENCY;

    // Create the link
    const supplierItem = await this.prisma.supplierItem.create({
      data: {
        tenantId,
        supplierId: input.supplierId,
        itemId: input.itemId,
        supplierCode: input.supplierCode.trim(),
        costPrice: input.costPrice,
        currency,
        leadTimeDays: input.leadTimeDays ?? null,
        minOrderQty: input.minOrderQty ?? null,
        isPrimary: input.isPrimary ?? false,
      },
    });

    // Record initial price in history
    await this.prisma.supplierItemPriceHistory.create({
      data: {
        tenantId,
        supplierItemId: supplierItem.id,
        costPrice: input.costPrice,
        currency,
        source: PriceChangeSource.MANUAL,
      },
    });

    await this.auditLogger.log({
      action: 'SUPPLIER_ITEM_LINKED',
      tenantId,
      userId,
      entityType: 'SupplierItem',
      entityId: supplierItem.id,
      details: {
        supplierId: input.supplierId,
        itemId: input.itemId,
        supplierCode: input.supplierCode,
        costPrice: input.costPrice,
      },
    });

    return supplierItem as SupplierItem;
  }

  /**
   * Update supplier-item link
   */
  async updateSupplierItem(
    id: string,
    tenantId: string,
    input: UpdateSupplierItemInput,
    userId: string,
    source: PriceChangeSource = PriceChangeSource.MANUAL
  ): Promise<SupplierItem> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen kapcsolat ID formátum');
    }

    // Validate supplierCode if provided
    if (input.supplierCode !== undefined) {
      if (input.supplierCode.trim() === '') {
        throw new BadRequestException('A beszállítói cikkszám nem lehet üres');
      }
      if (input.supplierCode.trim().length > MAX_SUPPLIER_CODE_LENGTH) {
        throw new BadRequestException(
          `A beszállítói cikkszám maximum ${MAX_SUPPLIER_CODE_LENGTH} karakter lehet`
        );
      }
    }

    // Validate costPrice if provided
    if (input.costPrice !== undefined && input.costPrice < 0) {
      throw new BadRequestException('A beszerzési ár nem lehet negatív');
    }

    // Validate leadTimeDays if provided
    if (input.leadTimeDays !== undefined && input.leadTimeDays !== null && input.leadTimeDays < 0) {
      throw new BadRequestException('A szállítási idő nem lehet negatív');
    }

    // Validate minOrderQty if provided
    if (input.minOrderQty !== undefined && input.minOrderQty !== null && input.minOrderQty < 1) {
      throw new BadRequestException('A minimum rendelési mennyiség legalább 1 kell legyen');
    }

    const existing = await this.prisma.supplierItem.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Cikk-beszállító kapcsolat nem található');
    }

    const updateData: Record<string, unknown> = {};

    if (input.supplierCode !== undefined) updateData['supplierCode'] = input.supplierCode.trim();
    if (input.costPrice !== undefined) updateData['costPrice'] = input.costPrice;
    if (input.currency !== undefined) updateData['currency'] = input.currency;
    if (input.leadTimeDays !== undefined) updateData['leadTimeDays'] = input.leadTimeDays;
    if (input.minOrderQty !== undefined) updateData['minOrderQty'] = input.minOrderQty;
    if (input.isPrimary !== undefined) updateData['isPrimary'] = input.isPrimary;

    // If setting as primary, clear other primary flags
    if (input.isPrimary === true) {
      await this.prisma.supplierItem.updateMany({
        where: {
          tenantId,
          itemId: existing.itemId,
          isPrimary: true,
          NOT: { id },
        },
        data: { isPrimary: false },
      });
    }

    const supplierItem = await this.prisma.supplierItem.update({
      where: { id },
      data: updateData,
    });

    // Record price change in history if price changed
    if (input.costPrice !== undefined) {
      const existingPrice =
        existing.costPrice instanceof Decimal
          ? existing.costPrice.toNumber()
          : Number(existing.costPrice);

      if (input.costPrice !== existingPrice) {
        await this.prisma.supplierItemPriceHistory.create({
          data: {
            tenantId,
            supplierItemId: id,
            costPrice: input.costPrice,
            currency: input.currency ?? existing.currency,
            source,
          },
        });
      }
    }

    await this.auditLogger.log({
      action: 'SUPPLIER_ITEM_UPDATED',
      tenantId,
      userId,
      entityType: 'SupplierItem',
      entityId: id,
      details: { changes: Object.keys(updateData) },
    });

    return supplierItem as SupplierItem;
  }

  /**
   * Remove supplier-item link
   */
  async unlinkItemFromSupplier(id: string, tenantId: string, userId: string): Promise<void> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen kapcsolat ID formátum');
    }

    const existing = await this.prisma.supplierItem.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Cikk-beszállító kapcsolat nem található');
    }

    await this.prisma.supplierItem.delete({
      where: { id },
    });

    await this.auditLogger.log({
      action: 'SUPPLIER_ITEM_UNLINKED',
      tenantId,
      userId,
      entityType: 'SupplierItem',
      entityId: id,
      details: {
        supplierId: existing.supplierId,
        itemId: existing.itemId,
      },
    });
  }

  /**
   * Get all items for a supplier
   */
  async getSupplierItems(
    supplierId: string,
    tenantId: string
  ): Promise<SupplierItemWithRelations[]> {
    const items = await this.prisma.supplierItem.findMany({
      where: {
        supplierId,
        tenantId,
      },
      include: {
        item: {
          select: { id: true, code: true, name: true, barcode: true },
        },
      },
      orderBy: { supplierCode: 'asc' },
    });

    return items as SupplierItemWithRelations[];
  }

  /**
   * Get all suppliers for an item
   */
  async getItemSuppliers(itemId: string, tenantId: string): Promise<SupplierItemWithRelations[]> {
    const suppliers = await this.prisma.supplierItem.findMany({
      where: {
        itemId,
        tenantId,
      },
      include: {
        supplier: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { costPrice: 'asc' }],
    });

    return suppliers as SupplierItemWithRelations[];
  }

  /**
   * Set a supplier-item as primary for the item
   */
  async setPrimarySupplier(
    supplierItemId: string,
    tenantId: string,
    userId: string
  ): Promise<SupplierItem> {
    // Validate UUID format
    if (!UUID_REGEX.test(supplierItemId)) {
      throw new BadRequestException('Érvénytelen kapcsolat ID formátum');
    }

    const existing = await this.prisma.supplierItem.findFirst({
      where: { id: supplierItemId, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Cikk-beszállító kapcsolat nem található');
    }

    // Clear other primary flags for this item
    await this.prisma.supplierItem.updateMany({
      where: {
        tenantId,
        itemId: existing.itemId,
        isPrimary: true,
        NOT: { id: supplierItemId },
      },
      data: { isPrimary: false },
    });

    // Set this one as primary
    const supplierItem = await this.prisma.supplierItem.update({
      where: { id: supplierItemId },
      data: { isPrimary: true },
    });

    await this.auditLogger.log({
      action: 'SUPPLIER_ITEM_SET_PRIMARY',
      tenantId,
      userId,
      entityType: 'SupplierItem',
      entityId: supplierItemId,
      details: { itemId: existing.itemId },
    });

    return supplierItem as SupplierItem;
  }

  /**
   * Get supplier-item by ID
   */
  async getSupplierItemById(
    id: string,
    tenantId: string
  ): Promise<SupplierItemWithRelations | null> {
    const supplierItem = await this.prisma.supplierItem.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        item: {
          select: { id: true, code: true, name: true, barcode: true },
        },
      },
    });

    return supplierItem as SupplierItemWithRelations | null;
  }
}
