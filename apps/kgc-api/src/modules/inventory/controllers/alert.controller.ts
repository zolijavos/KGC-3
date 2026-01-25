/**
 * Alert Controller - REST API endpoints
 * Story 9-6: Minimum stock alert
 *
 * Stock Level Settings:
 * - GET    /alerts/settings              - List stock level settings
 * - GET    /alerts/settings/:id          - Get setting by ID
 * - POST   /alerts/settings              - Create stock level setting
 * - PATCH  /alerts/settings/:id          - Update setting
 * - DELETE /alerts/settings/:id          - Delete setting
 *
 * Alerts:
 * - GET    /alerts                       - List alerts with filters
 * - GET    /alerts/summary               - Get alert summary
 * - GET    /alerts/:id                   - Get alert by ID
 * - POST   /alerts/:id/acknowledge       - Acknowledge alert
 * - POST   /alerts/:id/snooze            - Snooze alert
 * - POST   /alerts/:id/resolve           - Resolve alert
 * - POST   /alerts/check                 - Bulk check stock levels
 */

import {
  AuthenticatedRequest,
  JwtAuthGuard,
  parseBooleanParam,
  parseDateParam,
  parseIntParam,
} from '@kgc/common';
import {
  AcknowledgeAlertInput,
  AlertPriority,
  AlertQuery,
  AlertService,
  AlertStatus,
  BulkCheckStockLevelsInput,
  CreateStockLevelSettingInput,
  SnoozeAlertInput,
  StockAlertType,
  StockLevelSettingQuery,
  UpdateStockLevelSettingInput,
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

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  // ============================================
  // STOCK LEVEL SETTINGS
  // ============================================

  @Get('settings')
  @ApiOperation({ summary: 'List stock level settings' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of stock level settings' })
  async listSettings(
    @Req() req: AuthenticatedRequest,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('isActive') isActive?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: StockLevelSettingQuery = {
      tenantId: req.user.tenantId,
    };
    if (productId) query.productId = productId;
    if (warehouseId) query.warehouseId = warehouseId;
    const parsedIsActive = parseBooleanParam(isActive);
    if (parsedIsActive !== undefined) query.isActive = parsedIsActive;
    const parsedOffset = parseIntParam(offset, { min: 0 });
    if (parsedOffset !== undefined) query.offset = parsedOffset;
    const parsedLimit = parseIntParam(limit, { min: 1, max: 1000 });
    if (parsedLimit !== undefined) query.limit = parsedLimit;

    const result = await this.alertService.queryStockLevelSettings(query);
    return { data: result };
  }

  @Get('settings/by-product/:productId')
  @ApiOperation({ summary: 'Get stock level setting by product' })
  @ApiParam({ name: 'productId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Stock level setting' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getSettingByProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string
  ) {
    const setting = await this.alertService.findSettingByProduct(
      productId,
      req.user.tenantId,
      warehouseId
    );
    if (!setting) {
      return { error: { code: 'NOT_FOUND', message: 'Készlet szint beállítás nem található' } };
    }
    return { data: setting };
  }

  @Get('settings/:id')
  @ApiOperation({ summary: 'Get stock level setting by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stock level setting details' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getSettingById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const setting = await this.alertService.findSettingById(id, req.user.tenantId);
    if (!setting) {
      return { error: { code: 'NOT_FOUND', message: 'Készlet szint beállítás nem található' } };
    }
    return { data: setting };
  }

  @Post('settings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create stock level setting' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['productId', 'minimumLevel', 'reorderPoint', 'reorderQuantity', 'unit'],
      properties: {
        productId: { type: 'string', format: 'uuid' },
        warehouseId: { type: 'string', format: 'uuid' },
        minimumLevel: { type: 'integer', minimum: 0 },
        reorderPoint: { type: 'integer', minimum: 0, description: 'Must be >= minimumLevel' },
        reorderQuantity: { type: 'integer', minimum: 1 },
        maximumLevel: { type: 'integer', minimum: 0, description: 'Must be > reorderPoint' },
        unit: { type: 'string' },
        leadTimeDays: { type: 'integer', minimum: 0 },
        isActive: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Setting created' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate' })
  async createSetting(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateStockLevelSettingInput
  ) {
    try {
      const setting = await this.alertService.createStockLevelSetting(req.user.tenantId, input);
      return { data: setting };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Patch('settings/:id')
  @ApiOperation({ summary: 'Update stock level setting' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        minimumLevel: { type: 'integer', minimum: 0 },
        reorderPoint: { type: 'integer', minimum: 0 },
        reorderQuantity: { type: 'integer', minimum: 1 },
        maximumLevel: { type: 'integer', minimum: 0 },
        unit: { type: 'string' },
        leadTimeDays: { type: 'integer', minimum: 0 },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async updateSetting(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateStockLevelSettingInput
  ) {
    try {
      const setting = await this.alertService.updateStockLevelSetting(id, req.user.tenantId, input);
      return { data: setting };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Delete('settings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete stock level setting' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Setting deleted' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async deleteSetting(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      await this.alertService.deleteStockLevelSetting(id, req.user.tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  // ============================================
  // ALERTS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List alerts with filters' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRING_SOON', 'WARRANTY_EXPIRING'],
  })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED'],
  })
  @ApiQuery({ name: 'createdAfter', required: false, type: String })
  @ApiQuery({ name: 'createdBefore', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'priority', 'status'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  async listAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: StockAlertType,
    @Query('priority') priority?: AlertPriority,
    @Query('status') status?: AlertStatus,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'priority' | 'status',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: AlertQuery = {
      tenantId: req.user.tenantId,
    };
    if (productId) query.productId = productId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (status) query.status = status;
    const parsedCreatedAfter = parseDateParam(createdAfter);
    if (parsedCreatedAfter !== undefined) query.createdAfter = parsedCreatedAfter;
    const parsedCreatedBefore = parseDateParam(createdBefore);
    if (parsedCreatedBefore !== undefined) query.createdBefore = parsedCreatedBefore;
    if (sortBy) query.sortBy = sortBy;
    if (sortOrder) query.sortOrder = sortOrder;
    const parsedOffset = parseIntParam(offset, { min: 0 });
    if (parsedOffset !== undefined) query.offset = parsedOffset;
    const parsedLimit = parseIntParam(limit, { min: 1, max: 1000 });
    if (parsedLimit !== undefined) query.limit = parsedLimit;

    const result = await this.alertService.queryAlerts(query);
    return { data: result };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get alert summary (counts by priority and type)' })
  @ApiResponse({ status: 200, description: 'Alert summary' })
  async getSummary(@Req() req: AuthenticatedRequest) {
    const summary = await this.alertService.getAlertSummary(req.user.tenantId);
    return { data: summary };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async findAlertById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const alert = await this.alertService.findAlertById(id, req.user.tenantId);
    if (!alert) {
      return { error: { code: 'NOT_FOUND', message: 'Alert nem található' } };
    }
    return { data: alert };
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        note: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async acknowledge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input?: AcknowledgeAlertInput
  ) {
    try {
      const alert = await this.alertService.acknowledgeAlert(
        id,
        req.user.tenantId,
        req.user.id,
        input?.note
      );
      return { data: alert };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post(':id/snooze')
  @ApiOperation({ summary: 'Snooze alert' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['snoozeDays'],
      properties: {
        snoozeDays: { type: 'integer', minimum: 1, maximum: 30 },
        note: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Alert snoozed' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async snooze(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: SnoozeAlertInput
  ) {
    try {
      const alert = await this.alertService.snoozeAlert(
        id,
        req.user.tenantId,
        input.snoozeDays,
        input.note
      );
      return { data: alert };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        note: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async resolve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body?: { note?: string }
  ) {
    try {
      const alert = await this.alertService.resolveAlert(id, req.user.tenantId, body?.note);
      return { data: alert };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  @Post('check')
  @ApiOperation({ summary: 'Bulk check stock levels and create alerts' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        warehouseId: { type: 'string', format: 'uuid' },
        createAlerts: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Stock check results' })
  async bulkCheckStockLevels(
    @Req() req: AuthenticatedRequest,
    @Body() input: BulkCheckStockLevelsInput
  ) {
    try {
      const serviceInput: { productIds?: string[]; warehouseId?: string; createAlerts?: boolean } =
        {};
      if (input.productIds) serviceInput.productIds = input.productIds;
      if (input.warehouseId) serviceInput.warehouseId = input.warehouseId;
      if (input.createAlerts !== undefined) serviceInput.createAlerts = input.createAlerts;

      const result = await this.alertService.bulkCheckStockLevels(req.user.tenantId, serviceInput);
      return { data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Post('resolve-by-product/:productId')
  @ApiOperation({ summary: 'Resolve all alerts for a product' })
  @ApiParam({ name: 'productId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Alerts resolved' })
  async resolveByProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string
  ) {
    const resolvedCount = await this.alertService.resolveAlertsByProduct(
      productId,
      req.user.tenantId,
      warehouseId
    );
    return { data: { resolvedCount } };
  }
}
