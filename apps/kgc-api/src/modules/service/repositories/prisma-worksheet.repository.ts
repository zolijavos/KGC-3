/**
 * Prisma Worksheet Repository
 * Implements IWorksheetRepository and IWorksheetItemRepository for PostgreSQL persistence
 * Epic 17: Munkalap CRUD
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  WorksheetPriority as PrismaPriority,
  Worksheet as PrismaWorksheet,
  WorksheetItem as PrismaWorksheetItem,
  WorksheetStatus as PrismaWorksheetStatus,
} from '@prisma/client';

// ============================================
// LOCAL INTERFACE DEFINITIONS
// (Aligned with @kgc/service-worksheet interfaces)
// ============================================

/**
 * Worksheet status enum
 */
export enum WorksheetStatus {
  FELVEVE = 'FELVEVE',
  FOLYAMATBAN = 'FOLYAMATBAN',
  VARHATO = 'VARHATO',
  KESZ = 'KESZ',
  SZAMLAZANDO = 'SZAMLAZANDO',
  LEZART = 'LEZART',
  TOROLVE = 'TOROLVE',
}

/**
 * Worksheet type enum
 */
export enum WorksheetType {
  FIZETOS = 'FIZETOS',
  GARANCIALIS = 'GARANCIALIS',
  BERLESI = 'BERLESI',
  KARBANTARTAS = 'KARBANTARTAS',
}

/**
 * Worksheet priority enum
 */
export enum WorksheetPriority {
  SURGOS = 'SURGOS',
  FELARAS = 'FELARAS',
  GARANCIALIS = 'GARANCIALIS',
  FRANCHISE = 'FRANCHISE',
  NORMAL = 'NORMAL',
}

/**
 * Worksheet entity interface
 */
