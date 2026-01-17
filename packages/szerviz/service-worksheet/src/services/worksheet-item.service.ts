/**
 * @kgc/service-worksheet - WorksheetItemService
 * Story 17-4: Alkatresz felhasznalas
 * Story 17-5: Munkadij kalkulacio
 * Story 17-8: Tarolasi dij kezeles
 *
 * TDD approach for financial calculations
 */

import { Injectable } from '@nestjs/common';
import { IWorksheetItem, IWorksheetSummary } from '../interfaces/worksheet.interface';
import { CreateWorksheetItemDto, CreateWorksheetItemSchema } from '../dto/worksheet.dto';
import { IWorksheetRepository, IAuditService } from './worksheet.service';

// Constants
const VAT_RATE = 27; // 27% AFA
const DEFAULT_LABOR_RATE = 8000; // 8000 Ft/ora
const STORAGE_FEE_PER_DAY = 500; // 500 Ft/nap (30 nap utan)
const STORAGE_FREE_DAYS = 30; // Elso 30 nap ingyenes

/**
 * Worksheet Item Repository interface
 */
export interface IWorksheetItemRepository {
  create(data: Partial<IWorksheetItem>): Promise<IWorksheetItem>;
  findById(id: string): Promise<IWorksheetItem | null>;
  findByWorksheetId(worksheetId: string): Promise<IWorksheetItem[]>;
  update(id: string, data: Partial<IWorksheetItem>): Promise<IWorksheetItem>;
  delete(id: string): Promise<void>;
  sumByWorksheetId(worksheetId: string): Promise<{ net: number; gross: number }>;
}

/**
 * Inventory Service interface (from @kgc/inventory)
 */
export interface IInventoryService {
  reserve(productId: string, quantity: number, tenantId: string): Promise<boolean>;
  release(productId: string, quantity: number, tenantId: string): Promise<void>;
  consume(productId: string, quantity: number, tenantId: string): Promise<void>;
  getProductPrice(productId: string, tenantId: string): Promise<number>;
}

/**
 * Worksheet Item Service - Tetel es dijszamitas kezeles
 */
@Injectable()
export class WorksheetItemService {
  constructor(
    private readonly itemRepository: IWorksheetItemRepository,
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly inventoryService: IInventoryService,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Add item to worksheet (part or labor)
   */
  async addItem(
    worksheetId: string,
    input: CreateWorksheetItemDto,
    tenantId: string,
    userId: string,
  ): Promise<IWorksheetItem> {
    // Validate input
    const validationResult = CreateWorksheetItemSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new Error(firstError?.message ?? 'Hibas input');
    }

    const validInput = validationResult.data;

    // Check worksheet
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Calculate amounts
    const netAmount = validInput.quantity * validInput.unitPrice;
    const vatAmount = Math.round(netAmount * (validInput.vatRate / 100));
    const grossAmount = netAmount + vatAmount;

    // If it's a part, reserve inventory
    if (validInput.itemType === 'ALKATRESZ' && validInput.productId) {
      const reserved = await this.inventoryService.reserve(
        validInput.productId,
        validInput.quantity,
        tenantId,
      );
      if (!reserved) {
        throw new Error('Alkatresz nem elerheto a keszletben');
      }
    }

    // Create item
    const item = await this.itemRepository.create({
      worksheetId,
      tenantId,
      productId: validInput.productId,
      description: validInput.description,
      quantity: validInput.quantity,
      unitPrice: validInput.unitPrice,
      vatRate: validInput.vatRate,
      netAmount,
      grossAmount,
      itemType: validInput.itemType,
      createdAt: new Date(),
    });

    // Audit
    await this.auditService.log({
      action: 'worksheet_item_added',
      entityType: 'worksheet_item',
      entityId: item.id,
      userId,
      tenantId,
      metadata: {
        worksheetId,
        itemType: validInput.itemType,
        netAmount,
        grossAmount,
      },
    });

    return item;
  }

