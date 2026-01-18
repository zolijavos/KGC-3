/**
 * @kgc/service-warranty - Warranty Claim Service
 * Epic 19: Warranty Claims - Story 19.2, 19.3, 19.4
 *
 * Garanciális igény kezelés szolgáltatás
 * TDD: Red-Green-Refactor cycle szerint implementálva
 */

import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  IWarrantyClaim,
  IWarrantyClaimRepository,
  ICreateWarrantyClaimInput,
  IUpdateClaimStatusInput,
  ISettleClaimInput,
  IWarrantyClaimSummary,
} from '../interfaces/warranty-claim.interface';
import {
  WarrantyClaimStatus,
  WarrantySupplier,
} from '../interfaces/warranty-claim.interface';

export const WARRANTY_CLAIM_REPOSITORY = 'WARRANTY_CLAIM_REPOSITORY';

/**
 * Audit Service interfész
 */
export interface IAuditService {
  log(tenantId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>): Promise<void>;
}

export const AUDIT_SERVICE = 'AUDIT_SERVICE';

/**
 * Worksheet Service interfész (munkalap módosítás)
 */
export interface IWorksheetService {
  markAsWarranty(tenantId: string, worksheetId: string): Promise<void>;
  clearCosts(tenantId: string, worksheetId: string): Promise<void>;
}

export const WORKSHEET_SERVICE = 'WORKSHEET_SERVICE';

/**
 * Érvényes státusz átmenetek
 */
const VALID_STATUS_TRANSITIONS: Record<WarrantyClaimStatus, WarrantyClaimStatus[]> = {
  [WarrantyClaimStatus.PENDING]: [
    WarrantyClaimStatus.SUBMITTED,
    WarrantyClaimStatus.CANCELLED,
  ],
  [WarrantyClaimStatus.SUBMITTED]: [
    WarrantyClaimStatus.APPROVED,
    WarrantyClaimStatus.REJECTED,
    WarrantyClaimStatus.CANCELLED,
  ],
  [WarrantyClaimStatus.APPROVED]: [
    WarrantyClaimStatus.SETTLED,
  ],
  [WarrantyClaimStatus.REJECTED]: [],
  [WarrantyClaimStatus.SETTLED]: [],
  [WarrantyClaimStatus.CANCELLED]: [],
};

/**
 * Garanciális igény kezelés szolgáltatás
 */
@Injectable()
export class WarrantyClaimService {
  constructor(
    @Inject(WARRANTY_CLAIM_REPOSITORY)
    private readonly repository: IWarrantyClaimRepository,
    @Inject(AUDIT_SERVICE)
    private readonly auditService: IAuditService,
    @Inject(WORKSHEET_SERVICE)
    private readonly worksheetService: IWorksheetService,
  ) {}

  /**
   * Új garanciális igény létrehozása
   * Story 19.2
   */
  async createClaim(
    tenantId: string,
    input: ICreateWarrantyClaimInput,
    createdBy: string,
  ): Promise<IWarrantyClaim> {
    // Validáció: garancia lejárat a jövőben
    if (input.warrantyExpiresAt < new Date()) {
      throw new BadRequestException('A garancia már lejárt, nem hozható létre igény');
    }

    // Validáció: vásárlás dátum a múltban
    if (input.purchaseDate > new Date()) {
      throw new BadRequestException('A vásárlás dátuma nem lehet a jövőben');
    }

    // Igény létrehozása
    const claim = await this.repository.create(tenantId, input, createdBy);

    // Munkalap jelölése garanciálisként
    await this.worksheetService.markAsWarranty(tenantId, input.worksheetId);

    // Audit log
    await this.auditService.log(
      tenantId,
      'WARRANTY_CLAIM_CREATED',
      'warranty_claim',
      claim.id,
      {
        worksheetId: input.worksheetId,
        supplier: input.supplier,
        claimedAmount: input.claimedAmount,
      },
    );

    return claim;
  }

  /**
   * Igény lekérése ID alapján
   */
  async getClaimById(tenantId: string, claimId: string): Promise<IWarrantyClaim> {
    const claim = await this.repository.findById(tenantId, claimId);
    if (!claim) {
      throw new NotFoundException(`Warranty claim not found: ${claimId}`);
    }
    return claim;
  }

  /**
   * Munkalaphoz tartozó igények lekérése
   */
  async getClaimsByWorksheet(tenantId: string, worksheetId: string): Promise<IWarrantyClaim[]> {
    return this.repository.findByWorksheetId(tenantId, worksheetId);
  }

  /**
   * Igények lekérése státusz alapján
   */
  async getClaimsByStatus(
    tenantId: string,
    status: WarrantyClaimStatus,
  ): Promise<IWarrantyClaim[]> {
    return this.repository.findByStatus(tenantId, status);
  }

  /**
   * Igények lekérése beszállító alapján
   */
  async getClaimsBySupplier(
    tenantId: string,
    supplier: WarrantySupplier,
  ): Promise<IWarrantyClaim[]> {
    return this.repository.findBySupplier(tenantId, supplier);
  }

