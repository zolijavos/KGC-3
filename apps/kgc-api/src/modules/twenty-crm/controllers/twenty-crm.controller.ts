/**
 * Twenty CRM Controller - REST API for CRM Integration
 * Epic 28: Twenty CRM Integration
 *
 * Endpoints:
 * Partner Sync (Story 28-1):
 * - POST /twenty-crm/sync/partners - Sync partners
 * - POST /twenty-crm/mappings - Create partner mapping
 * - GET /twenty-crm/mappings - Get all mappings
 * - DELETE /twenty-crm/mappings/:id - Delete mapping
 * - POST /twenty-crm/auto-link - Auto-link partners by email
 *
 * Dashboard Embed (Story 28-2):
 * - POST /twenty-crm/dashboards - Create dashboard config
 * - GET /twenty-crm/dashboards - Get dashboard configs
 * - GET /twenty-crm/dashboards/active - Get active dashboards for user
 * - GET /twenty-crm/dashboards/:id - Get dashboard by ID
 * - PATCH /twenty-crm/dashboards/:id - Update dashboard config
 * - DELETE /twenty-crm/dashboards/:id - Delete dashboard config
 * - POST /twenty-crm/dashboards/:id/token - Generate embed token
 * - GET /twenty-crm/dashboards/:id/embed - Get embed URL
 */

import {
  CreateDashboardConfigDto,
  CreatePartnerMappingDto,
  DashboardEmbedService,
  GenerateEmbedTokenDto,
  IDashboardConfig,
  IEmbedToken,
  IPartnerMapping,
  ISyncResult,
  PartnerSyncService,
  SyncPartnersDto,
  UpdateDashboardConfigDto,
} from '@kgc/twenty-crm';
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
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('twenty-crm')
@Controller('twenty-crm')
export class TwentyCrmController {
  constructor(
    private readonly partnerSyncService: PartnerSyncService,
    private readonly dashboardEmbedService: DashboardEmbedService
  ) {}

  // =============================================
  // Partner Sync Endpoints (Story 28-1)
  // =============================================

