/**
 * Bergep-Szerviz Controller - REST API for Equipment-Service Integration
 * Epic 25: Equipment-Service Integration
 *
 * Endpoints:
 * - POST /equipment-service/dispatch - Dispatch equipment to service
 * - POST /equipment-service/return - Return equipment from service
 * - GET /equipment-service/dispatch/:equipmentId/active - Get active dispatch
 * - GET /equipment-service/dispatch/:equipmentId/history - Get dispatch history
 * - POST /equipment-service/auto-complete/:worksheetId - Auto-complete on worksheet done
 */

import {
  DispatchToServiceDto,
  EquipmentDispatchService,
  IServiceDispatch,
  IServiceReturn,
  IWorksheet,
  ReturnFromServiceDto,
  ServiceReturnService,
} from '@kgc/bergep-szerviz';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('equipment-service')
@Controller('equipment-service')
export class BergepSzervizController {
  constructor(
    private readonly dispatchService: EquipmentDispatchService,
    private readonly returnService: ServiceReturnService
  ) {}

  /**
   * Dispatch equipment to service
   */
  @Post('dispatch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Dispatch equipment to service' })
  @ApiResponse({ status: 201, description: 'Equipment dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or equipment cannot be dispatched' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ description: 'Dispatch configuration' })
  async dispatchToService(
    @Body() input: DispatchToServiceDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<{ dispatch: IServiceDispatch; worksheet: IWorksheet }> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.dispatchService.dispatchToService(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (
        message.includes('Cannot dispatch') ||
        message.includes('already in service') ||
        message.includes('active service dispatch')
      ) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Return equipment from service
   */
  @Post('return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return equipment from service' })
  @ApiResponse({ status: 200, description: 'Equipment returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or equipment cannot be returned' })
  @ApiResponse({ status: 404, description: 'Dispatch or worksheet not found' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ description: 'Return configuration' })
  async returnFromService(
    @Body() input: ReturnFromServiceDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IServiceReturn> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.returnService.returnFromService(input, tenantId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (
        message.includes('already returned') ||
        message.includes('must be completed') ||
        message.includes('not in service')
      ) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * Get active dispatch for equipment
   */
  @Get('dispatch/:equipmentId/active')
  @ApiOperation({ summary: 'Get active dispatch for equipment' })
  @ApiResponse({ status: 200, description: 'Returns active dispatch or null' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getActiveDispatch(
    @Param('equipmentId') equipmentId: string,
    @Query('tenantId') tenantId: string
  ): Promise<IServiceDispatch | null> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.dispatchService.getActiveDispatch(equipmentId, tenantId);
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
   * Get dispatch history for equipment
   */
  @Get('dispatch/:equipmentId/history')
  @ApiOperation({ summary: 'Get dispatch history for equipment' })
  @ApiResponse({ status: 200, description: 'Returns dispatch history' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getDispatchHistory(
    @Param('equipmentId') equipmentId: string,
    @Query('tenantId') tenantId: string
  ): Promise<IServiceDispatch[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    try {
      return await this.dispatchService.getDispatchHistory(equipmentId, tenantId);
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
   * Auto-complete equipment return when worksheet is done
   */
  @Post('auto-complete/:worksheetId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-complete equipment return on worksheet completion' })
  @ApiResponse({ status: 200, description: 'Equipment auto-returned or null if not applicable' })
  @ApiParam({ name: 'worksheetId', description: 'Worksheet UUID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  async autoComplete(
    @Param('worksheetId') worksheetId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<IServiceReturn | null> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    return this.returnService.autoCompleteOnWorksheetDone(worksheetId, tenantId, userId);
  }
}
