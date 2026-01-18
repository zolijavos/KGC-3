/**
 * @kgc/service-norma - NormaLaborService
 * Epic 20: Story 20-2 - Norma Alapu Munkadij
 */

import { Injectable } from '@nestjs/common';
import { INormaItem, INormaLaborCalculation } from '../interfaces/norma.interface';
import { CalculateLaborCostDto, CalculateLaborCostSchema } from '../dto/norma.dto';
import { INormaVersionRepository, INormaItemRepository, IAuditService } from './norma-import.service';

export interface IWorksheet {
  id: string;
  tenantId: string;
  worksheetNumber: string;
  isWarranty: boolean;
}

export interface IWorksheetRepository {
  findById(id: string): Promise<IWorksheet | null>;
}

@Injectable()
export class NormaLaborService {
  constructor(
    private readonly versionRepository: INormaVersionRepository,
    private readonly itemRepository: INormaItemRepository,
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly auditService: IAuditService,
  ) {}

  async calculateLaborCost(
    input: CalculateLaborCostDto,
    tenantId: string,
    userId: string,
    supplier: string = 'Makita',
  ): Promise<INormaLaborCalculation> {
    const validationResult = CalculateLaborCostSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Verify worksheet exists and belongs to tenant
    const worksheet = await this.worksheetRepository.findById(validInput.worksheetId);
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    // Warn if using norma pricing on non-warranty worksheet
    if (!worksheet.isWarranty) {
      console.warn(
        `[NormaLaborService] Using norma pricing on non-warranty worksheet: ${worksheet.worksheetNumber}`,
      );
    }

    // Find active norma version
    const activeVersion = await this.versionRepository.findActiveBySupplier(tenantId, supplier);
    if (!activeVersion) {
      throw new Error(`No active norma version found for supplier: ${supplier}`);
    }

    // Find norma item by code
    const normaItem = await this.itemRepository.findByCode(
      tenantId,
      activeVersion.id,
      validInput.normaCode,
    );
    if (!normaItem) {
      throw new Error(`Norma code not found: ${validInput.normaCode}`);
    }

    // Calculate cost with optional deviation
    const calculatedCost = normaItem.laborCost;
    let finalCost = calculatedCost;

    if (validInput.deviationPercent !== undefined && validInput.deviationPercent !== 0) {
      if (!validInput.deviationReason) {
        throw new Error('Deviation reason is required when applying deviation');
      }
      finalCost = Math.round(calculatedCost * (1 + validInput.deviationPercent / 100));
    }

    const calculation: INormaLaborCalculation = {
      normaItemId: normaItem.id,
      normaCode: normaItem.normaCode,
      description: normaItem.description,
      normaHours: normaItem.normaHours,
      hourlyRate: normaItem.hourlyRate,
      calculatedCost,
      finalCost,
    };
    if (validInput.deviationPercent !== undefined) {
      calculation.deviationPercent = validInput.deviationPercent;
    }
    if (validInput.deviationReason !== undefined) {
      calculation.deviationReason = validInput.deviationReason;
    }

    await this.auditService.log({
      action: 'norma_labor_calculated',
      entityType: 'worksheet',
      entityId: validInput.worksheetId,
      userId,
      tenantId,
      metadata: {
        normaCode: validInput.normaCode,
        calculatedCost,
        finalCost,
        deviationPercent: validInput.deviationPercent,
      },
    });

    return calculation;
  }

  async findNormaByCode(
    normaCode: string,
    tenantId: string,
    supplier: string = 'Makita',
  ): Promise<INormaItem | null> {
    const activeVersion = await this.versionRepository.findActiveBySupplier(tenantId, supplier);
    if (!activeVersion) {
      return null;
    }

    return this.itemRepository.findByCode(tenantId, activeVersion.id, normaCode);
  }

  async searchNormaCodes(
    searchTerm: string,
    tenantId: string,
    supplier: string = 'Makita',
  ): Promise<INormaItem[]> {
    const activeVersion = await this.versionRepository.findActiveBySupplier(tenantId, supplier);
    if (!activeVersion) {
      return [];
    }

    const allItems = await this.itemRepository.findByVersionId(activeVersion.id);
    const lowerSearch = searchTerm.toLowerCase();

    return allItems.filter(
      (item) =>
        item.normaCode.toLowerCase().includes(lowerSearch) ||
        item.description.toLowerCase().includes(lowerSearch),
    );
  }
}
