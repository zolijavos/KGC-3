/**
 * Dashboard Controller - REST API for Dashboard Widgets
 * Epic 27: Story 27-1 - Dashboard Widgetek
 *
 * Endpoints:
 * - GET /dashboard - Get all widgets for tenant
 * - POST /dashboard/widgets - Create widget
 * - GET /dashboard/widgets/:id - Get widget data
 * - PATCH /dashboard/widgets/:id - Update widget
 * - DELETE /dashboard/widgets/:id - Delete widget
 * - GET /dashboard/widgets/:id/data - Get widget data
 */

import {
  CreateWidgetDto,
  DashboardWidgetService,
  GetWidgetDataDto,
  IWidgetConfig,
  IWidgetData,
  UpdateWidgetDto,
} from '@kgc/reporting';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly widgetService: DashboardWidgetService) {}

  /**
   * Get all dashboard widgets for the current tenant
   */
  @Get()
  @ApiOperation({ summary: 'Get all dashboard widgets' })
  @ApiResponse({ status: 200, description: 'Returns list of widgets' })
  @ApiQuery({ name: 'tenantId', required: true, description: 'Tenant ID' })
  async getDashboard(@Query('tenantId') tenantId: string): Promise<IWidgetConfig[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.widgetService.getDashboard(tenantId);
  }

  /**
   * Create a new dashboard widget
   */
  @Post('widgets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new widget' })
  @ApiResponse({ status: 201, description: 'Widget created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or position overlap' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ description: 'Widget configuration' })
  async createWidget(
    @Body() input: CreateWidgetDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IWidgetConfig> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.widgetService.createWidget(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('overlap')) {
        throw new BadRequestException(message);
      }
      if (message.includes('Validation')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Update an existing widget
   */
  @Patch('widgets/:id')
  @ApiOperation({ summary: 'Update a widget' })
  @ApiResponse({ status: 200, description: 'Widget updated' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Widget ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async updateWidget(
    @Param('id') widgetId: string,
    @Body() input: UpdateWidgetDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IWidgetConfig> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.widgetService.updateWidget(widgetId, input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (message.includes('overlap') || message.includes('Validation')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Delete a widget
   */
  @Delete('widgets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a widget' })
  @ApiResponse({ status: 204, description: 'Widget deleted' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Widget ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async deleteWidget(
    @Param('id') widgetId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<void> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      await this.widgetService.deleteWidget(widgetId, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }

  /**
   * Get widget data (value, chart data, or table data)
   */
  @Get('widgets/:id/data')
  @ApiOperation({ summary: 'Get widget data' })
  @ApiResponse({ status: 200, description: 'Returns widget data' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  @ApiParam({ name: 'id', description: 'Widget ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'dateRange', required: false, description: 'Date range preset' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Custom start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Custom end date' })
  async getWidgetData(
    @Param('id') widgetId: string,
    @Query('tenantId') tenantId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<IWidgetData> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const input: GetWidgetDataDto = {
      widgetId,
      dateRange: (dateRange as GetWidgetDataDto['dateRange']) ?? 'THIS_MONTH',
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    };

    try {
      return await this.widgetService.getWidgetData(input, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }
}
