/**
 * @kgc/service-worksheet - WorksheetService
 * Story 17-1: Munkalap CRUD
 *
 * TDD GREEN PHASE - Implementation to pass tests
 */

import { Injectable } from '@nestjs/common';
import {
  CreateWorksheetDto,
  CreateWorksheetSchema,
  UpdateWorksheetDto,
  UpdateWorksheetSchema,
  WorksheetFilterDto,
} from '../dto/worksheet.dto';
import {
  IWorksheet,
  IWorksheetNumberResult,
  WorksheetPriority,
  WorksheetStatus,
} from '../interfaces/worksheet.interface';

/**
 * Priority ranking (lower = higher priority)
 */
const PRIORITY_RANK: Record<WorksheetPriority, number> = {
  [WorksheetPriority.SURGOS]: 1,
  [WorksheetPriority.FELARAS]: 2,
  [WorksheetPriority.GARANCIALIS]: 3,
  [WorksheetPriority.FRANCHISE]: 4,
  [WorksheetPriority.NORMAL]: 5,
};

/**
 * Repository interface for Worksheet entity
 */
export interface IWorksheetRepository {
  create(data: Partial<IWorksheet>): Promise<IWorksheet>;
  findById(id: string): Promise<IWorksheet | null>;
  findAll(tenantId: string, filter: Partial<WorksheetFilterDto>): Promise<IWorksheet[]>;
  findByRentalId(rentalId: string, tenantId: string): Promise<IWorksheet[]>;
  findByStatus(statuses: WorksheetStatus[], tenantId: string): Promise<IWorksheet[]>;
  update(id: string, data: Partial<IWorksheet>): Promise<IWorksheet>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
  countByTenant(tenantId: string, filter?: Partial<WorksheetFilterDto>): Promise<number>;
}

/**
 * Partner service interface
 */
export interface IPartnerService {
  findById(id: string): Promise<{ id: string; tenantId: string; name?: string } | null>;
  isContractedPartner(partnerId: string, tenantId: string): Promise<boolean>;
}

/**
 * Audit service interface
 */
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

/**
 * Paginated result interface
 */
export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Worksheet Service - Munkalap CRUD operations
 */
@Injectable()
export class WorksheetService {
  constructor(
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly partnerService: IPartnerService,
    private readonly auditService: IAuditService
  ) {}

  /**
   * Create a new worksheet
   *
   * @param input - CreateWorksheetDto
   * @param tenantId - Tenant ID
   * @param userId - Creating user ID
   * @returns Created worksheet
   */
  async create(input: CreateWorksheetDto, tenantId: string, userId: string): Promise<IWorksheet> {
    // Validate input with Zod
    const validationResult = CreateWorksheetSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new Error(firstError?.message ?? 'Hibas input');
    }

    const validInput = validationResult.data;

    // Check partner exists
    const partner = await this.partnerService.findById(validInput.partnerId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    // Tenant isolation check
    if (partner.tenantId !== tenantId) {
      throw new Error('Hozzáférés megtagadva');
    }

    // Determine priority (FR93 - contracted partner auto-priority)
    let priority = validInput.priority ?? WorksheetPriority.NORMAL;
    const isContracted = await this.partnerService.isContractedPartner(
      validInput.partnerId,
      tenantId
    );

    if (isContracted) {
      // Auto-set to FRANCHISE unless user specified higher priority
      const userPriorityRank = PRIORITY_RANK[priority];
      const franchiseRank = PRIORITY_RANK[WorksheetPriority.FRANCHISE];

      if (userPriorityRank > franchiseRank) {
        priority = WorksheetPriority.FRANCHISE;
      }
    }

    // Generate worksheet number
    const numberResult = await this.generateWorksheetNumber(tenantId);

    const now = new Date();

    // Build create data - only include defined optional properties
    const createData: Partial<IWorksheet> = {
      tenantId,
      worksheetNumber: numberResult.worksheetNumber,
      type: validInput.type,
      status: WorksheetStatus.FELVEVE,
      priority,
      partnerId: validInput.partnerId,
      deviceName: validInput.deviceName,
      faultDescription: validInput.faultDescription,
      receivedAt: now,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    // Add optional properties only if defined (exactOptionalPropertyTypes compliance)
    if (validInput.deviceSerialNumber !== undefined) {
      createData.deviceSerialNumber = validInput.deviceSerialNumber;
    }
    if (validInput.internalNote !== undefined) {
      createData.internalNote = validInput.internalNote;
    }
    if (validInput.assignedToId !== undefined) {
      createData.assignedToId = validInput.assignedToId;
    }
    if (validInput.costLimit !== undefined) {
      createData.costLimit = validInput.costLimit;
    }
    if (validInput.estimatedCompletionDate !== undefined) {
      createData.estimatedCompletionDate = validInput.estimatedCompletionDate;
    }
    if (validInput.rentalId !== undefined) {
      createData.rentalId = validInput.rentalId;
    }

    // Create worksheet
    const worksheet = await this.worksheetRepository.create(createData);

    // Audit log
    await this.auditService.log({
      action: 'worksheet_created',
      entityType: 'worksheet',
      entityId: worksheet.id,
      userId,
      tenantId,
      metadata: {
        worksheetNumber: worksheet.worksheetNumber,
        type: worksheet.type,
        priority: worksheet.priority,
        partnerId: worksheet.partnerId,
        deviceName: worksheet.deviceName,
      },
    });

    return worksheet;
  }

  /**
   * Find worksheet by ID with tenant isolation
   *
   * @param id - Worksheet ID
   * @param tenantId - Tenant ID
   * @returns Worksheet or null
   */
  async findById(id: string, tenantId: string): Promise<IWorksheet | null> {
    const worksheet = await this.worksheetRepository.findById(id);

    if (!worksheet) {
      return null;
    }

    // Tenant isolation check
    if (worksheet.tenantId !== tenantId) {
      return null;
    }

    return worksheet;
  }

  /**
   * Find all worksheets with filters and pagination
   *
   * @param tenantId - Tenant ID
   * @param filter - Filter options
   * @returns Paginated result
   */
  async findAll(
    tenantId: string,
    filter: Partial<WorksheetFilterDto>
  ): Promise<IPaginatedResult<IWorksheet>> {
    const items = await this.worksheetRepository.findAll(tenantId, filter);
    const total = await this.worksheetRepository.countByTenant(tenantId, filter);

    return {
      items,
      total,
      limit: filter.limit ?? 20,
      offset: filter.offset ?? 0,
    };
  }

  /**
   * Update worksheet
   *
   * @param id - Worksheet ID
   * @param input - UpdateWorksheetDto
   * @param tenantId - Tenant ID
   * @param userId - Updating user ID
   * @returns Updated worksheet
   */
  async update(
    id: string,
    input: UpdateWorksheetDto,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    // Validate input with Zod
    const validationResult = UpdateWorksheetSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new Error(firstError?.message ?? 'Hibas input');
    }

    const validInput = validationResult.data;

    // Find worksheet
    const worksheet = await this.worksheetRepository.findById(id);
    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    // Tenant isolation check
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzáférés megtagadva');
    }

