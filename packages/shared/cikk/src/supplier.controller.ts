/**
 * SupplierController - Beszállító REST API
 * Story 8-3: Beszállító Kapcsolat és Import
 */

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
} from '@nestjs/common';

import { SupplierService } from './services/supplier.service';
import { SupplierItemService } from './services/supplier-item.service';
import { CsvImportService } from './services/csv-import.service';
import { parseCreateSupplierDto } from './dto/create-supplier.dto';
import { parseUpdateSupplierDto } from './dto/update-supplier.dto';
import { parseLinkItemToSupplierDto, parseUpdateSupplierItemDto } from './dto/supplier-item.dto';
import {
  SupplierStatus,
  type Supplier,
  type SupplierListResponse,
  type SupplierItem,
  type SupplierItemWithRelations,
  type CsvImportResult,
  type CsvImportOptions,
} from './interfaces/supplier.interface';

/**
 * Tenant decorator placeholder - will be replaced with actual import from @kgc/tenant
 */
function CurrentTenant(): ParameterDecorator {
  return (_target, _key, _index) => {};
}

/**
 * User decorator placeholder - will be replaced with actual import from @kgc/auth
 */
function CurrentUser(): ParameterDecorator {
  return (_target, _key, _index) => {};
}

interface Tenant {
  id: string;
}

interface User {
  id: string;
}

/**
 * SupplierController - REST API for Supplier (Beszállító) management
 * Story 8-3: Beszállító Kapcsolat és Import
 *
 * Endpoints:
 * - POST   /api/v1/suppliers           - Create supplier
 * - GET    /api/v1/suppliers           - List suppliers
 * - GET    /api/v1/suppliers/:id       - Get supplier
 * - PATCH  /api/v1/suppliers/:id       - Update supplier
 * - DELETE /api/v1/suppliers/:id       - Delete supplier
 * - POST   /api/v1/suppliers/:id/items - Link item to supplier
 * - GET    /api/v1/suppliers/:id/items - Get supplier items
 * - POST   /api/v1/suppliers/:id/import - Import CSV
 */
