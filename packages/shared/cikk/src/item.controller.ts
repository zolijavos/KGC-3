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
  NotFoundException,
} from '@nestjs/common';
import { ItemService } from './services/item.service';
import { validateCreateItemDto } from './dto/create-item.dto';
import { validateUpdateItemDto } from './dto/update-item.dto';
import { parseItemFilterFromQuery } from './dto/item-filter.dto';
import type { Item, ItemListResponse } from './interfaces/item.interface';

// Import from @kgc/tenant - will be available when module is imported
// import { CurrentTenant, Tenant } from '@kgc/tenant';

/**
 * Tenant decorator placeholder - will be replaced with actual import
 */
function CurrentTenant(): ParameterDecorator {
  return (_target, _key, _index) => {};
}

/**
 * User decorator placeholder - will be replaced with actual import
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
 * ItemController - REST API for Item (Cikk) management
 * Story 8-1: Cikk CRUD
 *
 * Endpoints:
 * - POST   /api/v1/products       - Create item
 * - GET    /api/v1/products       - List items with pagination
 * - GET    /api/v1/products/:id   - Get item by ID
 * - PATCH  /api/v1/products/:id   - Update item
 * - DELETE /api/v1/products/:id   - Soft delete item
 * - GET    /api/v1/products/barcode/:barcode - Find by barcode
 *
 * @kgc/cikk
 */
@Controller('api/v1/products')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  /**
   * Create a new item
   * POST /api/v1/products
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: unknown,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: Item }> {
    const dto = validateCreateItemDto(body);
    const item = await this.itemService.createItem(tenant.id, dto, user.id);
    return { data: item };
  }

  /**
   * List items with pagination and filtering
   * GET /api/v1/products
   */
  @Get()
  async list(
    @Query() query: Record<string, unknown>,
    @CurrentTenant() tenant: Tenant
  ): Promise<ItemListResponse> {
    const filter = parseItemFilterFromQuery(query);
    return this.itemService.listItems(tenant.id, filter);
  }

  /**
   * Get item by ID
   * GET /api/v1/products/:id
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentTenant() tenant: Tenant
  ): Promise<{ data: Item }> {
    const item = await this.itemService.getItemById(id, tenant.id);
    if (!item) {
      throw new NotFoundException('Cikk nem található');
    }
    return { data: item };
  }

  /**
   * Find item by barcode
   * GET /api/v1/products/barcode/:barcode
   */
  @Get('barcode/:barcode')
  async getByBarcode(
    @Param('barcode') barcode: string,
    @CurrentTenant() tenant: Tenant
  ): Promise<{ data: Item }> {
    const item = await this.itemService.findByBarcode(barcode, tenant.id);
    if (!item) {
      throw new NotFoundException('Cikk nem található ezzel a vonalkóddal');
    }
    return { data: item };
  }

  /**
   * Update item
   * PATCH /api/v1/products/:id
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: Item }> {
    const dto = validateUpdateItemDto(body);
    const item = await this.itemService.updateItem(id, tenant.id, dto, user.id);
    return { data: item };
  }

  /**
   * Soft delete item
   * DELETE /api/v1/products/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User
  ): Promise<{ data: Item }> {
    const item = await this.itemService.deleteItem(id, tenant.id, user.id);
    return { data: item };
  }
}
