/**
 * Location Controller - REST API endpoints
 * Story 9-2: K-P-D helykód rendszer
 *
 * Endpoints:
 * - GET    /locations                     - List locations with filters
 * - GET    /locations/:id                 - Get location by ID
 * - PATCH  /locations/:id                 - Update location
 * - DELETE /locations/:id                 - Soft delete location
 *
 * Structure endpoints:
 * - GET    /locations/structure/:warehouseId  - Get location structure
 * - POST   /locations/structure               - Create structure
 * - PATCH  /locations/structure/:id           - Update structure
 *
 * Generation endpoints:
 * - POST   /locations/generate            - Generate locations (FR32)
 * - DELETE /locations/warehouse/:warehouseId - Delete all locations in warehouse
 */

import { AuthenticatedRequest, JwtAuthGuard, parseBooleanParam, parseIntParam } from '@kgc/common';
import {
  CreateLocationStructureInput,
  GenerateLocationsInput,
  LocationQuery,
  LocationService,
  LocationStatus,
  UpdateLocationInput,
  UpdateLocationStructureInput,
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

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // ============================================
  // LOCATION QUERY
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List locations with filters' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'FULL'] })
  @ApiQuery({ name: 'kommando', required: false, type: Number })
  @ApiQuery({ name: 'polc', required: false, type: Number })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['code', 'createdAt', 'currentOccupancy'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of locations' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: LocationStatus,
    @Query('kommando') kommando?: string,
    @Query('polc') polc?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'code' | 'createdAt' | 'currentOccupancy',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    const query: LocationQuery = {
      tenantId: req.user.tenantId,
    };
    if (warehouseId) query.warehouseId = warehouseId;
    if (status) query.status = status;
    const parsedKommando = parseIntParam(kommando, { min: 1 });
    if (parsedKommando !== undefined) query.kommando = parsedKommando;
    const parsedPolc = parseIntParam(polc, { min: 1 });
    if (parsedPolc !== undefined) query.polc = parsedPolc;
    const parsedAvailableOnly = parseBooleanParam(availableOnly);
    if (parsedAvailableOnly !== undefined) query.availableOnly = parsedAvailableOnly;
    if (search) query.search = search;
    if (sortBy) query.sortBy = sortBy;
    if (sortOrder) query.sortOrder = sortOrder;
    const parsedOffset = parseIntParam(offset, { min: 0 });
    if (parsedOffset !== undefined) query.offset = parsedOffset;
    const parsedLimit = parseIntParam(limit, { min: 1, max: 1000 });
    if (parsedLimit !== undefined) query.limit = parsedLimit;

    const result = await this.locationService.queryLocations(query);
    return { data: result };
  }

  @Get('by-code/:warehouseId/:code')
  @ApiOperation({ summary: 'Get location by code' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiParam({ name: 'code', type: String, description: 'Location code (e.g., K1-P2-D3)' })
  @ApiResponse({ status: 200, description: 'Location details' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findByCode(
    @Req() req: AuthenticatedRequest,
    @Param('warehouseId') warehouseId: string,
    @Param('code') code: string
  ) {
    const location = await this.locationService.findByCode(code, req.user.tenantId, warehouseId);
    if (!location) {
      return { error: { code: 'NOT_FOUND', message: 'Helykód nem található' } };
    }
    return { data: location };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Location details' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const location = await this.locationService.findById(id, req.user.tenantId);
    if (!location) {
      return { error: { code: 'NOT_FOUND', message: 'Helykód nem található' } };
    }
    return { data: location };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update location' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'FULL'] },
        description: { type: 'string', maxLength: 200 },
        capacity: { type: 'integer', minimum: 0 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Location updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateLocationInput
  ) {
    try {
      const location = await this.locationService.updateLocation(id, req.user.tenantId, input);
      return { data: location };
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
  @ApiOperation({ summary: 'Soft delete location' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Location deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete (has inventory)' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      await this.locationService.deleteLocation(id, req.user.tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  // ============================================
  // STRUCTURE MANAGEMENT
  // ============================================

  @Get('structure/:warehouseId')
  @ApiOperation({ summary: 'Get location structure for warehouse' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Location structure' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async getStructure(@Req() req: AuthenticatedRequest, @Param('warehouseId') warehouseId: string) {
    const structure = await this.locationService.getStructure(req.user.tenantId, warehouseId);
    if (!structure) {
      return { error: { code: 'NOT_FOUND', message: 'Helykód struktúra nem található' } };
    }
    return { data: structure };
  }

  @Post('structure')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create location structure for warehouse' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['warehouseId', 'maxKommando', 'maxPolcPerKommando', 'maxDobozPerPolc'],
      properties: {
        warehouseId: { type: 'string', format: 'uuid' },
        kommandoPrefix: { type: 'string', default: 'K', maxLength: 5 },
        polcPrefix: { type: 'string', default: 'P', maxLength: 5 },
        dobozPrefix: { type: 'string', default: 'D', maxLength: 5 },
        separator: { type: 'string', default: '-', maxLength: 1 },
        maxKommando: { type: 'integer', minimum: 1, maximum: 999 },
        maxPolcPerKommando: { type: 'integer', minimum: 1, maximum: 999 },
        maxDobozPerPolc: { type: 'integer', minimum: 1, maximum: 999 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Structure created' })
  @ApiResponse({ status: 400, description: 'Validation error or structure exists' })
  async createStructure(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateLocationStructureInput
  ) {
    try {
      const structure = await this.locationService.createStructure(req.user.tenantId, input);
      return { data: structure };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Patch('structure/:id')
  @ApiOperation({ summary: 'Update location structure' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        kommandoPrefix: { type: 'string', maxLength: 5 },
        polcPrefix: { type: 'string', maxLength: 5 },
        dobozPrefix: { type: 'string', maxLength: 5 },
        separator: { type: 'string', maxLength: 1 },
        maxKommando: { type: 'integer', minimum: 1, maximum: 999 },
        maxPolcPerKommando: { type: 'integer', minimum: 1, maximum: 999 },
        maxDobozPerPolc: { type: 'integer', minimum: 1, maximum: 999 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Structure updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async updateStructure(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateLocationStructureInput
  ) {
    try {
      const structure = await this.locationService.updateStructure(id, req.user.tenantId, input);
      return { data: structure };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  // ============================================
  // GENERATION (FR32: Partner onboarding)
  // ============================================

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate locations for warehouse (FR32)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['warehouseId', 'kommandoCount', 'polcCount', 'dobozCount'],
      properties: {
        warehouseId: { type: 'string', format: 'uuid' },
        kommandoCount: { type: 'integer', minimum: 1, maximum: 100 },
        polcCount: { type: 'integer', minimum: 1, maximum: 50 },
        dobozCount: { type: 'integer', minimum: 1, maximum: 50 },
        capacityPerDoboz: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Locations generated' })
  @ApiResponse({ status: 400, description: 'Validation error or structure missing' })
  async generateLocations(@Req() req: AuthenticatedRequest, @Body() input: GenerateLocationsInput) {
    try {
      const result = await this.locationService.generateLocations(req.user.tenantId, input);
      return { data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Delete('warehouse/:warehouseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all locations in warehouse' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Locations deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete (has inventory)' })
  async deleteAllByWarehouse(
    @Req() req: AuthenticatedRequest,
    @Param('warehouseId') warehouseId: string
  ) {
    try {
      const deletedCount = await this.locationService.deleteAllByWarehouse(
        req.user.tenantId,
        warehouseId
      );
      return { data: { deletedCount } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'INVALID_OPERATION', message } };
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  @Post('validate')
  @ApiOperation({ summary: 'Validate location code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'warehouseId'],
      properties: {
        code: { type: 'string', description: 'Location code (e.g., K1-P2-D3)' },
        warehouseId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string; warehouseId: string }
  ) {
    const result = await this.locationService.validateCode(
      req.user.tenantId,
      body.warehouseId,
      body.code
    );
    return { data: result };
  }
}