@Controller('api/v1/suppliers')
export class SupplierController {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly supplierItemService: SupplierItemService,
    private readonly csvImportService: CsvImportService
  ) {}

  // ==========================================
  // SUPPLIER CRUD
  // ==========================================

  /**
   * Create a new supplier
   * POST /api/v1/suppliers
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSupplier(
    @Body() body: unknown,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: Supplier }> {
    try {
      const dto = parseCreateSupplierDto(body);
      const supplier = await this.supplierService.createSupplier(tenant.id, dto, user.id);
      return { data: supplier };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('már létezik')) {
          throw new BadRequestException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * List suppliers with pagination
   * GET /api/v1/suppliers
   */
  @Get()
  async getSuppliers(
    @Query() query: Record<string, unknown>,
    @CurrentTenant() tenant: Tenant
  ): Promise<SupplierListResponse> {
    const statusStr = query['status'] as string | undefined;
    const status =
      statusStr === 'ACTIVE'
        ? SupplierStatus.ACTIVE
        : statusStr === 'INACTIVE'
          ? SupplierStatus.INACTIVE
          : undefined;

    const options = {
      search: query['search'] as string | undefined,
      status,
      includeInactive: query['includeInactive'] === 'true',
      page: query['page'] ? parseInt(query['page'] as string, 10) : undefined,
      limit: query['limit'] ? parseInt(query['limit'] as string, 10) : undefined,
    };
    return this.supplierService.getSuppliers(tenant.id, options);
  }

  /**
   * Get supplier by ID
   * GET /api/v1/suppliers/:id
   */
  @Get(':id')
  async getSupplierById(
    @Param('id') id: string,
    @CurrentTenant() tenant: Tenant
  ): Promise<{ data: Supplier }> {
    const supplier = await this.supplierService.getSupplierById(id, tenant.id);
    if (!supplier) {
      throw new NotFoundException('Beszállító nem található');
    }
    return { data: supplier };
  }

  /**
   * Update supplier
   * PATCH /api/v1/suppliers/:id
   */
  @Patch(':id')
  async updateSupplier(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: Supplier }> {
    try {
      const dto = parseUpdateSupplierDto(body);
      const supplier = await this.supplierService.updateSupplier(id, tenant.id, dto, user.id);
      return { data: supplier };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Beszállító nem található') {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Delete supplier (soft delete)
   * DELETE /api/v1/suppliers/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteSupplier(
    @Param('id') id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: Supplier }> {
    try {
      const supplier = await this.supplierService.deleteSupplier(id, tenant.id, user.id);
      return { data: supplier };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Beszállító nem található') {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  // ==========================================
  // SUPPLIER-ITEM LINKS
  // ==========================================

  /**
   * Link item to supplier
   * POST /api/v1/suppliers/:id/items
   */
  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  async linkItemToSupplier(
    @Param('id') supplierId: string,
    @Body() body: unknown,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: SupplierItem }> {
    try {
      const dto = parseLinkItemToSupplierDto({ ...(body as object), supplierId });
      const link = await this.supplierItemService.linkItemToSupplier(tenant.id, dto, user.id);
      return { data: link };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Get supplier items
   * GET /api/v1/suppliers/:id/items
   */
  @Get(':id/items')
  async getSupplierItems(
    @Param('id') supplierId: string,
    @CurrentTenant() tenant: Tenant
  ): Promise<{ data: SupplierItemWithRelations[] }> {
    const items = await this.supplierItemService.getSupplierItems(supplierId, tenant.id);
    return { data: items };
  }

  /**
   * Update supplier-item link
   * PATCH /api/v1/suppliers/:supplierId/items/:itemLinkId
   */
  @Patch(':supplierId/items/:itemLinkId')
  async updateSupplierItem(
    @Param('itemLinkId') itemLinkId: string,
    @Body() body: unknown,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: SupplierItem }> {
    try {
      const dto = parseUpdateSupplierItemDto(body);
      const link = await this.supplierItemService.updateSupplierItem(
        itemLinkId,
        tenant.id,
        dto,
        user.id
      );
      return { data: link };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('nem található')) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Unlink item from supplier
   * DELETE /api/v1/suppliers/:supplierId/items/:itemLinkId
   */
  @Delete(':supplierId/items/:itemLinkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkItemFromSupplier(
    @Param('itemLinkId') itemLinkId: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<void> {
    try {
      await this.supplierItemService.unlinkItemFromSupplier(itemLinkId, tenant.id, user.id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('nem található')) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Set primary supplier for item
   * POST /api/v1/suppliers/:supplierId/items/:itemLinkId/set-primary
   */
  @Post(':supplierId/items/:itemLinkId/set-primary')
  @HttpCode(HttpStatus.OK)
  async setPrimarySupplier(
    @Param('itemLinkId') itemLinkId: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: SupplierItem }> {
    try {
      const link = await this.supplierItemService.setPrimarySupplier(
        itemLinkId,
        tenant.id,
        user.id
      );
      return { data: link };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('nem található')) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  // ==========================================
  // CSV IMPORT
  // ==========================================

  /**
   * Import CSV for supplier items
   * POST /api/v1/suppliers/:id/import
   */
  @Post(':id/import')
  @HttpCode(HttpStatus.OK)
  async importCsv(
    @Param('id') supplierId: string,
    @Body() body: { csvContent: string; options?: CsvImportOptions },
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: CsvImportResult }> {
    if (!body.csvContent || typeof body.csvContent !== 'string') {
      throw new BadRequestException('csvContent kötelező mező');
    }

    try {
      const result = await this.csvImportService.importSupplierItems(
        tenant.id,
        supplierId,
        body.csvContent,
        body.options ?? {},
        user.id
      );
      return { data: result };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
