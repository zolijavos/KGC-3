/**
 * @kgc/bergep-szerviz - EquipmentDispatchService
 * Epic 25: Story 25-1 - Bergep Szervizbe Kuldes Automatizalas
 */

import { Injectable } from '@nestjs/common';
import {
  IEquipment,
  IWorksheet,
  IServiceDispatch,
  EquipmentStatus,
  WorksheetStatus,
  ServiceDispatchReason,
} from '../interfaces/bergep-szerviz.interface';
import { DispatchToServiceDto, DispatchToServiceSchema } from '../dto/bergep-szerviz.dto';

export interface IEquipmentRepository {
  findById(id: string): Promise<IEquipment | null>;
  update(id: string, data: Partial<IEquipment>): Promise<IEquipment>;
}

export interface IWorksheetRepository {
  create(data: Partial<IWorksheet>): Promise<IWorksheet>;
  findById(id: string): Promise<IWorksheet | null>;
  getNextNumber(tenantId: string): Promise<string>;
}

export interface IServiceDispatchRepository {
  create(data: Partial<IServiceDispatch>): Promise<IServiceDispatch>;
  findById(id: string): Promise<IServiceDispatch | null>;
  findByEquipmentId(equipmentId: string): Promise<IServiceDispatch[]>;
  findActiveByEquipmentId(equipmentId: string): Promise<IServiceDispatch | null>;
  update(id: string, data: Partial<IServiceDispatch>): Promise<IServiceDispatch>;
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
export class EquipmentDispatchService {
  constructor(
    private readonly equipmentRepository: IEquipmentRepository,
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly dispatchRepository: IServiceDispatchRepository,
    private readonly auditService: IAuditService,
  ) {}

  async dispatchToService(
    input: DispatchToServiceDto,
    tenantId: string,
    userId: string,
  ): Promise<{ dispatch: IServiceDispatch; worksheet: IWorksheet }> {
    const validationResult = DispatchToServiceSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Get equipment
    const equipment = await this.equipmentRepository.findById(validInput.equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    if (equipment.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    // Check if equipment can be dispatched
    if (equipment.status === EquipmentStatus.RENTED) {
      throw new Error('Cannot dispatch rented equipment to service');
    }
    if (equipment.status === EquipmentStatus.IN_SERVICE) {
      throw new Error('Equipment is already in service');
    }
    if (equipment.status === EquipmentStatus.RETIRED) {
      throw new Error('Cannot dispatch retired equipment');
    }

    // Check for active dispatch
    const activeDispatch = await this.dispatchRepository.findActiveByEquipmentId(
      validInput.equipmentId,
    );
    if (activeDispatch) {
      throw new Error('Equipment has an active service dispatch');
    }

    // Store previous status for restoration
    const previousStatus = equipment.status;

    // Create worksheet
    const worksheetNumber = await this.worksheetRepository.getNextNumber(tenantId);
    const worksheet = await this.worksheetRepository.create({
      tenantId,
      worksheetNumber,
      equipmentId: validInput.equipmentId,
      status: WorksheetStatus.WAITING,
      isWarranty: validInput.isWarranty,
    });

    // Create dispatch record
    const dispatch = await this.dispatchRepository.create({
      tenantId,
      equipmentId: validInput.equipmentId,
      worksheetId: worksheet.id,
      reason: validInput.reason as ServiceDispatchReason,
      previousStatus,
      dispatchedAt: new Date(),
      dispatchedBy: userId,
      notes: validInput.notes,
    });

    // Update equipment status
    await this.equipmentRepository.update(validInput.equipmentId, {
      status: EquipmentStatus.IN_SERVICE,
      lastServiceDate: new Date(),
    });

    await this.auditService.log({
      action: 'equipment_dispatched_to_service',
      entityType: 'equipment',
      entityId: validInput.equipmentId,
      userId,
      tenantId,
      metadata: {
        worksheetId: worksheet.id,
        worksheetNumber,
        reason: validInput.reason,
        previousStatus,
      },
    });

    return { dispatch, worksheet };
  }

  async getActiveDispatch(
    equipmentId: string,
    tenantId: string,
  ): Promise<IServiceDispatch | null> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    if (equipment.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    return this.dispatchRepository.findActiveByEquipmentId(equipmentId);
  }

  async getDispatchHistory(
    equipmentId: string,
    tenantId: string,
  ): Promise<IServiceDispatch[]> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    if (equipment.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    return this.dispatchRepository.findByEquipmentId(equipmentId);
  }
}
