/**
 * @kgc/service-worksheet - DiagnosisService
 * Story 17-3: Diagnosztika es hibaok
 *
 * Traditional testing - Code first, tests after
 */

import { Injectable } from '@nestjs/common';
import {
  CreateDiagnosisDto,
  CreateDiagnosisSchema,
  UpdateDiagnosisDto,
} from '../dto/diagnosis.dto';
import { IDiagnosis, IDiagnosisResult } from '../interfaces/diagnosis.interface';
import type { IAuditService, IWorksheetRepository } from './worksheet.service';

/**
 * Diagnosis Repository interface
 */
export interface IDiagnosisRepository {
  create(data: Partial<IDiagnosis>): Promise<IDiagnosis>;
  findById(id: string): Promise<IDiagnosis | null>;
  findByWorksheetId(worksheetId: string): Promise<IDiagnosis[]>;
  update(id: string, data: Partial<IDiagnosis>): Promise<IDiagnosis>;
  delete(id: string): Promise<void>;
}

/**
 * Diagnosis Service - Diagnosztika es hiba kezeles
 */
@Injectable()
export class DiagnosisService {
  constructor(
    private readonly diagnosisRepository: IDiagnosisRepository,
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly auditService: IAuditService
  ) {}

  /**
   * Add diagnosis to worksheet
   */
  async addDiagnosis(
    worksheetId: string,
    input: CreateDiagnosisDto,
    tenantId: string,
    userId: string
  ): Promise<IDiagnosisResult> {
    // Validate input
    const validationResult = CreateDiagnosisSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new Error(firstError?.message ?? 'Hibas input');
    }

    const validInput = validationResult.data;

    // Check worksheet exists and belongs to tenant
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }

    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Create diagnosis - only include optional properties if defined
    const createData: Partial<IDiagnosis> = {
      worksheetId,
      tenantId,
      faultCategory: validInput.faultCategory,
      description: validInput.description,
      createdBy: userId,
      createdAt: new Date(),
    };
    if (validInput.faultCode !== undefined) createData.faultCode = validInput.faultCode;
    if (validInput.customerMessage !== undefined)
      createData.customerMessage = validInput.customerMessage;
    if (validInput.repairRecommendation !== undefined)
      createData.repairRecommendation = validInput.repairRecommendation;
    if (validInput.estimatedRepairTime !== undefined)
      createData.estimatedRepairTime = validInput.estimatedRepairTime;

    const diagnosis = await this.diagnosisRepository.create(createData);

    // Update worksheet diagnosis field if empty
    let worksheetUpdated = false;
    if (!worksheet.diagnosis) {
      await this.worksheetRepository.update(worksheetId, {
        diagnosis: validInput.description,
        updatedAt: new Date(),
      });
      worksheetUpdated = true;
    }

    // Audit log
    await this.auditService.log({
      action: 'diagnosis_added',
      entityType: 'diagnosis',
      entityId: diagnosis.id,
      userId,
      tenantId,
      metadata: {
        worksheetId,
        faultCategory: validInput.faultCategory,
        faultCode: validInput.faultCode,
      },
    });

    return { diagnosis, worksheetUpdated };
  }

  /**
   * Get diagnoses for worksheet
   */
  async getDiagnosesByWorksheet(worksheetId: string, tenantId: string): Promise<IDiagnosis[]> {
    // Check worksheet exists
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }

    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    return this.diagnosisRepository.findByWorksheetId(worksheetId);
  }

  /**
   * Update diagnosis
   */
  async updateDiagnosis(
    diagnosisId: string,
    input: UpdateDiagnosisDto,
    tenantId: string,
    userId: string
  ): Promise<IDiagnosis> {
    // Find diagnosis
    const diagnosis = await this.diagnosisRepository.findById(diagnosisId);
    if (!diagnosis) {
      throw new Error('Diagnosztika nem talalhato');
    }

    if (diagnosis.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Update - filter out undefined properties
    const updateData: Partial<IDiagnosis> = {};
    if (input.description !== undefined) updateData.description = input.description;
    if (input.faultCategory !== undefined) updateData.faultCategory = input.faultCategory;
    if (input.faultCode !== undefined) updateData.faultCode = input.faultCode;
    if (input.customerMessage !== undefined) updateData.customerMessage = input.customerMessage;
    if (input.repairRecommendation !== undefined)
      updateData.repairRecommendation = input.repairRecommendation;
    if (input.estimatedRepairTime !== undefined)
      updateData.estimatedRepairTime = input.estimatedRepairTime;

    const updated = await this.diagnosisRepository.update(diagnosisId, updateData);

    // Audit log
    await this.auditService.log({
      action: 'diagnosis_updated',
      entityType: 'diagnosis',
      entityId: diagnosisId,
      userId,
      tenantId,
      metadata: {
        changes: Object.keys(input),
      },
    });

    return updated;
  }

  /**
   * Delete diagnosis
   */
  async deleteDiagnosis(diagnosisId: string, tenantId: string, userId: string): Promise<void> {
    // Find diagnosis
    const diagnosis = await this.diagnosisRepository.findById(diagnosisId);
    if (!diagnosis) {
      throw new Error('Diagnosztika nem talalhato');
    }

    if (diagnosis.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    await this.diagnosisRepository.delete(diagnosisId);

    // Audit log
    await this.auditService.log({
      action: 'diagnosis_deleted',
      entityType: 'diagnosis',
      entityId: diagnosisId,
      userId,
      tenantId,
      metadata: {
        worksheetId: diagnosis.worksheetId,
        faultCategory: diagnosis.faultCategory,
      },
    });
  }
}