    // Check if worksheet is closed
    if (worksheet.status === WorksheetStatus.LEZART) {
      throw new Error('Lezárt munkalap nem módosítható');
    }

    // Build update data - only include defined properties (exactOptionalPropertyTypes compliance)
    const updateData: Partial<IWorksheet> = {
      updatedAt: new Date(),
    };

    if (validInput.priority !== undefined) {
      updateData.priority = validInput.priority;
    }
    if (validInput.deviceName !== undefined) {
      updateData.deviceName = validInput.deviceName;
    }
    if (validInput.deviceSerialNumber !== undefined) {
      updateData.deviceSerialNumber = validInput.deviceSerialNumber;
    }
    if (validInput.faultDescription !== undefined) {
      updateData.faultDescription = validInput.faultDescription;
    }
    if (validInput.diagnosis !== undefined) {
      updateData.diagnosis = validInput.diagnosis;
    }
    if (validInput.workPerformed !== undefined) {
      updateData.workPerformed = validInput.workPerformed;
    }
    if (validInput.internalNote !== undefined) {
      updateData.internalNote = validInput.internalNote;
    }
    // Handle nullable fields - only set if not null (exactOptionalPropertyTypes compliance)
    if (validInput.assignedToId !== undefined && validInput.assignedToId !== null) {
      updateData.assignedToId = validInput.assignedToId;
    }
    if (validInput.costLimit !== undefined && validInput.costLimit !== null) {
      updateData.costLimit = validInput.costLimit;
    }
    if (
      validInput.estimatedCompletionDate !== undefined &&
      validInput.estimatedCompletionDate !== null
    ) {
      updateData.estimatedCompletionDate = validInput.estimatedCompletionDate;
    }

    // Update worksheet
    const updatedWorksheet = await this.worksheetRepository.update(id, updateData);

    // Audit log
    await this.auditService.log({
      action: 'worksheet_updated',
      entityType: 'worksheet',
      entityId: id,
      userId,
      tenantId,
      metadata: {
        changes: Object.keys(validInput),
        previousStatus: worksheet.status,
      },
    });

    return updatedWorksheet;
  }

  /**
   * Soft delete worksheet (set status to TOROLVE)
   *
   * @param id - Worksheet ID
   * @param tenantId - Tenant ID
   * @param userId - Deleting user ID
   * @returns Deleted worksheet
   */
  async delete(id: string, tenantId: string, userId: string): Promise<IWorksheet> {
    // Find worksheet
    const worksheet = await this.worksheetRepository.findById(id);
    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    // Tenant isolation check
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzáférés megtagadva');
    }

    // Only allow delete from FELVEVE status
    if (worksheet.status !== WorksheetStatus.FELVEVE) {
      throw new Error('Csak felvett munkalap törölhető');
    }

    // Soft delete by setting status to TOROLVE
    const deletedWorksheet = await this.worksheetRepository.update(id, {
      status: WorksheetStatus.TOROLVE,
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'worksheet_deleted',
      entityType: 'worksheet',
      entityId: id,
      userId,
      tenantId,
      metadata: {
        worksheetNumber: worksheet.worksheetNumber,
        previousStatus: worksheet.status,
      },
    });

    return deletedWorksheet;
  }

  /**
   * Generate worksheet number in ML-YYYY-NNNN format
   *
   * @param tenantId - Tenant ID
   * @returns Worksheet number result
   */
  async generateWorksheetNumber(tenantId: string): Promise<IWorksheetNumberResult> {
    const year = new Date().getFullYear();
    const sequence = await this.worksheetRepository.getNextSequence(tenantId, year);

    // Pad to 4 digits, but allow more if > 9999
    const paddedSequence = sequence.toString().padStart(4, '0');
    const worksheetNumber = `ML-${year}-${paddedSequence}`;

    return {
      worksheetNumber,
      year,
      sequence,
    };
  }
}
