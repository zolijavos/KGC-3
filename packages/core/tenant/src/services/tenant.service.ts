import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuidv4, validate as isValidUuid } from 'uuid';
import {
  Tenant,
  TenantStatus,
  TenantListResponse,
  DEFAULT_TENANT_SETTINGS,
} from '../interfaces/tenant.interface';
import { CreateTenantDto, validateCreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto, validateUpdateTenantDto } from '../dto/update-tenant.dto';
import { TenantFilterDto } from '../dto/tenant-filter.dto';
import { SchemaService } from './schema.service';

/**
 * TenantService - Tenant CRUD műveletek
 * @kgc/tenant - Multi-tenant infrastructure
 *
 * Felelősségek:
 * - Tenant létrehozás (PostgreSQL séma létrehozással)
 * - Tenant lekérdezés (by ID, lista/keresés)
 * - Tenant frissítés
 * - Tenant soft delete
 * - Audit log bejegyzések
 */
@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly schemaService: SchemaService
  ) {}

  /**
   * Tenant létrehozás
   * - Validálja az inputot
   * - Ellenőrzi a slug egyediségét
   * - Létrehozza a tenant rekordot
   * - Létrehozza a PostgreSQL sémát
   * - Audit log bejegyzést készít
   *
   * SECURITY: Uses compensating transaction pattern for atomicity
   * NOTE: PostgreSQL DDL (CREATE SCHEMA) is auto-committed and cannot be part of a transaction.
   * We use compensating transaction pattern: if tenant record creation fails, we rollback the schema.
   */
  async createTenant(dto: CreateTenantDto): Promise<Tenant> {
    // Validáció
    const validatedDto = validateCreateTenantDto(dto);

    // Slug egyediség ellenőrzés
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { slug: validatedDto.slug },
    });

    if (existingTenant) {
      throw new BadRequestException('A slug már foglalt');
    }

    const tenantId = uuidv4();
    const schemaName = this.schemaService.slugToSchemaName(validatedDto.slug);

    // Step 1: Create PostgreSQL schema FIRST (this is auto-committed)
    // We do this first so we can rollback if tenant creation fails
    let schemaCreated = false;
    try {
      await this.schemaService.createTenantSchema(tenantId, validatedDto.slug);
      schemaCreated = true;
    } catch (schemaError) {
      // Schema creation failed - no cleanup needed
      throw new BadRequestException('Séma létrehozás sikertelen: ' + (schemaError instanceof Error ? schemaError.message : 'Ismeretlen hiba'));
    }

    // Step 2: Create tenant record in transaction
    let tenant;
    try {
      tenant = await this.prisma.tenant.create({
        data: {
          id: tenantId,
          name: validatedDto.name,
          slug: validatedDto.slug,
          status: validatedDto.status ?? TenantStatus.PENDING,
          settings: validatedDto.settings ?? DEFAULT_TENANT_SETTINGS,
          parentTenantId: validatedDto.parentTenantId ?? null,
          schemaName,
        },
      });
    } catch (tenantError) {
      // COMPENSATING TRANSACTION: Tenant creation failed, rollback schema
      if (schemaCreated) {
        try {
          await this.schemaService.dropTenantSchema(tenantId, schemaName);
        } catch (rollbackError) {
          // Log rollback failure - orphaned schema requires manual cleanup
          console.error(`CRITICAL: Failed to rollback schema ${schemaName} after tenant creation failure:`, rollbackError);
        }
      }
      throw tenantError;
    }

    // Audit log (non-blocking)
    try {
      await this.createAuditLog(tenant.id, 'CREATE', {
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
      });
    } catch (auditError) {
      // Log audit failure but don't fail the operation
      console.error('Failed to create audit log for tenant creation:', auditError);
    }

    return tenant as unknown as Tenant;
  }

  /**
   * Tenant lekérdezés ID alapján
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    // UUID validáció
    if (!isValidUuid(id)) {
      throw new BadRequestException('Érvénytelen tenant ID formátum');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    return tenant as unknown as Tenant | null;
  }

  /**
   * Tenant frissítés
   * - Validálja az inputot
   * - Ellenőrzi, hogy a tenant létezik
   * - Frissíti a tenant rekordot
   * - Audit log bejegyzést készít (különösen státusz változásnál)
   */
  async updateTenant(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    // UUID validáció
    if (!isValidUuid(id)) {
      throw new BadRequestException('Érvénytelen tenant ID formátum');
    }

    // Validáció
    const validatedDto = validateUpdateTenantDto(dto);

    // Tenant létezés ellenőrzés
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new NotFoundException('Tenant nem található');
    }

    // Slug egyediség ellenőrzés (ha változik)
    if (validatedDto.slug && validatedDto.slug !== existingTenant.slug) {
      const slugTaken = await this.prisma.tenant.findFirst({
        where: { slug: validatedDto.slug, id: { not: id } },
      });

      if (slugTaken) {
        throw new BadRequestException('A slug már foglalt');
      }
    }

    // Tenant frissítés
    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(validatedDto.name && { name: validatedDto.name }),
        ...(validatedDto.slug && { slug: validatedDto.slug }),
        ...(validatedDto.status && { status: validatedDto.status }),
        ...(validatedDto.settings && {
          settings: { ...(existingTenant.settings as object), ...validatedDto.settings },
        }),
        ...(validatedDto.parentTenantId !== undefined && {
          parentTenantId: validatedDto.parentTenantId,
        }),
      },
    });

    // Audit log - különösen státusz változásnál (non-blocking)
    const action = validatedDto.status && validatedDto.status !== existingTenant.status
      ? 'STATUS_CHANGE'
      : 'UPDATE';

    try {
      await this.createAuditLog(id, action, {
        before: {
          name: existingTenant.name,
          status: existingTenant.status,
          settings: existingTenant.settings,
        },
        after: {
          name: updatedTenant.name,
          status: updatedTenant.status,
          settings: updatedTenant.settings,
        },
      });
    } catch (auditError) {
      // Log audit failure but don't fail the operation
      console.error('Failed to create audit log for tenant update:', auditError);
    }

    return updatedTenant as unknown as Tenant;
  }

  /**
   * Tenant soft delete
   * - Státuszt INACTIVE-ra állítja
   * - deletedAt mezőt beállítja
   * - Audit log bejegyzést készít
   */
  async deleteTenant(id: string): Promise<Tenant> {
    // UUID validáció
    if (!isValidUuid(id)) {
      throw new BadRequestException('Érvénytelen tenant ID formátum');
    }

    // Tenant létezés ellenőrzés
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new NotFoundException('Tenant nem található');
    }

    // Már törölve ellenőrzés
    if (existingTenant.deletedAt) {
      throw new BadRequestException('Tenant már törölve');
    }

    // Soft delete
    const deletedTenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    // Audit log (non-blocking)
    try {
      await this.createAuditLog(id, 'DELETE', {
        previousStatus: existingTenant.status,
        deletedAt: deletedTenant.deletedAt,
      });
    } catch (auditError) {
      // Log audit failure but don't fail the operation
      console.error('Failed to create audit log for tenant deletion:', auditError);
    }

    return deletedTenant as unknown as Tenant;
  }

  /**
   * Tenant lista lekérdezés szűréssel és paginációval
   */
  async listTenants(filter: TenantFilterDto): Promise<TenantListResponse> {
    const { search, status, page, limit, parentTenantId, includeInactive } = filter;

    // Where feltételek összeállítása
    const where: Record<string, unknown> = {};

    // Inaktív tenantok kizárása (kivéve, ha expliciten kérték)
    if (!includeInactive) {
      where.deletedAt = null;
    }

    // Státusz szűrés
    if (status) {
      where.status = status;
    }

    // Parent tenant szűrés
    if (parentTenantId) {
      where.parentTenantId = parentTenantId;
    }

    // Keresés név vagy slug alapján
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Lekérdezés paginációval
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants as unknown as Tenant[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Audit log bejegyzés készítése
   */
  private async createAuditLog(
    tenantId: string,
    action: string,
    changes: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await this.prisma.tenantAuditLog.create({
      data: {
        id: uuidv4(),
        tenantId,
        action,
        changes,
        userId: userId ?? null,
      },
    });
  }
}
