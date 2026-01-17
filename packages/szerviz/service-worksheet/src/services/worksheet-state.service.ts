/**
 * @kgc/service-worksheet - WorksheetStateService
 * Story 17-2: Munkalap statusz workflow
 *
 * TDD GREEN PHASE - State machine implementation
 *
 * State transitions:
 * FELVEVE -> FOLYAMATBAN, VARHATO, TOROLVE
 * FOLYAMATBAN -> KESZ, VARHATO
 * VARHATO -> FOLYAMATBAN
 * KESZ -> SZAMLAZANDO
 * SZAMLAZANDO -> LEZART
 * LEZART -> (terminal)
 * TOROLVE -> (terminal)
 */

import { Injectable } from '@nestjs/common';
import { WorksheetStatus, IWorksheet } from '../interfaces/worksheet.interface';
import { IWorksheetRepository, IAuditService } from './worksheet.service';

/**
 * Valid state transitions map
 */
const STATE_TRANSITIONS: Record<WorksheetStatus, WorksheetStatus[]> = {
  [WorksheetStatus.FELVEVE]: [
    WorksheetStatus.FOLYAMATBAN,
    WorksheetStatus.VARHATO,
    WorksheetStatus.TOROLVE,
  ],
  [WorksheetStatus.FOLYAMATBAN]: [WorksheetStatus.KESZ, WorksheetStatus.VARHATO],
  [WorksheetStatus.VARHATO]: [WorksheetStatus.FOLYAMATBAN],
  [WorksheetStatus.KESZ]: [WorksheetStatus.SZAMLAZANDO],
  [WorksheetStatus.SZAMLAZANDO]: [WorksheetStatus.LEZART],
  [WorksheetStatus.LEZART]: [], // Terminal state
  [WorksheetStatus.TOROLVE]: [], // Terminal state
};

/**
 * State Machine Service - Munkalap status transitions
 */
@Injectable()
export class WorksheetStateService {
  constructor(
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Transition worksheet to a new status
   *
   * @param worksheetId - Worksheet ID
   * @param toStatus - Target status
   * @param tenantId - Tenant ID
   * @param userId - User performing the transition
   * @param metadata - Optional metadata for audit
   * @returns Updated worksheet
   */
  async transition(
    worksheetId: string,
    toStatus: WorksheetStatus,
    tenantId: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<IWorksheet> {
    // Find worksheet
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }

    // Tenant isolation
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Validate transition
    if (!this.isValidTransition(worksheet.status, toStatus)) {
      throw new Error('Ervenytelen statuszatmenet');
    }

    const fromStatus = worksheet.status;

    // Prepare update data
    const updateData: Partial<IWorksheet> = {
      status: toStatus,
      updatedAt: new Date(),
    };

    // Set completedAt for KESZ status
    if (toStatus === WorksheetStatus.KESZ) {
      updateData.completedAt = new Date();
    }

    // Update worksheet
    const updatedWorksheet = await this.worksheetRepository.update(worksheetId, updateData);

    // Audit log
    await this.auditService.log({
      action: 'worksheet_status_changed',
      entityType: 'worksheet',
      entityId: worksheetId,
      userId,
      tenantId,
      metadata: {
        fromStatus,
        toStatus,
        ...metadata,
      },
    });

    return updatedWorksheet;
  }

  /**
   * Check if a transition is valid
   *
   * @param fromStatus - Current status
   * @param toStatus - Target status
   * @returns True if transition is valid
   */
  isValidTransition(fromStatus: WorksheetStatus, toStatus: WorksheetStatus): boolean {
    const validTargets = STATE_TRANSITIONS[fromStatus] ?? [];
    return validTargets.includes(toStatus);
  }

  /**
   * Get valid next statuses for current status
   *
   * @param currentStatus - Current worksheet status
   * @returns Array of valid next statuses
   */
  getNextStatuses(currentStatus: WorksheetStatus): WorksheetStatus[] {
    return STATE_TRANSITIONS[currentStatus] ?? [];
  }

  /**
   * Start work on worksheet (FELVEVE/VARHATO -> FOLYAMATBAN)
   */
  async startWork(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet> {
    return this.transition(worksheetId, WorksheetStatus.FOLYAMATBAN, tenantId, userId);
  }

  /**
   * Mark worksheet as waiting (-> VARHATO)
   */
  async markWaiting(
    worksheetId: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<IWorksheet> {
    return this.transition(worksheetId, WorksheetStatus.VARHATO, tenantId, userId, {
      waitingReason: reason,
    });
  }

  /**
   * Complete work on worksheet (FOLYAMATBAN -> KESZ)
   */
  async completeWork(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet> {
    return this.transition(worksheetId, WorksheetStatus.KESZ, tenantId, userId);
  }

  /**
   * Mark worksheet for invoicing (KESZ -> SZAMLAZANDO)
   */
  async markForInvoicing(
    worksheetId: string,
    tenantId: string,
    userId: string,
  ): Promise<IWorksheet> {
    return this.transition(worksheetId, WorksheetStatus.SZAMLAZANDO, tenantId, userId);
  }

  /**
   * Close worksheet (SZAMLAZANDO -> LEZART)
   */
  async close(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet> {
    return this.transition(worksheetId, WorksheetStatus.LEZART, tenantId, userId);
  }
}
