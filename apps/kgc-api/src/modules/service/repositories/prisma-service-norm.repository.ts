/**
 * Prisma Service Norm Repository
 * Implements IServiceNormRepository for PostgreSQL persistence
 * Epic 20: Szerviz Norma Kezelés
 *
 * Makita, Stihl és más gyártók norma tételeinek kezelése
 * garanciális javítások munkadíj kalkulációjához.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, ServiceNorm as PrismaServiceNorm } from '@prisma/client';

// ============================================
// LOCAL INTERFACE DEFINITIONS
// (Aligned with Prisma ServiceNorm model)
// ============================================

/**
 * Nehézségi szintek
 */
export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT',
}

/**
 * Gyártók
 */
export enum NormaManufacturer {
  MAKITA = 'MAKITA',
  STIHL = 'STIHL',
  HUSQVARNA = 'HUSQVARNA',
  HIKOKI = 'HIKOKI',
  BOSCH = 'BOSCH',
  OTHER = 'OTHER',
}

/**
 * Service Norm entitás
 */
export interface IServiceNorm {
  /** Egyedi azonosító (UUID) */
  id: string;
  /** Tenant azonosító (multi-tenancy) */
  tenantId: string;
  /** Gyártó neve */
  manufacturer: string;
  /** Norma kód (egyedi gyártónként) */
  normCode: string;
  /** Leírás */
  description: string;
  /** Norma munka percek */
  laborMinutes: number;
  /** Óradíj (HUF) */
  laborRate: number;
  /** Nehézségi szint */
  difficultyLevel: DifficultyLevel;
  /** Termék kategória (opcionális) */
  productCategory?: string;
  /** Javítás típusa (opcionális) */
  repairType?: string;
  /** Érvényesség kezdete */
  validFrom: Date;
  /** Érvényesség vége (opcionális) */
  validUntil?: Date;
  /** Aktív-e */
  isActive: boolean;
  /** Import dátum */
  importedAt?: Date;
  /** Import forrás */
  importSource?: string;
  /** Külső azonosító */
  externalId?: string;
  /** Létrehozás dátum */
  createdAt: Date;
  /** Módosítás dátum */
  updatedAt: Date;
  /** Kalkulált munkadíj (laborMinutes/60 * laborRate) */
  calculatedLaborCost: number;
}

/**
 * Norma létrehozás input
 */
export interface ICreateServiceNormInput {
  manufacturer: string;
  normCode: string;
  description: string;
  laborMinutes: number;
  laborRate: number;
  difficultyLevel?: DifficultyLevel | undefined;
  productCategory?: string | undefined;
  repairType?: string | undefined;
  validFrom: Date;
  validUntil?: Date | undefined;
  externalId?: string | undefined;
}

/**
 * Norma frissítés input
 */
export interface IUpdateServiceNormInput {
  description?: string | undefined;
  laborMinutes?: number | undefined;
  laborRate?: number | undefined;
  difficultyLevel?: DifficultyLevel | undefined;
  productCategory?: string | undefined;
  repairType?: string | undefined;
  validUntil?: Date | undefined;
  isActive?: boolean | undefined;
}

/**
 * Norma import input (bulk)
 */
export interface IImportServiceNormInput {
  manufacturer: string;
  normCode: string;
  description: string;
  laborMinutes: number;
  laborRate: number;
  difficultyLevel?: DifficultyLevel | undefined;
  productCategory?: string | undefined;
  repairType?: string | undefined;
  validFrom: Date;
  validUntil?: Date | undefined;
  externalId?: string | undefined;
}

/**
 * Import eredmény
 */
export interface IServiceNormImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    normCode: string;
    error: string;
  }>;
}

/**
 * Norma szűrés DTO
 */