  /**
   * Add labor charge
   */
  async addLabor(
    worksheetId: string,
    hours: number,
    description: string,
    hourlyRate: number = DEFAULT_LABOR_RATE,
    tenantId: string,
    userId: string,
  ): Promise<IWorksheetItem> {
    if (hours <= 0) {
      throw new Error('Munkaora pozitiv kell legyen');
    }

    return this.addItem(
      worksheetId,
      {
        description: description || `Munkadij ${hours} ora`,
        quantity: hours,
        unitPrice: hourlyRate,
        vatRate: VAT_RATE,
        itemType: 'MUNKADIJ',
      },
      tenantId,
      userId,
    );
  }

  /**
   * Calculate labor cost based on time
   */
  calculateLaborCost(hours: number, hourlyRate: number = DEFAULT_LABOR_RATE): number {
    if (hours < 0) {
      throw new Error('Ora nem lehet negativ');
    }
    // Round to nearest 100 Ft
    return Math.round((hours * hourlyRate) / 100) * 100;
  }

  /**
   * Calculate storage fee (tarolasi dij)
   * Free for first 30 days, then 500 Ft/day
   */
  calculateStorageFee(daysStored: number): number {
    if (daysStored < 0) {
      throw new Error('Napok szama nem lehet negativ');
    }
    if (daysStored <= STORAGE_FREE_DAYS) {
      return 0;
    }
    const chargeableDays = daysStored - STORAGE_FREE_DAYS;
    return chargeableDays * STORAGE_FEE_PER_DAY;
  }

  /**
   * Add storage fee to worksheet
   */
  async addStorageFee(
    worksheetId: string,
    daysStored: number,
    tenantId: string,
    userId: string,
  ): Promise<IWorksheetItem | null> {
    const fee = this.calculateStorageFee(daysStored);
    if (fee === 0) {
      return null; // No fee needed
    }

    return this.addItem(
      worksheetId,
      {
        description: `Tarolasi dij (${daysStored - STORAGE_FREE_DAYS} nap)`,
        quantity: 1,
        unitPrice: fee,
        vatRate: VAT_RATE,
        itemType: 'EGYEB',
      },
      tenantId,
      userId,
    );
  }

  /**
   * Get items for worksheet
   */
  async getItems(worksheetId: string, tenantId: string): Promise<IWorksheetItem[]> {
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    return this.itemRepository.findByWorksheetId(worksheetId);
  }

  /**
   * Calculate worksheet summary (parts + labor + other)
   */
  async calculateSummary(worksheetId: string, tenantId: string): Promise<IWorksheetSummary> {
    const items = await this.getItems(worksheetId, tenantId);

    let partsNetAmount = 0;
    let laborNetAmount = 0;
    let otherNetAmount = 0;

    for (const item of items) {
      switch (item.itemType) {
        case 'ALKATRESZ':
          partsNetAmount += item.netAmount;
          break;
        case 'MUNKADIJ':
          laborNetAmount += item.netAmount;
          break;
        case 'EGYEB':
          otherNetAmount += item.netAmount;
          break;
      }
    }

    const totalNetAmount = partsNetAmount + laborNetAmount + otherNetAmount;
    const vatAmount = Math.round(totalNetAmount * (VAT_RATE / 100));
    const totalGrossAmount = totalNetAmount + vatAmount;

    return {
      worksheetId,
      partsNetAmount,
      laborNetAmount,
      otherNetAmount,
      totalNetAmount,
      totalGrossAmount,
      vatAmount,
    };
  }

  /**
   * Remove item from worksheet
   */
  async removeItem(
    itemId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const item = await this.itemRepository.findById(itemId);
    if (!item) {
      throw new Error('Tetel nem talalhato');
    }
    if (item.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Release inventory if it's a part
    if (item.itemType === 'ALKATRESZ' && item.productId) {
      await this.inventoryService.release(item.productId, item.quantity, tenantId);
    }

    await this.itemRepository.delete(itemId);

    await this.auditService.log({
      action: 'worksheet_item_removed',
      entityType: 'worksheet_item',
      entityId: itemId,
      userId,
      tenantId,
      metadata: {
        worksheetId: item.worksheetId,
        itemType: item.itemType,
        netAmount: item.netAmount,
      },
    });
  }
}
