/**
 * Horilla HR Controller - REST API for HR Integration
 * Epic 30: Horilla HR Integration
 *
 * Endpoints:
 * Employee Sync:
 * - POST /horilla-hr/sync/employees - Sync employees (bidirectional)
 * - POST /horilla-hr/sync/user/:id - Sync single user to Horilla
 * - POST /horilla-hr/mappings - Create employee mapping
 * - GET /horilla-hr/mappings - Get all mappings
 * - DELETE /horilla-hr/mappings/:id - Delete mapping
 * - POST /horilla-hr/auto-link - Auto-link employees by email
 *
 * Configuration:
 * - POST /horilla-hr/config - Save Horilla config
 * - GET /horilla-hr/config - Get Horilla config
 */

import {
  CreateEmployeeMappingDto,
  EmployeeSyncService,
  IEmployeeMapping,
  ISyncResult,
  ISyncResultExtended,
  SyncEmployeesDto,
  SyncEmployeesExtendedDto,
} from '@kgc/horilla-hr';
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
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('horilla-hr')
@Controller('horilla-hr')
export class HorillaHrController {
  constructor(private readonly employeeSyncService: EmployeeSyncService) {}

  // =============================================
  // Employee Sync Endpoints
  // =============================================

  /**
   * Sync employees (original unidirectional - for backward compatibility)
   */
  @Post('sync/employees/legacy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync employees from Horilla to KGC (legacy)' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async syncEmployeesLegacy(
    @Body() input: SyncEmployeesDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<ISyncResult> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.employeeSyncService.syncEmployees(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      if (message.includes('configuration not found')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Sync employees with direction support (bidirectional)
   */
  @Post('sync/employees')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync employees between KGC and Horilla HR (bidirectional)' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async syncEmployees(
    @Body() input: SyncEmployeesExtendedDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<ISyncResultExtended> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.employeeSyncService.syncEmployeesExtended(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation failed')) {
        throw new BadRequestException(message);
      }
      if (message.includes('configuration not found')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Create an employee mapping
   */
  @Post('mappings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create employee mapping between KGC and Horilla' })
  @ApiResponse({ status: 201, description: 'Mapping created' })
  @ApiResponse({ status: 400, description: 'Invalid input or mapping exists' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async createMapping(
    @Body() input: CreateEmployeeMappingDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IEmployeeMapping> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.employeeSyncService.createMapping(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('already mapped') || message.includes('Validation failed')) {
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
   * Get all employee mappings for tenant
   */
  @Get('mappings')
  @ApiOperation({ summary: 'Get all employee mappings' })
  @ApiResponse({ status: 200, description: 'Returns all mappings' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getMappings(@Query('tenantId') tenantId: string): Promise<IEmployeeMapping[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.employeeSyncService.getMappings(tenantId);
  }

  /**
   * Delete an employee mapping
   */
  @Delete('mappings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee mapping' })
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
      await this.employeeSyncService.deleteMapping(mappingId, tenantId, userId);
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