export interface ServiceNormFilterDto {
  manufacturer?: string;
  productCategory?: string;
  repairType?: string;
  difficultyLevel?: DifficultyLevel;
  isActive?: boolean;
  validAt?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Munkadíj kalkuláció eredménye
 */
export interface ILaborCalculationResult {
  normId: string;
  normCode: string;
  description: string;
  laborMinutes: number;
  laborRate: number;
  calculatedCost: number;
}

/**
 * Repository interfész
 */
export interface IServiceNormRepository {
  create(tenantId: string, input: ICreateServiceNormInput): Promise<IServiceNorm>;
  findById(id: string, tenantId: string): Promise<IServiceNorm | null>;
  findByNormCode(
    tenantId: string,
    manufacturer: string,
    normCode: string
  ): Promise<IServiceNorm | null>;
  findAll(tenantId: string, filter: Partial<ServiceNormFilterDto>): Promise<IServiceNorm[]>;
  findByManufacturer(tenantId: string, manufacturer: string): Promise<IServiceNorm[]>;
  findActiveNorms(tenantId: string, manufacturer: string, validAt?: Date): Promise<IServiceNorm[]>;
  update(id: string, tenantId: string, data: IUpdateServiceNormInput): Promise<IServiceNorm>;
  deactivate(id: string, tenantId: string): Promise<void>;
  bulkImport(
    tenantId: string,
    norms: IImportServiceNormInput[],
    importSource: string
  ): Promise<IServiceNormImportResult>;
  calculateLaborCost(
    tenantId: string,
    manufacturer: string,
    normCode: string
  ): Promise<ILaborCalculationResult | null>;
  countByTenant(tenantId: string, filter?: Partial<ServiceNormFilterDto>): Promise<number>;
  getManufacturers(tenantId: string): Promise<string[]>;
  getCategories(tenantId: string, manufacturer: string): Promise<string[]>;
}

// ============================================
// PRISMA SERVICE NORM REPOSITORY
// ============================================

@Injectable()
export class PrismaServiceNormRepository implements IServiceNormRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // DOMAIN MAPPING FUNCTIONS
  // ============================================

  private toDomain(norm: PrismaServiceNorm): IServiceNorm {
    const laborMinutes = norm.laborMinutes;
    const laborRate = Number(norm.laborRate);
    const calculatedLaborCost = Math.round((laborMinutes / 60) * laborRate);

    const result: IServiceNorm = {
      id: norm.id,
      tenantId: norm.tenantId,
      manufacturer: norm.manufacturer,
      normCode: norm.normCode,
      description: norm.description,
      laborMinutes,
      laborRate,
      difficultyLevel: this.toDifficultyLevel(norm.difficultyLevel),
      validFrom: norm.validFrom,
      isActive: norm.isActive,
      createdAt: norm.createdAt,
      updatedAt: norm.updatedAt,
      calculatedLaborCost,
    };

    // Add optional properties only when defined (exactOptionalPropertyTypes compliance)
    if (norm.productCategory !== null) {
      result.productCategory = norm.productCategory;
    }
    if (norm.repairType !== null) {
      result.repairType = norm.repairType;
    }
    if (norm.validUntil !== null) {
      result.validUntil = norm.validUntil;
    }
    if (norm.importedAt !== null) {
      result.importedAt = norm.importedAt;
    }
    if (norm.importSource !== null) {
      result.importSource = norm.importSource;
    }
    if (norm.externalId !== null) {
      result.externalId = norm.externalId;
    }

    return result;
  }

