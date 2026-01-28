/**
 * @kgc/service-worksheet - WorksheetRentalService
 * Story 17-6: Munkalap-bérlés kapcsolat
 *
 * Traditional approach - linkage between worksheets and rentals
 */

import { Injectable } from '@nestjs/common';
import {
  IWorksheet,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
} from '../interfaces/worksheet.interface';
import type { IAuditService, IWorksheetRepository } from './worksheet.service';

/**
 * Rental info interface (from @kgc/rental-core)
 */
export interface IRentalInfo {
  id: string;
  tenantId: string;
  partnerId: string;
  rentalNumber: string;
  deviceName: string;
  deviceSerialNumber?: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  returnedAt?: Date;
  damageNotes?: string;
}

/**
 * Rental service interface
 */
export interface IRentalService {
  findById(id: string, tenantId: string): Promise<IRentalInfo | null>;
  findByWorksheetId(worksheetId: string, tenantId: string): Promise<IRentalInfo | null>;
}

/**
 * Linked worksheet result
 */
export interface ILinkedWorksheetResult {
  worksheet: IWorksheet;
  rental: IRentalInfo | null;
}

/**
 * Worksheet-Rental Service - Bérlés és munkalap összekapcsolása
 */
@Injectable()
export class WorksheetRentalService {
  constructor(
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly rentalService: IRentalService,
    private readonly auditService: IAuditService
  ) {}

  /**
   * Link worksheet to rental
   */
  async linkToRental(
    worksheetId: string,
    rentalId: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Verify rental exists
    const rental = await this.rentalService.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Berles nem talalhato');
    }
    if (rental.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    // Update worksheet with rental link
    const updated = await this.worksheetRepository.update(worksheetId, {
      rentalId,
      type: WorksheetType.BERLESI,
    });

    await this.auditService.log({
      action: 'worksheet_linked_to_rental',
      entityType: 'worksheet',
      entityId: worksheetId,
      userId,
      tenantId,
      metadata: {
        rentalId,
        rentalNumber: rental.rentalNumber,
      },
    });

    return updated;
  }

  /**
   * Unlink worksheet from rental
   */
  async unlinkFromRental(
    worksheetId: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }
    if (!worksheet.rentalId) {
      throw new Error('Munkalap nincs berleshez kapcsolva');
    }

    const previousRentalId = worksheet.rentalId;

    // Update worksheet, remove rental link
    // Repository implementation should set rentalId to null when receiving null
    const updateData: Partial<IWorksheet> = {
      type: WorksheetType.FIZETOS, // Revert to standard paid repair
    };
    // Use null to signal "clear field" - repository converts to actual DB null
    const updated = await this.worksheetRepository.update(worksheetId, {
      ...updateData,
      rentalId: null,
    } as unknown as Partial<IWorksheet>);

    await this.auditService.log({
      action: 'worksheet_unlinked_from_rental',
      entityType: 'worksheet',
      entityId: worksheetId,
      userId,
      tenantId,
      metadata: {
        previousRentalId,
      },
    });

    return updated;
  }

  /**
   * Get worksheets by rental ID
   */
  async getWorksheetsByRental(rentalId: string, tenantId: string): Promise<IWorksheet[]> {
    // Verify rental exists
    const rental = await this.rentalService.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Berles nem talalhato');
    }

    return this.worksheetRepository.findByRentalId(rentalId, tenantId);
  }

  /**
   * Get worksheet with rental info
   */
  async getWorksheetWithRental(
    worksheetId: string,
    tenantId: string
  ): Promise<ILinkedWorksheetResult> {
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    let rental: IRentalInfo | null = null;
    if (worksheet.rentalId) {
      rental = await this.rentalService.findById(worksheet.rentalId, tenantId);
    }

    return { worksheet, rental };
  }

  /**
   * Create worksheet from rental damage report
   * Used when returning a rental with damage
   */
  async createFromRentalDamage(
    rentalId: string,
    damageDescription: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    // Get rental info
    const rental = await this.rentalService.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Berles nem talalhato');
    }
    if (rental.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    if (!damageDescription || damageDescription.length < 5) {
      throw new Error('Karmeghatározás minimum 5 karakter');
    }

    // Create worksheet with rental data
    const worksheet = await this.worksheetRepository.create({
      tenantId,
      worksheetNumber: '', // Will be generated by service
      type: WorksheetType.BERLESI,
      status: WorksheetStatus.FELVEVE,
      priority: WorksheetPriority.NORMAL,
      partnerId: rental.partnerId,
      deviceName: rental.deviceName,
      ...(rental.deviceSerialNumber !== undefined && {
        deviceSerialNumber: rental.deviceSerialNumber,
      }),
      faultDescription: damageDescription,
      internalNote: `Bérlésből származó sérülés. Bérlés szám: ${rental.rentalNumber}`,
      rentalId,
      receivedAt: new Date(),
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditService.log({
      action: 'worksheet_created_from_rental',
      entityType: 'worksheet',
      entityId: worksheet.id,
      userId,
      tenantId,
      metadata: {
        rentalId,
        rentalNumber: rental.rentalNumber,
        damageDescription,
      },
    });

    return worksheet;
  }

  /**
   * Check if rental has any open worksheets
   */
  async hasOpenWorksheets(rentalId: string, tenantId: string): Promise<boolean> {
    const worksheets = await this.getWorksheetsByRental(rentalId, tenantId);
    const closedStatuses = [WorksheetStatus.LEZART, WorksheetStatus.TOROLVE];
    return worksheets.some(ws => !closedStatuses.includes(ws.status));
  }
}
