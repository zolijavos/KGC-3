/**
 * @kgc/bevetelezes - ReceiptService
 * Epic 21: Story 21-2 - Bevetelezes Workflow
 */

import { Injectable } from '@nestjs/common';
import {
  IReceipt,
  IReceiptItem,
  ReceiptStatus,
  RECEIPT_TOLERANCE_PERCENT,
} from '../interfaces/receipt.interface';
import { IAvizo, IAvizoItem, AvizoStatus } from '../interfaces/avizo.interface';
import { CreateReceiptDto, CreateReceiptSchema } from '../dto/receipt.dto';
import { IAvizoRepository, IAvizoItemRepository, IAuditService } from './avizo.service';

export interface IReceiptRepository {
  create(data: Partial<IReceipt>): Promise<IReceipt>;
  findById(id: string): Promise<IReceipt | null>;
  findByAvizoId(avizoId: string): Promise<IReceipt | null>;
  update(id: string, data: Partial<IReceipt>): Promise<IReceipt>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
}

export interface IReceiptItemRepository {
  createMany(items: Partial<IReceiptItem>[]): Promise<IReceiptItem[]>;
  findByReceiptId(receiptId: string): Promise<IReceiptItem[]>;
  update(id: string, data: Partial<IReceiptItem>): Promise<IReceiptItem>;
}

export interface IInventoryService {
  increaseStock(
    tenantId: string,
    productId: string,
    quantity: number,
    locationCode?: string,
  ): Promise<void>;
}

@Injectable()
export class ReceiptService {
  constructor(
    private readonly receiptRepository: IReceiptRepository,
    private readonly receiptItemRepository: IReceiptItemRepository,
    private readonly avizoRepository: IAvizoRepository,
    private readonly avizoItemRepository: IAvizoItemRepository,
    private readonly inventoryService: IInventoryService,
    private readonly auditService: IAuditService,
  ) {}

  async createReceipt(
    input: CreateReceiptDto,
    tenantId: string,
    userId: string,
  ): Promise<IReceipt> {
    const validationResult = CreateReceiptSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Validate avizo if provided
    let avizo: IAvizo | null = null;
    let avizoItems: IAvizoItem[] = [];
    if (validInput.avizoId) {
      avizo = await this.avizoRepository.findById(validInput.avizoId);
      if (!avizo) {
        throw new Error('Avizo not found');
      }
      if (avizo.tenantId !== tenantId) {
        throw new Error('Access denied');
      }
      if (avizo.status === AvizoStatus.RECEIVED) {
        throw new Error('Avizo already fully received');
      }
      if (avizo.status === AvizoStatus.CANCELLED) {
        throw new Error('Cannot receive cancelled avizo');
      }
      avizoItems = await this.avizoItemRepository.findByAvizoId(validInput.avizoId);
    }

    // Generate receipt number
    const year = new Date().getFullYear();
    const sequence = await this.receiptRepository.getNextSequence(tenantId, year);
    const receiptNumber = `BEV-${year}-${String(sequence).padStart(4, '0')}`;

    // Check for discrepancies
    let hasDiscrepancy = false;
    for (const item of validInput.items) {
      if (item.expectedQuantity > 0) {
        const difference = Math.abs(item.receivedQuantity - item.expectedQuantity);
        const toleranceAmount = item.expectedQuantity * (RECEIPT_TOLERANCE_PERCENT / 100);
        if (difference > toleranceAmount) {
          hasDiscrepancy = true;
          break;
        }
      }
    }

    // Calculate totals
    const totalItems = validInput.items.length;
    const totalQuantity = validInput.items.reduce((sum, item) => sum + item.receivedQuantity, 0);

    const receipt = await this.receiptRepository.create({
      tenantId,
      receiptNumber,
      avizoId: validInput.avizoId,
      supplierId: validInput.supplierId,
      supplierName: validInput.supplierName,
      receivedDate: new Date(),
      status: hasDiscrepancy ? ReceiptStatus.DISCREPANCY : ReceiptStatus.IN_PROGRESS,
      totalItems,
      totalQuantity,
      hasDiscrepancy,
      processedBy: userId,
      notes: validInput.notes,
    });

    // Create receipt items
    const itemsToCreate = validInput.items.map((item) => ({
      receiptId: receipt.id,
      tenantId,
      avizoItemId: item.avizoItemId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      expectedQuantity: item.expectedQuantity,
      receivedQuantity: item.receivedQuantity,
      unitPrice: item.unitPrice,
      locationCode: item.locationCode,
    }));
    await this.receiptItemRepository.createMany(itemsToCreate);

    // Update avizo item received quantities if linked to avizo
    if (validInput.avizoId && avizoItems.length > 0) {
      for (const item of validInput.items) {
        if (item.avizoItemId) {
          const avizoItem = avizoItems.find((ai) => ai.id === item.avizoItemId);
          if (avizoItem) {
            await this.avizoItemRepository.update(item.avizoItemId, {
              receivedQuantity: avizoItem.receivedQuantity + item.receivedQuantity,
            });
          }
        }
      }
    }

    await this.auditService.log({
      action: 'receipt_created',
      entityType: 'receipt',
      entityId: receipt.id,
      userId,
      tenantId,
      metadata: {
        receiptNumber,
        avizoId: validInput.avizoId,
        totalItems,
        totalQuantity,
        hasDiscrepancy,
      },
    });

    return receipt;
  }

  async completeReceipt(receiptId: string, tenantId: string, userId: string): Promise<IReceipt> {
    const receipt = await this.getReceiptById(receiptId, tenantId);

    if (receipt.status === ReceiptStatus.COMPLETED) {
      throw new Error('Receipt already completed');
    }
    if (receipt.status === ReceiptStatus.DISCREPANCY) {
      throw new Error('Receipt has unresolved discrepancies');
    }

    // Get items and update inventory
    const items = await this.receiptItemRepository.findByReceiptId(receiptId);
    for (const item of items) {
      if (item.receivedQuantity > 0) {
        await this.inventoryService.increaseStock(
          tenantId,
          item.productId,
          item.receivedQuantity,
          item.locationCode,
        );
      }
    }

    // Update receipt status
    const updatedReceipt = await this.receiptRepository.update(receiptId, {
      status: ReceiptStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Update avizo status if linked
    if (receipt.avizoId) {
      const avizoItems = await this.avizoItemRepository.findByAvizoId(receipt.avizoId);
      const allReceived = avizoItems.every(
        (item) => item.receivedQuantity >= item.expectedQuantity,
      );
      await this.avizoRepository.update(receipt.avizoId, {
        status: allReceived ? AvizoStatus.RECEIVED : AvizoStatus.PARTIAL,
      });
    }

    await this.auditService.log({
      action: 'receipt_completed',
      entityType: 'receipt',
      entityId: receiptId,
      userId,
      tenantId,
      metadata: {
        receiptNumber: receipt.receiptNumber,
        itemCount: items.length,
      },
    });

    return updatedReceipt;
  }

  async getReceiptById(receiptId: string, tenantId: string): Promise<IReceipt> {
    const receipt = await this.receiptRepository.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    if (receipt.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return receipt;
  }

  async getReceiptItems(receiptId: string, tenantId: string): Promise<IReceiptItem[]> {
    await this.getReceiptById(receiptId, tenantId);
    return this.receiptItemRepository.findByReceiptId(receiptId);
  }

  checkTolerance(expected: number, actual: number): boolean {
    if (expected === 0) return actual === 0;
    const difference = Math.abs(actual - expected);
    const toleranceAmount = expected * (RECEIPT_TOLERANCE_PERCENT / 100);
    return difference <= toleranceAmount;
  }
}