export interface IWorksheet {
  id: string;
  tenantId: string;
  worksheetNumber: string;
  type: WorksheetType;
  status: WorksheetStatus;
  priority: WorksheetPriority;
  partnerId: string;
  deviceName: string;
  deviceSerialNumber?: string;
  faultDescription: string;
  diagnosis?: string;
  workPerformed?: string;
  internalNote?: string;
  assignedToId?: string;
  costLimit?: number;
  estimatedCompletionDate?: Date;
  receivedAt: Date;
  completedAt?: Date;
  rentalId?: string;
  queuePosition?: number; // Epic 17-7: Várakozási lista pozíció
  // Storage fee fields (Epic 17-8)
  storageStartDate?: Date;
  storageDailyFee?: number;
  storageTotalFee?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Worksheet item interface
 */
export interface IWorksheetItem {
  id: string;
  worksheetId: string;
  tenantId: string;
  productId?: string;
  serviceNormId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  grossAmount: number;
  itemType: 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB';
  // Reservation fields (Epic 17-4)
  isReserved: boolean;
  reservedAt?: Date;
  reserveExpiresAt?: Date;
  notes?: string;
  createdAt: Date;
}

/**
 * Worksheet filter DTO
 */
export interface WorksheetFilterDto {
  status?: string;
  type?: WorksheetType;
  partnerId?: string;
  assignedToId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Worksheet repository interface
 */
/**
 * Rental worksheet statistics summary
 */
export interface IRentalWorksheetStats {
  rentalId: string;
  totalWorksheets: number;
  byStatus: Record<WorksheetStatus, number>;
  totalLabor: number;
  totalParts: number;
  totalCost: number;
  oldestOpenWorksheet?: Date;
  newestCompletedWorksheet?: Date;
}

/**
 * Queue position result for batch operations
 */
export interface IQueueReorderResult {
  updated: number;
  worksheets: Array<{ id: string; queuePosition: number }>;
}

/**
 * Storage fee calculation result (Epic 17-8)
 */
export interface IStorageFeeCalculation {
  worksheetId: string;
  storageStartDate: Date | null;
  storageDailyFee: number;
  daysStored: number;
  calculatedFee: number;
  currentTotalFee: number;
  isActive: boolean;
}

export interface IWorksheetRepository {
  create(data: Partial<IWorksheet>): Promise<IWorksheet>;
  findById(id: string, tenantId: string): Promise<IWorksheet | null>;
  findAll(tenantId: string, filter: Partial<WorksheetFilterDto>): Promise<IWorksheet[]>;
  findByRentalId(rentalId: string, tenantId: string): Promise<IWorksheet[]>;
  findByStatus(statuses: WorksheetStatus[], tenantId: string): Promise<IWorksheet[]>;
  update(id: string, tenantId: string, data: Partial<IWorksheet>): Promise<IWorksheet>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
  countByTenant(tenantId: string, filter?: Partial<WorksheetFilterDto>): Promise<number>;
  changeStatus(
    id: string,
    tenantId: string,
    newStatus: WorksheetStatus,
    changedBy: string,
    reason?: string
  ): Promise<IWorksheet>;
  // Rental relationship methods (Epic 17-6)
  linkToRental(
    worksheetId: string,
    rentalId: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet>;
  unlinkFromRental(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet>;
  createForRental(
    rentalId: string,
    data: Partial<IWorksheet>,
    tenantId: string
  ): Promise<IWorksheet>;
  getRentalWorksheetStats(rentalId: string, tenantId: string): Promise<IRentalWorksheetStats>;
  // Priority and queue methods (Epic 17-7)
  getQueuedWorksheets(tenantId: string): Promise<IWorksheet[]>;
  updateQueuePosition(
    worksheetId: string,
    tenantId: string,
    position: number,
    userId: string
  ): Promise<IWorksheet>;
  reorderQueue(
    tenantId: string,
    worksheetIds: string[],
    userId: string
  ): Promise<IQueueReorderResult>;
  getWorksheetsByPriority(
    priority: WorksheetPriority,
    tenantId: string,
    limit?: number
  ): Promise<IWorksheet[]>;
  addToQueue(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet>;
  removeFromQueue(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet>;
  // Storage fee methods (Epic 17-8)
  startStorageFee(
    worksheetId: string,
    dailyFee: number,
    tenantId: string,
    userId: string,
    startDate?: Date
  ): Promise<IWorksheet>;
  calculateStorageFee(worksheetId: string, tenantId: string): Promise<IStorageFeeCalculation>;
  stopStorageFee(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet>;
  getWorksheetsWithStorageFee(tenantId: string, activeOnly?: boolean): Promise<IWorksheet[]>;
}

/**
 * Labor calculation result
 */
export interface ILaborItemCalculation {
  itemId: string;
  normId: string;
  normCode: string;
  description: string;
  laborMinutes: number;
  laborRate: number;
  quantity: number;
  calculatedCost: number;
}

/**
 * Worksheet labor summary
 */
export interface IWorksheetLaborSummary {
  worksheetId: string;
  totalItems: number;
  totalMinutes: number;
  totalCost: number;
  items: ILaborItemCalculation[];
}

/**
 * Worksheet item repository interface
 */
export interface IWorksheetItemRepository {
  create(data: Partial<IWorksheetItem>): Promise<IWorksheetItem>;
  findById(id: string): Promise<IWorksheetItem | null>;
  findByWorksheetId(worksheetId: string): Promise<IWorksheetItem[]>;
  update(id: string, data: Partial<IWorksheetItem>): Promise<IWorksheetItem>;
  delete(id: string): Promise<void>;
  sumByWorksheetId(worksheetId: string): Promise<{ net: number; gross: number }>;
  // Reservation methods (Epic 17-4)
  reserveItem(id: string, tenantId: string, expiresInMinutes?: number): Promise<IWorksheetItem>;
  releaseReservation(id: string, tenantId: string): Promise<IWorksheetItem>;
  getReservedItems(worksheetId: string, tenantId: string): Promise<IWorksheetItem[]>;
  cleanupExpiredReservations(): Promise<number>;
  checkReservationAvailability(
    productId: string,
    quantity: number,
    tenantId: string
  ): Promise<boolean>;
  // Labor calculation methods (Epic 17-5)
  createLaborItem(
    worksheetId: string,
    tenantId: string,
    normId: string,
    quantity?: number,
    notes?: string
  ): Promise<IWorksheetItem>;
  calculateLaborSummary(worksheetId: string, tenantId: string): Promise<IWorksheetLaborSummary>;
  recalculateLaborItem(itemId: string, tenantId: string): Promise<IWorksheetItem>;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Type for Prisma worksheet with relations
 */
type PrismaWorksheetWithRelations = PrismaWorksheet & {
  partner?: { id: string; name: string } | null;
  equipment?: { id: string; equipmentCode: string } | null;
  items?: PrismaWorksheetItem[];
};

/**
 * H3 FIX: Priority weight mapping for sorting
 * Lower weight = higher priority in queue
 */
const PRIORITY_WEIGHT: Record<PrismaPriority, number> = {
  HIGH: 1, // SURGOS
  EXPRESS: 2, // FELARAS
  WARRANTY: 3, // GARANCIALIS
  FRANCHISE: 4, // FRANCHISE
  NORMAL: 5,
};

// ============================================
// PRISMA WORKSHEET REPOSITORY
// ============================================

@Injectable()
export class PrismaWorksheetRepository implements IWorksheetRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // STATUS MAPPING FUNCTIONS
  // ============================================

  /**
   * Map Prisma status to domain status
   * Note: Basic mapping - for SZAMLAZANDO detection, use toDomainStatusWithContext
   */
  private toDomainStatus(prismaStatus: PrismaWorksheetStatus): WorksheetStatus {
    const statusMap: Record<PrismaWorksheetStatus, WorksheetStatus> = {
      DRAFT: WorksheetStatus.FELVEVE,
      PENDING: WorksheetStatus.FELVEVE,
      IN_PROGRESS: WorksheetStatus.FOLYAMATBAN,
      WAITING_PARTS: WorksheetStatus.VARHATO,
      WAITING_QUOTE: WorksheetStatus.VARHATO,
      QUOTE_SENT: WorksheetStatus.VARHATO,
      APPROVED: WorksheetStatus.FOLYAMATBAN,
      COMPLETED: WorksheetStatus.KESZ,
      DELIVERED: WorksheetStatus.LEZART,
      CANCELLED: WorksheetStatus.TOROLVE,
    };
    return statusMap[prismaStatus] ?? WorksheetStatus.FELVEVE;
  }

  /**
   * H5 FIX: Map Prisma status to domain status with context
   * Uses invoiceId to distinguish KESZ from SZAMLAZANDO
   *
   * Logic:
   * - COMPLETED + invoiceId set → SZAMLAZANDO (számlázásra vár/számlázva)
   * - COMPLETED + no invoiceId → KESZ (elkészült, de nincs számla)
   */
  private toDomainStatusWithContext(
    prismaStatus: PrismaWorksheetStatus,
    invoiceId: string | null
  ): WorksheetStatus {
    if (prismaStatus === 'COMPLETED' && invoiceId !== null) {
      return WorksheetStatus.SZAMLAZANDO;
    }
    return this.toDomainStatus(prismaStatus);
  }

  /**
   * Map domain status to Prisma status
   * Note: SZAMLAZANDO maps to COMPLETED (Prisma has no INVOICING status)
   * The distinction is maintained via invoiceId field
   */
  private toPrismaStatus(domainStatus: WorksheetStatus): PrismaWorksheetStatus {
    const statusMap: Record<WorksheetStatus, PrismaWorksheetStatus> = {
      [WorksheetStatus.FELVEVE]: 'DRAFT',
      [WorksheetStatus.FOLYAMATBAN]: 'IN_PROGRESS',
      [WorksheetStatus.VARHATO]: 'WAITING_PARTS',
      [WorksheetStatus.KESZ]: 'COMPLETED',
      [WorksheetStatus.SZAMLAZANDO]: 'COMPLETED', // H5: Uses invoiceId for distinction
      [WorksheetStatus.LEZART]: 'DELIVERED',
      [WorksheetStatus.TOROLVE]: 'CANCELLED',
    };
    return statusMap[domainStatus] ?? 'DRAFT';
  }

  private toDomainPriority(prismaPriority: PrismaPriority): WorksheetPriority {
    const priorityMap: Record<PrismaPriority, WorksheetPriority> = {
      NORMAL: WorksheetPriority.NORMAL,
      HIGH: WorksheetPriority.SURGOS,
      EXPRESS: WorksheetPriority.FELARAS,
      WARRANTY: WorksheetPriority.GARANCIALIS,
      FRANCHISE: WorksheetPriority.FRANCHISE,
    };
    return priorityMap[prismaPriority] ?? WorksheetPriority.NORMAL;
  }

  private toPrismaPriority(domainPriority: WorksheetPriority): PrismaPriority {
    const priorityMap: Record<WorksheetPriority, PrismaPriority> = {
      [WorksheetPriority.NORMAL]: 'NORMAL',
      [WorksheetPriority.SURGOS]: 'HIGH',
      [WorksheetPriority.FELARAS]: 'EXPRESS',
      [WorksheetPriority.GARANCIALIS]: 'WARRANTY',
      [WorksheetPriority.FRANCHISE]: 'FRANCHISE',
    };
    return priorityMap[domainPriority] ?? 'NORMAL';
  }

  // ============================================
  // DOMAIN MAPPING FUNCTIONS
  // ============================================

  private toWorksheetDomain(worksheet: PrismaWorksheetWithRelations): IWorksheet {
    // Determine type based on isWarranty flag and other indicators
    let type: WorksheetType = WorksheetType.FIZETOS;
    if (worksheet.isWarranty) {
      type = WorksheetType.GARANCIALIS;
    } else if (worksheet.rentalId) {
      type = WorksheetType.BERLESI;
    }

    const result: IWorksheet = {
      id: worksheet.id,
      tenantId: worksheet.tenantId,
      worksheetNumber: worksheet.worksheetNumber,
      type,
      // H5 FIX: Use context-aware status mapping to distinguish KESZ from SZAMLAZANDO
      status: this.toDomainStatusWithContext(worksheet.status, worksheet.invoiceId),
      priority: this.toDomainPriority(worksheet.priority),
      partnerId: worksheet.partnerId,
      deviceName:
        worksheet.brand && worksheet.model
          ? `${worksheet.brand} ${worksheet.model}`
          : (worksheet.brand ?? worksheet.model ?? 'Ismeretlen gép'),
      faultDescription: worksheet.reportedIssue,
      receivedAt: worksheet.receivedAt,
      createdBy: worksheet.createdBy,
      createdAt: worksheet.createdAt,
      updatedAt: worksheet.updatedAt,
    };

    // Add optional properties only when defined (exactOptionalPropertyTypes compliance)
    if (worksheet.serialNumber !== null) {
      result.deviceSerialNumber = worksheet.serialNumber;
    }
    if (worksheet.diagnosticNotes !== null) {
      result.diagnosis = worksheet.diagnosticNotes;
    }
    if (worksheet.internalNotes !== null) {
      result.internalNote = worksheet.internalNotes;
    }
    if (worksheet.customerCostLimit !== null) {
      result.costLimit = Number(worksheet.customerCostLimit);
    }
    if (worksheet.promisedDate !== null) {
      result.estimatedCompletionDate = worksheet.promisedDate;
    }
    if (worksheet.completedAt !== null) {
      result.completedAt = worksheet.completedAt;
    }
    if (worksheet.rentalId !== null) {
      result.rentalId = worksheet.rentalId;
    }
    if (worksheet.queuePosition !== null) {
      result.queuePosition = worksheet.queuePosition;
    }
    // Storage fee fields (Epic 17-8)
    if (worksheet.storageStartDate !== null) {
      result.storageStartDate = worksheet.storageStartDate;
    }
    if (worksheet.storageDailyFee !== null) {
      result.storageDailyFee = Number(worksheet.storageDailyFee);
    }
    if (worksheet.storageTotalFee !== null) {
      result.storageTotalFee = Number(worksheet.storageTotalFee);
    }

    return result;
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async create(data: Partial<IWorksheet>): Promise<IWorksheet> {
    if (!data.tenantId) {
      throw new Error('Tenant ID megadása kötelező');
    }
    if (!data.partnerId) {
      throw new Error('Partner ID megadása kötelező');
    }
    if (!data.worksheetNumber) {
      throw new Error('Munkalap szám megadása kötelező');
    }
    if (!data.faultDescription) {
      throw new Error('Hiba leírás megadása kötelező');
    }
    if (!data.createdBy) {
      throw new Error('Létrehozó user megadása kötelező');
    }

    // Parse device name into brand and model
    const deviceParts = data.deviceName?.split(' ') ?? [];
    const brand = deviceParts[0] ?? null;
    const model = deviceParts.slice(1).join(' ') || null;

    // Determine isWarranty based on type
    const isWarranty = data.type === WorksheetType.GARANCIALIS;

    const worksheet = await this.prisma.worksheet.create({
      data: {
        tenantId: data.tenantId,
        worksheetNumber: data.worksheetNumber,
        partnerId: data.partnerId,
        status: data.status ? this.toPrismaStatus(data.status) : 'DRAFT',
        priority: data.priority ? this.toPrismaPriority(data.priority) : 'NORMAL',
        brand,
        model,
        serialNumber: data.deviceSerialNumber ?? null,
        reportedIssue: data.faultDescription,
        diagnosticNotes: data.diagnosis ?? null,
        internalNotes: data.internalNote ?? null,
        isWarranty,
        customerCostLimit: data.costLimit ?? null,
        promisedDate: data.estimatedCompletionDate ?? null,
        receivedAt: data.receivedAt ?? new Date(),
        rentalId: data.rentalId ?? null,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
    });

    return this.toWorksheetDomain(worksheet);
  }

  async findById(id: string, tenantId: string): Promise<IWorksheet | null> {
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { id, tenantId },
      include: {
        partner: { select: { id: true, name: true } },
        equipment: { select: { id: true, equipmentCode: true } },
      },
    });

    return worksheet ? this.toWorksheetDomain(worksheet) : null;
  }

  async findAll(tenantId: string, filter: Partial<WorksheetFilterDto>): Promise<IWorksheet[]> {
    const where = this.buildWhereClause(tenantId, filter);

    const worksheets = await this.prisma.worksheet.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true } },
        equipment: { select: { id: true, equipmentCode: true } },
      },
      orderBy: [{ priority: 'asc' }, { receivedAt: 'desc' }],
      skip: filter.offset ?? 0,
      take: filter.limit ?? 20,
    });

    return worksheets.map(w => this.toWorksheetDomain(w));
  }

