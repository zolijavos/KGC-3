/**
 * Movement Controller - REST API endpoints
 * Story 9-4: Készlet mozgás audit trail
 *
 * Endpoints:
 * - GET    /movements              - List movements with filters
 * - GET    /movements/:id          - Get movement by ID
 * - GET    /movements/history/:inventoryItemId - Get item history
 * - GET    /movements/summary      - Get movement summary
 * - POST   /movements              - Record movement (internal use)
 */

import { AuthenticatedRequest, JwtAuthGuard, parseDateParam, parseIntParam } from '@kgc/common';
import {
  CreateMovementInput,
  MovementQuery,
  MovementService,
  MovementSourceModule,
  MovementType,
} from '@kgc/inventory';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

@ApiTags('movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('movements')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Get()
  @ApiOperation({ summary: 'List movements with filters (audit trail)' })
  @ApiQuery({ name: 'inventoryItemId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'RECEIPT',
      'ISSUE',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'ADJUSTMENT',
      'RETURN',
      'SCRAP',
      'RESERVATION',
      'RELEASE',
      'STATUS_CHANGE',
    ],
  })
  @ApiQuery({
    name: 'sourceModule',
    required: false,
    enum: ['INVENTORY', 'RENTAL', 'SERVICE', 'SALES', 'STOCK_COUNT', 'TRANSFER', 'MANUAL'],
  })
  @ApiQuery({ name: 'referenceId', required: false, type: String })
  @ApiQuery({ name: 'serialNumber', required: false, type: String })
  @ApiQuery({ name: 'batchNumber', required: false, type: String })
  @ApiQuery({ name: 'performedBy', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['performedAt', 'createdAt', 'quantityChange'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of movements' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('inventoryItemId') inventoryItemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: MovementType,
    @Query('sourceModule') sourceModule?: MovementSourceModule,
    @Query('referenceId') referenceId?: string,
    @Query('serialNumber') serialNumber?: string,
    @Query('batchNumber') batchNumber?: string,
    @Query('performedBy') performedBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: 'performedAt' | 'createdAt' | 'quantityChange',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: MovementQuery = {
      tenantId: req.user.tenantId,
    };
    if (inventoryItemId) query.inventoryItemId = inventoryItemId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (productId) query.productId = productId;
    if (type) query.type = type;
    if (sourceModule) query.sourceModule = sourceModule;
    if (referenceId) query.referenceId = referenceId;
    if (serialNumber) query.serialNumber = serialNumber;
    if (batchNumber) query.batchNumber = batchNumber;
    if (performedBy) query.performedBy = performedBy;
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

    const result = await this.movementService.queryMovements(query);
    return { data: result };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get movement summary for period' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'periodStart', required: true, type: String })
  @ApiQuery({ name: 'periodEnd', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Movement summary' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async getSummary(
    @Req() req: AuthenticatedRequest,
    @Query('warehouseId') warehouseId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string
  ) {
    if (!periodStart || !periodEnd) {
      return { error: { code: 'VALIDATION_ERROR', message: 'periodStart és periodEnd kötelező' } };
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { error: { code: 'VALIDATION_ERROR', message: 'Érvénytelen dátum formátum' } };
    }

    if (start > end) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A kezdő dátum nem lehet később mint a záró dátum',
        },
      };
    }

    const summary = await this.movementService.getSummary(
      req.user.tenantId,
      warehouseId,
      start,
      end
    );
    return { data: summary };
  }

  @Get('history/:inventoryItemId')
  @ApiOperation({ summary: 'Get movement history for inventory item' })
  @ApiParam({ name: 'inventoryItemId', type: String, format: 'uuid' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max records (default: 50)',
  })
  @ApiResponse({ status: 200, description: 'Movement history' })
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Param('inventoryItemId') inventoryItemId: string,
    @Query('limit') limit?: string
  ) {
    const maxRecords = parseIntParam(limit, { min: 1, max: 500 }) ?? 50;
    const history = await this.movementService.getHistory(
      inventoryItemId,
      req.user.tenantId,
      maxRecords
    );
    return { data: history };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movement by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Movement details' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const movement = await this.movementService.findById(id, req.user.tenantId);
    if (!movement) {
      return { error: { code: 'NOT_FOUND', message: 'Mozgás nem található' } };
    }
    return { data: movement };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record movement (internal/manual use)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'inventoryItemId',
        'warehouseId',
        'productId',
        'type',
        'sourceModule',
        'quantityChange',
        'previousQuantity',
        'unit',
      ],
      properties: {
        inventoryItemId: { type: 'string', format: 'uuid' },
        warehouseId: { type: 'string', format: 'uuid' },
        productId: { type: 'string', format: 'uuid' },
        type: {
          type: 'string',
          enum: [
            'RECEIPT',
            'ISSUE',
            'TRANSFER_OUT',
            'TRANSFER_IN',
            'ADJUSTMENT',
            'RETURN',
            'SCRAP',
            'RESERVATION',
            'RELEASE',
            'STATUS_CHANGE',
          ],
        },
        sourceModule: {
          type: 'string',
          enum: ['INVENTORY', 'RENTAL', 'SERVICE', 'SALES', 'STOCK_COUNT', 'TRANSFER', 'MANUAL'],
        },
        referenceId: { type: 'string', format: 'uuid' },
        referenceType: { type: 'string' },
        quantityChange: {
          type: 'integer',
          description: 'Positive for increase, negative for decrease',
        },
        previousQuantity: { type: 'integer', minimum: 0 },
        unit: { type: 'string' },
        previousStatus: { type: 'string' },
        newStatus: { type: 'string' },
        previousLocationCode: { type: 'string' },
        newLocationCode: { type: 'string' },
        serialNumber: { type: 'string' },
        batchNumber: { type: 'string' },
        value: { type: 'number', minimum: 0 },
        currency: { type: 'string', minLength: 3, maxLength: 3 },
        reason: { type: 'string', description: 'Required for negative quantity changes' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Movement recorded' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Req() req: AuthenticatedRequest, @Body() input: CreateMovementInput) {
    try {
      const movement = await this.movementService.recordMovement(
        req.user.tenantId,
        input,
        req.user.id
      );
      return { data: movement };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }
}
