/**
 * Prisma Diagnostic Code Repository
 * Implements diagnostic code CRUD operations for worksheets
 * Epic 17: Munkalap CRUD - Story 17-3: Diagnosztika és hibaokok
 */

import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, DiagnosticCode as PrismaDiagnosticCode } from '@prisma/client';

// ============================================
// LOCAL INTERFACE DEFINITIONS
// ============================================

/**
 * Diagnostic severity levels
 */
export enum DiagnosticSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Diagnostic code entity interface
 */
export interface IDiagnosticCode {
  id: string;
  worksheetId: string;
  code: string;
  description: string;
  severity: DiagnosticSeverity;
  causeFound: boolean;
  diagnosedBy: string;
  diagnosedAt: Date;
}

/**
 * Create diagnostic code input
 */
export interface ICreateDiagnosticInput {
  worksheetId: string;
  code: string;
  description: string;
  severity?: DiagnosticSeverity;
  causeFound?: boolean;
  diagnosedBy: string;
}

/**
 * Update diagnostic code input
 */
export interface IUpdateDiagnosticInput {
  description?: string;
  severity?: DiagnosticSeverity;
  causeFound?: boolean;
}

/**
 * Diagnostic filter options
 */
export interface DiagnosticFilterDto {
  worksheetId?: string;
  severity?: DiagnosticSeverity;
  causeFound?: boolean;
  code?: string;
  diagnosedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Diagnostic summary for worksheet
 */
export interface IDiagnosticSummary {
  worksheetId: string;
  totalCodes: number;
  causesFound: number;
  bySeverity: Record<DiagnosticSeverity, number>;
  mostRecent?: IDiagnosticCode;
}

/**
 * Diagnostic code repository interface
 */
export interface IDiagnosticCodeRepository {
  create(tenantId: string, input: ICreateDiagnosticInput): Promise<IDiagnosticCode>;
  findById(id: string, tenantId: string): Promise<IDiagnosticCode | null>;
  findByWorksheetId(worksheetId: string, tenantId: string): Promise<IDiagnosticCode[]>;
  update(id: string, tenantId: string, input: IUpdateDiagnosticInput): Promise<IDiagnosticCode>;
  delete(id: string, tenantId: string): Promise<void>;
  markCauseFound(id: string, tenantId: string): Promise<IDiagnosticCode>;
  getSummary(worksheetId: string, tenantId: string): Promise<IDiagnosticSummary>;
  findBySeverity(
    severity: DiagnosticSeverity,
    tenantId: string,
    limit?: number
  ): Promise<IDiagnosticCode[]>;
  findByCode(code: string, tenantId: string): Promise<IDiagnosticCode[]>;
}

// ============================================
// PRISMA DIAGNOSTIC CODE REPOSITORY
// ============================================

export const DIAGNOSTIC_CODE_REPOSITORY = Symbol('DIAGNOSTIC_CODE_REPOSITORY');

@Injectable()
export class PrismaDiagnosticCodeRepository implements IDiagnosticCodeRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // DOMAIN MAPPING
  // ============================================

  private toDomain(diagnostic: PrismaDiagnosticCode): IDiagnosticCode {
    return {
      id: diagnostic.id,
      worksheetId: diagnostic.worksheetId,
      code: diagnostic.code,
      description: diagnostic.description,
      severity: this.toSeverityEnum(diagnostic.severity),
      causeFound: diagnostic.causeFound,
      diagnosedBy: diagnostic.diagnosedBy,
      diagnosedAt: diagnostic.diagnosedAt,
    };
  }

