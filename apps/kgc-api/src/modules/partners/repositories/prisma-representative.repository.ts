/**
 * Prisma Representative Repository
 * Implements IRepresentativeRepository for PostgreSQL persistence
 * Epic 7: Story 7-2: Meghatalmazott kezelés
 */

import {
  CreateRepresentativeInput,
  IRepresentativeRepository,
  Representative,
  RepresentativeQuery,
  RepresentativeQueryResult,
  RepresentativeValidationResult,
  UpdateRepresentativeInput,
} from '@kgc/partners';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, Representative as PrismaRepresentative } from '@prisma/client';

@Injectable()
export class PrismaRepresentativeRepository implements IRepresentativeRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma Representative to domain interface
   */
  private toRepresentativeDomain(rep: PrismaRepresentative): Representative {
    return {
      id: rep.id,
      tenantId: rep.tenantId,
      partnerId: rep.partnerId,
      name: rep.name,
      phone: rep.phone,
      email: rep.email,
      idNumber: rep.idNumber,
      validFrom: rep.validFrom,
      validUntil: rep.validUntil,
      isActive: rep.isActive,
      canRent: rep.canRent,
      canReturn: rep.canReturn,
      canSign: rep.canSign,
      canPayCash: rep.canPayCash,
      notes: rep.notes,
      createdAt: rep.createdAt,
      updatedAt: rep.updatedAt,
    };
  }

  // ============================================
  // CLEAR (testing only)
  // ============================================

  clear(): void {
    // No-op: Database cleanup should be handled by test fixtures
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: RepresentativeQuery): Promise<RepresentativeQueryResult> {
    const where: Prisma.RepresentativeWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.partnerId) {
      where.partnerId = params.partnerId;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.canRent !== undefined) {
      where.canRent = params.canRent;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { idNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [representatives, total] = await Promise.all([
      this.prisma.representative.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.representative.count({ where }),
    ]);

    return {
      representatives: representatives.map(r => this.toRepresentativeDomain(r)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<Representative | null> {
    const rep = await this.prisma.representative.findFirst({
      where: { id, tenantId },
    });
    return rep ? this.toRepresentativeDomain(rep) : null;
  }

  async findByPartnerId(partnerId: string, tenantId: string): Promise<Representative[]> {
    const representatives = await this.prisma.representative.findMany({
      where: { partnerId, tenantId },
      orderBy: { name: 'asc' },
    });
    return representatives.map(r => this.toRepresentativeDomain(r));
  }

  async findActiveByPartnerId(partnerId: string, tenantId: string): Promise<Representative[]> {
    const now = new Date();
    const representatives = await this.prisma.representative.findMany({
      where: {
        partnerId,
        tenantId,
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { name: 'asc' },
    });
    return representatives.map(r => this.toRepresentativeDomain(r));
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreateRepresentativeInput): Promise<Representative> {
    const rep = await this.prisma.representative.create({
      data: {
        tenantId,
        partnerId: data.partnerId,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        idNumber: data.idNumber ?? null,
        validFrom: data.validFrom ?? new Date(),
        validUntil: data.validUntil ?? null,
        isActive: true,
        canRent: data.canRent ?? true,
        canReturn: data.canReturn ?? true,
        canSign: data.canSign ?? true,
        canPayCash: data.canPayCash ?? false,
        notes: data.notes ?? null,
      },
    });

    return this.toRepresentativeDomain(rep);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRepresentativeInput
  ): Promise<Representative> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Meghatalmazott nem található: ${id}`);
    }

    const updateData: Prisma.RepresentativeUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.canRent !== undefined) updateData.canRent = data.canRent;
    if (data.canReturn !== undefined) updateData.canReturn = data.canReturn;
    if (data.canSign !== undefined) updateData.canSign = data.canSign;
    if (data.canPayCash !== undefined) updateData.canPayCash = data.canPayCash;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.representative.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error(`Meghatalmazott frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Meghatalmazott nem található: ${id}`);
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.representative.deleteMany({
      where: { id, tenantId },
    });
  }

  // ============================================
  // ACTIVATION METHODS
  // ============================================

  async activate(id: string, tenantId: string): Promise<Representative> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<Representative> {
    return this.update(id, tenantId, { isActive: false });
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================

  async validate(
    partnerId: string,
    representativeId: string,
    tenantId: string,
    action: 'rent' | 'return' | 'sign' | 'pay_cash'
  ): Promise<RepresentativeValidationResult> {
    const rep = await this.findById(representativeId, tenantId);

    if (!rep || rep.partnerId !== partnerId) {
      return {
        isValid: false,
        representative: null,
        errorCode: 'NOT_FOUND',
        errorMessage: 'Representative not found',
      };
    }

    if (!rep.isActive) {
      return {
        isValid: false,
        representative: { id: rep.id, name: rep.name },
        errorCode: 'INACTIVE',
        errorMessage: 'Representative is inactive',
      };
    }

    const now = new Date();
    if (rep.validFrom > now || (rep.validUntil && rep.validUntil < now)) {
      return {
        isValid: false,
        representative: { id: rep.id, name: rep.name },
        errorCode: 'EXPIRED',
        errorMessage: 'Representative authorization has expired or not yet valid',
      };
    }

    const permissionMap: Record<string, keyof Representative> = {
      rent: 'canRent',
      return: 'canReturn',
      sign: 'canSign',
      pay_cash: 'canPayCash',
    };

    const permissionKey = permissionMap[action];
    if (permissionKey && !rep[permissionKey]) {
      return {
        isValid: false,
        representative: { id: rep.id, name: rep.name },
        errorCode: 'NO_PERMISSION',
        errorMessage: `Representative does not have permission for action: ${action}`,
      };
    }

    return {
      isValid: true,
      representative: { id: rep.id, name: rep.name },
    };
  }

  async hasPermission(
    id: string,
    tenantId: string,
    permission: 'canRent' | 'canReturn' | 'canSign' | 'canPayCash'
  ): Promise<boolean> {
    const rep = await this.findById(id, tenantId);
    if (!rep || !rep.isActive) return false;

    const now = new Date();
    if (rep.validFrom > now || (rep.validUntil && rep.validUntil < now)) {
      return false;
    }

    return rep[permission] === true;
  }

  // ============================================
  // EXPIRING & PERMISSIONS
  // ============================================

  async getExpiringSoon(tenantId: string, daysAhead = 30): Promise<Representative[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const representatives = await this.prisma.representative.findMany({
      where: {
        tenantId,
        isActive: true,
        validUntil: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { validUntil: 'asc' },
    });

    return representatives.map(r => this.toRepresentativeDomain(r));
  }

  async updatePermissions(
    id: string,
    tenantId: string,
    permissions: {
      canRent?: boolean;
      canReturn?: boolean;
      canSign?: boolean;
      canPayCash?: boolean;
    }
  ): Promise<Representative> {
    return this.update(id, tenantId, permissions);
  }

  async extendValidity(id: string, tenantId: string, validUntil: Date): Promise<Representative> {
    return this.update(id, tenantId, { validUntil });
  }

  // ============================================
  // SEARCH
  // ============================================

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { partnerId?: string; activeOnly?: boolean; limit?: number }
  ): Promise<Representative[]> {
    const now = new Date();
    const where: Prisma.RepresentativeWhereInput = {
      tenantId,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { idNumber: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (options?.partnerId) {
      where.partnerId = options.partnerId;
    }
    if (options?.activeOnly !== false) {
      where.isActive = true;
      where.validFrom = { lte: now };
      where.AND = [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }];
    }

    const representatives = await this.prisma.representative.findMany({
      where,
      take: options?.limit ?? 10,
      orderBy: { name: 'asc' },
    });

    return representatives.map(r => this.toRepresentativeDomain(r));
  }
}
