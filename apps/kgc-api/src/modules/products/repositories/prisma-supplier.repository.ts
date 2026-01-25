/**
 * Prisma Supplier Repository
 * Implements ISupplierRepository for PostgreSQL persistence
 * Epic 8: Story 8-3: Beszállító kezelés
 */

import {
  CreateSupplierInput,
  ISupplierRepository,
  Supplier,
  SupplierQuery,
  SupplierQueryResult,
  UpdateSupplierInput,
} from '@kgc/products';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, Supplier as PrismaSupplier } from '@prisma/client';

@Injectable()
export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toSupplierDomain(supplier: PrismaSupplier): Supplier {
    return {
      id: supplier.id,
      tenantId: supplier.tenantId,
      code: supplier.code,
      name: supplier.name,
      taxNumber: supplier.taxNumber,
      contactName: supplier.contactName,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      country: supplier.country,
      postalCode: supplier.postalCode,
      city: supplier.city,
      address: supplier.address,
      apiEnabled: supplier.apiEnabled,
      apiEndpoint: supplier.apiEndpoint,
      apiKey: supplier.apiKey ? '********' : null, // H1 FIX: Mask API key for security
      apiVersion: supplier.apiVersion,
      lastSyncAt: supplier.lastSyncAt,
      paymentTermDays: supplier.paymentTermDays,
      defaultDiscountPc: Number(supplier.defaultDiscountPc),
      currency: supplier.currency,
      notes: supplier.notes,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  clear(): void {
    // No-op
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: SupplierQuery): Promise<SupplierQueryResult> {
    const where: Prisma.SupplierWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.apiEnabled !== undefined) {
      where.apiEnabled = params.apiEnabled;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { contactName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      suppliers: suppliers.map(s => this.toSupplierDomain(s)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<Supplier | null> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    return supplier ? this.toSupplierDomain(supplier) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<Supplier | null> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { code, tenantId },
    });
    return supplier ? this.toSupplierDomain(supplier) : null;
  }

  async getActiveSuppliers(tenantId: string): Promise<Supplier[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return suppliers.map(s => this.toSupplierDomain(s));
  }

  async getApiEnabledSuppliers(tenantId: string): Promise<Supplier[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, apiEnabled: true, isActive: true },
      orderBy: { name: 'asc' },
    });
    return suppliers.map(s => this.toSupplierDomain(s));
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreateSupplierInput): Promise<Supplier> {
    if (await this.codeExists(data.code, tenantId)) {
      throw new Error(`Beszállító kód már létezik: ${data.code}`);
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        taxNumber: data.taxNumber ?? null,
        contactName: data.contactName ?? null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        country: data.country ?? null,
        postalCode: data.postalCode ?? null,
        city: data.city ?? null,
        address: data.address ?? null,
        apiEnabled: data.apiEnabled ?? false,
        apiEndpoint: data.apiEndpoint ?? null,
        apiKey: data.apiKey ?? null,
        apiVersion: data.apiVersion ?? null,
        paymentTermDays: data.paymentTermDays ?? 30,
        defaultDiscountPc: data.defaultDiscountPc ?? 0,
        currency: data.currency ?? 'HUF',
        notes: data.notes ?? null,
        isActive: data.isActive ?? true,
      },
    });

    return this.toSupplierDomain(supplier);
  }

  async update(id: string, tenantId: string, data: UpdateSupplierInput): Promise<Supplier> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Beszállító nem található: ${id}`);
    }

    const updateData: Prisma.SupplierUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.apiEnabled !== undefined) updateData.apiEnabled = data.apiEnabled;
    if (data.apiEndpoint !== undefined) updateData.apiEndpoint = data.apiEndpoint;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.apiVersion !== undefined) updateData.apiVersion = data.apiVersion;
    if (data.paymentTermDays !== undefined) updateData.paymentTermDays = data.paymentTermDays;
    if (data.defaultDiscountPc !== undefined) updateData.defaultDiscountPc = data.defaultDiscountPc;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.supplier.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error(`Beszállító frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Beszállító nem található: ${id}`);
    }

    if (await this.hasProducts(id, tenantId)) {
      throw new Error('Nem törölhető termékekkel rendelkező beszállító');
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.supplier.deleteMany({
      where: { id, tenantId },
    });
  }

  async activate(id: string, tenantId: string): Promise<Supplier> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<Supplier> {
    return this.update(id, tenantId, { isActive: false });
  }

  // ============================================
  // API SETTINGS
  // ============================================

  async updateApiSettings(
    id: string,
    tenantId: string,
    apiSettings: {
      apiEnabled?: boolean;
      apiEndpoint?: string | null;
      apiKey?: string | null;
      apiVersion?: string | null;
    }
  ): Promise<Supplier> {
    return this.update(id, tenantId, apiSettings);
  }

  async recordSync(id: string, tenantId: string): Promise<Supplier> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Beszállító nem található: ${id}`);
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.supplier.updateMany({
      where: { id, tenantId },
      data: {
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  // ============================================
  // SEARCH & UTILITY
  // ============================================

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { activeOnly?: boolean; limit?: number }
  ): Promise<Supplier[]> {
    const where: Prisma.SupplierWhereInput = {
      tenantId,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { contactName: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (options?.activeOnly !== false) {
      where.isActive = true;
    }

    const suppliers = await this.prisma.supplier.findMany({
      where,
      take: options?.limit ?? 10,
      orderBy: { name: 'asc' },
    });

    return suppliers.map(s => this.toSupplierDomain(s));
  }

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        code,
        tenantId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return supplier !== null;
  }

  async countProducts(id: string, tenantId: string): Promise<number> {
    return this.prisma.product.count({
      where: { supplierId: id, tenantId, isDeleted: false },
    });
  }

  async hasProducts(id: string, tenantId: string): Promise<boolean> {
    const count = await this.countProducts(id, tenantId);
    return count > 0;
  }

  async getSuppliersNeedingSync(tenantId: string, hoursOld: number): Promise<Supplier[]> {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        tenantId,
        isActive: true,
        apiEnabled: true,
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoffTime } }],
      },
      orderBy: { lastSyncAt: 'asc' },
    });

    return suppliers.map(s => this.toSupplierDomain(s));
  }
}