  /**
   * Sync partners between KGC and Twenty CRM
   */
  @Post('sync/partners')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync partners between KGC and Twenty CRM' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async syncPartners(
    @Body() input: SyncPartnersDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<ISyncResult> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.partnerSyncService.syncPartners(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Create a partner mapping
   */
  @Post('mappings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create partner mapping between KGC and CRM' })
  @ApiResponse({ status: 201, description: 'Mapping created' })
  @ApiResponse({ status: 400, description: 'Invalid input or mapping exists' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async createMapping(
    @Body() input: CreatePartnerMappingDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IPartnerMapping> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.partnerSyncService.createMapping(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('already exists') || message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      throw error;
    }
  }

  /**
   * Get all partner mappings for tenant
   */
  @Get('mappings')
  @ApiOperation({ summary: 'Get all partner mappings' })
  @ApiResponse({ status: 200, description: 'Returns all mappings' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getMappings(@Query('tenantId') tenantId: string): Promise<IPartnerMapping[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.partnerSyncService.getMappings(tenantId);
  }

  /**
   * Delete a partner mapping
   */
  @Delete('mappings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete partner mapping' })
  @ApiResponse({ status: 204, description: 'Mapping deleted' })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Mapping UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async deleteMapping(
    @Param('id') mappingId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<void> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      await this.partnerSyncService.deleteMapping(mappingId, tenantId, userId);
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
   * Auto-link partners by email
   */
  @Post('auto-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-link KGC and CRM partners by matching email' })
  @ApiResponse({ status: 200, description: 'Auto-link completed' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async autoLinkByEmail(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<{ linked: number; skipped: number; errors: string[] }> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    return this.partnerSyncService.autoLinkByEmail(tenantId, userId);
  }

  // =============================================
  // Dashboard Embed Endpoints (Story 28-2)
  // =============================================

  /**
   * Create dashboard configuration
   */
  @Post('dashboards')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create dashboard embed configuration' })
  @ApiResponse({ status: 201, description: 'Dashboard config created' })
  @ApiResponse({ status: 400, description: 'Invalid input or CRM dashboard not accessible' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async createDashboardConfig(
    @Body() input: CreateDashboardConfigDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IDashboardConfig> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.dashboardEmbedService.createDashboardConfig(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed') || message.includes('not accessible')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Get all dashboard configs for tenant
   */
  @Get('dashboards')
  @ApiOperation({ summary: 'Get all dashboard configurations' })
  @ApiResponse({ status: 200, description: 'Returns all dashboard configs' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getDashboardConfigs(@Query('tenantId') tenantId: string): Promise<IDashboardConfig[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.dashboardEmbedService.getDashboardConfigs(tenantId);
  }

  /**
   * Get active dashboards that user has access to
   */
  @Get('dashboards/active')
  @ApiOperation({ summary: 'Get active dashboards user can access' })
  @ApiResponse({ status: 200, description: 'Returns accessible dashboards' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async getActiveDashboards(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IDashboardConfig[]> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    return this.dashboardEmbedService.getActiveDashboards(tenantId, userId);
  }

  /**
   * Get dashboard config by ID
   */
  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard configuration by ID' })
  @ApiResponse({ status: 200, description: 'Returns dashboard config' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Dashboard config UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getDashboardById(
    @Param('id') configId: string,
    @Query('tenantId') tenantId: string
  ): Promise<IDashboardConfig> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      const config = await this.dashboardEmbedService.getDashboardById(configId, tenantId);
      if (!config) {
        throw new NotFoundException('Dashboard config not found');
      }
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }

  /**
   * Update dashboard configuration
   */
  @Patch('dashboards/:id')
  @ApiOperation({ summary: 'Update dashboard configuration' })
  @ApiResponse({ status: 200, description: 'Dashboard config updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Dashboard config UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async updateDashboardConfig(
    @Param('id') configId: string,
    @Body() input: UpdateDashboardConfigDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IDashboardConfig> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.dashboardEmbedService.updateDashboardConfig(
        configId,
        input,
        tenantId,
        userId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed') || message.includes('not accessible')) {
        throw new BadRequestException(message);
      }
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
   * Delete dashboard configuration
   */
  @Delete('dashboards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete dashboard configuration' })
  @ApiResponse({ status: 204, description: 'Dashboard config deleted' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Dashboard config UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async deleteDashboardConfig(
    @Param('id') configId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<void> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      await this.dashboardEmbedService.deleteDashboardConfig(configId, tenantId, userId);
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
   * Generate embed token for dashboard
   */
  @Post('dashboards/:id/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate embed token for dashboard' })
  @ApiResponse({ status: 200, description: 'Token generated' })
  @ApiResponse({ status: 400, description: 'Dashboard not active or invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiParam({ name: 'id', description: 'Dashboard config UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async generateEmbedToken(
    @Param('id') configId: string,
    @Body() input: Partial<GenerateEmbedTokenDto>,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IEmbedToken> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      const fullInput: GenerateEmbedTokenDto = {
        dashboardId: configId,
        expiresInMinutes: input.expiresInMinutes || 60,
      };
      return await this.dashboardEmbedService.generateEmbedToken(fullInput, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not active') || message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied') || message.includes('Insufficient permissions')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }

  /**
   * Get embed URL with token
   */
  @Get('dashboards/:id/embed')
  @ApiOperation({ summary: 'Get embed URL with token' })
  @ApiResponse({ status: 200, description: 'Returns embed URL and token' })
  @ApiResponse({ status: 400, description: 'Dashboard not active' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiParam({ name: 'id', description: 'Dashboard config UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async getEmbedUrl(
    @Param('id') configId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<{ url: string; token: string; config: IDashboardConfig }> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.dashboardEmbedService.getEmbedUrl(configId, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not active')) {
        throw new BadRequestException(message);
      }
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied') || message.includes('Insufficient permissions')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }
}
