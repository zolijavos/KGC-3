/**
 * Prisma Partner Repository
 * Implements IPartnerRepository for PostgreSQL persistence
 * Epic 7: Story 7-1: Partner CRUD magánszemély és cég
 */

import {
  CreatePartnerInput,
  IPartnerRepository,
  Partner,
  PartnerQuery,
  PartnerQueryResult,
  PartnerStatus,
  PartnerType,
  UpdatePartnerInput,
} from '@kgc/partners';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Partner as PrismaPartner,
  PartnerStatus as PrismaPartnerStatus,
  PartnerType as PrismaPartnerType,
} from '@prisma/client';

@Injectable()
export class PrismaPartnerRepository implements IPartnerRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma Partner to domain interface
   */
  private toPartnerDomain(partner: PrismaPartner): Partner {
    return {
      id: partner.id,
      tenantId: partner.tenantId,
      type: partner.type as PartnerType,
      status: partner.status as PartnerStatus,
      partnerCode: partner.partnerCode,
      taxNumber: partner.taxNumber,
      euVatNumber: partner.euVatNumber,
      name: partner.name,
      companyName: partner.companyName,
      contactName: partner.contactName,
      email: partner.email,
      phone: partner.phone,
      phoneAlt: partner.phoneAlt,
      country: partner.country,
      postalCode: partner.postalCode,
      city: partner.city,
      address: partner.address,
      addressAlt: partner.addressAlt,
      birthDate: partner.birthDate,
      idCardNumber: partner.idCardNumber,
      drivingLicenseNo: partner.drivingLicenseNo,
      creditLimit: partner.creditLimit ? Number(partner.creditLimit) : null,
      currentBalance: Number(partner.currentBalance),
      paymentTermDays: partner.paymentTermDays,
      defaultDiscountPc: Number(partner.defaultDiscountPc),
      loyaltyTierId: partner.loyaltyTierId,
      loyaltyPoints: partner.loyaltyPoints,
      tierCalculatedAt: partner.tierCalculatedAt,
      blacklistReason: partner.blacklistReason,
      blacklistedAt: partner.blacklistedAt,
      blacklistedBy: partner.blacklistedBy,
      warningNote: partner.warningNote,
      notes: partner.notes,
      createdBy: partner.createdBy,
      updatedBy: partner.updatedBy,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
      isDeleted: partner.isDeleted,
      deletedAt: partner.deletedAt,
      deletedBy: partner.deletedBy,
    };
  }

  // ============================================
  // CLEAR (testing only)
  // ============================================

  /**
   * Clear is a no-op for Prisma repositories.
   * In tests, use database cleanup utilities instead.
   */
  clear(): void {
    // No-op: Database cleanup should be handled by test fixtures
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: PartnerQuery): Promise<PartnerQueryResult> {
    const where: Prisma.PartnerWhereInput = {
      tenantId: params.tenantId,
    };

    if (!params.includeDeleted) {
      where.isDeleted = false;
    }
    if (params.type) {
      where.type = params.type as PrismaPartnerType;
    }
    if (params.status) {
      where.status = params.status as PrismaPartnerStatus;
    }
    if (params.loyaltyTierId) {
      where.loyaltyTierId = params.loyaltyTierId;
    }
    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }
    if (params.isBlacklisted !== undefined) {
      where.status = params.isBlacklisted ? 'BLACKLISTED' : { not: 'BLACKLISTED' };
    }
    if (params.hasCredit) {
      where.creditLimit = { gt: 0 };
    }
    // H3 FIX: Proper balance range handling
    if (params.minBalance !== undefined || params.maxBalance !== undefined) {
      const balanceFilter: Prisma.DecimalFilter<'Partner'> = {};
      if (params.minBalance !== undefined) {
        balanceFilter.gte = params.minBalance;
      }
      if (params.maxBalance !== undefined) {
        balanceFilter.lte = params.maxBalance;
      }
      where.currentBalance = balanceFilter;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { partnerCode: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderByField = params.sortBy ?? 'name';
    const orderByDir = params.sortOrder ?? 'asc';
    const orderBy: Prisma.PartnerOrderByWithRelationInput = { [orderByField]: orderByDir };

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      partners: partners.map(p => this.toPartnerDomain(p)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId },
    });
    return partner ? this.toPartnerDomain(partner) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findFirst({
      where: { partnerCode: code, tenantId, isDeleted: false },
    });
    return partner ? this.toPartnerDomain(partner) : null;
  }

  async findByTaxNumber(taxNumber: string, tenantId: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findFirst({
      where: { taxNumber, tenantId, isDeleted: false },
    });
    return partner ? this.toPartnerDomain(partner) : null;
  }

  async findByPhone(phone: string, tenantId: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findFirst({
      where: { phone, tenantId, isDeleted: false },
    });
    return partner ? this.toPartnerDomain(partner) : null;
  }

  async findByEmail(email: string, tenantId: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        tenantId,
        isDeleted: false,
      },
    });
    return partner ? this.toPartnerDomain(partner) : null;
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreatePartnerInput, createdBy: string): Promise<Partner> {
    // Validate unique constraints
    if (await this.codeExists(data.partnerCode, tenantId)) {
      throw new Error(`Partner code already exists: ${data.partnerCode}`);
    }
    if (data.taxNumber && (await this.taxNumberExists(data.taxNumber, tenantId))) {
      throw new Error(`Tax number already exists: ${data.taxNumber}`);
    }

    const partner = await this.prisma.partner.create({
      data: {
        tenantId,
        type: (data.type ?? 'INDIVIDUAL') as PrismaPartnerType,
        status: 'ACTIVE',
        partnerCode: data.partnerCode,
        taxNumber: data.taxNumber ?? null,
        euVatNumber: data.euVatNumber ?? null,
        name: data.name,
        companyName: data.companyName ?? null,
        contactName: data.contactName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        phoneAlt: data.phoneAlt ?? null,
        country: data.country ?? null,
        postalCode: data.postalCode ?? null,
        city: data.city ?? null,
        address: data.address ?? null,
        addressAlt: data.addressAlt ?? null,
        birthDate: data.birthDate ?? null,
        idCardNumber: data.idCardNumber ?? null,
        drivingLicenseNo: data.drivingLicenseNo ?? null,
        creditLimit: data.creditLimit ?? null,
        currentBalance: 0,
        paymentTermDays: data.paymentTermDays ?? 0,
        defaultDiscountPc: data.defaultDiscountPc ?? 0,
        warningNote: data.warningNote ?? null,
        notes: data.notes ?? null,
        createdBy,
        updatedBy: createdBy,
      },
    });

    return this.toPartnerDomain(partner);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePartnerInput,
    updatedBy: string
  ): Promise<Partner> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner not found: ${id}`);
    }

    const updateData: Prisma.PartnerUpdateInput = {
      updatedBy,
      updatedAt: new Date(),
    };

    // Apply non-undefined fields
    if (data.type !== undefined) updateData.type = data.type as PrismaPartnerType;
    if (data.status !== undefined) updateData.status = data.status as PrismaPartnerStatus;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.phoneAlt !== undefined) updateData.phoneAlt = data.phoneAlt;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.addressAlt !== undefined) updateData.addressAlt = data.addressAlt;
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;
    if (data.idCardNumber !== undefined) updateData.idCardNumber = data.idCardNumber;
    if (data.drivingLicenseNo !== undefined) updateData.drivingLicenseNo = data.drivingLicenseNo;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
    if (data.paymentTermDays !== undefined) updateData.paymentTermDays = data.paymentTermDays;
    if (data.defaultDiscountPc !== undefined) updateData.defaultDiscountPc = data.defaultDiscountPc;
    if (data.warningNote !== undefined) updateData.warningNote = data.warningNote;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.PartnerUpdateManyMutationInput,
    });

    if (result.count === 0) {
      throw new Error(`Partner frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async restore(id: string, tenantId: string): Promise<Partner> {
    // H8 FIX: Check that partner is actually deleted before restoring
    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: true },
    });
    if (!partner) {
      throw new Error(`Törölt partner nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.partner.deleteMany({
      where: { id, tenantId },
    });
  }

  // ============================================
  // STATUS & BLACKLIST METHODS
  // ============================================

  async updateStatus(
    id: string,
    tenantId: string,
    status: PartnerStatus,
    updatedBy: string
  ): Promise<Partner> {
    return this.update(id, tenantId, { status }, updatedBy);
  }

  async blacklist(
    id: string,
    tenantId: string,
    reason: string,
    blacklistedBy: string
  ): Promise<Partner> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: {
        status: 'BLACKLISTED',
        blacklistReason: reason,
        blacklistedAt: new Date(),
        blacklistedBy,
        updatedBy: blacklistedBy,
        updatedAt: new Date(),
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  async removeFromBlacklist(id: string, tenantId: string, updatedBy: string): Promise<Partner> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: {
        status: 'ACTIVE',
        blacklistReason: null,
        blacklistedAt: null,
        blacklistedBy: null,
        updatedBy,
        updatedAt: new Date(),
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  // ============================================
  // CREDIT & LOYALTY METHODS
  // ============================================

  async updateCreditLimit(
    id: string,
    tenantId: string,
    creditLimit: number,
    updatedBy: string
  ): Promise<Partner> {
    return this.update(id, tenantId, { creditLimit }, updatedBy);
  }

  async updateBalance(id: string, tenantId: string, amount: number): Promise<Partner> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use raw query for increment with tenantId safety
    await this.prisma.$executeRaw`
      UPDATE "Partner"
      SET "currentBalance" = "currentBalance" + ${amount}, "updatedAt" = NOW()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `;

    return (await this.findById(id, tenantId))!;
  }

  async updateLoyaltyTier(
    id: string,
    tenantId: string,
    tierId: string | null,
    points: number
  ): Promise<Partner> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: {
        loyaltyTierId: tierId,
        loyaltyPoints: points,
        tierCalculatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  async addLoyaltyPoints(id: string, tenantId: string, points: number): Promise<Partner> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Partner nem található: ${id}`);
    }

    // H2 FIX: Use raw query for increment with tenantId safety
    await this.prisma.$executeRaw`
      UPDATE "Partner"
      SET "loyaltyPoints" = "loyaltyPoints" + ${points}, "updatedAt" = NOW()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `;

    return (await this.findById(id, tenantId))!;
  }

  // ============================================
  // SEARCH & QUERY HELPERS
  // ============================================

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { type?: PartnerType; activeOnly?: boolean; limit?: number }
  ): Promise<Partner[]> {
    const where: Prisma.PartnerWhereInput = {
      tenantId,
      isDeleted: false,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { partnerCode: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (options?.type) {
      where.type = options.type as PrismaPartnerType;
    }
    if (options?.activeOnly !== false) {
      where.status = 'ACTIVE';
    }

    const partners = await this.prisma.partner.findMany({
      where,
      take: options?.limit ?? 10,
      orderBy: { name: 'asc' },
    });

    return partners.map(p => this.toPartnerDomain(p));
  }

  async getPartnersWithBalance(
    tenantId: string,
    options?: { minBalance?: number; maxBalance?: number; overdueOnly?: boolean }
  ): Promise<Partner[]> {
    const where: Prisma.PartnerWhereInput = {
      tenantId,
      isDeleted: false,
    };

    // H3 FIX: Proper balance range handling
    if (options?.minBalance !== undefined || options?.maxBalance !== undefined) {
      const balanceFilter: Prisma.DecimalFilter<'Partner'> = {};
      if (options?.minBalance !== undefined) {
        balanceFilter.gte = options.minBalance;
      }
      if (options?.maxBalance !== undefined) {
        balanceFilter.lte = options.maxBalance;
      }
      where.currentBalance = balanceFilter;
    }

    // M2 NOTE: overdueOnly would require payment due date tracking
    // which is not part of the current Partner model - left unimplemented

    const partners = await this.prisma.partner.findMany({
      where,
      orderBy: { currentBalance: 'desc' },
    });

    return partners.map(p => this.toPartnerDomain(p));
  }

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const partner = await this.prisma.partner.findFirst({
      where: {
        partnerCode: code,
        tenantId,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return partner !== null;
  }

  async taxNumberExists(taxNumber: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const partner = await this.prisma.partner.findFirst({
      where: {
        taxNumber,
        tenantId,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return partner !== null;
  }

  async generateNextCode(tenantId: string, prefix = 'P'): Promise<string> {
    // Find the highest existing code with this prefix
    const latestPartner = await this.prisma.partner.findFirst({
      where: {
        tenantId,
        partnerCode: { startsWith: prefix },
      },
      orderBy: { partnerCode: 'desc' },
      select: { partnerCode: true },
    });

    if (!latestPartner) {
      return `${prefix}000001`;
    }

    // Extract the numeric part and increment
    const numericPart = latestPartner.partnerCode.slice(prefix.length);
    const nextNum = parseInt(numericPart, 10) + 1;
    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }

  async countByStatus(tenantId: string): Promise<Record<PartnerStatus, number>> {
    const counts = await this.prisma.partner.groupBy({
      by: ['status'],
      where: { tenantId, isDeleted: false },
      _count: { status: true },
    });

    const result: Record<PartnerStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      BLACKLISTED: 0,
    };

    for (const { status, _count } of counts) {
      result[status as PartnerStatus] = _count.status;
    }

    return result;
  }

  async getRecent(tenantId: string, limit = 10): Promise<Partner[]> {
    const partners = await this.prisma.partner.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return partners.map(p => this.toPartnerDomain(p));
  }

  async getBlacklisted(tenantId: string): Promise<Partner[]> {
    const partners = await this.prisma.partner.findMany({
      where: { tenantId, isDeleted: false, status: 'BLACKLISTED' },
      orderBy: { blacklistedAt: 'desc' },
    });

    return partners.map(p => this.toPartnerDomain(p));
  }
}