  private toSeverityEnum(severity: string): DiagnosticSeverity {
    const severityMap: Record<string, DiagnosticSeverity> = {
      LOW: DiagnosticSeverity.LOW,
      MEDIUM: DiagnosticSeverity.MEDIUM,
      HIGH: DiagnosticSeverity.HIGH,
      CRITICAL: DiagnosticSeverity.CRITICAL,
    };
    return severityMap[severity] ?? DiagnosticSeverity.MEDIUM;
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(tenantId: string, input: ICreateDiagnosticInput): Promise<IDiagnosticCode> {
    // Validate required fields
    if (!input.worksheetId) {
      throw new Error('Munkalap ID megadása kötelező');
    }
    if (!input.code || input.code.trim().length === 0) {
      throw new Error('Hibakód megadása kötelező');
    }
    if (!input.description || input.description.trim().length === 0) {
      throw new Error('Leírás megadása kötelező');
    }
    if (!input.diagnosedBy) {
      throw new Error('Diagnosztizáló user megadása kötelező');
    }

    // Verify worksheet exists and belongs to tenant
    const worksheet = await this.prisma.worksheet.findFirst({
      where: {
        id: input.worksheetId,
        tenantId,
      },
      select: { id: true, status: true },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    // Business rule: Cannot add diagnostics to closed/cancelled worksheets
    if (worksheet.status === 'DELIVERED' || worksheet.status === 'CANCELLED') {
      throw new Error('Lezárt vagy törölt munkalaphoz nem adható diagnosztika');
    }

    // Check for duplicate code on same worksheet
    const existingCode = await this.prisma.diagnosticCode.findFirst({
      where: {
        worksheetId: input.worksheetId,
        code: input.code,
      },
    });

    if (existingCode) {
      throw new Error(`A "${input.code}" hibakód már létezik ezen a munkalapon`);
    }

    const diagnostic = await this.prisma.diagnosticCode.create({
      data: {
        worksheetId: input.worksheetId,
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        severity: input.severity ?? DiagnosticSeverity.MEDIUM,
        causeFound: input.causeFound ?? false,
        diagnosedBy: input.diagnosedBy,
        diagnosedAt: new Date(),
      },
    });

    // Update worksheet diagnosedAt timestamp if this is first diagnostic
    await this.updateWorksheetDiagnosedAt(input.worksheetId);

    return this.toDomain(diagnostic);
  }

  async findById(id: string, tenantId: string): Promise<IDiagnosticCode | null> {
    // Join with worksheet to verify tenant
    const diagnostic = await this.prisma.diagnosticCode.findFirst({
      where: {
        id,
        worksheet: { tenantId },
      },
    });

    return diagnostic ? this.toDomain(diagnostic) : null;
  }

  async findByWorksheetId(worksheetId: string, tenantId: string): Promise<IDiagnosticCode[]> {
    // Verify worksheet belongs to tenant
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { id: worksheetId, tenantId },
      select: { id: true },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    const diagnostics = await this.prisma.diagnosticCode.findMany({
      where: { worksheetId },
      orderBy: { diagnosedAt: 'desc' },
    });

    // H4 FIX: Sort by severity weight (CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1)
    const severityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const sorted = diagnostics.sort((a, b) => {
      const weightA = severityWeight[a.severity] ?? 0;
      const weightB = severityWeight[b.severity] ?? 0;
      if (weightB !== weightA) {
        return weightB - weightA; // Higher severity first
      }
      return b.diagnosedAt.getTime() - a.diagnosedAt.getTime(); // Then by date desc
    });

    return sorted.map(d => this.toDomain(d));
  }

  async update(
    id: string,
    tenantId: string,
    input: IUpdateDiagnosticInput
  ): Promise<IDiagnosticCode> {
    // Build update data first (validation before DB)
    const updateData: Prisma.DiagnosticCodeUpdateManyMutationInput = {};

    if (input.description !== undefined) {
      if (input.description.trim().length === 0) {
        throw new Error('Leírás nem lehet üres');
      }
      updateData.description = input.description.trim();
    }

    if (input.severity !== undefined) {
      updateData.severity = input.severity;
    }

    if (input.causeFound !== undefined) {
      updateData.causeFound = input.causeFound;
    }

    // H2 FIX: Use Serializable transaction to prevent TOCTOU
    const updated = await this.prisma.$transaction(
      async tx => {
        // Verify diagnostic exists and belongs to tenant
        const diagnostic = await tx.diagnosticCode.findFirst({
          where: {
            id,
            worksheet: { tenantId },
          },
          select: { id: true, worksheetId: true },
        });

        if (!diagnostic) {
          throw new Error('Diagnosztikai kód nem található');
        }

        // Use updateMany with worksheetId for tenant-safe update
        const result = await tx.diagnosticCode.updateMany({
          where: {
            id,
            worksheetId: diagnostic.worksheetId,
          },
          data: updateData,
        });

        if (result.count === 0) {
          throw new Error('Diagnosztikai kód frissítése sikertelen');
        }

        // Fetch updated record
        return tx.diagnosticCode.findUniqueOrThrow({
          where: { id },
        });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    // H1 FIX: Use Serializable transaction to prevent TOCTOU
    // The isolation level ensures the check and delete are atomic
    await this.prisma.$transaction(
      async tx => {
        // Verify diagnostic exists and belongs to tenant
        const diagnostic = await tx.diagnosticCode.findFirst({
          where: {
            id,
            worksheet: { tenantId },
          },
          select: { id: true, worksheetId: true },
        });

        if (!diagnostic) {
          throw new Error('Diagnosztikai kód nem található');
        }

        // Delete using the verified worksheetId for additional safety
        await tx.diagnosticCode.deleteMany({
          where: {
            id,
            worksheetId: diagnostic.worksheetId,
          },
        });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  // ============================================
  // SPECIALIZED OPERATIONS
  // ============================================

  async markCauseFound(id: string, tenantId: string): Promise<IDiagnosticCode> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Diagnosztikai kód nem található');
    }

    if (existing.causeFound) {
      return existing; // Already marked
    }

    return this.update(id, tenantId, { causeFound: true });
  }

  async getSummary(worksheetId: string, tenantId: string): Promise<IDiagnosticSummary> {
    // Verify worksheet belongs to tenant
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { id: worksheetId, tenantId },
      select: { id: true },
    });

    if (!worksheet) {
      throw new Error('Munkalap nem található');
    }

    const diagnostics = await this.prisma.diagnosticCode.findMany({
      where: { worksheetId },
      orderBy: { diagnosedAt: 'desc' },
    });

    const bySeverity: Record<DiagnosticSeverity, number> = {
      [DiagnosticSeverity.LOW]: 0,
      [DiagnosticSeverity.MEDIUM]: 0,
      [DiagnosticSeverity.HIGH]: 0,
      [DiagnosticSeverity.CRITICAL]: 0,
    };

    let causesFound = 0;

    for (const d of diagnostics) {
      const severity = this.toSeverityEnum(d.severity);
      bySeverity[severity]++;
      if (d.causeFound) {
        causesFound++;
      }
    }

    const result: IDiagnosticSummary = {
      worksheetId,
      totalCodes: diagnostics.length,
      causesFound,
      bySeverity,
    };

    // Add most recent if exists
    const firstDiagnostic = diagnostics[0];
    if (firstDiagnostic) {
      result.mostRecent = this.toDomain(firstDiagnostic);
    }

    return result;
  }

  async findBySeverity(
    severity: DiagnosticSeverity,
    tenantId: string,
    limit = 50
  ): Promise<IDiagnosticCode[]> {
    const diagnostics = await this.prisma.diagnosticCode.findMany({
      where: {
        severity,
        worksheet: { tenantId },
      },
      orderBy: { diagnosedAt: 'desc' },
      take: limit,
    });

    return diagnostics.map(d => this.toDomain(d));
  }

  async findByCode(code: string, tenantId: string): Promise<IDiagnosticCode[]> {
    // H5 FIX: Normalize code same way as create() does
    const normalizedCode = code.trim().toUpperCase();

    const diagnostics = await this.prisma.diagnosticCode.findMany({
      where: {
        code: { contains: normalizedCode, mode: 'insensitive' },
        worksheet: { tenantId },
      },
      orderBy: { diagnosedAt: 'desc' },
      take: 100,
    });

    return diagnostics.map(d => this.toDomain(d));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async updateWorksheetDiagnosedAt(worksheetId: string): Promise<void> {
    const count = await this.prisma.diagnosticCode.count({
      where: { worksheetId },
    });

    // If this is the first diagnostic, set diagnosedAt
    if (count === 1) {
      await this.prisma.worksheet.update({
        where: { id: worksheetId },
        data: { diagnosedAt: new Date() },
      });
    }
  }
}
