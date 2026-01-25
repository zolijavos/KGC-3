/**
 * Prisma Warranty Claim Repository
 * Implements IWarrantyClaimRepository for PostgreSQL persistence
 * Epic 19: Garanciális megkülönböztetés
 * ADR-041: Garanciális Igény Kezelés Architektúra
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  ClaimItem as PrismaClaimItem,
  ClaimStatus as PrismaClaimStatus,
  PrismaClient,
  WarrantyClaim as PrismaWarrantyClaim,
} from '@prisma/client';

// ============================================
// LOCAL INTERFACE DEFINITIONS
// (Aligned with @kgc/service-warranty interfaces)
// ============================================

/**
 * Warranty Claim státuszok - State machine
 *
 * Átmenetek:
 * PENDING → SUBMITTED → APPROVED | REJECTED
 *         ↘ CANCELLED (bármikor PENDING-ből)
 */
export enum WarrantyClaimStatus {
  /** Függőben - Még nem küldték be a beszállítónak */
  PENDING = 'PENDING',
  /** Beküldve - Beszállítónak elküldve */
  SUBMITTED = 'SUBMITTED',
  /** Elbírálás alatt */
  UNDER_REVIEW = 'UNDER_REVIEW',
  /** Jóváhagyva - Beszállító elfogadta */
  APPROVED = 'APPROVED',
  /** Elutasítva - Beszállító elutasította */
  REJECTED = 'REJECTED',
  /** Feldolgozás alatt */
  PROCESSING = 'PROCESSING',
  /** Elszámolva - Pénzügyileg rendezve */
  SETTLED = 'SETTLED',
  /** Visszavonva */
  CANCELLED = 'CANCELLED',
}

/**
 * Beszállító típusok (gyártók)
 */
export enum WarrantySupplier {
  MAKITA = 'MAKITA',
  STIHL = 'STIHL',
  HUSQVARNA = 'HUSQVARNA',
  BOSCH = 'BOSCH',
  DEWALT = 'DEWALT',
  MILWAUKEE = 'MILWAUKEE',
  HIKOKI = 'HIKOKI',
  OTHER = 'OTHER',
}

/**
 * Garancia típusok
 */
export enum WarrantyType {
  /** Gyártói garancia (standard) */
  MANUFACTURER = 'MANUFACTURER',
  /** Kiterjesztett garancia */
  EXTENDED = 'EXTENDED',
  /** Bolti garancia (saját) */
  STORE = 'STORE',
}

/**
 * Claim tétel típusok
 */
export enum ClaimItemType {
  PART = 'PART',
  LABOR = 'LABOR',
}

/**
 * Warranty Claim entitás
 */
export interface IWarrantyClaim {
  /** Egyedi azonosító (UUID) */
  id: string;
  /** Tenant azonosító (multi-tenancy) */
  tenantId: string;
  /** Claim szám (WC-YYYY-NNNN) */
  claimNumber: string;
  /** Aktuális státusz */
  status: WarrantyClaimStatus;
  /** Beszállító/Gyártó */
  manufacturer: string;
  /** Gép sorozatszám */
  serialNumber: string;
  /** Gép megnevezés */
  productName: string;
  /** Vásárlás dátuma */
  purchaseDate: Date;
  /** Garancia lejárat */
  warrantyEnd: Date;
  /** Hiba leírás */
  issueDescription: string;
  /** Diagnózis eredmény */
  diagnosisResult?: string;
  /** Norma munka percek */
  normLaborMinutes?: number;
  /** Norma óradíj */
  normLaborRate?: number;
  /** Alkatrész érték */
  partsValue?: number;
  /** Teljes igényelt összeg */
  totalClaimValue?: number;
  /** Beküldés dátuma */
  submittedAt?: Date;
  /** Beküldő user ID */
  submittedBy?: string;
  /** Gyártói referencia szám */
  manufacturerRef?: string;
  /** Elbírálás dátuma */
  reviewedAt?: Date;
  /** Jóváhagyás dátuma */
  approvedAt?: Date;
  /** Elutasítás dátuma */
  rejectedAt?: Date;
  /** Elutasítás oka */
  rejectionReason?: string;
  /** Elszámolás dátuma */
  settledAt?: Date;
  /** Elszámolt összeg */
  settledAmount?: number;
  /** Jóváírás szám */
  creditNoteNumber?: string;
  /** Megjegyzések */
  notes?: string;
  /** Létrehozó user ID */
  createdBy: string;
  /** Módosító user ID */
  updatedBy: string;
  /** Létrehozás dátum */
  createdAt: Date;
  /** Módosítás dátum */
  updatedAt: Date;
  /** Kapcsolódó tételek */
  items?: IClaimItem[];
}

/**
 * Claim tétel entitás
 */
export interface IClaimItem {
  id: string;
  claimId: string;
  itemType: ClaimItemType;
  partNumber?: string;
  description: string;
  quantity: number;
  normMinutes?: number;
  unitValue: number;
  totalValue: number;
  createdAt: Date;
}

/**
 * Claim létrehozás input
 */
export interface ICreateWarrantyClaimInput {
  manufacturer: string;
  serialNumber: string;
  productName: string;
  purchaseDate: Date;
  warrantyEnd: Date;
  issueDescription: string;
  diagnosisResult?: string;
  normLaborMinutes?: number;
  normLaborRate?: number;
  notes?: string;
  items?: ICreateClaimItemInput[];
}

/**
 * Claim tétel létrehozás input
 */
export interface ICreateClaimItemInput {
  itemType: ClaimItemType;
  partNumber?: string;
  description: string;
  quantity: number;
  normMinutes?: number;
  unitValue: number;
}

/**
 * Claim frissítés input
 */
export interface IUpdateWarrantyClaimInput {
  issueDescription?: string;
  diagnosisResult?: string;
  normLaborMinutes?: number;
  normLaborRate?: number;
  notes?: string;
}

/**
 * Claim státusz frissítés input
 */
export interface IUpdateClaimStatusInput {
  status: WarrantyClaimStatus;
  manufacturerRef?: string;
  rejectionReason?: string;
  settledAmount?: number;
  creditNoteNumber?: string;
}

/**
 * Claim szűrés DTO
 */
