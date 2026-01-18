/**
 * @kgc/bergep-szerviz - ServiceReturnService
 * Epic 25: Story 25-2 - Szerviz Kesz Bergep Visszaall
 */

import { Injectable } from '@nestjs/common';
import {
  IEquipment,
  IWorksheet,
  IServiceDispatch,
  IServiceReturn,
  EquipmentStatus,
  WorksheetStatus,
} from '../interfaces/bergep-szerviz.interface';
import { ReturnFromServiceDto, ReturnFromServiceSchema } from '../dto/bergep-szerviz.dto';
import {
  IEquipmentRepository,
  IWorksheetRepository,
  IServiceDispatchRepository,
  IAuditService,
} from './equipment-dispatch.service';

export interface INotificationService {
  notify(params: {
    tenantId: string;
    type: string;
    recipientId?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class ServiceReturnService {
  constructor(
    private readonly equipmentRepository: IEquipmentRepository,
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly dispatchRepository: IServiceDispatchRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
  ) {}

  async returnFromService(
    input: ReturnFromServiceDto,
    tenantId: string,
    userId: string,
  ): Promise<IServiceReturn> {
    const validationResult = ReturnFromServiceSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Get dispatch
    const dispatch = await this.dispatchRepository.findById(validInput.dispatchId);
    if (!dispatch) {
      throw new Error('Service dispatch not found');
    }
    if (dispatch.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (dispatch.returnedAt) {
      throw new Error('Equipment already returned from service');
    }

    // Get equipment
    const equipment = await this.equipmentRepository.findById(dispatch.equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    if (equipment.status !== EquipmentStatus.IN_SERVICE) {
      throw new Error('Equipment is not in service status');
    }

    // Get worksheet and verify it's completed
    const worksheet = await this.worksheetRepository.findById(dispatch.worksheetId);
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }
    if (
      worksheet.status !== WorksheetStatus.COMPLETED &&
      worksheet.status !== WorksheetStatus.DELIVERED
    ) {
      throw new Error('Worksheet must be completed before returning equipment');
    }

    // Determine new status
    const newStatus = validInput.restoreToStatus as EquipmentStatus;

    // Update dispatch record
    await this.dispatchRepository.update(validInput.dispatchId, {
      returnedAt: new Date(),
      returnedBy: userId,
    });

    // Update equipment status
    await this.equipmentRepository.update(dispatch.equipmentId, {
      status: newStatus,
    });

    // Send notification
    await this.notificationService.notify({
      tenantId,
      type: 'EQUIPMENT_RETURNED_FROM_SERVICE',
      message: `Bérgép ${equipment.equipmentCode} visszaérkezett a szervizből`,
      metadata: {
        equipmentId: equipment.id,
        equipmentCode: equipment.equipmentCode,
        worksheetNumber: worksheet.worksheetNumber,
        newStatus,
      },
    });

    await this.auditService.log({
      action: 'equipment_returned_from_service',
      entityType: 'equipment',
      entityId: dispatch.equipmentId,
      userId,
      tenantId,
      metadata: {
        dispatchId: validInput.dispatchId,
        worksheetId: dispatch.worksheetId,
        previousStatus: EquipmentStatus.IN_SERVICE,
        newStatus,
        serviceNotes: validInput.serviceNotes,
      },
    });

    return {
      dispatchId: validInput.dispatchId,
      worksheetId: dispatch.worksheetId,
      equipmentId: dispatch.equipmentId,
      newStatus,
      returnedAt: new Date(),
      returnedBy: userId,
      serviceNotes: validInput.serviceNotes,
    };
  }

  async autoCompleteOnWorksheetDone(
    worksheetId: string,
    tenantId: string,
    userId: string,
  ): Promise<IServiceReturn | null> {
    // Get worksheet
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      return null;
    }
    if (worksheet.tenantId !== tenantId) {
      return null;
    }

    // Check if worksheet has linked equipment via dispatch
    if (!worksheet.equipmentId) {
      return null;
    }

    // Find active dispatch for this worksheet's equipment
    const activeDispatch = await this.dispatchRepository.findActiveByEquipmentId(
      worksheet.equipmentId,
    );
    if (!activeDispatch || activeDispatch.worksheetId !== worksheetId) {
      return null;
    }

    // Auto-return with AVAILABLE status
    return this.returnFromService(
      {
        dispatchId: activeDispatch.id,
        restoreToStatus: 'AVAILABLE',
        serviceNotes: 'Automatikus visszavétel munkalap lezárásakor',
      },
      tenantId,
      userId,
    );
  }
}
