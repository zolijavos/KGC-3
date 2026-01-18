/**
 * @kgc/bevetelezes - DiscrepancyService
 * Epic 21: Story 21-3 - Bevetelezes Elteres Kezeles
 */

import { Injectable } from '@nestjs/common';
import { IDiscrepancy, DiscrepancyType, ReceiptStatus } from '../interfaces/receipt.interface';
import {
  CreateDiscrepancyDto,
  CreateDiscrepancySchema,
  ResolveDiscrepancyDto,
  ResolveDiscrepancySchema,
} from '../dto/receipt.dto';
import { IReceiptRepository, IReceiptItemRepository } from './receipt.service';
import { IAuditService } from './avizo.service';

export interface IDiscrepancyRepository {
  create(data: Partial<IDiscrepancy>): Promise<IDiscrepancy>;
  findById(id: string): Promise<IDiscrepancy | null>;
  findByReceiptId(receiptId: string): Promise<IDiscrepancy[]>;
  findUnresolvedByReceiptId(receiptId: string): Promise<IDiscrepancy[]>;
  update(id: string, data: Partial<IDiscrepancy>): Promise<IDiscrepancy>;
}

export interface ISupplierNotificationService {
  notifyDiscrepancy(
    supplierId: string,
    supplierName: string,
    discrepancy: IDiscrepancy,
    receiptNumber: string,
  ): Promise<void>;
}

@Injectable()
export class DiscrepancyService {
  constructor(
    private readonly discrepancyRepository: IDiscrepancyRepository,
    private readonly receiptRepository: IReceiptRepository,
    private readonly receiptItemRepository: IReceiptItemRepository,
    private readonly supplierNotificationService: ISupplierNotificationService,
    private readonly auditService: IAuditService,
  ) {}

  async createDiscrepancy(
    receiptId: string,
    input: CreateDiscrepancyDto,
    tenantId: string,
    userId: string,
  ): Promise<IDiscrepancy> {
    const validationResult = CreateDiscrepancySchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Verify receipt
    const receipt = await this.receiptRepository.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    if (receipt.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (receipt.status === ReceiptStatus.COMPLETED) {
      throw new Error('Cannot add discrepancy to completed receipt');
    }

    // Verify receipt item
    const items = await this.receiptItemRepository.findByReceiptId(receiptId);
    const receiptItem = items.find((item) => item.id === validInput.receiptItemId);
    if (!receiptItem) {
      throw new Error('Receipt item not found');
    }

    // Calculate difference
    const difference = validInput.actualQuantity - validInput.expectedQuantity;

    const discrepancy = await this.discrepancyRepository.create({
      receiptId,
      receiptItemId: validInput.receiptItemId,
      tenantId,
      type: validInput.type as DiscrepancyType,
      expectedQuantity: validInput.expectedQuantity,
      actualQuantity: validInput.actualQuantity,
      difference,
      reason: validInput.reason,
      supplierNotified: false,
      createdBy: userId,
    });

    // Update receipt to have discrepancy flag
    if (!receipt.hasDiscrepancy) {
      await this.receiptRepository.update(receiptId, {
        hasDiscrepancy: true,
        status: ReceiptStatus.DISCREPANCY,
      });
    }

    await this.auditService.log({
      action: 'discrepancy_created',
      entityType: 'discrepancy',
      entityId: discrepancy.id,
      userId,
      tenantId,
      metadata: {
        receiptId,
        type: validInput.type,
        difference,
        productCode: receiptItem.productCode,
      },
    });

    return discrepancy;
  }

  async resolveDiscrepancy(
    discrepancyId: string,
    input: ResolveDiscrepancyDto,
    tenantId: string,
    userId: string,
  ): Promise<IDiscrepancy> {
    const validationResult = ResolveDiscrepancySchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const discrepancy = await this.discrepancyRepository.findById(discrepancyId);
    if (!discrepancy) {
      throw new Error('Discrepancy not found');
    }
    if (discrepancy.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (discrepancy.resolvedAt) {
      throw new Error('Discrepancy already resolved');
    }

    // Notify supplier if requested
    if (input.notifySupplier && !discrepancy.supplierNotified) {
      const receipt = await this.receiptRepository.findById(discrepancy.receiptId);
      if (receipt) {
        await this.supplierNotificationService.notifyDiscrepancy(
          receipt.supplierId,
          receipt.supplierName,
          discrepancy,
          receipt.receiptNumber,
        );
      }
    }

    const updatedDiscrepancy = await this.discrepancyRepository.update(discrepancyId, {
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolutionNote: input.resolutionNote,
      supplierNotified: input.notifySupplier || discrepancy.supplierNotified,
    });

    // Check if all discrepancies are resolved and reset receipt status
    const unresolved = await this.discrepancyRepository.findUnresolvedByReceiptId(
      discrepancy.receiptId,
    );
    if (unresolved.length === 0) {
      await this.receiptRepository.update(discrepancy.receiptId, {
        status: ReceiptStatus.IN_PROGRESS,
        hasDiscrepancy: false,
      });
    }

    await this.auditService.log({
      action: 'discrepancy_resolved',
      entityType: 'discrepancy',
      entityId: discrepancyId,
      userId,
      tenantId,
      metadata: {
        resolutionNote: input.resolutionNote,
        supplierNotified: input.notifySupplier,
      },
    });

    return updatedDiscrepancy;
  }

  async getDiscrepanciesByReceipt(receiptId: string, tenantId: string): Promise<IDiscrepancy[]> {
    const receipt = await this.receiptRepository.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    if (receipt.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return this.discrepancyRepository.findByReceiptId(receiptId);
  }

  async getUnresolvedDiscrepancies(receiptId: string, tenantId: string): Promise<IDiscrepancy[]> {
    const receipt = await this.receiptRepository.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    if (receipt.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return this.discrepancyRepository.findUnresolvedByReceiptId(receiptId);
  }
}