  async findByRentalId(rentalId: string, tenantId: string): Promise<IWorksheet[]> {
    const worksheets = await this.prisma.worksheet.findMany({
      where: {
        tenantId,
        rentalId,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: { receivedAt: 'desc' },
    });

    return worksheets.map(w => this.toWorksheetDomain(w));
  }

  async findByStatus(statuses: WorksheetStatus[], tenantId: string): Promise<IWorksheet[]> {
    const prismaStatuses = statuses.map(s => this.toPrismaStatus(s));

    const worksheets = await this.prisma.worksheet.findMany({
      where: {
        tenantId,
        status: { in: prismaStatuses },
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { receivedAt: 'desc' }],
    });

    return worksheets.map(w => this.toWorksheetDomain(w));
  }

  async update(id: string, tenantId: string, data: Partial<IWorksheet>): Promise<IWorksheet> {
    // Verify worksheet exists and belongs to tenant (tenant isolation)
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Munkalap nem található');
    }

    const updateData: Prisma.WorksheetUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = this.toPrismaStatus(data.status);
    }
    if (data.priority !== undefined) {
      updateData.priority = this.toPrismaPriority(data.priority);
    }
    if (data.deviceName !== undefined) {
      const deviceParts = data.deviceName.split(' ');
      updateData.brand = deviceParts[0] ?? null;
      updateData.model = deviceParts.slice(1).join(' ') || null;
    }
    if (data.deviceSerialNumber !== undefined) {
      updateData.serialNumber = data.deviceSerialNumber;
    }
    if (data.faultDescription !== undefined) {
      updateData.reportedIssue = data.faultDescription;
    }
    if (data.diagnosis !== undefined) {
      updateData.diagnosticNotes = data.diagnosis;
    }
    if (data.internalNote !== undefined) {
      updateData.internalNotes = data.internalNote;
    }
    if (data.costLimit !== undefined) {
      updateData.customerCostLimit = data.costLimit;
    }
    if (data.estimatedCompletionDate !== undefined) {
      updateData.promisedDate = data.estimatedCompletionDate;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt;
    }

    // Use updateMany for tenant-safe update
    await this.prisma.worksheet.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.WorksheetUpdateManyMutationInput,
    });

