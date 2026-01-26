/**
 * @kgc/bevetelezes - AvizoService
 * Epic 21: Story 21-1 - Avizo Kezeles
 */

import { Injectable } from '@nestjs/common';
import {
  CreateAvizoDto,
  CreateAvizoSchema,
  UpdateAvizoDto,
  UpdateAvizoSchema,
} from '../dto/avizo.dto';
import { AvizoStatus, IAvizo, IAvizoCreateResult, IAvizoItem } from '../interfaces/avizo.interface';

export interface IAvizoRepository {
  create(data: Partial<IAvizo>): Promise<IAvizo>;
  findById(id: string): Promise<IAvizo | null>;
  findBySupplier(tenantId: string, supplierId: string): Promise<IAvizo[]>;
  findPending(tenantId: string): Promise<IAvizo[]>;
  update(id: string, data: Partial<IAvizo>): Promise<IAvizo>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
}

export interface IAvizoItemRepository {
  createMany(items: Partial<IAvizoItem>[]): Promise<IAvizoItem[]>;
  findByAvizoId(avizoId: string): Promise<IAvizoItem[]>;
  update(id: string, data: Partial<IAvizoItem>): Promise<IAvizoItem>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class AvizoService {
  constructor(
    private readonly avizoRepository: IAvizoRepository,
    private readonly itemRepository: IAvizoItemRepository,
    private readonly auditService: IAuditService
  ) {}

  async createAvizo(
    input: CreateAvizoDto,
    tenantId: string,
    userId: string
  ): Promise<IAvizoCreateResult> {
    const validationResult = CreateAvizoSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Generate avizo number
    const year = new Date().getFullYear();
    const sequence = await this.avizoRepository.getNextSequence(tenantId, year);
    const avizoNumber = `AV-${year}-${String(sequence).padStart(4, '0')}`;

    // Calculate totals
    const totalItems = validInput.items.length;
    const totalQuantity = validInput.items.reduce((sum, item) => sum + item.expectedQuantity, 0);

    const avizo = await this.avizoRepository.create({
      tenantId,
      avizoNumber,
      supplierId: validInput.supplierId,
      supplierName: validInput.supplierName,
      expectedDate: validInput.expectedDate,
      status: AvizoStatus.PENDING,
      totalItems,
      totalQuantity,
      ...(validInput.notes !== undefined && { notes: validInput.notes }),
      createdBy: userId,
    });

    // Create items
    const itemsToCreate = validInput.items.map(item => ({
      avizoId: avizo.id,
      tenantId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      expectedQuantity: item.expectedQuantity,
      receivedQuantity: 0,
      unitPrice: item.unitPrice,
    }));
    await this.itemRepository.createMany(itemsToCreate);

    await this.auditService.log({
      action: 'avizo_created',
      entityType: 'avizo',
      entityId: avizo.id,
      userId,
      tenantId,
      metadata: {
        avizoNumber,
        supplierId: validInput.supplierId,
        totalItems,
        totalQuantity,
      },
    });

    return { avizo, avizoNumber };
  }

  async getAvizoById(avizoId: string, tenantId: string): Promise<IAvizo> {
    const avizo = await this.avizoRepository.findById(avizoId);
    if (!avizo) {
      throw new Error('Avizo not found');
    }
    if (avizo.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return avizo;
  }

  async getAvizoItems(avizoId: string, tenantId: string): Promise<IAvizoItem[]> {
    await this.getAvizoById(avizoId, tenantId);
    return this.itemRepository.findByAvizoId(avizoId);
  }

  async getPendingAvizos(tenantId: string): Promise<IAvizo[]> {
    return this.avizoRepository.findPending(tenantId);
  }

  async updateAvizo(
    avizoId: string,
    input: UpdateAvizoDto,
    tenantId: string,
    userId: string
  ): Promise<IAvizo> {
    const validationResult = UpdateAvizoSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const avizo = await this.getAvizoById(avizoId, tenantId);

    if (avizo.status !== AvizoStatus.PENDING) {
      throw new Error('Can only update pending avizos');
    }

    const updateData: Partial<IAvizo> = {};
    if (input.expectedDate !== undefined) {
      updateData.expectedDate = input.expectedDate;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }
    if (input.pdfUrl !== undefined) {
      updateData.pdfUrl = input.pdfUrl;
    }

    const updatedAvizo = await this.avizoRepository.update(avizoId, updateData);

    await this.auditService.log({
      action: 'avizo_updated',
      entityType: 'avizo',
      entityId: avizoId,
      userId,
      tenantId,
      metadata: { changes: input },
    });

    return updatedAvizo;
  }

  async cancelAvizo(avizoId: string, tenantId: string, userId: string): Promise<IAvizo> {
    const avizo = await this.getAvizoById(avizoId, tenantId);

    if (avizo.status !== AvizoStatus.PENDING) {
      throw new Error('Can only cancel pending avizos');
    }

    const updatedAvizo = await this.avizoRepository.update(avizoId, {
      status: AvizoStatus.CANCELLED,
    });

    await this.auditService.log({
      action: 'avizo_cancelled',
      entityType: 'avizo',
      entityId: avizoId,
      userId,
      tenantId,
      metadata: { avizoNumber: avizo.avizoNumber },
    });

    return updatedAvizo;
  }
}