  private toDifficultyLevel(level: string): DifficultyLevel {
    const levelMap: Record<string, DifficultyLevel> = {
      EASY: DifficultyLevel.EASY,
      MEDIUM: DifficultyLevel.MEDIUM,
      HARD: DifficultyLevel.HARD,
      EXPERT: DifficultyLevel.EXPERT,
    };
    return levelMap[level] ?? DifficultyLevel.MEDIUM;
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async create(tenantId: string, input: ICreateServiceNormInput): Promise<IServiceNorm> {
    // Validate required fields
    if (!input.manufacturer.trim()) {
      throw new Error('Gyártó megadása kötelező');
    }
    if (!input.normCode.trim()) {
      throw new Error('Norma kód megadása kötelező');
    }
    if (!input.description.trim()) {
      throw new Error('Leírás megadása kötelező');
    }
    if (input.laborMinutes <= 0) {
      throw new Error('Norma percek pozitív értékű kell legyen');
    }
    if (input.laborRate <= 0) {
      throw new Error('Óradíj pozitív értékű kell legyen');
    }

    // Check for duplicate (tenantId + manufacturer + normCode is unique)
    const existing = await this.findByNormCode(tenantId, input.manufacturer, input.normCode);
    if (existing) {
      throw new Error(`Norma már létezik: ${input.manufacturer} - ${input.normCode}`);
    }

    const norm = await this.prisma.serviceNorm.create({
      data: {
        tenantId,
        manufacturer: input.manufacturer.toUpperCase().trim(),
        normCode: input.normCode.trim(),
        description: input.description.trim(),
        laborMinutes: input.laborMinutes,
        laborRate: input.laborRate,
        difficultyLevel: input.difficultyLevel ?? 'MEDIUM',
        productCategory: input.productCategory?.trim() ?? null,
        repairType: input.repairType?.trim() ?? null,
        validFrom: input.validFrom,
        validUntil: input.validUntil ?? null,
        isActive: true,
        externalId: input.externalId ?? null,
      },
    });

    return this.toDomain(norm);
  }

  // H1 FIX: tenantId is now required for tenant isolation
  async findById(id: string, tenantId: string): Promise<IServiceNorm | null> {
    const norm = await this.prisma.serviceNorm.findFirst({
      where: { id, tenantId },
    });
    return norm ? this.toDomain(norm) : null;
  }

  async findByNormCode(
    tenantId: string,
    manufacturer: string,
    normCode: string
  ): Promise<IServiceNorm | null> {
    const norm = await this.prisma.serviceNorm.findFirst({
      where: {
        tenantId,
        manufacturer: { equals: manufacturer.toUpperCase().trim(), mode: 'insensitive' },
        normCode: { equals: normCode.trim(), mode: 'insensitive' },
      },
    });
    return norm ? this.toDomain(norm) : null;
  }

  async findAll(tenantId: string, filter: Partial<ServiceNormFilterDto>): Promise<IServiceNorm[]> {
    const where = this.buildWhereClause(tenantId, filter);

    const norms = await this.prisma.serviceNorm.findMany({
      where,
      orderBy: [{ manufacturer: 'asc' }, { normCode: 'asc' }],
      skip: filter.offset ?? 0,
      take: filter.limit ?? 50,
    });

    return norms.map(n => this.toDomain(n));
  }

  async findByManufacturer(tenantId: string, manufacturer: string): Promise<IServiceNorm[]> {
    const norms = await this.prisma.serviceNorm.findMany({
      where: {
        tenantId,
        manufacturer: { equals: manufacturer.toUpperCase().trim(), mode: 'insensitive' },
        isActive: true,
      },
      orderBy: { normCode: 'asc' },
    });

    return norms.map(n => this.toDomain(n));
  }

  async findActiveNorms(
    tenantId: string,
    manufacturer: string,
    validAt?: Date
  ): Promise<IServiceNorm[]> {
    const checkDate = validAt ?? new Date();

    const norms = await this.prisma.serviceNorm.findMany({
      where: {
        tenantId,
        manufacturer: { equals: manufacturer.toUpperCase().trim(), mode: 'insensitive' },
        isActive: true,
        validFrom: { lte: checkDate },
        OR: [{ validUntil: null }, { validUntil: { gte: checkDate } }],
      },
      orderBy: { normCode: 'asc' },
    });

    return norms.map(n => this.toDomain(n));
  }

  async update(id: string, tenantId: string, data: IUpdateServiceNormInput): Promise<IServiceNorm> {
    // Verify norm exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Norma tétel nem található');
    }

    const updateData: Prisma.ServiceNormUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.description !== undefined) {
      if (!data.description.trim()) {
        throw new Error('Leírás nem lehet üres');
      }
      updateData.description = data.description.trim();
    }
    if (data.laborMinutes !== undefined) {
      if (data.laborMinutes <= 0) {
        throw new Error('Norma percek pozitív értékű kell legyen');
      }
      updateData.laborMinutes = data.laborMinutes;
    }
    if (data.laborRate !== undefined) {
      if (data.laborRate <= 0) {
        throw new Error('Óradíj pozitív értékű kell legyen');
      }
      updateData.laborRate = data.laborRate;
    }
    if (data.difficultyLevel !== undefined) {
      updateData.difficultyLevel = data.difficultyLevel;
    }
    if (data.productCategory !== undefined) {
      updateData.productCategory = data.productCategory?.trim() ?? null;
    }
    if (data.repairType !== undefined) {
      updateData.repairType = data.repairType?.trim() ?? null;
    }
    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // Use updateMany for tenant-safe update
    await this.prisma.serviceNorm.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.ServiceNormUpdateManyMutationInput,
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Norma tétel nem található frissítés után');
    }

    return updated;
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    // Verify norm exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Norma tétel nem található');
    }

    // H5 FIX: Only set validUntil if it's not already set (preserve original value)
    const updateData: Prisma.ServiceNormUpdateManyMutationInput = {
      isActive: false,
      updatedAt: new Date(),
    };

    // Only set validUntil if the norm doesn't already have one
    if (!existing.validUntil) {
      updateData.validUntil = new Date();
    }

    // Use updateMany for tenant-safe update
    await this.prisma.serviceNorm.updateMany({
      where: { id, tenantId },
      data: updateData,
    });
  }

  async bulkImport(
    tenantId: string,
    norms: IImportServiceNormInput[],
    importSource: string
  ): Promise<IServiceNormImportResult> {
    const result: IServiceNormImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const now = new Date();

    // H2 FIX: Pre-validate all items before starting transaction
    const validatedNorms: Array<{
      norm: IImportServiceNormInput;
      rowNumber: number;
    }> = [];

    for (let i = 0; i < norms.length; i++) {
      const norm = norms[i];
      const rowNumber = i + 1;

      // Validate required fields
      if (!norm) {
        result.errors.push({ row: rowNumber, normCode: '', error: 'Üres sor' });
        result.skipped++;
        continue;
      }
      if (!norm.manufacturer?.trim()) {
        result.errors.push({
          row: rowNumber,
          normCode: norm.normCode ?? '',
          error: 'Hiányzó gyártó',
        });
        result.skipped++;
        continue;
      }
      if (!norm.normCode?.trim()) {
        result.errors.push({ row: rowNumber, normCode: '', error: 'Hiányzó norma kód' });
        result.skipped++;
        continue;
      }
      if (!norm.description?.trim()) {
        result.errors.push({ row: rowNumber, normCode: norm.normCode, error: 'Hiányzó leírás' });
        result.skipped++;
        continue;
      }
      if (norm.laborMinutes <= 0) {
        result.errors.push({
          row: rowNumber,
          normCode: norm.normCode,
          error: 'Érvénytelen norma percek',
        });
        result.skipped++;
        continue;
      }
      if (norm.laborRate <= 0) {
        result.errors.push({
          row: rowNumber,
          normCode: norm.normCode,
          error: 'Érvénytelen óradíj',
        });
        result.skipped++;
        continue;
      }

      validatedNorms.push({ norm, rowNumber });
    }

    // H2 FIX: Process all valid items in a single transaction
    if (validatedNorms.length > 0) {
      try {
        await this.prisma.$transaction(
          async tx => {
            for (const { norm, rowNumber } of validatedNorms) {
              try {
                // Check if norm already exists (within transaction)
                const existing = await tx.serviceNorm.findFirst({
                  where: {
                    tenantId,
                    manufacturer: {
                      equals: norm.manufacturer.toUpperCase().trim(),
                      mode: 'insensitive',
                    },
                    normCode: { equals: norm.normCode.trim(), mode: 'insensitive' },
                  },
                });

                if (existing) {
                  // Update existing norm
                  await tx.serviceNorm.updateMany({
                    where: {
                      id: existing.id,
                      tenantId,
                    },
                    data: {
                      description: norm.description.trim(),
                      laborMinutes: norm.laborMinutes,
                      laborRate: norm.laborRate,
                      difficultyLevel: norm.difficultyLevel ?? 'MEDIUM',
                      productCategory: norm.productCategory?.trim() ?? null,
                      repairType: norm.repairType?.trim() ?? null,
                      validFrom: norm.validFrom,
                      validUntil: norm.validUntil ?? null,
                      externalId: norm.externalId ?? null,
                      importedAt: now,
                      importSource,
                      isActive: true,
                      updatedAt: now,
                    },
                  });
                  result.updated++;
                } else {
                  // Create new norm
                  await tx.serviceNorm.create({
                    data: {
                      tenantId,
                      manufacturer: norm.manufacturer.toUpperCase().trim(),
                      normCode: norm.normCode.trim(),
                      description: norm.description.trim(),
                      laborMinutes: norm.laborMinutes,
                      laborRate: norm.laborRate,
                      difficultyLevel: norm.difficultyLevel ?? 'MEDIUM',
                      productCategory: norm.productCategory?.trim() ?? null,
                      repairType: norm.repairType?.trim() ?? null,
                      validFrom: norm.validFrom,
                      validUntil: norm.validUntil ?? null,
                      externalId: norm.externalId ?? null,
                      importedAt: now,
                      importSource,
                      isActive: true,
                    },
                  });
                  result.imported++;
                }
              } catch (error) {
                // Re-throw to rollback entire transaction
                throw new Error(
                  `Sor ${rowNumber} (${norm.normCode}): ${error instanceof Error ? error.message : 'Ismeretlen hiba'}`
                );
              }
            }
          },
          {
            timeout: 60000, // 60 seconds for large imports
          }
        );
      } catch (error) {
        // Transaction failed - all changes rolled back
        result.errors.push({
          row: 0,
          normCode: '',
          error: `Import visszagörgetésre került: ${error instanceof Error ? error.message : 'Ismeretlen hiba'}`,
        });
        // Reset counters since everything was rolled back
        result.imported = 0;
        result.updated = 0;
        result.skipped = validatedNorms.length;
      }
    }

    return result;
  }

  async calculateLaborCost(
    tenantId: string,
    manufacturer: string,
    normCode: string
  ): Promise<ILaborCalculationResult | null> {
    // H3 FIX: Check validity dates in addition to isActive
    const now = new Date();

    const norm = await this.prisma.serviceNorm.findFirst({
      where: {
        tenantId,
        manufacturer: { equals: manufacturer.toUpperCase().trim(), mode: 'insensitive' },
        normCode: { equals: normCode.trim(), mode: 'insensitive' },
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
    });

    if (!norm) {
      return null;
    }

    const laborRate = Number(norm.laborRate);
    const calculatedCost = Math.round((norm.laborMinutes / 60) * laborRate);

    return {
      normId: norm.id,
      normCode: norm.normCode,
      description: norm.description,
      laborMinutes: norm.laborMinutes,
      laborRate,
      calculatedCost,
    };
  }

  async countByTenant(tenantId: string, filter?: Partial<ServiceNormFilterDto>): Promise<number> {
    const where = this.buildWhereClause(tenantId, filter ?? {});
    return this.prisma.serviceNorm.count({ where });
  }

  async getManufacturers(tenantId: string): Promise<string[]> {
    const result = await this.prisma.serviceNorm.findMany({
      where: { tenantId, isActive: true },
      select: { manufacturer: true },
      distinct: ['manufacturer'],
      orderBy: { manufacturer: 'asc' },
    });

    return result.map(r => r.manufacturer);
  }

  async getCategories(tenantId: string, manufacturer: string): Promise<string[]> {
    const result = await this.prisma.serviceNorm.findMany({
      where: {
        tenantId,
        manufacturer: { equals: manufacturer.toUpperCase().trim(), mode: 'insensitive' },
        isActive: true,
        productCategory: { not: null },
      },
      select: { productCategory: true },
      distinct: ['productCategory'],
      orderBy: { productCategory: 'asc' },
    });

    return result.map(r => r.productCategory).filter((c): c is string => c !== null);
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  private buildWhereClause(
    tenantId: string,
    filter: Partial<ServiceNormFilterDto>
  ): Prisma.ServiceNormWhereInput {
    const where: Prisma.ServiceNormWhereInput = {
      tenantId,
    };

    if (filter.manufacturer) {
      where.manufacturer = {
        equals: filter.manufacturer.toUpperCase().trim(),
        mode: 'insensitive',
      };
    }

    if (filter.productCategory) {
      where.productCategory = { equals: filter.productCategory, mode: 'insensitive' };
    }

    if (filter.repairType) {
      where.repairType = { equals: filter.repairType, mode: 'insensitive' };
    }

    if (filter.difficultyLevel) {
      where.difficultyLevel = filter.difficultyLevel;
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    // H1 FIX: Combine validAt and search conditions using AND
    const andConditions: Prisma.ServiceNormWhereInput[] = [];

    if (filter.validAt) {
      where.validFrom = { lte: filter.validAt };
      andConditions.push({
        OR: [{ validUntil: null }, { validUntil: { gte: filter.validAt } }],
      });
    }

    if (filter.search) {
      andConditions.push({
        OR: [
          { normCode: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { manufacturer: { contains: filter.search, mode: 'insensitive' } },
          { productCategory: { contains: filter.search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }
}

// ============================================
// REPOSITORY TOKEN
// ============================================

export const SERVICE_NORM_REPOSITORY = Symbol('SERVICE_NORM_REPOSITORY');
