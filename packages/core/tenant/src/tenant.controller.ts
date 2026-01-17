import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { safeValidateCreateTenantDto } from './dto/create-tenant.dto';
import { safeValidateUpdateTenantDto } from './dto/update-tenant.dto';
import { safeValidateTenantFilterDto } from './dto/tenant-filter.dto';
import type { Tenant, TenantListResponse } from './interfaces/tenant.interface';
// Import auth guards and permission decorators
// Note: These imports will need to be configured when packages are linked
import { JwtAuthGuard } from '@kgc/auth';
import { RequirePermission, PermissionGuard, Permission } from '@kgc/users';

/**
 * TenantController - REST API tenant kezeléshez
 * @kgc/tenant - Multi-tenant infrastructure
 *
 * SECURITY: All endpoints require ADMIN_TENANT permission (DEVOPS_ADMIN role)
 * per AC1: "Given DEVOPS_ADMIN jogosultság"
 *
 * Endpoints:
 * - POST   /api/v1/tenants        - Tenant létrehozás
 * - GET    /api/v1/tenants        - Tenant lista (pagináció, keresés)
 * - GET    /api/v1/tenants/:id    - Tenant lekérdezés ID alapján
 * - PATCH  /api/v1/tenants/:id    - Tenant frissítés
 * - DELETE /api/v1/tenants/:id    - Tenant soft delete
 */
@Controller('api/v1/tenants')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Tenant létrehozás
   * POST /api/v1/tenants
   * Requires: ADMIN_TENANT permission (DEVOPS_ADMIN role)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permission.ADMIN_TENANT)
  async create(@Body() body: unknown): Promise<{ data: Tenant }> {
    // Zod validáció
    const validation = safeValidateCreateTenantDto(body);

    if (!validation.success) {
      const errors = validation.error.errors.reduce(
        (acc, err) => ({
          ...acc,
          [err.path.join('.')]: err.message,
        }),
        {}
      );

      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Hibás adatok',
        fields: errors,
      });
    }

    const tenant = await this.tenantService.createTenant(validation.data);

    return { data: tenant };
  }

  /**
   * Tenant lista lekérdezés
   * GET /api/v1/tenants?search=&status=&page=&limit=
   * Requires: ADMIN_TENANT permission (DEVOPS_ADMIN role)
   */
  @Get()
  @RequirePermission(Permission.ADMIN_TENANT)
  async list(@Query() query: unknown): Promise<TenantListResponse> {
    // Zod validáció
    const validation = safeValidateTenantFilterDto(query);

    if (!validation.success) {
      const errors = validation.error.errors.reduce(
        (acc, err) => ({
          ...acc,
          [err.path.join('.')]: err.message,
        }),
        {}
      );

      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Hibás szűrési paraméterek',
        fields: errors,
      });
    }

    return this.tenantService.listTenants(validation.data);
  }

  /**
   * Tenant lekérdezés ID alapján
   * GET /api/v1/tenants/:id
   * Requires: ADMIN_TENANT permission (DEVOPS_ADMIN role)
   */
  @Get(':id')
  @RequirePermission(Permission.ADMIN_TENANT)
  async getById(@Param('id') id: string): Promise<{ data: Tenant }> {
    const tenant = await this.tenantService.getTenantById(id);

    if (!tenant) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant nem található',
      });
    }

    return { data: tenant };
  }

  /**
   * Tenant frissítés
   * PATCH /api/v1/tenants/:id
   * Requires: ADMIN_TENANT permission (DEVOPS_ADMIN role)
   */
  @Patch(':id')
  @RequirePermission(Permission.ADMIN_TENANT)
  async update(
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<{ data: Tenant }> {
    // Zod validáció
    const validation = safeValidateUpdateTenantDto(body);

    if (!validation.success) {
      const errors = validation.error.errors.reduce(
        (acc, err) => ({
          ...acc,
          [err.path.join('.')]: err.message,
        }),
        {}
      );

      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Hibás adatok',
        fields: errors,
      });
    }

    const tenant = await this.tenantService.updateTenant(id, validation.data);

    return { data: tenant };
  }

  /**
   * Tenant soft delete
   * DELETE /api/v1/tenants/:id
   * Requires: ADMIN_TENANT permission (DEVOPS_ADMIN role)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.ADMIN_TENANT)
  async delete(@Param('id') id: string): Promise<{ data: Tenant }> {
    const tenant = await this.tenantService.deleteTenant(id);

    return { data: tenant };
  }
}
