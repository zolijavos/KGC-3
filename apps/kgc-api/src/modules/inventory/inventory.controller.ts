/**
 * Inventory Controller - REST API endpoints
 * Story 9-1: Készlet nyilvántartás alap
 *
 * Endpoints:
 * - GET  /inventory - List inventory items with filters
 * - GET  /inventory/:id - Get single item
 * - POST /inventory - Create inventory item
 * - PATCH /inventory/:id - Update inventory item
 * - DELETE /inventory/:id - Soft delete item
 * - POST /inventory/:id/adjust - Adjust quantity
 * - GET  /inventory/stock-summary/:productId - Get stock summary
 * - GET  /inventory/alerts/low-stock - Get low stock alerts
 */

import { JwtAuthGuard } from '@kgc/common';
import {
  AdjustQuantityInput,
  CreateInventoryItemInput,
  InventoryItemType,
  InventoryQuery,
  InventoryService,
  InventoryStatus,
  UpdateInventoryItemInput,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

interface AuthenticatedRequest {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory items with filters' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['PRODUCT', 'RENTAL_EQUIPMENT', 'PART', 'CONSUMABLE'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'AVAILABLE',
      'RESERVED',
      'IN_TRANSIT',
      'IN_SERVICE',
      'SOLD',
      'RENTED',
      'DAMAGED',
      'LOST',
      'SCRAPPED',
    ],
  })
  @ApiQuery({ name: 'serialNumber', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of inventory items' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: InventoryItemType,
    @Query('status') status?: InventoryStatus,
    @Query('serialNumber') serialNumber?: string,
    @Query('search') search?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: InventoryQuery = {
      tenantId: req.user.tenantId,
    };
    if (warehouseId) query.warehouseId = warehouseId;
    if (productId) query.productId = productId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (serialNumber) query.serialNumber = serialNumber;
    if (search) query.search = search;
    if (offset) query.offset = parseInt(offset, 10);
    if (limit) query.limit = parseInt(limit, 10);

    return this.inventoryService.query(query);
  }

  @Get('stock-summary/:productId')
  @ApiOperation({ summary: 'Get stock summary for a product' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Stock summary' })
  @ApiResponse({ status: 404, description: 'Product not found in inventory' })
  async getStockSummary(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string
  ) {
    const summary = await this.inventoryService.getStockSummary(
      req.user.tenantId,
      productId,
      warehouseId
    );
    return { data: summary };
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get items below minimum stock level' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Low stock alerts' })
  async getLowStockAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('warehouseId') warehouseId?: string
  ) {
    const alerts = await this.inventoryService.findBelowMinStock(req.user.tenantId, warehouseId);
    return { data: alerts };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiResponse({ status: 200, description: 'Inventory item details' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const item = await this.inventoryService.findById(id, req.user.tenantId);
    if (!item) {
      return { error: { code: 'NOT_FOUND', message: 'Készlet tétel nem található' } };
    }
    return { data: item };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new inventory item' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['warehouseId', 'productId', 'type', 'quantity', 'unit'],
      properties: {
        warehouseId: { type: 'string', format: 'uuid' },
        productId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['PRODUCT', 'RENTAL_EQUIPMENT', 'PART', 'CONSUMABLE'] },
        status: { type: 'string', enum: ['AVAILABLE', 'RESERVED'], default: 'AVAILABLE' },
        serialNumber: { type: 'string' },
        batchNumber: { type: 'string' },
        locationCode: { type: 'string', description: 'K-P-D helykód' },
        quantity: { type: 'integer', minimum: 0 },
        unit: { type: 'string', example: 'db' },
        minStockLevel: { type: 'integer' },
        maxStockLevel: { type: 'integer' },
        purchasePrice: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Inventory item created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Req() req: AuthenticatedRequest, @Body() input: CreateInventoryItemInput) {
    try {
      const item = await this.inventoryService.create(req.user.tenantId, input, req.user.id);
      return { data: item };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        warehouseId: { type: 'string', format: 'uuid' },
        status: {
          type: 'string',
          enum: [
            'AVAILABLE',
            'RESERVED',
            'IN_TRANSIT',
            'IN_SERVICE',
            'SOLD',
            'RENTED',
            'DAMAGED',
            'LOST',
            'SCRAPPED',
          ],
        },
        locationCode: { type: 'string' },
        quantity: { type: 'integer' },
        minStockLevel: { type: 'integer' },
        maxStockLevel: { type: 'integer' },
        purchasePrice: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Inventory item updated' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid status transition' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateInventoryItemInput
  ) {
    try {
      const item = await this.inventoryService.update(id, req.user.tenantId, input, req.user.id);
      return { data: item };
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
  @ApiOperation({ summary: 'Soft delete inventory item' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete (item in use)' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      await this.inventoryService.delete(id, req.user.tenantId, req.user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['adjustment'],
      properties: {
        adjustment: { type: 'integer', description: 'Positive to add, negative to subtract' },
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Quantity adjusted' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment (would go negative)' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async adjustQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: AdjustQuantityInput
  ) {
    try {
      const item = await this.inventoryService.adjustQuantity(
        id,
        req.user.tenantId,
        input,
        req.user.id
      );
      return { data: item };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }
}
