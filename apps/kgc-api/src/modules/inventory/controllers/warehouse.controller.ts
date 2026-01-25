/**
 * Warehouse Controller - REST API endpoints
 * Story 9-3: Multi-warehouse támogatás
 *
 * Endpoints:
 * - GET    /warehouses              - List warehouses with filters
 * - GET    /warehouses/default      - Get default warehouse
 * - GET    /warehouses/:id          - Get single warehouse
 * - POST   /warehouses              - Create warehouse
 * - PATCH  /warehouses/:id          - Update warehouse
 * - DELETE /warehouses/:id          - Soft delete warehouse
 * - POST   /warehouses/:id/default  - Set as default warehouse
 * - GET    /warehouses/stock-summary - Cross-warehouse stock summary
 *
 * Transfer endpoints:
 * - GET    /warehouses/transfers         - List transfers
 * - GET    /warehouses/transfers/:id     - Get single transfer
 * - POST   /warehouses/transfers         - Create transfer
 * - POST   /warehouses/transfers/:id/start    - Start transfer
 * - POST   /warehouses/transfers/:id/complete - Complete transfer
 * - POST   /warehouses/transfers/:id/cancel   - Cancel transfer
 */

import { AuthenticatedRequest, JwtAuthGuard, parseDateParam, parseIntParam } from '@kgc/common';
import {
  CompleteTransferInput,
  CreateTransferInput,
  CreateWarehouseInput,
  TransferQuery,
  TransferStatus,
  UpdateWarehouseInput,
  WarehouseQuery,
  WarehouseService,
  WarehouseStatus,
  WarehouseType,
} from '@kgc/inventory';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ============================================
  // WAREHOUSE CRUD
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List warehouses with filters' })
  @ApiQuery({ name: 'type', required: false, enum: ['MAIN', 'BRANCH', 'VIRTUAL', 'TRANSIT'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'CLOSED'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'code', 'createdAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: WarehouseType,
    @Query('status') status?: WarehouseStatus,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'name' | 'code' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: WarehouseQuery = {
      tenantId: req.user.tenantId,
    };
    if (type) query.type = type;
    if (status) query.status = status;
    if (city) query.city = city;
    if (search) query.search = search;
    if (sortBy) query.sortBy = sortBy;
    if (sortOrder) query.sortOrder = sortOrder;
    const parsedOffset = parseIntParam(offset, { min: 0 });
    if (parsedOffset !== undefined) query.offset = parsedOffset;
    const parsedLimit = parseIntParam(limit, { min: 1, max: 1000 });
    if (parsedLimit !== undefined) query.limit = parsedLimit;

    const result = await this.warehouseService.queryWarehouses(query);
    return { data: result };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default warehouse for tenant' })
  @ApiResponse({ status: 200, description: 'Default warehouse' })
  @ApiResponse({ status: 404, description: 'No default warehouse' })
  async getDefault(@Req() req: AuthenticatedRequest) {
    const warehouse = await this.warehouseService.findDefaultWarehouse(req.user.tenantId);
    if (!warehouse) {
      return { error: { code: 'NOT_FOUND', message: 'Nincs alapértelmezett raktár' } };
    }
    return { data: warehouse };
  }

  @Get('stock-summary')
  @ApiOperation({ summary: 'Get cross-warehouse stock summary' })
  @ApiQuery({
    name: 'productIds',
    required: false,
    type: String,
    description: 'Comma-separated product IDs',
  })
  @ApiResponse({ status: 200, description: 'Cross-warehouse stock summary' })
  async getCrossWarehouseStock(
    @Req() req: AuthenticatedRequest,
    @Query('productIds') productIds?: string
  ) {
    const ids = productIds ? productIds.split(',').map(id => id.trim()) : undefined;
    const summary = await this.warehouseService.getCrossWarehouseStock(req.user.tenantId, ids);
    return { data: summary };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Warehouse details' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const warehouse = await this.warehouseService.findWarehouseById(id, req.user.tenantId);
    if (!warehouse) {
      return { error: { code: 'NOT_FOUND', message: 'Raktár nem található' } };
    }
    return { data: warehouse };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new warehouse' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'name', 'type'],
      properties: {
        code: { type: 'string', maxLength: 20 },
        name: { type: 'string', maxLength: 100 },
        type: { type: 'string', enum: ['MAIN', 'BRANCH', 'VIRTUAL', 'TRANSIT'] },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'CLOSED'], default: 'ACTIVE' },
        address: { type: 'string', maxLength: 200 },
        city: { type: 'string', maxLength: 50 },
        postalCode: { type: 'string', maxLength: 10 },
        contactName: { type: 'string', maxLength: 100 },
        contactPhone: { type: 'string', maxLength: 20 },
        contactEmail: { type: 'string', format: 'email' },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Req() req: AuthenticatedRequest, @Body() input: CreateWarehouseInput) {
    try {
      const warehouse = await this.warehouseService.createWarehouse(req.user.tenantId, input);
      return { data: warehouse };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 100 },
        type: { type: 'string', enum: ['MAIN', 'BRANCH', 'VIRTUAL', 'TRANSIT'] },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'CLOSED'] },
        address: { type: 'string', maxLength: 200 },
        city: { type: 'string', maxLength: 50 },
        postalCode: { type: 'string', maxLength: 10 },
        contactName: { type: 'string', maxLength: 100 },
        contactPhone: { type: 'string', maxLength: 20 },
        contactEmail: { type: 'string', format: 'email' },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateWarehouseInput
  ) {
    try {
      const warehouse = await this.warehouseService.updateWarehouse(id, req.user.tenantId, input);
      return { data: warehouse };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete warehouse' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete (default or has inventory)' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      await this.warehouseService.deleteWarehouse(id, req.user.tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set warehouse as default' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Default warehouse set' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async setDefault(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      const warehouse = await this.warehouseService.setDefaultWarehouse(id, req.user.tenantId);
      return { data: warehouse };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  // ============================================
  // TRANSFER MANAGEMENT
  // ============================================

  @Get('transfers')
  @ApiOperation({ summary: 'List transfers with filters' })
  @ApiQuery({ name: 'sourceWarehouseId', required: false, type: String })
  @ApiQuery({ name: 'targetWarehouseId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'initiatedBy', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['initiatedAt', 'completedAt', 'status'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  async listTransfers(
    @Req() req: AuthenticatedRequest,
    @Query('sourceWarehouseId') sourceWarehouseId?: string,
    @Query('targetWarehouseId') targetWarehouseId?: string,
    @Query('status') status?: TransferStatus,
    @Query('initiatedBy') initiatedBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: 'initiatedAt' | 'completedAt' | 'status',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: TransferQuery = {
      tenantId: req.user.tenantId,
    };
    if (sourceWarehouseId) query.sourceWarehouseId = sourceWarehouseId;
    if (targetWarehouseId) query.targetWarehouseId = targetWarehouseId;
    if (status) query.status = status;
    if (initiatedBy) query.initiatedBy = initiatedBy;
    const parsedDateFrom = parseDateParam(dateFrom);
    if (parsedDateFrom !== undefined) query.dateFrom = parsedDateFrom;
    const parsedDateTo = parseDateParam(dateTo);
    if (parsedDateTo !== undefined) query.dateTo = parsedDateTo;
    if (sortBy) query.sortBy = sortBy;
    if (sortOrder) query.sortOrder = sortOrder;
    const parsedOffset = parseIntParam(offset, { min: 0 });
    if (parsedOffset !== undefined) query.offset = parsedOffset;
    const parsedLimit = parseIntParam(limit, { min: 1, max: 1000 });
    if (parsedLimit !== undefined) query.limit = parsedLimit;

    const result = await this.warehouseService.queryTransfers(query);
    return { data: result };
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: 'Get transfer by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async findTransferById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const transfer = await this.warehouseService.findTransferById(id, req.user.tenantId);
    if (!transfer) {
      return { error: { code: 'NOT_FOUND', message: 'Transfer nem található' } };
    }
    return { data: transfer };
  }

  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new transfer' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sourceWarehouseId', 'targetWarehouseId', 'items'],
      properties: {
        sourceWarehouseId: { type: 'string', format: 'uuid' },
        targetWarehouseId: { type: 'string', format: 'uuid' },
        reason: { type: 'string', maxLength: 500 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['inventoryItemId', 'quantity', 'unit'],
            properties: {
              inventoryItemId: { type: 'string', format: 'uuid' },
              serialNumber: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 },
              unit: { type: 'string' },
              note: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transfer created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createTransfer(@Req() req: AuthenticatedRequest, @Body() input: CreateTransferInput) {
    try {
      const transfer = await this.warehouseService.createTransfer(
        req.user.tenantId,
        input,
        req.user.id
      );
      return { data: transfer };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Post('transfers/:id/start')
  @ApiOperation({ summary: 'Start transfer (PENDING -> IN_TRANSIT)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transfer started' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async startTransfer(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      const transfer = await this.warehouseService.startTransfer(id, req.user.tenantId);
      return { data: transfer };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post('transfers/:id/complete')
  @ApiOperation({ summary: 'Complete transfer (IN_TRANSIT -> COMPLETED)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        receivedItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              inventoryItemId: { type: 'string', format: 'uuid' },
              receivedQuantity: { type: 'integer', minimum: 0 },
              note: { type: 'string' },
            },
          },
        },
        note: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Transfer completed' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async completeTransfer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input?: CompleteTransferInput
  ) {
    try {
      const transfer = await this.warehouseService.completeTransfer(
        id,
        req.user.tenantId,
        req.user.id,
        input
      );
      return { data: transfer };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post('transfers/:id/cancel')
  @ApiOperation({ summary: 'Cancel transfer' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Transfer cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed transfer' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async cancelTransfer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    try {
      const transfer = await this.warehouseService.cancelTransfer(
        id,
        req.user.tenantId,
        body.reason
      );
      return { data: transfer };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }
}
