/**
 * SupplierService - Beszállító CRUD műveletek
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { BadRequestException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  type Supplier,
  SupplierStatus,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type SupplierFilterOptions,
  type SupplierListResponse,
} from '../interfaces/supplier.interface';

/**
 * Audit logger interface
 */
interface AuditLogger {
  log(entry: {
    action: string;
    tenantId: string;
    userId: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }): void | Promise<void>;
}

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Validation constants
 */
const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupplierService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Create a new supplier
   */
  async createSupplier(
    tenantId: string,
    input: CreateSupplierInput,
    userId: string
  ): Promise<Supplier> {
    // Validate code
    if (!input.code || input.code.trim() === '') {
      throw new BadRequestException('A beszállító kód kötelező');
    }
    if (input.code.trim().length > MAX_CODE_LENGTH) {
      throw new BadRequestException(`A beszállító kód maximum ${MAX_CODE_LENGTH} karakter lehet`);
    }

    // Validate name
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('A beszállító neve kötelező');
    }
    if (input.name.trim().length > MAX_NAME_LENGTH) {
      throw new BadRequestException(`A beszállító neve maximum ${MAX_NAME_LENGTH} karakter lehet`);
    }

    // Validate email format if provided
    if (input.email && input.email.trim() !== '' && !EMAIL_REGEX.test(input.email.trim())) {
      throw new BadRequestException('Érvénytelen email formátum');
    }

    const code = input.code.trim().toUpperCase();

    // Check for duplicate code
    const existing = await this.prisma.supplier.findFirst({
      where: {
        code,
        tenantId,
      },
    });

    if (existing) {
      throw new BadRequestException(`Beszállító kód már létezik: ${code}`);
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        code,
        name: input.name.trim(),
        description: input.description ?? null,
        contactName: input.contactName ?? null,
        email: input.email?.trim() ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        status: SupplierStatus.ACTIVE,
      },
    });

    await this.auditLogger.log({
      action: 'SUPPLIER_CREATED',
      tenantId,
      userId,
      entityType: 'Supplier',
      entityId: supplier.id,
      details: { code, name: input.name },
    });

    return supplier as Supplier;
  }

  /**
   * Get supplier by ID
   */
  async getSupplierById(id: string, tenantId: string): Promise<Supplier | null> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    return supplier as Supplier | null;
  }

  /**
   * Get supplier by code
   */
  async getSupplierByCode(code: string, tenantId: string): Promise<Supplier | null> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        code: code.toUpperCase(),
        tenantId,
      },
    });

    return supplier as Supplier | null;
  }

  /**
   * Get suppliers with pagination and filtering
   */
  async getSuppliers(
    tenantId: string,
    options: SupplierFilterOptions = {}
  ): Promise<SupplierListResponse> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
    };

    // Apply status filter
    if (options.status) {
      where['status'] = options.status;
    } else if (!options.includeInactive) {
      where['status'] = SupplierStatus.ACTIVE;
    }

    // Apply search filter
    if (options.search) {
      where['OR'] = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers as Supplier[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update supplier
   */
  async updateSupplier(
    id: string,
    tenantId: string,
    input: UpdateSupplierInput,
    userId: string
  ): Promise<Supplier> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen beszállító ID formátum');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (input.name.trim() === '') {
        throw new BadRequestException('A beszállító neve nem lehet üres');
      }
      if (input.name.trim().length > MAX_NAME_LENGTH) {
        throw new BadRequestException(`A beszállító neve maximum ${MAX_NAME_LENGTH} karakter lehet`);
      }
    }

    // Validate email format if provided
    if (input.email !== undefined && input.email !== null && input.email.trim() !== '') {
      if (!EMAIL_REGEX.test(input.email.trim())) {
        throw new BadRequestException('Érvénytelen email formátum');
      }
    }

    const existing = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Beszállító nem található');
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData['name'] = input.name.trim();
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.contactName !== undefined) updateData['contactName'] = input.contactName;
    if (input.email !== undefined) updateData['email'] = input.email?.trim() ?? null;
    if (input.phone !== undefined) updateData['phone'] = input.phone;
    if (input.website !== undefined) updateData['website'] = input.website;
    if (input.status !== undefined) updateData['status'] = input.status;

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    await this.auditLogger.log({
      action: 'SUPPLIER_UPDATED',
      tenantId,
      userId,
      entityType: 'Supplier',
      entityId: id,
      details: { changes: Object.keys(updateData) },
    });

    return supplier as Supplier;
  }

  /**
   * Delete supplier (soft delete)
   */
  async deleteSupplier(id: string, tenantId: string, userId: string): Promise<Supplier> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen beszállító ID formátum');
    }

    const existing = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Beszállító nem található');
    }

    if (existing.status === SupplierStatus.INACTIVE) {
      throw new BadRequestException('Beszállító már inaktív');
    }

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { status: SupplierStatus.INACTIVE },
    });

    await this.auditLogger.log({
      action: 'SUPPLIER_DELETED',
      tenantId,
      userId,
      entityType: 'Supplier',
      entityId: id,
      details: { code: existing.code },
    });

    return supplier as Supplier;
  }
}