  /**
   * Igény státusz frissítése
   * Story 19.3
   */
  async updateClaimStatus(
    tenantId: string,
    input: IUpdateClaimStatusInput,
    updatedBy: string,
  ): Promise<IWarrantyClaim> {
    // Aktuális claim lekérése
    const currentClaim = await this.getClaimById(tenantId, input.claimId);

    // Státusz átmenet validálás
    this.validateStatusTransition(currentClaim.status, input.status);

    // Státusz specifikus validációk
    if (input.status === WarrantyClaimStatus.APPROVED) {
      if (input.approvedAmount === undefined || input.approvedAmount <= 0) {
        throw new BadRequestException('Jóváhagyott összeg kötelező és pozitív kell legyen');
      }
    }

    // Frissítés
    const updatedClaim = await this.repository.updateStatus(tenantId, input);

    // Audit log
    await this.auditService.log(
      tenantId,
      `WARRANTY_CLAIM_STATUS_${input.status}`,
      'warranty_claim',
      input.claimId,
      {
        previousStatus: currentClaim.status,
        newStatus: input.status,
        approvedAmount: input.approvedAmount,
        supplierResponse: input.supplierResponse,
        updatedBy,
      },
    );

    return updatedClaim;
  }

  /**
   * Igény beküldése a beszállítónak
   */
  async submitClaim(
    tenantId: string,
    claimId: string,
    submittedBy: string,
  ): Promise<IWarrantyClaim> {
    return this.updateClaimStatus(
      tenantId,
      { claimId, status: WarrantyClaimStatus.SUBMITTED },
      submittedBy,
    );
  }

  /**
   * Igény jóváhagyása
   */
  async approveClaim(
    tenantId: string,
    claimId: string,
    approvedAmount: number,
    supplierResponse: string,
    supplierReference: string,
    approvedBy: string,
  ): Promise<IWarrantyClaim> {
    return this.updateClaimStatus(
      tenantId,
      {
        claimId,
        status: WarrantyClaimStatus.APPROVED,
        approvedAmount,
        supplierResponse,
        supplierReference,
      },
      approvedBy,
    );
  }

  /**
   * Igény elutasítása
   */
  async rejectClaim(
    tenantId: string,
    claimId: string,
    supplierResponse: string,
    rejectedBy: string,
  ): Promise<IWarrantyClaim> {
    return this.updateClaimStatus(
      tenantId,
      {
        claimId,
        status: WarrantyClaimStatus.REJECTED,
        supplierResponse,
      },
      rejectedBy,
    );
  }

  /**
   * Igény visszavonása
   */
  async cancelClaim(
    tenantId: string,
    claimId: string,
    cancelledBy: string,
  ): Promise<IWarrantyClaim> {
    return this.updateClaimStatus(
      tenantId,
      { claimId, status: WarrantyClaimStatus.CANCELLED },
      cancelledBy,
    );
  }

  /**
   * Igény elszámolása
   * Story 19.4
   */
  async settleClaim(
    tenantId: string,
    input: ISettleClaimInput,
    settledBy: string,
  ): Promise<IWarrantyClaim> {
    // Aktuális claim lekérése
    const currentClaim = await this.getClaimById(tenantId, input.claimId);

    // Csak jóváhagyott igény számolható el
    if (currentClaim.status !== WarrantyClaimStatus.APPROVED) {
      throw new BadRequestException(
        `Csak jóváhagyott igény számolható el. Jelenlegi státusz: ${currentClaim.status}`,
      );
    }

    // Elszámolás
    const settledClaim = await this.repository.settle(tenantId, input);

    // Munkalap költségek nullázása (ügyfélnek ingyenes)
    await this.worksheetService.clearCosts(tenantId, currentClaim.worksheetId);

    // Audit log
    await this.auditService.log(
      tenantId,
      'WARRANTY_CLAIM_SETTLED',
      'warranty_claim',
      input.claimId,
      {
        worksheetId: currentClaim.worksheetId,
        claimedAmount: currentClaim.claimedAmount,
        approvedAmount: currentClaim.approvedAmount,
        settledAmount: input.settledAmount,
        settlementNote: input.settlementNote,
        settledBy,
      },
    );

    return settledClaim;
  }

  /**
   * Összesítő riport lekérése
   */
  async getClaimSummary(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<IWarrantyClaimSummary> {
    return this.repository.getSummary(tenantId, dateFrom, dateTo);
  }

  /**
   * Függőben lévő igények lekérése (beküldésre váró)
   */
  async getPendingClaims(tenantId: string): Promise<IWarrantyClaim[]> {
    return this.repository.findByStatus(tenantId, WarrantyClaimStatus.PENDING);
  }

  /**
   * Beküldött, válaszra váró igények
   */
  async getAwaitingResponseClaims(tenantId: string): Promise<IWarrantyClaim[]> {
    return this.repository.findByStatus(tenantId, WarrantyClaimStatus.SUBMITTED);
  }

  /**
   * Elszámolásra váró igények
   */
  async getAwaitingSettlementClaims(tenantId: string): Promise<IWarrantyClaim[]> {
    return this.repository.findByStatus(tenantId, WarrantyClaimStatus.APPROVED);
  }

  /**
   * Státusz átmenet validálása
   */
  private validateStatusTransition(
    currentStatus: WarrantyClaimStatus,
    newStatus: WarrantyClaimStatus,
  ): void {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Érvénytelen státusz átmenet: ${currentStatus} → ${newStatus}. ` +
        `Megengedett átmenetek: ${allowedTransitions.join(', ') || 'nincs'}`,
      );
    }
  }
}