export interface WarrantyClaimFilterDto {
  status?: WarrantyClaimStatus;
  manufacturer?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Claim összesítő (riport)
 */
export interface IWarrantyClaimSummary {
  totalClaims: number;
  byStatus: Record<WarrantyClaimStatus, number>;
  byManufacturer: Record<
    string,
    {
      count: number;
      totalClaimValue: number;
      totalSettledAmount: number;
    }
  >;
  totalClaimValue: number;
  totalSettledAmount: number;
}

/**
 * Repository interfész
 */
/**
 * Worksheet reference for warranty claim (Epic 19-2)
 */
export interface ILinkedWorksheet {
  worksheetId: string;
  worksheetNumber: string;
  linkedAt: Date;
}

/**
 * Status timeline entry (Epic 19-3)
 */
export interface IStatusTimelineEntry {
  status: WarrantyClaimStatus;
  timestamp: Date;
  description: string;
}

/**
 * Processing time statistics (Epic 19-3)
 */
export interface IProcessingTimeStats {
  totalClaims: number;
  averageDaysToSubmit: number;
  averageDaysToApprove: number;
  averageDaysToSettle: number;
  totalAverageDays: number;
}

/**
 * Settlement summary (Epic 19-4)
 */
export interface ISettlementSummary {
  totalClaims: number;
  totalClaimedAmount: number;
  totalSettledAmount: number;
  differenceAmount: number;
  byManufacturer: Record<string, { claims: number; amount: number }>;
}

/**
 * Bulk settle result (Epic 19-4)
 */
export interface IBulkSettleResult {
  successful: number;
  failed: number;
  errors: Array<{ claimId: string; error: string }>;
}

export interface IWarrantyClaimRepository {
  create(
    tenantId: string,
    input: ICreateWarrantyClaimInput,
    createdBy: string
  ): Promise<IWarrantyClaim>;
  findById(id: string, tenantId?: string): Promise<IWarrantyClaim | null>;
  findAll(tenantId: string, filter: Partial<WarrantyClaimFilterDto>): Promise<IWarrantyClaim[]>;
  findByStatus(tenantId: string, status: WarrantyClaimStatus): Promise<IWarrantyClaim[]>;
  findByManufacturer(tenantId: string, manufacturer: string): Promise<IWarrantyClaim[]>;
  update(
    id: string,
    tenantId: string,
    data: IUpdateWarrantyClaimInput,
    updatedBy: string
  ): Promise<IWarrantyClaim>;
  updateStatus(
    id: string,
    tenantId: string,
    input: IUpdateClaimStatusInput,
    updatedBy: string
  ): Promise<IWarrantyClaim>;
  addItem(claimId: string, tenantId: string, item: ICreateClaimItemInput): Promise<IClaimItem>;
  removeItem(itemId: string, claimId: string, tenantId: string): Promise<void>;
  softDelete(id: string, tenantId: string): Promise<void>;
  getSummary(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<IWarrantyClaimSummary>;
  generateClaimNumber(tenantId: string): Promise<string>;
  countByTenant(tenantId: string, filter?: Partial<WarrantyClaimFilterDto>): Promise<number>;
  // Worksheet integration methods (Epic 19-2)
  createFromWorksheet(
    worksheetId: string,
    tenantId: string,
    createdBy: string
  ): Promise<IWarrantyClaim>;
  linkToWorksheet(
    claimId: string,
    worksheetId: string,
    tenantId: string,
    userId: string
  ): Promise<IWarrantyClaim>;
  unlinkFromWorksheet(
    claimId: string,
    worksheetId: string,
    tenantId: string,
    userId: string
  ): Promise<IWarrantyClaim>;
  getLinkedWorksheets(claimId: string, tenantId: string): Promise<ILinkedWorksheet[]>;
  // Status tracking methods (Epic 19-3)
  getStatusTimeline(claimId: string, tenantId: string): Promise<IStatusTimelineEntry[]>;
  getClaimsByStatusAge(
    tenantId: string,
    status: WarrantyClaimStatus,
    olderThanDays: number
  ): Promise<IWarrantyClaim[]>;
  getAverageProcessingTime(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<IProcessingTimeStats>;
  // Settlement methods (Epic 19-4)
  getPendingSettlements(tenantId: string): Promise<IWarrantyClaim[]>;
  getSettlementSummary(tenantId: string, dateFrom: Date, dateTo: Date): Promise<ISettlementSummary>;
  bulkSettle(
    claimIds: string[],
    settledAmount: number,
    tenantId: string,
    userId: string,
    creditNoteNumber?: string
  ): Promise<IBulkSettleResult>;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

type PrismaClaimWithItems = PrismaWarrantyClaim & {
  items?: PrismaClaimItem[];
};

// ============================================
// PRISMA WARRANTY CLAIM REPOSITORY
// ============================================

@Injectable()
export class PrismaWarrantyClaimRepository implements IWarrantyClaimRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // STATUS MAPPING FUNCTIONS
  // ============================================

  private toDomainStatus(prismaStatus: PrismaClaimStatus): WarrantyClaimStatus {
    const statusMap: Record<PrismaClaimStatus, WarrantyClaimStatus> = {
      DRAFT: WarrantyClaimStatus.PENDING,
      SUBMITTED: WarrantyClaimStatus.SUBMITTED,
      UNDER_REVIEW: WarrantyClaimStatus.UNDER_REVIEW,
      APPROVED: WarrantyClaimStatus.APPROVED,
      REJECTED: WarrantyClaimStatus.REJECTED,
      PROCESSING: WarrantyClaimStatus.PROCESSING,
      COMPLETED: WarrantyClaimStatus.SETTLED,
      CANCELLED: WarrantyClaimStatus.CANCELLED,
    };
    return statusMap[prismaStatus] ?? WarrantyClaimStatus.PENDING;
  }

  private toPrismaStatus(domainStatus: WarrantyClaimStatus): PrismaClaimStatus {
    const statusMap: Record<WarrantyClaimStatus, PrismaClaimStatus> = {
      [WarrantyClaimStatus.PENDING]: 'DRAFT',
      [WarrantyClaimStatus.SUBMITTED]: 'SUBMITTED',
      [WarrantyClaimStatus.UNDER_REVIEW]: 'UNDER_REVIEW',
      [WarrantyClaimStatus.APPROVED]: 'APPROVED',
      [WarrantyClaimStatus.REJECTED]: 'REJECTED',
      [WarrantyClaimStatus.PROCESSING]: 'PROCESSING',
      [WarrantyClaimStatus.SETTLED]: 'COMPLETED',
      [WarrantyClaimStatus.CANCELLED]: 'CANCELLED',
    };
    return statusMap[domainStatus] ?? 'DRAFT';
  }

  // ============================================
  // DOMAIN MAPPING FUNCTIONS
  // ============================================

  private toDomain(claim: PrismaClaimWithItems): IWarrantyClaim {
    const result: IWarrantyClaim = {
      id: claim.id,
      tenantId: claim.tenantId,
      claimNumber: claim.claimNumber,
      status: this.toDomainStatus(claim.status),
      manufacturer: claim.manufacturer,
      serialNumber: claim.serialNumber,
      productName: claim.productName,
      purchaseDate: claim.purchaseDate,
      warrantyEnd: claim.warrantyEnd,
      issueDescription: claim.issueDescription,
      createdBy: claim.createdBy,
      updatedBy: claim.updatedBy,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };

    // Add optional properties only when defined (exactOptionalPropertyTypes compliance)
    if (claim.diagnosisResult !== null) {
      result.diagnosisResult = claim.diagnosisResult;
    }
    if (claim.normLaborMinutes !== null) {
      result.normLaborMinutes = claim.normLaborMinutes;
    }
    if (claim.normLaborRate !== null) {
      result.normLaborRate = Number(claim.normLaborRate);
    }
    if (claim.partsValue !== null) {
      result.partsValue = Number(claim.partsValue);
    }
    if (claim.totalClaimValue !== null) {
      result.totalClaimValue = Number(claim.totalClaimValue);
    }
    if (claim.submittedAt !== null) {
      result.submittedAt = claim.submittedAt;
    }
    if (claim.submittedBy !== null) {
      result.submittedBy = claim.submittedBy;
    }
    if (claim.manufacturerRef !== null) {
      result.manufacturerRef = claim.manufacturerRef;
    }
    if (claim.reviewedAt !== null) {
      result.reviewedAt = claim.reviewedAt;
    }
    if (claim.approvedAt !== null) {
      result.approvedAt = claim.approvedAt;
    }
    if (claim.rejectedAt !== null) {
      result.rejectedAt = claim.rejectedAt;
    }
    if (claim.rejectionReason !== null) {
      result.rejectionReason = claim.rejectionReason;
    }
    if (claim.settledAt !== null) {
      result.settledAt = claim.settledAt;
    }
    if (claim.settledAmount !== null) {
      result.settledAmount = Number(claim.settledAmount);
    }
    if (claim.creditNoteNumber !== null) {
      result.creditNoteNumber = claim.creditNoteNumber;
    }
    if (claim.notes !== null) {
      result.notes = claim.notes;
    }
    if (claim.items && claim.items.length > 0) {
      result.items = claim.items.map(item => this.toItemDomain(item));
    }

    return result;
  }

  private toItemDomain(item: PrismaClaimItem): IClaimItem {
    const result: IClaimItem = {
      id: item.id,
      claimId: item.claimId,
      itemType: item.itemType === 'LABOR' ? ClaimItemType.LABOR : ClaimItemType.PART,
      description: item.description,
      quantity: item.quantity,
      unitValue: Number(item.unitValue),
      totalValue: Number(item.totalValue),
      createdAt: item.createdAt,
    };

    if (item.partNumber !== null) {
      result.partNumber = item.partNumber;
    }
    if (item.normMinutes !== null) {
      result.normMinutes = item.normMinutes;
    }

    return result;
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async create(
    tenantId: string,
    input: ICreateWarrantyClaimInput,
    createdBy: string
  ): Promise<IWarrantyClaim> {
    // H3 FIX: Validate warranty dates
    const now = new Date();
    if (input.purchaseDate > now) {
      throw new Error('Vásárlás dátuma nem lehet jövőbeli');
    }
    if (input.warrantyEnd <= input.purchaseDate) {
      throw new Error('Garancia lejárat dátuma a vásárlás után kell legyen');
    }

    // H5 FIX: Validate required string fields are not empty
    if (!input.manufacturer.trim()) {
      throw new Error('Gyártó megadása kötelező');
    }
    if (!input.serialNumber.trim()) {
      throw new Error('Sorozatszám megadása kötelező');
    }
    if (!input.productName.trim()) {
      throw new Error('Termék név megadása kötelező');
    }
    if (!input.issueDescription.trim()) {
      throw new Error('Hiba leírás megadása kötelező');
    }

    // Generate claim number
    const claimNumber = await this.generateClaimNumber(tenantId);

    // Calculate totals
    let partsValue = 0;
    let laborValue = 0;
    let hasLaborItems = false;

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const totalValue = item.quantity * item.unitValue;
        if (item.itemType === ClaimItemType.PART) {
          partsValue += totalValue;
        } else {
          laborValue += totalValue;
          hasLaborItems = true;
        }
      }
    }

    // H4 FIX: Validate labor calculation source - can't have both items and norm
    const hasNormLabor = input.normLaborMinutes !== undefined && input.normLaborRate !== undefined;
    if (hasLaborItems && hasNormLabor) {
      throw new Error('Munkadíj tételt ÉS norma alapú munkadíjat egyszerre nem lehet megadni');
    }

    // Calculate labor from norm if provided (and no labor items)
    if (hasNormLabor && input.normLaborMinutes && input.normLaborRate) {
      laborValue = Math.round((input.normLaborMinutes / 60) * input.normLaborRate);
    }

    const totalClaimValue = partsValue + laborValue;

    // Build create data without items first (exactOptionalPropertyTypes compliance)
    const createData: Prisma.WarrantyClaimCreateInput = {
      tenantId,
      claimNumber,
      status: 'DRAFT',
      manufacturer: input.manufacturer,
      serialNumber: input.serialNumber,
      productName: input.productName,
      purchaseDate: input.purchaseDate,
      warrantyEnd: input.warrantyEnd,
      issueDescription: input.issueDescription,
      diagnosisResult: input.diagnosisResult ?? null,
      normLaborMinutes: input.normLaborMinutes ?? null,
      normLaborRate: input.normLaborRate ?? null,
      partsValue: partsValue > 0 ? partsValue : null,
      totalClaimValue: totalClaimValue > 0 ? totalClaimValue : null,
      notes: input.notes ?? null,
      createdBy,
      updatedBy: createdBy,
    };

    // Add items only when they exist
    if (input.items && input.items.length > 0) {
      createData.items = {
        create: input.items.map(item => ({
          itemType: item.itemType === ClaimItemType.LABOR ? 'LABOR' : 'PART',
          partNumber: item.partNumber ?? null,
          description: item.description,
          quantity: item.quantity,
          normMinutes: item.normMinutes ?? null,
          unitValue: item.unitValue,
          totalValue: item.quantity * item.unitValue,
        })),
      };
    }

    const claim = await this.prisma.warrantyClaim.create({
      data: createData,
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.toDomain(claim);
  }

  async findById(id: string, tenantId?: string): Promise<IWarrantyClaim | null> {
    // Multi-tenant safety: use findFirst with tenantId when provided
    const where: Prisma.WarrantyClaimWhereInput = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const claim = await this.prisma.warrantyClaim.findFirst({
      where,
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    return claim ? this.toDomain(claim) : null;
  }

  async findAll(
    tenantId: string,
    filter: Partial<WarrantyClaimFilterDto>
  ): Promise<IWarrantyClaim[]> {
    const where = this.buildWhereClause(tenantId, filter);

    const claims = await this.prisma.warrantyClaim.findMany({
      where,
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: filter.offset ?? 0,
      take: filter.limit ?? 20,
    });

    return claims.map(c => this.toDomain(c));
  }

  async findByStatus(tenantId: string, status: WarrantyClaimStatus): Promise<IWarrantyClaim[]> {
    const prismaStatus = this.toPrismaStatus(status);

    const claims = await this.prisma.warrantyClaim.findMany({
      where: {
        tenantId,
        status: prismaStatus,
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return claims.map(c => this.toDomain(c));
  }

  async findByManufacturer(tenantId: string, manufacturer: string): Promise<IWarrantyClaim[]> {
    const claims = await this.prisma.warrantyClaim.findMany({
      where: {
        tenantId,
        manufacturer: { equals: manufacturer, mode: 'insensitive' },
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return claims.map(c => this.toDomain(c));
  }

  async update(
    id: string,
    tenantId: string,
    data: IUpdateWarrantyClaimInput,
    updatedBy: string
  ): Promise<IWarrantyClaim> {
    // Verify claim exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Garanciális igény nem található');
    }

    // Only allow updates on PENDING claims
    if (existing.status !== WarrantyClaimStatus.PENDING) {
      throw new Error('Csak függőben lévő igény módosítható');
    }

    const updateData: Prisma.WarrantyClaimUpdateInput = {
      updatedBy,
      updatedAt: new Date(),
    };

    if (data.issueDescription !== undefined) {
      updateData.issueDescription = data.issueDescription;
    }
    if (data.diagnosisResult !== undefined) {
      updateData.diagnosisResult = data.diagnosisResult;
    }
    if (data.normLaborMinutes !== undefined) {
      updateData.normLaborMinutes = data.normLaborMinutes;
    }
    if (data.normLaborRate !== undefined) {
      updateData.normLaborRate = data.normLaborRate;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Recalculate total if norm values changed
    if (data.normLaborMinutes !== undefined || data.normLaborRate !== undefined) {
      const normMinutes = data.normLaborMinutes ?? existing.normLaborMinutes ?? 0;
      const normRate = data.normLaborRate ?? existing.normLaborRate ?? 0;
      const laborValue = Math.round((normMinutes / 60) * normRate);
      const partsValue = existing.partsValue ?? 0;
      updateData.totalClaimValue = laborValue + partsValue;
    }

    // Use updateMany for tenant-safe update
    await this.prisma.warrantyClaim.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.WarrantyClaimUpdateManyMutationInput,
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Garanciális igény nem található frissítés után');
    }

    return updated;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    input: IUpdateClaimStatusInput,
    updatedBy: string
  ): Promise<IWarrantyClaim> {
    // Verify claim exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Garanciális igény nem található');
    }

    // Validate state transition
    this.validateStatusTransition(existing.status, input.status);

    const updateData: Prisma.WarrantyClaimUpdateInput = {
      status: this.toPrismaStatus(input.status),
      updatedBy,
      updatedAt: new Date(),
    };

    // Set timestamps and fields based on status
    switch (input.status) {
      case WarrantyClaimStatus.SUBMITTED:
        updateData.submittedAt = new Date();
        updateData.submittedBy = updatedBy;
        break;
      case WarrantyClaimStatus.UNDER_REVIEW:
        updateData.reviewedAt = new Date();
        if (input.manufacturerRef) {
          updateData.manufacturerRef = input.manufacturerRef;
        }
        break;
      case WarrantyClaimStatus.APPROVED:
        updateData.approvedAt = new Date();
        if (input.manufacturerRef) {
          updateData.manufacturerRef = input.manufacturerRef;
        }
        break;
      case WarrantyClaimStatus.REJECTED:
        updateData.rejectedAt = new Date();
        if (input.rejectionReason) {
          updateData.rejectionReason = input.rejectionReason;
        }
        break;
      case WarrantyClaimStatus.SETTLED:
        // H1 FIX: Require settledAmount for SETTLED status
        if (input.settledAmount === undefined || input.settledAmount < 0) {
          throw new Error('Elszámolt összeg megadása kötelező és nem lehet negatív');
        }
        updateData.settledAt = new Date();
        updateData.settledAmount = input.settledAmount;
        if (input.creditNoteNumber) {
          updateData.creditNoteNumber = input.creditNoteNumber;
        }
        break;
    }

    // Use updateMany for tenant-safe update
    await this.prisma.warrantyClaim.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.WarrantyClaimUpdateManyMutationInput,
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Garanciális igény nem található frissítés után');
    }

    return updated;
  }

  async addItem(
    claimId: string,
    tenantId: string,
    item: ICreateClaimItemInput
  ): Promise<IClaimItem> {
    // H2 FIX: Use transaction to prevent race condition between status check and item creation
    const createdItem = await this.prisma.$transaction(async tx => {
      // Verify claim exists, belongs to tenant, and is PENDING - all within transaction
      const claim = await tx.warrantyClaim.findFirst({
        where: { id: claimId, tenantId },
        select: { status: true },
      });

      if (!claim) {
        throw new Error('Garanciális igény nem található');
      }

      // Check status within transaction
      if (claim.status !== 'DRAFT') {
        throw new Error('Csak függőben lévő igényhez adható tétel');
      }

      const totalValue = item.quantity * item.unitValue;

      return tx.claimItem.create({
        data: {
          claimId,
          itemType: item.itemType === ClaimItemType.LABOR ? 'LABOR' : 'PART',
          partNumber: item.partNumber ?? null,
          description: item.description,
          quantity: item.quantity,
          normMinutes: item.normMinutes ?? null,
          unitValue: item.unitValue,
          totalValue,
        },
      });
    });

    // Update claim totals (outside transaction - eventual consistency is OK here)
    await this.recalculateClaimTotals(claimId, tenantId);

    return this.toItemDomain(createdItem);
  }

  async removeItem(itemId: string, claimId: string, tenantId: string): Promise<void> {
    // H2 FIX: Use transaction to prevent race condition between status check and item deletion
    await this.prisma.$transaction(async tx => {
      // Verify claim exists, belongs to tenant, and is PENDING - all within transaction
      const claim = await tx.warrantyClaim.findFirst({
        where: { id: claimId, tenantId },
        select: { status: true },
      });

      if (!claim) {
        throw new Error('Garanciális igény nem található');
      }

      // Check status within transaction
      if (claim.status !== 'DRAFT') {
        throw new Error('Csak függőben lévő igényből törölhető tétel');
      }

      // Verify item belongs to the claim
      const item = await tx.claimItem.findFirst({
        where: { id: itemId, claimId },
      });

      if (!item) {
        throw new Error('Tétel nem található az igényben');
      }

      await tx.claimItem.delete({
        where: { id: itemId },
      });
    });

    // Update claim totals (outside transaction - eventual consistency is OK here)
    await this.recalculateClaimTotals(claimId, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    // Verify claim exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Garanciális igény nem található');
    }

    // Only allow cancelling PENDING or SUBMITTED claims
    if (
      existing.status !== WarrantyClaimStatus.PENDING &&
      existing.status !== WarrantyClaimStatus.SUBMITTED
    ) {
      throw new Error('Csak függőben lévő vagy beküldött igény vonható vissza');
    }

    // Use updateMany for tenant-safe update
    await this.prisma.warrantyClaim.updateMany({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });
  }

  async getSummary(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<IWarrantyClaimSummary> {
    const where: Prisma.WarrantyClaimWhereInput = { tenantId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    // Get all claims for the period
    const claims = await this.prisma.warrantyClaim.findMany({
      where,
      select: {
        status: true,
        manufacturer: true,
        totalClaimValue: true,
        settledAmount: true,
      },
    });

    // Initialize summary
    const summary: IWarrantyClaimSummary = {
      totalClaims: claims.length,
      byStatus: {
        [WarrantyClaimStatus.PENDING]: 0,
        [WarrantyClaimStatus.SUBMITTED]: 0,
        [WarrantyClaimStatus.UNDER_REVIEW]: 0,
        [WarrantyClaimStatus.APPROVED]: 0,
        [WarrantyClaimStatus.REJECTED]: 0,
        [WarrantyClaimStatus.PROCESSING]: 0,
        [WarrantyClaimStatus.SETTLED]: 0,
        [WarrantyClaimStatus.CANCELLED]: 0,
      },
      byManufacturer: {},
      totalClaimValue: 0,
      totalSettledAmount: 0,
    };

    // Calculate aggregates
    for (const claim of claims) {
      const domainStatus = this.toDomainStatus(claim.status);
      summary.byStatus[domainStatus]++;

      const claimValue = claim.totalClaimValue ? Number(claim.totalClaimValue) : 0;
      const settledAmount = claim.settledAmount ? Number(claim.settledAmount) : 0;

      summary.totalClaimValue += claimValue;
      summary.totalSettledAmount += settledAmount;

      // Group by manufacturer
      const manufacturer = claim.manufacturer.toUpperCase();
      if (!summary.byManufacturer[manufacturer]) {
        summary.byManufacturer[manufacturer] = {
          count: 0,
          totalClaimValue: 0,
          totalSettledAmount: 0,
        };
      }
      const mfData = summary.byManufacturer[manufacturer];
      if (mfData) {
        mfData.count++;
        mfData.totalClaimValue += claimValue;
        mfData.totalSettledAmount += settledAmount;
      }
    }

    return summary;
  }

  async generateClaimNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `WC-${year}-%`;

    // Use transaction with advisory lock to prevent race conditions
    const lockKey = `warranty-${tenantId}-${year}`
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const sequence = await this.prisma.$transaction(async tx => {
      // Acquire advisory lock
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const result = await tx.$queryRaw<{ max_seq: number | null }[]>`
        SELECT MAX(CAST(SPLIT_PART(claim_number, '-', 3) AS INTEGER)) as max_seq
        FROM warranty_claims
        WHERE tenant_id = ${tenantId}::uuid
        AND claim_number LIKE ${pattern}
      `;

      return result[0]?.max_seq ?? 0;
    });

    const nextSeq = sequence + 1;
    return `WC-${year}-${nextSeq.toString().padStart(4, '0')}`;
  }

  async countByTenant(tenantId: string, filter?: Partial<WarrantyClaimFilterDto>): Promise<number> {
    const where = this.buildWhereClause(tenantId, filter ?? {});
    return this.prisma.warrantyClaim.count({ where });
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  private validateStatusTransition(from: WarrantyClaimStatus, to: WarrantyClaimStatus): void {
    const validTransitions: Record<WarrantyClaimStatus, WarrantyClaimStatus[]> = {
      [WarrantyClaimStatus.PENDING]: [WarrantyClaimStatus.SUBMITTED, WarrantyClaimStatus.CANCELLED],
      [WarrantyClaimStatus.SUBMITTED]: [
        WarrantyClaimStatus.UNDER_REVIEW,
        WarrantyClaimStatus.APPROVED,
        WarrantyClaimStatus.REJECTED,
        WarrantyClaimStatus.CANCELLED,
      ],
      [WarrantyClaimStatus.UNDER_REVIEW]: [
        WarrantyClaimStatus.APPROVED,
        WarrantyClaimStatus.REJECTED,
      ],
      [WarrantyClaimStatus.APPROVED]: [WarrantyClaimStatus.PROCESSING, WarrantyClaimStatus.SETTLED],
      [WarrantyClaimStatus.REJECTED]: [],
      [WarrantyClaimStatus.PROCESSING]: [WarrantyClaimStatus.SETTLED],
      [WarrantyClaimStatus.SETTLED]: [],
      [WarrantyClaimStatus.CANCELLED]: [],
    };

    if (from === to) return;

    const allowed = validTransitions[from];
    if (!allowed?.includes(to)) {
      throw new Error(`Érvénytelen státusz átmenet: ${from} → ${to}`);
    }
  }

  private buildWhereClause(
    tenantId: string,
    filter: Partial<WarrantyClaimFilterDto>
  ): Prisma.WarrantyClaimWhereInput {
    const where: Prisma.WarrantyClaimWhereInput = {
      tenantId,
      status: { not: 'CANCELLED' }, // Exclude cancelled by default
    };

    if (filter.status) {
      where.status = this.toPrismaStatus(filter.status);
    }

    if (filter.manufacturer) {
      where.manufacturer = { equals: filter.manufacturer, mode: 'insensitive' };
    }

    if (filter.dateFrom) {
      where.createdAt = { gte: filter.dateFrom };
    }

    if (filter.dateTo) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        lte: filter.dateTo,
      };
    }

    if (filter.search) {
      where.OR = [
        { claimNumber: { contains: filter.search, mode: 'insensitive' } },
        { manufacturer: { contains: filter.search, mode: 'insensitive' } },
        { serialNumber: { contains: filter.search, mode: 'insensitive' } },
        { productName: { contains: filter.search, mode: 'insensitive' } },
        { issueDescription: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async recalculateClaimTotals(claimId: string, tenantId: string): Promise<void> {
    // Get all items for the claim
    const items = await this.prisma.claimItem.findMany({
      where: { claimId },
    });

    let partsValue = 0;
    let laborValue = 0;

    for (const item of items) {
      const value = Number(item.totalValue);
      if (item.itemType === 'PART') {
        partsValue += value;
      } else {
        laborValue += value;
      }
    }

    // Get claim for norm-based labor calculation
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId },
    });

    if (claim) {
      // Add norm-based labor if no explicit labor items
      if (laborValue === 0 && claim.normLaborMinutes && claim.normLaborRate) {
        laborValue = Math.round((claim.normLaborMinutes / 60) * Number(claim.normLaborRate));
      }
    }

    const totalClaimValue = partsValue + laborValue;

    // Update claim totals using updateMany for tenant safety
    await this.prisma.warrantyClaim.updateMany({
      where: { id: claimId, tenantId },
      data: {
        partsValue: partsValue > 0 ? partsValue : null,
        totalClaimValue: totalClaimValue > 0 ? totalClaimValue : null,
        updatedAt: new Date(),
      },
    });
  }

  // ============================================
  // WORKSHEET INTEGRATION (Epic 19-2)
  // ============================================

  /**
   * Create a warranty claim from an existing worksheet
   * Copies device info and diagnosis from the worksheet
   * @param worksheetId Source worksheet ID
   * @param tenantId Tenant ID
   * @param createdBy User ID creating the claim
   */
  async createFromWorksheet(
    worksheetId: string,
    tenantId: string,
    createdBy: string
  ): Promise<IWarrantyClaim> {
    return this.prisma.$transaction(
      async tx => {
        // Find the worksheet
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: {
            id: true,
            status: true,
            isWarranty: true,
            warrantyClaimId: true,
            brand: true,
            model: true,
            serialNumber: true,
            warrantyEndDate: true,
            purchaseDate: true,
            reportedIssue: true,
            diagnosticNotes: true,
          },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Business rule: Worksheet must be warranty type
        if (!worksheet.isWarranty) {
          throw new Error('Csak garanciális munkalapból hozható létre garanciális igény');
        }

        // Business rule: Worksheet cannot already have a claim
        if (worksheet.warrantyClaimId !== null) {
          throw new Error('A munkalaphoz már tartozik garanciális igény');
        }

        // H1 FIX: Validate warranty end date
        if (worksheet.warrantyEndDate !== null) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const warrantyEnd = new Date(worksheet.warrantyEndDate);
          warrantyEnd.setHours(0, 0, 0, 0);
          if (warrantyEnd < today) {
            throw new Error('Lejárt garanciás munkalapból nem hozható létre igény');
          }
        }

        // Generate claim number
        const claimNumber = await this.generateClaimNumber(tenantId);

        // Determine manufacturer from brand
        const manufacturer = worksheet.brand ?? 'OTHER';

        // Build claim data with optional diagnosisResult
        const claimData: Prisma.WarrantyClaimCreateInput = {
          tenantId,
          claimNumber,
          status: 'DRAFT',
          manufacturer,
          serialNumber: worksheet.serialNumber ?? '',
          productName: `${worksheet.brand ?? ''} ${worksheet.model ?? ''}`.trim() || 'Ismeretlen',
          purchaseDate: worksheet.purchaseDate ?? new Date(),
          warrantyEnd: worksheet.warrantyEndDate ?? new Date(),
          issueDescription: worksheet.reportedIssue,
          createdBy,
          updatedBy: createdBy,
        };

        // Add optional diagnosisResult only if defined (exactOptionalPropertyTypes compliance)
        if (worksheet.diagnosticNotes !== null) {
          claimData.diagnosisResult = worksheet.diagnosticNotes;
        }

        // Create the warranty claim
        const claim = await tx.warrantyClaim.create({
          data: claimData,
          include: { items: true },
        });

        // Link worksheet to the new claim
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            warrantyClaimId: claim.id,
            updatedAt: new Date(),
          },
        });

        return this.toDomain(claim);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Link an existing worksheet to a warranty claim
   * @param claimId Warranty claim ID
   * @param worksheetId Worksheet ID to link
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async linkToWorksheet(
    claimId: string,
    worksheetId: string,
    tenantId: string,
    _userId: string
  ): Promise<IWarrantyClaim> {
    await this.prisma.$transaction(
      async tx => {
        // Verify claim exists
        const claim = await tx.warrantyClaim.findFirst({
          where: { id: claimId, tenantId },
          select: { id: true, status: true },
        });

        if (!claim) {
          throw new Error('Garanciális igény nem található');
        }

        // Business rule: Cannot link to completed/cancelled claims
        if (claim.status === 'COMPLETED' || claim.status === 'CANCELLED') {
          throw new Error('Lezárt garanciális igényhez nem kapcsolható munkalap');
        }

        // Verify worksheet exists and is warranty type
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, isWarranty: true, warrantyClaimId: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        if (!worksheet.isWarranty) {
          throw new Error('Csak garanciális munkalap kapcsolható');
        }

        // Check if worksheet already linked to another claim
        if (worksheet.warrantyClaimId !== null && worksheet.warrantyClaimId !== claimId) {
          throw new Error('A munkalap már másik igényhez tartozik');
        }

        // Already linked to this claim
        if (worksheet.warrantyClaimId === claimId) {
          return;
        }

        // Link the worksheet
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            warrantyClaimId: claimId,
            updatedAt: new Date(),
          },
        });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    const updated = await this.findById(claimId, tenantId);
    if (!updated) {
      throw new Error('Garanciális igény nem található frissítés után');
    }
    return updated;
  }

  /**
   * Unlink a worksheet from a warranty claim
   * @param claimId Warranty claim ID
   * @param worksheetId Worksheet ID to unlink
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async unlinkFromWorksheet(
    claimId: string,
    worksheetId: string,
    tenantId: string,
    _userId: string
  ): Promise<IWarrantyClaim> {
    await this.prisma.$transaction(
      async tx => {
        // Verify claim exists
        const claim = await tx.warrantyClaim.findFirst({
          where: { id: claimId, tenantId },
          select: { id: true, status: true },
        });

        if (!claim) {
          throw new Error('Garanciális igény nem található');
        }

        // Business rule: Cannot unlink from completed claims
        if (claim.status === 'COMPLETED') {
          throw new Error('Lezárt igényről nem választható le munkalap');
        }

        // Verify worksheet is linked to this claim
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, warrantyClaimId: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        if (worksheet.warrantyClaimId !== claimId) {
          throw new Error('A munkalap nem ehhez az igényhez tartozik');
        }

        // Unlink the worksheet
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            warrantyClaimId: null,
            updatedAt: new Date(),
          },
        });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    const updated = await this.findById(claimId, tenantId);
    if (!updated) {
      throw new Error('Garanciális igény nem található frissítés után');
    }
    return updated;
  }

  /**
   * Get all worksheets linked to a warranty claim
   * @param claimId Warranty claim ID
   * @param tenantId Tenant ID
   */
  async getLinkedWorksheets(claimId: string, tenantId: string): Promise<ILinkedWorksheet[]> {
    // Verify claim exists
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId },
      select: { id: true },
    });

    if (!claim) {
      throw new Error('Garanciális igény nem található');
    }

    // Find all worksheets linked to this claim
    const worksheets = await this.prisma.worksheet.findMany({
      where: {
        warrantyClaimId: claimId,
        tenantId,
      },
      select: {
        id: true,
        worksheetNumber: true,
        updatedAt: true,
      },
      orderBy: { receivedAt: 'desc' },
    });

    return worksheets.map(w => ({
      worksheetId: w.id,
      worksheetNumber: w.worksheetNumber,
      linkedAt: w.updatedAt,
    }));
  }

  // ============================================
  // STATUS TRACKING METHODS (Epic 19-3)
  // ============================================

  /**
   * Get the status timeline for a warranty claim
   * Reconstructs history from timestamp fields
   * @param claimId Warranty claim ID
   * @param tenantId Tenant ID
   */
  async getStatusTimeline(claimId: string, tenantId: string): Promise<IStatusTimelineEntry[]> {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId },
      select: {
        status: true,
        createdAt: true,
        submittedAt: true,
        reviewedAt: true,
        approvedAt: true,
        rejectedAt: true,
        settledAt: true,
      },
    });

    if (!claim) {
      throw new Error('Garanciális igény nem található');
    }

    const timeline: IStatusTimelineEntry[] = [];

    // Always add created (PENDING/DRAFT)
    timeline.push({
      status: WarrantyClaimStatus.PENDING,
      timestamp: claim.createdAt,
      description: 'Igény létrehozva',
    });

    // Add status changes in chronological order
    if (claim.submittedAt) {
      timeline.push({
        status: WarrantyClaimStatus.SUBMITTED,
        timestamp: claim.submittedAt,
        description: 'Beküldve a gyártónak',
      });
    }

    if (claim.reviewedAt) {
      timeline.push({
        status: WarrantyClaimStatus.UNDER_REVIEW,
        timestamp: claim.reviewedAt,
        description: 'Elbírálás alatt',
      });
    }

    if (claim.approvedAt) {
      timeline.push({
        status: WarrantyClaimStatus.APPROVED,
        timestamp: claim.approvedAt,
        description: 'Gyártó jóváhagyta',
      });
    }

    if (claim.rejectedAt) {
      timeline.push({
        status: WarrantyClaimStatus.REJECTED,
        timestamp: claim.rejectedAt,
        description: 'Gyártó elutasította',
      });
    }

    if (claim.settledAt) {
      timeline.push({
        status: WarrantyClaimStatus.SETTLED,
        timestamp: claim.settledAt,
        description: 'Pénzügyileg elszámolva',
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }

  /**
   * Get claims that have been in a specific status for too long
   * Useful for identifying stuck or overdue claims
   * @param tenantId Tenant ID
   * @param status Status to check
   * @param olderThanDays Number of days threshold
   */
  async getClaimsByStatusAge(
    tenantId: string,
    status: WarrantyClaimStatus,
    olderThanDays: number
  ): Promise<IWarrantyClaim[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Determine which timestamp to check based on status
    const prismaStatus = this.toPrismaStatus(status);

    let dateField: string;
    switch (status) {
      case WarrantyClaimStatus.PENDING:
        dateField = 'createdAt';
        break;
      case WarrantyClaimStatus.SUBMITTED:
        dateField = 'submittedAt';
        break;
      case WarrantyClaimStatus.UNDER_REVIEW:
        dateField = 'reviewedAt';
        break;
      case WarrantyClaimStatus.APPROVED:
        dateField = 'approvedAt';
        break;
      default:
        dateField = 'updatedAt';
    }

    const claims = await this.prisma.warrantyClaim.findMany({
      where: {
        tenantId,
        status: prismaStatus,
        [dateField]: { lt: cutoffDate },
      },
      include: { items: true },
      orderBy: { [dateField]: 'asc' },
    });

    return claims.map(c => this.toDomain(c));
  }

  /**
   * Calculate average processing times for warranty claims
   * @param tenantId Tenant ID
   * @param dateFrom Optional start date filter
   * @param dateTo Optional end date filter
   */
  async getAverageProcessingTime(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<IProcessingTimeStats> {
    const where: Prisma.WarrantyClaimWhereInput = {
      tenantId,
      status: { in: ['COMPLETED', 'APPROVED', 'REJECTED'] }, // Only completed claims
    };

    if (dateFrom) {
      where.createdAt = { gte: dateFrom };
    }
    if (dateTo) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        lte: dateTo,
      };
    }

    const claims = await this.prisma.warrantyClaim.findMany({
      where,
      select: {
        createdAt: true,
        submittedAt: true,
        approvedAt: true,
        rejectedAt: true,
        settledAt: true,
      },
    });

    if (claims.length === 0) {
      return {
        totalClaims: 0,
        averageDaysToSubmit: 0,
        averageDaysToApprove: 0,
        averageDaysToSettle: 0,
        totalAverageDays: 0,
      };
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    let totalDaysToSubmit = 0;
    let submitCount = 0;
    let totalDaysToApprove = 0;
    let approveCount = 0;
    let totalDaysToSettle = 0;
    let settleCount = 0;

    for (const claim of claims) {
      if (claim.submittedAt) {
        totalDaysToSubmit += (claim.submittedAt.getTime() - claim.createdAt.getTime()) / MS_PER_DAY;
        submitCount++;

        const endDate = claim.approvedAt ?? claim.rejectedAt;
        if (endDate) {
          totalDaysToApprove += (endDate.getTime() - claim.submittedAt.getTime()) / MS_PER_DAY;
          approveCount++;
        }

        if (claim.settledAt && (claim.approvedAt ?? claim.rejectedAt)) {
          const approveDate = claim.approvedAt ?? claim.rejectedAt;
          if (approveDate) {
            totalDaysToSettle += (claim.settledAt.getTime() - approveDate.getTime()) / MS_PER_DAY;
            settleCount++;
          }
        }
      }
    }

    const averageDaysToSubmit =
      submitCount > 0 ? Math.round((totalDaysToSubmit / submitCount) * 10) / 10 : 0;
    const averageDaysToApprove =
      approveCount > 0 ? Math.round((totalDaysToApprove / approveCount) * 10) / 10 : 0;
    const averageDaysToSettle =
      settleCount > 0 ? Math.round((totalDaysToSettle / settleCount) * 10) / 10 : 0;

    return {
      totalClaims: claims.length,
      averageDaysToSubmit,
      averageDaysToApprove,
      averageDaysToSettle,
      totalAverageDays: averageDaysToSubmit + averageDaysToApprove + averageDaysToSettle,
    };
  }

  // ============================================
  // SETTLEMENT METHODS (Epic 19-4)
  // ============================================

  /**
   * Get claims that are approved but not yet settled
   * These are pending financial settlement
   * @param tenantId Tenant ID
   */
  async getPendingSettlements(tenantId: string): Promise<IWarrantyClaim[]> {
    const claims = await this.prisma.warrantyClaim.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        settledAt: null,
      },
      include: { items: true },
      orderBy: { approvedAt: 'asc' },
    });

    return claims.map(c => this.toDomain(c));
  }

  /**
   * Get settlement summary for a date range
   * @param tenantId Tenant ID
   * @param dateFrom Start date
   * @param dateTo End date
   */
  async getSettlementSummary(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ISettlementSummary> {
    const claims = await this.prisma.warrantyClaim.findMany({
      where: {
        tenantId,
        settledAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        manufacturer: true,
        totalClaimValue: true,
        settledAmount: true,
      },
    });

    let totalClaimedAmount = 0;
    let totalSettledAmount = 0;
    const byManufacturer: Record<string, { claims: number; amount: number }> = {};

    for (const claim of claims) {
      const claimed = Number(claim.totalClaimValue ?? 0);
      const settled = Number(claim.settledAmount ?? 0);

      totalClaimedAmount += claimed;
      totalSettledAmount += settled;

      const mfr = claim.manufacturer;
      const existing = byManufacturer[mfr];
      if (existing) {
        existing.claims++;
        existing.amount += settled;
      } else {
        byManufacturer[mfr] = { claims: 1, amount: settled };
      }
    }

    return {
      totalClaims: claims.length,
      totalClaimedAmount,
      totalSettledAmount,
      differenceAmount: totalClaimedAmount - totalSettledAmount,
      byManufacturer,
    };
  }

  /**
   * Bulk settle multiple claims at once
   * All claims must be APPROVED status
   * @param claimIds Array of claim IDs to settle
   * @param settledAmounts Either single amount for all, or Map of claimId -> amount
   * @param tenantId Tenant ID
   * @param userId User performing the settlement
   * @param creditNoteNumber Optional credit note number for all claims
   */
  async bulkSettle(
    claimIds: string[],
    settledAmounts: number | Map<string, number>,
    tenantId: string,
    userId: string,
    creditNoteNumber?: string
  ): Promise<IBulkSettleResult> {
    if (claimIds.length === 0) {
      return { successful: 0, failed: 0, errors: [] };
    }

    // H1 FIX: Support both uniform and per-claim amounts
    const getAmount = (claimId: string): number => {
      if (typeof settledAmounts === 'number') {
        return settledAmounts;
      }
      const amount = settledAmounts.get(claimId);
      if (amount === undefined) {
        throw new Error(`Nincs összeg megadva: ${claimId}`);
      }
      return amount;
    };

    const errors: Array<{ claimId: string; error: string }> = [];
    let successful = 0;
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');

    // Process each claim individually to handle errors gracefully
    for (const claimId of claimIds) {
      try {
        const amount = getAmount(claimId);

        if (amount < 0) {
          throw new Error('Elszámolt összeg nem lehet negatív');
        }

        await this.prisma.$transaction(
          async tx => {
            // Verify claim exists and is APPROVED
            const claim = await tx.warrantyClaim.findFirst({
              where: { id: claimId, tenantId },
              select: {
                id: true,
                status: true,
                claimNumber: true,
                totalClaimValue: true,
                notes: true,
              },
            });

            if (!claim) {
              throw new Error('Igény nem található');
            }

            if (claim.status !== 'APPROVED') {
              throw new Error('Csak jóváhagyott igény számolható el');
            }

            // H3 FIX: Audit trail in notes field
            const existingNotes = claim.notes ?? '';
            const claimValue = claim.totalClaimValue ? Number(claim.totalClaimValue) : 0;
            const difference = claimValue - amount;
            const auditEntry = `\n[${timestamp}] ELSZÁMOLVA: ${amount} Ft (igényelt: ${claimValue} Ft, eltérés: ${difference} Ft) - ${userId}`;

            // Build update data
            const updateData: Prisma.WarrantyClaimUpdateManyMutationInput = {
              status: 'COMPLETED',
              settledAt: now,
              settledAmount: amount,
              notes: existingNotes + auditEntry,
              updatedBy: userId,
              updatedAt: now,
            };

            if (creditNoteNumber) {
              updateData.creditNoteNumber = creditNoteNumber;
            }

            // Update the claim
            await tx.warrantyClaim.updateMany({
              where: { id: claimId, tenantId },
              data: updateData,
            });
          },
          {
            isolationLevel: 'Serializable',
            maxWait: 5000,
            timeout: 10000,
          }
        );
        successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba';
        errors.push({ claimId, error: errorMessage });
      }
    }

    return {
      successful,
      failed: errors.length,
      errors,
    };
  }
}

// ============================================
// REPOSITORY TOKEN
// ============================================

export const WARRANTY_CLAIM_REPOSITORY = Symbol('WARRANTY_CLAIM_REPOSITORY');