    // Fetch and return the updated worksheet
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  async getNextSequence(tenantId: string, year: number): Promise<number> {
    const pattern = `ML-${year}-`;

    return this.prisma.$transaction(
      async tx => {
        const lastWorksheet = await tx.worksheet.findFirst({
          where: {
            tenantId,
            worksheetNumber: { startsWith: pattern },
          },
          orderBy: { worksheetNumber: 'desc' },
        });

        if (!lastWorksheet) {
          return 1;
        }

        const match = lastWorksheet.worksheetNumber.match(/-(\d+)$/);
        if (match?.[1]) {
          return parseInt(match[1], 10) + 1;
        }

        return 1;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  async countByTenant(tenantId: string, filter?: Partial<WorksheetFilterDto>): Promise<number> {
    const where = this.buildWhereClause(tenantId, filter ?? {});
    return this.prisma.worksheet.count({ where });
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  async changeStatus(
    id: string,
    tenantId: string,
    newStatus: WorksheetStatus,
    changedBy: string,
    reason?: string
  ): Promise<IWorksheet> {
    const worksheet = await this.findById(id, tenantId);
    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    // Validate state transition
    this.validateStatusTransition(worksheet.status, newStatus);

    const updateData: Prisma.WorksheetUpdateManyMutationInput = {
      status: this.toPrismaStatus(newStatus),
      updatedBy: changedBy,
      updatedAt: new Date(),
    };

    // Set timestamps based on status (H3, H4 FIX)
    switch (newStatus) {
      case WorksheetStatus.FOLYAMATBAN:
        updateData.startedAt = new Date();
        break;
      case WorksheetStatus.KESZ:
        updateData.completedAt = new Date();
        break;
      case WorksheetStatus.SZAMLAZANDO:
        // SZAMLAZANDO státusz - jelzi, hogy számlázásra vár
        // Az invoiceId majd a számla létrehozásakor kerül beállításra
        break;
      case WorksheetStatus.LEZART:
        updateData.deliveredAt = new Date();
        updateData.closedBy = changedBy;
        updateData.closedAt = new Date();
        break;
      case WorksheetStatus.TOROLVE:
        // H3 FIX: TOROLVE audit - closedAt/closedBy beállítása
        updateData.closedBy = changedBy;
        updateData.closedAt = new Date();
        break;
    }

    // Append reason to internal notes for audit trail
    if (reason) {
      const existingNotes = worksheet.internalNote ?? '';
      const timestamp = new Date().toISOString();
      updateData.internalNotes = existingNotes
        ? `${existingNotes}\n[${timestamp}] Státusz: ${newStatus} - ${reason}`
        : `[${timestamp}] Státusz: ${newStatus} - ${reason}`;
    }

    // H1 FIX: Use updateMany for tenant-safe update
    const result = await this.prisma.worksheet.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error('Munkalap státusz frissítése sikertelen');
    }

    // Fetch and return the updated worksheet
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  /**
   * H2 FIX: Validate status transition with complete business logic
   *
   * State machine transitions:
   * - FELVEVE → FOLYAMATBAN: Munka megkezdése
   * - FELVEVE → VARHATO: Alkatrészre/árajánlatra vár
   * - FELVEVE → KESZ: Gyors javítás (pl. egyszerű beállítás)
   * - FELVEVE → TOROLVE: Ügyfél visszamondja
   * - FOLYAMATBAN → VARHATO: Alkatrész szükséges
   * - FOLYAMATBAN → KESZ: Javítás kész
   * - FOLYAMATBAN → TOROLVE: Ügyfél visszavonja
   * - VARHATO → FOLYAMATBAN: Alkatrész megérkezett, munka folytatódik
   * - VARHATO → KESZ: Alkatrész megérkezett és javítás rögtön kész
   * - VARHATO → TOROLVE: Ügyfél visszavonja várakozás közben
   * - KESZ → SZAMLAZANDO: Számlázásra vár (fizetős)
   * - KESZ → LEZART: Garanciális/bérlési - nincs számla
   * - KESZ → FOLYAMATBAN: További munka szükséges (visszavitel)
   * - SZAMLAZANDO → LEZART: Számla kiállítva, kiadva
   * - LEZART: Végleges státusz (nincs tovább)
   * - TOROLVE: Végleges státusz (nincs tovább)
   */
  private validateStatusTransition(from: WorksheetStatus, to: WorksheetStatus): void {
    const validTransitions: Record<WorksheetStatus, WorksheetStatus[]> = {
      [WorksheetStatus.FELVEVE]: [
        WorksheetStatus.FOLYAMATBAN,
        WorksheetStatus.VARHATO,
        WorksheetStatus.KESZ, // H2 FIX: Gyors javítás
        WorksheetStatus.TOROLVE,
      ],
      [WorksheetStatus.FOLYAMATBAN]: [
        WorksheetStatus.VARHATO,
        WorksheetStatus.KESZ,
        WorksheetStatus.TOROLVE, // H2 FIX: Visszavonás munka közben
      ],
      [WorksheetStatus.VARHATO]: [
        WorksheetStatus.FOLYAMATBAN,
        WorksheetStatus.KESZ, // H2 FIX: Alkatrész + azonnali kész
        WorksheetStatus.TOROLVE,
      ],
      [WorksheetStatus.KESZ]: [
        WorksheetStatus.SZAMLAZANDO,
        WorksheetStatus.LEZART, // H2 FIX: Garanciális direkt lezárás
        WorksheetStatus.FOLYAMATBAN,
      ],
      [WorksheetStatus.SZAMLAZANDO]: [WorksheetStatus.LEZART],
      [WorksheetStatus.LEZART]: [], // Végleges státusz
      [WorksheetStatus.TOROLVE]: [], // Végleges státusz
    };

    if (from === to) return;

    const allowed = validTransitions[from];
    if (!allowed?.includes(to)) {
      throw new Error(`Érvénytelen státusz átmenet: ${from} → ${to}`);
    }
  }

  // ============================================
  // RENTAL RELATIONSHIP METHODS (Epic 17-6)
  // ============================================

  /**
   * Link an existing worksheet to a rental
   * Changes worksheet type to BERLESI if not already
   * @param worksheetId Worksheet ID
   * @param rentalId Rental ID to link to
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async linkToRental(
    worksheetId: string,
    rentalId: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    // Use serializable transaction to ensure data consistency
    await this.prisma.$transaction(
      async tx => {
        // Verify worksheet exists and belongs to tenant
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, status: true, rentalId: true, isWarranty: true, internalNotes: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Business rule: Cannot link closed/cancelled worksheets
        if (worksheet.status === 'DELIVERED' || worksheet.status === 'CANCELLED') {
          throw new Error('Lezárt vagy törölt munkalap nem kapcsolható bérléshez');
        }

        // Business rule: Cannot link warranty worksheets to rentals
        if (worksheet.isWarranty) {
          throw new Error('Garanciális munkalap nem kapcsolható bérléshez');
        }

        // Check if already linked to same rental
        if (worksheet.rentalId === rentalId) {
          return; // Already linked, nothing to do
        }

        // Check if already linked to another rental
        if (worksheet.rentalId !== null) {
          throw new Error('A munkalap már hozzá van kapcsolva egy másik bérléshez');
        }

        // Verify rental exists and belongs to tenant
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: { id: true, status: true },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Business rule: Cannot link to returned or cancelled rentals
        if (rental.status === 'RETURNED' || rental.status === 'CANCELLED') {
          throw new Error('Visszavett vagy törölt bérléshez nem kapcsolható munkalap');
        }

        // H3 FIX: Append audit trail to internal notes
        const existingNotes = worksheet.internalNotes ?? '';
        const timestamp = new Date().toISOString();
        const auditNote = `[${timestamp}] Bérléshez kapcsolva: ${rentalId}`;
        const newNotes = existingNotes ? `${existingNotes}\n${auditNote}` : auditNote;

        // Use updateMany for tenant-safe update
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            rentalId,
            internalNotes: newNotes,
            updatedBy: userId,
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

    // Fetch and return the updated worksheet
    const updated = await this.findById(worksheetId, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  /**
   * Unlink a worksheet from its rental
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async unlinkFromRental(
    worksheetId: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    await this.prisma.$transaction(
      async tx => {
        // Verify worksheet exists and belongs to tenant
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, status: true, rentalId: true, internalNotes: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Business rule: Cannot unlink closed/cancelled worksheets
        if (worksheet.status === 'DELIVERED' || worksheet.status === 'CANCELLED') {
          throw new Error('Lezárt vagy törölt munkalap bérlés kapcsolata nem módosítható');
        }

        // Check if not linked to any rental
        if (worksheet.rentalId === null) {
          return; // Not linked, nothing to do
        }

        // H3 FIX: Append audit trail to internal notes
        const existingNotes = worksheet.internalNotes ?? '';
        const timestamp = new Date().toISOString();
        const auditNote = `[${timestamp}] Bérlésről leválasztva: ${worksheet.rentalId}`;
        const newNotes = existingNotes ? `${existingNotes}\n${auditNote}` : auditNote;

        // Use updateMany for tenant-safe update
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            rentalId: null,
            internalNotes: newNotes,
            updatedBy: userId,
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

    // Fetch and return the updated worksheet
    const updated = await this.findById(worksheetId, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  /**
   * Create a new worksheet specifically for a rental
   * Automatically sets type to BERLESI and links to rental
   * @param rentalId Rental ID to create worksheet for
   * @param data Worksheet creation data
   * @param tenantId Tenant ID
   */
  async createForRental(
    rentalId: string,
    data: Partial<IWorksheet>,
    tenantId: string
  ): Promise<IWorksheet> {
    // Verify rental exists and belongs to tenant
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: { id: true, status: true, partnerId: true },
    });

    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    // Business rule: Cannot create worksheet for returned or cancelled rentals
    if (rental.status === 'RETURNED' || rental.status === 'CANCELLED') {
      throw new Error('Visszavett vagy törölt bérléshez nem hozható létre munkalap');
    }

    // Ensure required fields are set
    if (!data.createdBy) {
      throw new Error('Létrehozó user megadása kötelező');
    }

    // H1 FIX: Auto-generate worksheetNumber if not provided
    let worksheetNumber = data.worksheetNumber;
    if (!worksheetNumber) {
      const year = new Date().getFullYear();
      const seq = await this.getNextSequence(tenantId, year);
      worksheetNumber = `ML-${year}-${String(seq).padStart(5, '0')}`;
    }

    // Create worksheet with BERLESI type and linked to rental
    const worksheetData: Partial<IWorksheet> = {
      ...data,
      tenantId,
      worksheetNumber,
      type: WorksheetType.BERLESI,
      rentalId,
      // Use rental's partner if not specified
      partnerId: data.partnerId ?? rental.partnerId,
    };

    return this.create(worksheetData);
  }

  /**
   * Get statistics for all worksheets linked to a rental
   * H2 FIX: Wrapped in RepeatableRead transaction for consistency
   * H4 FIX: Uses toDomainStatusWithContext for proper SZAMLAZANDO detection
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   */
  async getRentalWorksheetStats(
    rentalId: string,
    tenantId: string
  ): Promise<IRentalWorksheetStats> {
    // H2 FIX: Use transaction for consistent read
    return this.prisma.$transaction(
      async tx => {
        // Verify rental exists and belongs to tenant
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: { id: true },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Get all worksheets for this rental
        // H4 FIX: Include invoiceId for SZAMLAZANDO detection
        const worksheets = await tx.worksheet.findMany({
          where: { rentalId, tenantId },
          select: {
            id: true,
            status: true,
            invoiceId: true, // H4: Needed for SZAMLAZANDO detection
            laborCost: true,
            partsCost: true,
            totalAmount: true,
            receivedAt: true,
            completedAt: true,
          },
        });

        // Initialize stats
        const byStatus: Record<WorksheetStatus, number> = {
          [WorksheetStatus.FELVEVE]: 0,
          [WorksheetStatus.FOLYAMATBAN]: 0,
          [WorksheetStatus.VARHATO]: 0,
          [WorksheetStatus.KESZ]: 0,
          [WorksheetStatus.SZAMLAZANDO]: 0,
          [WorksheetStatus.LEZART]: 0,
          [WorksheetStatus.TOROLVE]: 0,
        };

        let totalLabor = 0;
        let totalParts = 0;
        let totalCost = 0;
        let oldestOpen: Date | undefined;
        let newestCompleted: Date | undefined;

        const openStatuses: PrismaWorksheetStatus[] = [
          'DRAFT',
          'PENDING',
          'IN_PROGRESS',
          'WAITING_PARTS',
          'WAITING_QUOTE',
          'QUOTE_SENT',
          'APPROVED',
        ];

        for (const ws of worksheets) {
          // H4 FIX: Use context-aware status mapping for proper SZAMLAZANDO detection
          const domainStatus = this.toDomainStatusWithContext(ws.status, ws.invoiceId);
          byStatus[domainStatus]++;

          // Sum costs (only for non-cancelled)
          if (ws.status !== 'CANCELLED') {
            totalLabor += Number(ws.laborCost);
            totalParts += Number(ws.partsCost);
            totalCost += Number(ws.totalAmount);
          }

          // Track oldest open worksheet
          if (openStatuses.includes(ws.status)) {
            if (!oldestOpen || ws.receivedAt < oldestOpen) {
              oldestOpen = ws.receivedAt;
            }
          }

          // Track newest completed worksheet
          if (ws.completedAt) {
            if (!newestCompleted || ws.completedAt > newestCompleted) {
              newestCompleted = ws.completedAt;
            }
          }
        }

        const result: IRentalWorksheetStats = {
          rentalId,
          totalWorksheets: worksheets.length,
          byStatus,
          totalLabor,
          totalParts,
          totalCost,
        };

        // Add optional dates only when defined (exactOptionalPropertyTypes compliance)
        if (oldestOpen) {
          result.oldestOpenWorksheet = oldestOpen;
        }
        if (newestCompleted) {
          result.newestCompletedWorksheet = newestCompleted;
        }

        return result;
      },
      {
        isolationLevel: 'RepeatableRead',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  // ============================================
  // PRIORITY AND QUEUE METHODS (Epic 17-7)
  // ============================================

  /**
   * Get all worksheets in the queue (have queuePosition set)
   * Sorted by priority weight then by queuePosition
   * Note: assignedToId filter removed - Worksheet model doesn't have this field
   * @param tenantId Tenant ID
   */
  async getQueuedWorksheets(tenantId: string): Promise<IWorksheet[]> {
    const where: Prisma.WorksheetWhereInput = {
      tenantId,
      queuePosition: { not: null },
      // Only active worksheets (not closed or cancelled)
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    };

    const worksheets = await this.prisma.worksheet.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'asc' }, // Higher priority first (enum ordering)
        { queuePosition: 'asc' }, // Then by queue position
      ],
    });

    // Secondary sort by priority weight since Prisma enum ordering might differ
    // H3 FIX: Use class-level constant
    const sorted = worksheets.sort((a, b) => {
      const weightA = PRIORITY_WEIGHT[a.priority] ?? 5;
      const weightB = PRIORITY_WEIGHT[b.priority] ?? 5;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      // Same priority, sort by queuePosition
      const posA = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
      const posB = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });

    return sorted.map(w => this.toWorksheetDomain(w));
  }

  /**
   * Update queue position for a single worksheet
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   * @param position New queue position (1-based)
   * @param userId User performing the action
   */
  async updateQueuePosition(
    worksheetId: string,
    tenantId: string,
    position: number,
    userId: string
  ): Promise<IWorksheet> {
    if (position < 1) {
      throw new Error('Pozíció legalább 1 kell legyen');
    }

    await this.prisma.$transaction(
      async tx => {
        // Verify worksheet exists and belongs to tenant
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, status: true, queuePosition: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Business rule: Cannot queue closed/cancelled worksheets
        if (worksheet.status === 'DELIVERED' || worksheet.status === 'CANCELLED') {
          throw new Error('Lezárt vagy törölt munkalap nem sorolható be a várakozási listára');
        }

        // Use updateMany for tenant-safe update
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            queuePosition: position,
            updatedBy: userId,
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

    const updated = await this.findById(worksheetId, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  /**
   * Reorder entire queue by setting positions based on array order
   * First item in array gets position 1, second gets 2, etc.
   * @param tenantId Tenant ID
   * @param worksheetIds Array of worksheet IDs in desired order
   * @param userId User performing the action
   */
  async reorderQueue(
    tenantId: string,
    worksheetIds: string[],
    userId: string
  ): Promise<IQueueReorderResult> {
    if (worksheetIds.length === 0) {
      return { updated: 0, worksheets: [] };
    }

    return this.prisma.$transaction(
      async tx => {
        // Verify all worksheets exist and belong to tenant
        const worksheets = await tx.worksheet.findMany({
          where: {
            id: { in: worksheetIds },
            tenantId,
          },
          select: { id: true, status: true },
        });

        if (worksheets.length !== worksheetIds.length) {
          const foundIds = new Set(worksheets.map(w => w.id));
          const missingIds = worksheetIds.filter(id => !foundIds.has(id));
          throw new Error(`Worksheetek nem találhatók: ${missingIds.join(', ')}`);
        }

        // Check for closed/cancelled worksheets
        const invalidWorksheets = worksheets.filter(
          w => w.status === 'DELIVERED' || w.status === 'CANCELLED'
        );
        if (invalidWorksheets.length > 0) {
          throw new Error('Lezárt vagy törölt munkalapok nem rendezhetők');
        }

        // Update positions - use for-of with index for cleaner code
        const result: Array<{ id: string; queuePosition: number }> = [];
        let position = 1;
        for (const worksheetId of worksheetIds) {
          await tx.worksheet.updateMany({
            where: { id: worksheetId, tenantId },
            data: {
              queuePosition: position,
              updatedBy: userId,
              updatedAt: new Date(),
            },
          });

          result.push({ id: worksheetId, queuePosition: position });
          position++;
        }

        return {
          updated: worksheetIds.length,
          worksheets: result,
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 15000, // Longer timeout for batch operation
      }
    );
  }

  /**
   * Get worksheets by priority level
   * @param priority Priority level to filter
   * @param tenantId Tenant ID
   * @param limit Maximum results (default 50)
   */
  async getWorksheetsByPriority(
    priority: WorksheetPriority,
    tenantId: string,
    limit = 50
  ): Promise<IWorksheet[]> {
    const worksheets = await this.prisma.worksheet.findMany({
      where: {
        tenantId,
        priority: this.toPrismaPriority(priority),
        // Only active worksheets
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: [{ queuePosition: 'asc' }, { receivedAt: 'asc' }],
      take: limit,
    });

    return worksheets.map(w => this.toWorksheetDomain(w));
  }

  /**
   * Add a worksheet to the queue at the end
   * Automatically assigns the next available position
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async addToQueue(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet> {
    return this.prisma.$transaction(
      async tx => {
        // Verify worksheet exists and belongs to tenant
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, status: true, queuePosition: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Business rule: Cannot queue closed/cancelled worksheets
        if (worksheet.status === 'DELIVERED' || worksheet.status === 'CANCELLED') {
          throw new Error('Lezárt vagy törölt munkalap nem adható a várakozási listához');
        }

        // Already in queue
        if (worksheet.queuePosition !== null) {
          throw new Error('A munkalap már a várakozási listán van');
        }

        // Find the highest current position
        const maxPositionResult = await tx.worksheet.aggregate({
          where: {
            tenantId,
            queuePosition: { not: null },
          },
          _max: { queuePosition: true },
        });

        const nextPosition = (maxPositionResult._max.queuePosition ?? 0) + 1;

        // Update worksheet with new position
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            queuePosition: nextPosition,
            updatedBy: userId,
            updatedAt: new Date(),
          },
        });

        // Fetch updated worksheet
        const updated = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          include: {
            partner: { select: { id: true, name: true } },
          },
        });

        return this.toWorksheetDomain(updated!);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Remove a worksheet from the queue
   * Sets queuePosition to null
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async removeFromQueue(
    worksheetId: string,
    tenantId: string,
    userId: string
  ): Promise<IWorksheet> {
    await this.prisma.$transaction(
      async tx => {
        // Verify worksheet exists and belongs to tenant
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, queuePosition: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Already not in queue
        if (worksheet.queuePosition === null) {
          return; // Nothing to do
        }

        // Remove from queue
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            queuePosition: null,
            updatedBy: userId,
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

    const updated = await this.findById(worksheetId, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  // ============================================
  // STORAGE FEE METHODS (Epic 17-8)
  // ============================================

  /**
   * Start charging storage fee for a worksheet
   * Storage fee is charged when customer doesn't pick up their item
   * @param worksheetId Worksheet ID
   * @param dailyFee Daily storage fee amount
   * @param tenantId Tenant ID
   * @param userId User performing the action
   * @param startDate Optional start date (defaults to today)
   */
  async startStorageFee(
    worksheetId: string,
    dailyFee: number,
    tenantId: string,
    userId: string,
    startDate?: Date
  ): Promise<IWorksheet> {
    if (dailyFee < 0) {
      throw new Error('Napi díj nem lehet negatív');
    }

    await this.prisma.$transaction(
      async tx => {
        // Verify worksheet exists and belongs to tenant
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { id: true, status: true, storageStartDate: true },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Business rule: Cannot start storage on cancelled worksheets
        if (worksheet.status === 'CANCELLED') {
          throw new Error('Törölt munkalapra nem indítható tárolási díj');
        }

        // Business rule: Storage can only start on COMPLETED worksheets (ready for pickup)
        if (worksheet.status !== 'COMPLETED') {
          throw new Error('Tárolási díj csak elkészült munkalapoknál indítható');
        }

        // Check if already has storage fee
        if (worksheet.storageStartDate !== null) {
          throw new Error('A munkalapnak már van aktív tárolási díja');
        }

        const effectiveStartDate = startDate ?? new Date();

        // H4 FIX: Audit trail for storage fee start
        const worksheet2 = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: { internalNotes: true },
        });
        const existingNotes = worksheet2?.internalNotes ?? '';
        const timestamp = new Date().toISOString();
        const auditNote = `[${timestamp}] Tárolási díj indítva: ${dailyFee} Ft/nap`;
        const newNotes = existingNotes ? `${existingNotes}\n${auditNote}` : auditNote;

        // Update worksheet with storage fee
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            storageStartDate: effectiveStartDate,
            storageDailyFee: dailyFee,
            storageTotalFee: 0, // Will be calculated on demand or stop
            internalNotes: newNotes,
            updatedBy: userId,
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

    const updated = await this.findById(worksheetId, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  /**
   * Calculate current storage fee for a worksheet
   * Does not modify the worksheet - just calculates
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   */
  async calculateStorageFee(
    worksheetId: string,
    tenantId: string
  ): Promise<IStorageFeeCalculation> {
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { id: worksheetId, tenantId },
      select: {
        id: true,
        storageStartDate: true,
        storageDailyFee: true,
        storageTotalFee: true,
      },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    const isActive = worksheet.storageStartDate !== null;
    const dailyFee = Number(worksheet.storageDailyFee ?? 0);
    const currentTotalFee = Number(worksheet.storageTotalFee ?? 0);

    let daysStored = 0;
    let calculatedFee = 0;

    if (isActive && worksheet.storageStartDate) {
      // H3 FIX: Calculate days using date-only comparison (timezone-safe)
      const now = new Date();
      const start = new Date(worksheet.storageStartDate);
      // Reset time parts to compare dates only
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Calculate days including start day (minimum 1 day if started today)
      const diffDays = Math.round((nowDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
      daysStored = Math.max(1, diffDays + 1); // Minimum 1 day, +1 to include start day
      calculatedFee = daysStored * dailyFee;
    }

    return {
      worksheetId: worksheet.id,
      storageStartDate: worksheet.storageStartDate,
      storageDailyFee: dailyFee,
      daysStored,
      calculatedFee,
      currentTotalFee,
      isActive,
    };
  }

  /**
   * Stop storage fee and finalize the total
   * Should be called when customer picks up their item
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   * @param userId User performing the action
   */
  async stopStorageFee(worksheetId: string, tenantId: string, userId: string): Promise<IWorksheet> {
    await this.prisma.$transaction(
      async tx => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id: worksheetId, tenantId },
          select: {
            id: true,
            storageStartDate: true,
            storageDailyFee: true,
            internalNotes: true,
          },
        });

        if (!worksheet) {
          throw new Error('Munkalap nem található');
        }

        // Check if has active storage fee
        if (worksheet.storageStartDate === null) {
          throw new Error('A munkalapnak nincs aktív tárolási díja');
        }

        // H3 FIX: Calculate final storage fee using date-only comparison
        const dailyFee = Number(worksheet.storageDailyFee ?? 0);
        const now = new Date();
        const start = new Date(worksheet.storageStartDate);
        // Reset time parts to compare dates only
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round(
          (nowDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysStored = Math.max(1, diffDays + 1);
        const finalFee = daysStored * dailyFee;

        // H4 FIX: Audit trail for storage fee stop
        const existingNotes = worksheet.internalNotes ?? '';
        const timestamp = new Date().toISOString();
        const auditNote = `[${timestamp}] Tárolási díj lezárva: ${daysStored} nap, ${finalFee} Ft`;
        const newNotes = existingNotes ? `${existingNotes}\n${auditNote}` : auditNote;

        // Update worksheet - clear start date to indicate stopped, keep total
        await tx.worksheet.updateMany({
          where: { id: worksheetId, tenantId },
          data: {
            storageStartDate: null, // Clear to indicate stopped
            storageTotalFee: finalFee,
            internalNotes: newNotes,
            updatedBy: userId,
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

    const updated = await this.findById(worksheetId, tenantId);
    if (!updated) {
      throw new Error('Munkalap nem található frissítés után');
    }

    return updated;
  }

  /**
   * Get all worksheets with storage fee (active or historical)
   * @param tenantId Tenant ID
   * @param activeOnly Only return worksheets with active (ongoing) storage fee
   */
  async getWorksheetsWithStorageFee(tenantId: string, activeOnly = false): Promise<IWorksheet[]> {
    const where: Prisma.WorksheetWhereInput = {
      tenantId,
    };

    if (activeOnly) {
      // Active storage = has start date
      where.storageStartDate = { not: null };
    } else {
      // Any storage (active or historical with total > 0)
      where.OR = [{ storageStartDate: { not: null } }, { storageTotalFee: { gt: 0 } }];
    }

    const worksheets = await this.prisma.worksheet.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: [{ storageStartDate: 'desc' }, { receivedAt: 'desc' }],
    });

    return worksheets.map(w => this.toWorksheetDomain(w));
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  private buildWhereClause(
    tenantId: string,
    filter: Partial<WorksheetFilterDto>
  ): Prisma.WorksheetWhereInput {
    const where: Prisma.WorksheetWhereInput = {
      tenantId,
    };

    if (filter.status) {
      where.status = this.toPrismaStatus(filter.status as WorksheetStatus);
    }

    if (filter.type) {
      // Map type to isWarranty and rentalId conditions
      switch (filter.type) {
        case WorksheetType.GARANCIALIS:
          where.isWarranty = true;
          break;
        case WorksheetType.BERLESI:
          where.rentalId = { not: null };
          where.isWarranty = false;
          break;
        case WorksheetType.FIZETOS:
          where.isWarranty = false;
          where.rentalId = null;
          break;
      }
    }

    if (filter.partnerId) {
      where.partnerId = filter.partnerId;
    }

    if (filter.dateFrom) {
      where.receivedAt = { gte: filter.dateFrom };
    }

    if (filter.dateTo) {
      where.receivedAt = {
        ...(where.receivedAt as Prisma.DateTimeFilter),
        lte: filter.dateTo,
      };
    }

    if (filter.search) {
      where.OR = [
        { worksheetNumber: { contains: filter.search, mode: 'insensitive' } },
        { brand: { contains: filter.search, mode: 'insensitive' } },
        { model: { contains: filter.search, mode: 'insensitive' } },
        { serialNumber: { contains: filter.search, mode: 'insensitive' } },
        { reportedIssue: { contains: filter.search, mode: 'insensitive' } },
        { partner: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}

// ============================================
// WORKSHEET ITEM REPOSITORY
// ============================================

@Injectable()
export class PrismaWorksheetItemRepository implements IWorksheetItemRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  private toItemDomain(item: PrismaWorksheetItem): IWorksheetItem {
    const result: IWorksheetItem = {
      id: item.id,
      worksheetId: item.worksheetId,
      tenantId: '',
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      vatRate: 27,
      netAmount: Number(item.totalPrice),
      grossAmount: Math.round(Number(item.totalPrice) * 1.27),
      itemType: this.mapItemType(item.itemType),
      isReserved: item.isReserved,
      createdAt: item.createdAt,
    };

    // Add optional fields only when defined (exactOptionalPropertyTypes compliance)
    if (item.productId !== null) {
      result.productId = item.productId;
    }
    if (item.serviceNormId !== null) {
      result.serviceNormId = item.serviceNormId;
    }
    if (item.reservedAt !== null) {
      result.reservedAt = item.reservedAt;
    }
    if (item.reserveExpiresAt !== null) {
      result.reserveExpiresAt = item.reserveExpiresAt;
    }
    if (item.notes !== null) {
      result.notes = item.notes;
    }

    return result;
  }

  private mapItemType(prismaType: string): 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB' {
    const typeMap: Record<string, 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB'> = {
      PART: 'ALKATRESZ',
      LABOR: 'MUNKADIJ',
      OTHER: 'EGYEB',
    };
    return typeMap[prismaType] ?? 'EGYEB';
  }

  private toPrismaItemType(domainType: 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB'): string {
    const typeMap: Record<string, string> = {
      ALKATRESZ: 'PART',
      MUNKADIJ: 'LABOR',
      EGYEB: 'OTHER',
    };
    return typeMap[domainType] ?? 'OTHER';
  }

  async create(data: Partial<IWorksheetItem>): Promise<IWorksheetItem> {
    if (!data.worksheetId) {
      throw new Error('Munkalap ID megadása kötelező');
    }
    if (!data.description) {
      throw new Error('Leírás megadása kötelező');
    }
    if (data.quantity === undefined || data.quantity <= 0) {
      throw new Error('Mennyiség pozitív kell legyen');
    }
    if (data.unitPrice === undefined || data.unitPrice < 0) {
      throw new Error('Egységár nem lehet negatív');
    }

    // Verify worksheet exists before creating item
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: data.worksheetId },
      select: { id: true },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    const totalPrice = data.quantity * data.unitPrice;

    const item = await this.prisma.worksheetItem.create({
      data: {
        worksheetId: data.worksheetId,
        itemType: this.toPrismaItemType(data.itemType ?? 'EGYEB'),
        productId: data.productId ?? null,
        description: data.description,
        quantity: data.quantity,
        unit: 'db',
        unitPrice: data.unitPrice,
        totalPrice,
      },
    });

    // Update worksheet totals
    await this.updateWorksheetTotals(data.worksheetId);

    return this.toItemDomain(item);
  }

  async findById(id: string): Promise<IWorksheetItem | null> {
    const item = await this.prisma.worksheetItem.findUnique({
      where: { id },
    });

    return item ? this.toItemDomain(item) : null;
  }

  async findByWorksheetId(worksheetId: string): Promise<IWorksheetItem[]> {
    const items = await this.prisma.worksheetItem.findMany({
      where: { worksheetId },
      orderBy: { createdAt: 'asc' },
    });

    return items.map(i => this.toItemDomain(i));
  }

  async update(id: string, data: Partial<IWorksheetItem>): Promise<IWorksheetItem> {
    const existing = await this.prisma.worksheetItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tétel nem található');
    }

    const updateData: Prisma.WorksheetItemUpdateInput = {};

    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }
    if (data.unitPrice !== undefined) {
      updateData.unitPrice = data.unitPrice;
    }
    if (data.itemType !== undefined) {
      updateData.itemType = this.toPrismaItemType(data.itemType);
    }
    if (data.productId !== undefined) {
      updateData.product = data.productId
        ? { connect: { id: data.productId } }
        : { disconnect: true };
    }

    // Recalculate total if quantity or price changed
    const quantity = data.quantity ?? Number(existing.quantity);
    const unitPrice = data.unitPrice ?? Number(existing.unitPrice);
    updateData.totalPrice = quantity * unitPrice;

    const item = await this.prisma.worksheetItem.update({
      where: { id },
      data: updateData,
    });

    // Update worksheet totals
    await this.updateWorksheetTotals(existing.worksheetId);

    return this.toItemDomain(item);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.worksheetItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tétel nem található');
    }

    await this.prisma.worksheetItem.delete({
      where: { id },
    });

    // Update worksheet totals
    await this.updateWorksheetTotals(existing.worksheetId);
  }

  async sumByWorksheetId(worksheetId: string): Promise<{ net: number; gross: number }> {
    const result = await this.prisma.worksheetItem.aggregate({
      where: { worksheetId },
      _sum: { totalPrice: true },
    });

    const net = Number(result._sum.totalPrice ?? 0);
    const gross = Math.round(net * 1.27);

    return { net, gross };
  }

  private async updateWorksheetTotals(worksheetId: string): Promise<void> {
    // Use transaction to prevent race conditions
    await this.prisma.$transaction(async tx => {
      // Get all items grouped by type
      const items = await tx.worksheetItem.findMany({
        where: { worksheetId },
      });

      let laborCost = 0;
      let partsCost = 0;
      let otherCost = 0;

      for (const item of items) {
        const amount = Number(item.totalPrice);
        switch (item.itemType) {
          case 'LABOR':
            laborCost += amount;
            break;
          case 'PART':
            partsCost += amount;
            break;
          default:
            otherCost += amount;
        }
      }

      const subtotal = laborCost + partsCost + otherCost;
      const vatAmount = Math.round(subtotal * 0.27);
      const totalAmount = subtotal + vatAmount;

      await tx.worksheet.update({
        where: { id: worksheetId },
        data: {
          laborCost,
          partsCost,
          otherCost,
          subtotal,
          vatAmount,
          totalAmount,
          updatedAt: new Date(),
        },
      });
    });
  }

  // ============================================
  // RESERVATION METHODS (Epic 17-4)
  // ============================================

  /**
   * Reserve a worksheet item (parts only)
   * Creates a soft reservation that expires after specified time
   * @param id Item ID
   * @param tenantId Tenant ID for security
   * @param expiresInMinutes Reservation expiry time (default 30 minutes)
   */
  async reserveItem(id: string, tenantId: string, expiresInMinutes = 30): Promise<IWorksheetItem> {
    // Use serializable transaction to prevent double-reservation
    const item = await this.prisma.$transaction(
      async tx => {
        // Find item with tenant verification via worksheet
        const existing = await tx.worksheetItem.findFirst({
          where: {
            id,
            worksheet: { tenantId },
          },
          include: {
            worksheet: { select: { status: true } },
          },
        });

        if (!existing) {
          throw new Error('Tétel nem található');
        }

        // Business rule: Can only reserve PART type items
        if (existing.itemType !== 'PART') {
          throw new Error('Csak alkatrész típusú tételt lehet foglalni');
        }

        // Business rule: Cannot reserve on closed/cancelled worksheets
        if (
          existing.worksheet.status === 'DELIVERED' ||
          existing.worksheet.status === 'CANCELLED'
        ) {
          throw new Error('Lezárt munkalaphoz tartozó tétel nem foglalható');
        }

        // Check if already reserved and not expired
        if (existing.isReserved && existing.reserveExpiresAt) {
          if (existing.reserveExpiresAt > new Date()) {
            throw new Error('A tétel már foglalt');
          }
        }

        // Set reservation
        const reservedAt = new Date();
        const reserveExpiresAt = new Date(reservedAt.getTime() + expiresInMinutes * 60 * 1000);

        // Use updateMany for tenant-safe update
        await tx.worksheetItem.updateMany({
          where: { id },
          data: {
            isReserved: true,
            reservedAt,
            reserveExpiresAt,
          },
        });

        // Return updated item
        return tx.worksheetItem.findUniqueOrThrow({ where: { id } });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return this.toItemDomain(item);
  }

  /**
   * Release a reservation on a worksheet item
   * H2 FIX: Added worksheet status check for consistency
   * @param id Item ID
   * @param tenantId Tenant ID for security
   */
  async releaseReservation(id: string, tenantId: string): Promise<IWorksheetItem> {
    const item = await this.prisma.$transaction(
      async tx => {
        // Verify item exists and belongs to tenant
        const existing = await tx.worksheetItem.findFirst({
          where: {
            id,
            worksheet: { tenantId },
          },
          include: {
            worksheet: { select: { status: true } },
          },
        });

        if (!existing) {
          throw new Error('Tétel nem található');
        }

        // H2 FIX: Check worksheet status - cannot modify items on closed worksheets
        if (
          existing.worksheet.status === 'DELIVERED' ||
          existing.worksheet.status === 'CANCELLED'
        ) {
          throw new Error('Lezárt munkalaphoz tartozó foglalás nem módosítható');
        }

        if (!existing.isReserved) {
          // Already not reserved, just return as-is
          return existing;
        }

        // Release reservation
        await tx.worksheetItem.updateMany({
          where: { id },
          data: {
            isReserved: false,
            reservedAt: null,
            reserveExpiresAt: null,
          },
        });

        return tx.worksheetItem.findUniqueOrThrow({ where: { id } });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return this.toItemDomain(item);
  }

  /**
   * Get all reserved items for a worksheet
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID for security
   */
  async getReservedItems(worksheetId: string, tenantId: string): Promise<IWorksheetItem[]> {
    // Verify worksheet belongs to tenant
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { id: worksheetId, tenantId },
      select: { id: true },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    const items = await this.prisma.worksheetItem.findMany({
      where: {
        worksheetId,
        isReserved: true,
        reserveExpiresAt: { gt: new Date() }, // Only active reservations
      },
      orderBy: { reservedAt: 'asc' },
    });

    return items.map(i => this.toItemDomain(i));
  }

  /**
   * Cleanup expired reservations across all tenants
   * Typically called by a scheduled job
   * @returns Number of released reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    const result = await this.prisma.worksheetItem.updateMany({
      where: {
        isReserved: true,
        reserveExpiresAt: { lt: new Date() },
      },
      data: {
        isReserved: false,
        reservedAt: null,
        reserveExpiresAt: null,
      },
    });

    return result.count;
  }

  /**
   * Check if a product has enough stock available for reservation
   * Considers existing reservations when checking availability
   * Uses InventoryItem table for stock levels
   * H4 FIX: Added product existence verification
   * @param productId Product ID to check
   * @param quantity Required quantity
   * @param tenantId Tenant ID
   * @returns true if available, false if not enough stock
   * @throws Error if product doesn't exist
   */
  async checkReservationAvailability(
    productId: string,
    quantity: number,
    tenantId: string
  ): Promise<boolean> {
    // H4 FIX: Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, trackInventory: true },
    });

    if (!product) {
      throw new Error('Termék nem található');
    }

    // If product doesn't track inventory, always return true
    if (!product.trackInventory) {
      return true;
    }

    // Get total inventory for this product across all warehouses
    const inventoryResult = await this.prisma.inventoryItem.aggregate({
      where: {
        productId,
        tenantId,
        status: 'AVAILABLE',
      },
      _sum: { quantity: true },
    });

    const totalStock = inventoryResult._sum.quantity ?? 0;

    if (totalStock === 0) {
      return false;
    }

    // Sum currently reserved quantities for this product (active reservations only)
    const reservedResult = await this.prisma.worksheetItem.aggregate({
      where: {
        productId,
        isReserved: true,
        reserveExpiresAt: { gt: new Date() },
        worksheet: { tenantId },
      },
      _sum: { quantity: true },
    });

    const reservedQty = Number(reservedResult._sum.quantity ?? 0);
    const availableStock = totalStock - reservedQty;

    return availableStock >= quantity;
  }

  // ============================================
  // LABOR CALCULATION METHODS (Epic 17-5)
  // ============================================

  /**
   * Create a labor item from ServiceNorm
   * Automatically calculates cost based on norm's laborMinutes and laborRate
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   * @param normId ServiceNorm ID to use for calculation
   * @param quantity Number of times this labor is performed (default 1)
   * @param notes Optional notes for this labor item
   */
  async createLaborItem(
    worksheetId: string,
    tenantId: string,
    normId: string,
    quantity = 1,
    notes?: string
  ): Promise<IWorksheetItem> {
    // Use transaction to ensure data consistency
    const item = await this.prisma.$transaction(async tx => {
      // Verify worksheet exists and belongs to tenant
      const worksheet = await tx.worksheet.findFirst({
        where: { id: worksheetId, tenantId },
        select: { id: true, status: true },
      });

      if (!worksheet) {
        throw new Error('Munkalap nem található');
      }

      // Business rule: Cannot add items to closed/cancelled worksheets
      if (worksheet.status === 'DELIVERED' || worksheet.status === 'CANCELLED') {
        throw new Error('Lezárt munkalaphoz nem adható tétel');
      }

      // H1 FIX: Get the ServiceNorm with validity check
      const now = new Date();
      const norm = await tx.serviceNorm.findFirst({
        where: {
          id: normId,
          tenantId,
          isActive: true,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      });

      if (!norm) {
        throw new Error('Szerviz norma nem található, inaktív vagy lejárt');
      }

      // Calculate labor cost
      const laborRate = Number(norm.laborRate);
      const laborMinutes = norm.laborMinutes;
      const unitPrice = Math.round((laborMinutes / 60) * laborRate);
      const totalPrice = unitPrice * quantity;

      // Create the worksheet item
      const createdItem = await tx.worksheetItem.create({
        data: {
          worksheetId,
          itemType: 'LABOR',
          serviceNormId: normId,
          description: `${norm.normCode} - ${norm.description}`,
          quantity,
          unit: 'db',
          unitPrice,
          totalPrice,
          notes: notes ?? null,
        },
      });

      return createdItem;
    });

    // Update worksheet totals
    await this.updateWorksheetTotals(worksheetId);

    return this.toItemDomain(item);
  }

  /**
   * Calculate labor summary for a worksheet
   * Returns all labor items with their norm-based calculations
   * @param worksheetId Worksheet ID
   * @param tenantId Tenant ID
   */
  async calculateLaborSummary(
    worksheetId: string,
    tenantId: string
  ): Promise<IWorksheetLaborSummary> {
    // Verify worksheet belongs to tenant
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { id: worksheetId, tenantId },
      select: { id: true },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    // Get all labor items with their service norms
    const laborItems = await this.prisma.worksheetItem.findMany({
      where: {
        worksheetId,
        itemType: 'LABOR',
      },
      include: {
        serviceNorm: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const items: ILaborItemCalculation[] = [];
    let totalMinutes = 0;
    let totalCost = 0;

    for (const item of laborItems) {
      const quantity = Number(item.quantity);
      const calculatedCost = Number(item.totalPrice);

      if (item.serviceNorm) {
        const laborMinutes = item.serviceNorm.laborMinutes * quantity;
        totalMinutes += laborMinutes;

        items.push({
          itemId: item.id,
          normId: item.serviceNorm.id,
          normCode: item.serviceNorm.normCode,
          description: item.serviceNorm.description,
          laborMinutes: item.serviceNorm.laborMinutes,
          laborRate: Number(item.serviceNorm.laborRate),
          quantity,
          calculatedCost,
        });
      } else {
        // Labor item without norm - use stored values
        items.push({
          itemId: item.id,
          normId: '',
          normCode: 'MANUAL',
          description: item.description,
          laborMinutes: 0,
          laborRate: Number(item.unitPrice),
          quantity,
          calculatedCost,
        });
      }

      totalCost += calculatedCost;
    }

    return {
      worksheetId,
      totalItems: items.length,
      totalMinutes,
      totalCost,
      items,
    };
  }

  /**
   * Recalculate a labor item based on current norm rates
   * Useful when norm rates change and items need to be updated
   * @param itemId Worksheet item ID
   * @param tenantId Tenant ID
   */
  async recalculateLaborItem(itemId: string, tenantId: string): Promise<IWorksheetItem> {
    const item = await this.prisma.$transaction(async tx => {
      // Get the item with its norm and worksheet
      const existing = await tx.worksheetItem.findFirst({
        where: {
          id: itemId,
          worksheet: { tenantId },
        },
        include: {
          serviceNorm: true,
          worksheet: { select: { status: true } },
        },
      });

      if (!existing) {
        throw new Error('Tétel nem található');
      }

      // Business rule: Cannot modify items on closed worksheets
      if (existing.worksheet.status === 'DELIVERED' || existing.worksheet.status === 'CANCELLED') {
        throw new Error('Lezárt munkalaphoz tartozó tétel nem módosítható');
      }

      // Only recalculate labor items with a linked norm
      if (existing.itemType !== 'LABOR') {
        throw new Error('Csak munkadíj típusú tétel kalkulálható újra');
      }

      if (!existing.serviceNorm) {
        throw new Error('A tételhez nincs szerviz norma hozzárendelve');
      }

      // Recalculate based on current norm rates
      const laborRate = Number(existing.serviceNorm.laborRate);
      const laborMinutes = existing.serviceNorm.laborMinutes;
      const quantity = Number(existing.quantity);
      const unitPrice = Math.round((laborMinutes / 60) * laborRate);
      const totalPrice = unitPrice * quantity;

      // Update the item
      await tx.worksheetItem.updateMany({
        where: { id: itemId },
        data: {
          unitPrice,
          totalPrice,
          description: `${existing.serviceNorm.normCode} - ${existing.serviceNorm.description}`,
        },
      });

      return tx.worksheetItem.findUniqueOrThrow({ where: { id: itemId } });
    });

    // Update worksheet totals
    await this.updateWorksheetTotals(item.worksheetId);

    return this.toItemDomain(item);
  }
}

// ============================================
// REPOSITORY TOKENS
// ============================================

export const WORKSHEET_REPOSITORY = Symbol('WORKSHEET_REPOSITORY');
export const WORKSHEET_ITEM_REPOSITORY = Symbol('WORKSHEET_ITEM_REPOSITORY');
