/**
 * Bergep Controller - Rental Equipment REST API
 * Epic 13: Bérgép Management
 * Epic 40: Bérgép Megtérülés & Előzmények
 *
 * Endpoints:
 * - GET    /bergep              - List equipment with filters
 * - GET    /bergep/:id          - Get equipment by ID
 * - POST   /bergep              - Create new equipment
 * - PATCH  /bergep/:id          - Update equipment
 * - DELETE /bergep/:id          - Soft delete equipment
 * - POST   /bergep/:id/status   - Change equipment status
 * - POST   /bergep/scan         - Scan by QR/Serial/Inventory code
 * - GET    /bergep/:id/accessories      - List accessories
 * - POST   /bergep/:id/accessories      - Add accessory
 * - PATCH  /bergep/accessories/:id      - Update accessory
 * - DELETE /bergep/accessories/:id      - Remove accessory
 * - POST   /bergep/:id/checklist        - Verify accessory checklist
 * - GET    /bergep/:id/history          - Get equipment history
 * - GET    /bergep/:id/maintenance      - Get maintenance records
 * - POST   /bergep/:id/maintenance      - Add maintenance record
 * - GET    /bergep/alerts/maintenance   - Get maintenance alerts
 * - GET    /bergep/statistics           - Get equipment statistics
 * - GET    /bergep/:id/costs            - Get service costs (Epic 40)
 */

import {
  EquipmentCategory,
  EquipmentCondition,
  EquipmentPermissionContext,
  EquipmentStatus,
  MaintenanceType,
  RentalEquipmentService,
} from '@kgc/bergep';
import { EquipmentCostService, EquipmentProfitService } from '@kgc/rental-core';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EquipmentCostResponseDto } from '../dto/equipment-cost-response.dto';
import {
  EquipmentProfitResponseDto,
  EquipmentProfitStatusDto,
} from '../dto/equipment-profit-response.dto';
import { EquipmentRentalHistoryResponseDto } from '../dto/equipment-rental-history-response.dto';
import { PrismaEquipmentHistoryRepository } from '../repositories/prisma-equipment-history.repository';

// ============================================
// DTOs for Swagger with class-validator
// ============================================

class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(EquipmentCategory)
  category!: EquipmentCategory;

  @IsNumber()
  @Min(0)
  dailyRate!: number;

  @IsNumber()
  @Min(0)
  weeklyRate!: number;

  @IsNumber()
  @Min(0)
  monthlyRate!: number;

  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  inventoryCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maintenanceIntervalDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EquipmentCategory)
  category?: EquipmentCategory;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maintenanceIntervalDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ChangeStatusDto {
  @IsEnum(EquipmentStatus)
  newStatus!: EquipmentStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}

class ScanEquipmentDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(['QR', 'SERIAL', 'INVENTORY'])
  codeType!: 'QR' | 'SERIAL' | 'INVENTORY';
}

class CreateAccessoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsBoolean()
  isMandatory!: boolean;

  @IsNumber()
  @Min(0)
  replacementCost!: number;

  @IsEnum(EquipmentCondition)
  condition!: EquipmentCondition;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateAccessoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  replacementCost?: number;

  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}

class AccessoryChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  accessoryId!: string;

  @IsBoolean()
  isPresent!: boolean;

  @IsEnum(EquipmentCondition)
  condition!: EquipmentCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}

class AccessoryChecklistDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccessoryChecklistItemDto)
  items!: AccessoryChecklistItemDto[];
}

class CreateMaintenanceDto {
  @IsEnum(MaintenanceType)
  maintenanceType!: MaintenanceType;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsString()
  @IsNotEmpty()
  performedBy!: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partsReplaced?: string[];

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================
// CONTROLLER
// ============================================

@ApiTags('bergep')
@ApiBearerAuth()
@Controller('bergep')
export class BergepController {
  private readonly logger = new Logger(BergepController.name);

  constructor(
    private readonly equipmentService: RentalEquipmentService,
    private readonly equipmentCostService: EquipmentCostService,
    private readonly equipmentProfitService: EquipmentProfitService,
    private readonly equipmentHistoryRepository: PrismaEquipmentHistoryRepository
  ) {}

  /**
   * Build permission context from request
   *
   * SECURITY WARNING: In production, tenantId/userId/roles MUST come from JWT token,
   * not from query parameters. Current implementation is for development only.
   *
   * TODO (Epic 1 - Auth): Replace with JWT-based context extraction
   */
  private buildContext(
    tenantId: string,
    locationId: string,
    userId: string
  ): EquipmentPermissionContext {
    // Validate required parameters
    if (!tenantId || !locationId || !userId) {
      throw new BadRequestException('tenantId, locationId, and userId are required');
    }

    // SECURITY: Log for audit - these should come from JWT in production
    this.logger.warn(
      `[SECURITY] Building context from query params - tenantId: ${tenantId}, userId: ${userId}. ` +
        'This should be replaced with JWT-based auth in production.'
    );

    return {
      userId,
      tenantId,
      locationId,
      // FIXME: These should be extracted from JWT roles, not hardcoded
      // See ADR-032 for RBAC architecture
      canManageEquipment: true,
      canPerformMaintenance: true,
    };
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List rental equipment with filters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: EquipmentStatus })
  @ApiQuery({ name: 'category', required: false, enum: EquipmentCategory })
  @ApiQuery({ name: 'condition', required: false, enum: EquipmentCondition })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'maintenanceDueSoon', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Equipment list with pagination' })
  async list(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Query('status') status?: EquipmentStatus,
    @Query('category') category?: EquipmentCategory,
    @Query('condition') condition?: EquipmentCondition,
    @Query('brand') brand?: string,
    @Query('search') search?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('maintenanceDueSoon') maintenanceDueSoon?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (brand) filter.brand = brand;
    if (search) filter.search = search;
    if (availableOnly === 'true') filter.availableOnly = true;
    if (maintenanceDueSoon === 'true') filter.maintenanceDueSoon = true;
    if (page) filter.page = parseInt(page, 10);
    if (pageSize) filter.pageSize = parseInt(pageSize, 10);

    return this.equipmentService.findMany(
      filter as Parameters<typeof this.equipmentService.findMany>[0],
      context
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get equipment statistics' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Equipment statistics' })
  async getStatistics(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.getStatistics(context);
  }

  @Get('alerts/maintenance')
  @ApiOperation({ summary: 'Get maintenance alerts' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Maintenance alerts' })
  async getMaintenanceAlerts(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.getMaintenanceAlerts(context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Equipment details' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async getById(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    const equipment = await this.equipmentService.findById(id, context);
    if (!equipment) {
      throw new NotFoundException(`Equipment not found: ${id}`);
    }
    return equipment;
  }

  @Post()
  @ApiOperation({ summary: 'Create new rental equipment' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: CreateEquipmentDto })
  @ApiResponse({ status: 201, description: 'Equipment created' })
  async create(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: CreateEquipmentDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);

    const input: Parameters<typeof this.equipmentService.create>[0] = {
      serialNumber: dto.serialNumber,
      name: dto.name,
      category: dto.category,
      dailyRate: dto.dailyRate,
      weeklyRate: dto.weeklyRate,
      monthlyRate: dto.monthlyRate,
      depositAmount: dto.depositAmount,
    };

    if (dto.productId) input.productId = dto.productId;
    if (dto.inventoryCode) input.inventoryCode = dto.inventoryCode;
    if (dto.description) input.description = dto.description;
    if (dto.brand) input.brand = dto.brand;
    if (dto.model) input.model = dto.model;
    if (dto.purchaseDate) input.purchaseDate = new Date(dto.purchaseDate);
    if (dto.purchasePrice !== undefined) input.purchasePrice = dto.purchasePrice;
    if (dto.warrantyExpiry) input.warrantyExpiry = new Date(dto.warrantyExpiry);
    if (dto.maintenanceIntervalDays !== undefined)
      input.maintenanceIntervalDays = dto.maintenanceIntervalDays;
    if (dto.notes) input.notes = dto.notes;

    return this.equipmentService.create(input, context);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update equipment' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: UpdateEquipmentDto })
  @ApiResponse({ status: 200, description: 'Equipment updated' })
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateEquipmentDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);

    const input: Parameters<typeof this.equipmentService.update>[1] = {};
    if (dto.name) input.name = dto.name;
    if (dto.description !== undefined) input.description = dto.description;
    if (dto.category) input.category = dto.category;
    if (dto.brand !== undefined) input.brand = dto.brand;
    if (dto.model !== undefined) input.model = dto.model;
    if (dto.dailyRate !== undefined) input.dailyRate = dto.dailyRate;
    if (dto.weeklyRate !== undefined) input.weeklyRate = dto.weeklyRate;
    if (dto.monthlyRate !== undefined) input.monthlyRate = dto.monthlyRate;
    if (dto.depositAmount !== undefined) input.depositAmount = dto.depositAmount;
    if (dto.condition) input.condition = dto.condition;
    if (dto.warrantyExpiry !== undefined) {
      input.warrantyExpiry = dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined;
    }
    if (dto.maintenanceIntervalDays !== undefined)
      input.maintenanceIntervalDays = dto.maintenanceIntervalDays;
    if (dto.notes !== undefined) input.notes = dto.notes;

    return this.equipmentService.update(id, input, context);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete equipment' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 204, description: 'Equipment deleted' })
  async delete(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    await this.equipmentService.delete(id, context);
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  @Post(':id/status')
  @ApiOperation({ summary: 'Change equipment status' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: ChangeStatusDto })
  @ApiResponse({ status: 200, description: 'Status changed' })
  async changeStatus(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: ChangeStatusDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);

    const input: Parameters<typeof this.equipmentService.changeStatus>[0] = {
      equipmentId: id,
      newStatus: dto.newStatus,
    };
    if (dto.reason) input.reason = dto.reason;
    if (dto.relatedId) input.relatedId = dto.relatedId;

    return this.equipmentService.changeStatus(input, context);
  }

  // ============================================
  // SCAN OPERATIONS
  // ============================================

  @Post('scan')
  @ApiOperation({ summary: 'Scan equipment by QR/Serial/Inventory code' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: ScanEquipmentDto })
  @ApiResponse({ status: 200, description: 'Equipment scan result' })
  async scan(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: ScanEquipmentDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.scan(dto, context);
  }

  // ============================================
  // ACCESSORY OPERATIONS
  // ============================================

  @Get(':id/accessories')
  @ApiOperation({ summary: 'List equipment accessories' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Accessories list' })
  async getAccessories(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.getAccessories(id, context);
  }

  @Post(':id/accessories')
  @ApiOperation({ summary: 'Add accessory to equipment' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: CreateAccessoryDto })
  @ApiResponse({ status: 201, description: 'Accessory added' })
  async addAccessory(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: CreateAccessoryDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);

    const input: Parameters<typeof this.equipmentService.addAccessory>[0] = {
      equipmentId: id,
      name: dto.name,
      quantity: dto.quantity,
      isMandatory: dto.isMandatory,
      replacementCost: dto.replacementCost,
      condition: dto.condition,
    };
    if (dto.description) input.description = dto.description;
    if (dto.notes) input.notes = dto.notes;

    return this.equipmentService.addAccessory(input, context);
  }

  @Patch('accessories/:accessoryId')
  @ApiOperation({ summary: 'Update accessory' })
  @ApiParam({ name: 'accessoryId', description: 'Accessory ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: UpdateAccessoryDto })
  @ApiResponse({ status: 200, description: 'Accessory updated' })
  async updateAccessory(
    @Param('accessoryId') accessoryId: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateAccessoryDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.updateAccessory(accessoryId, dto, context);
  }

  @Delete('accessories/:accessoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove accessory' })
  @ApiParam({ name: 'accessoryId', description: 'Accessory ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 204, description: 'Accessory removed' })
  async removeAccessory(
    @Param('accessoryId') accessoryId: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    await this.equipmentService.removeAccessory(accessoryId, context);
  }

  @Post(':id/checklist')
  @ApiOperation({ summary: 'Verify accessory checklist' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: AccessoryChecklistDto })
  @ApiResponse({ status: 200, description: 'Checklist verification result' })
  async verifyChecklist(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: AccessoryChecklistDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.verifyAccessoryChecklist(
      { equipmentId: id, items: dto.items },
      context
    );
  }

  // ============================================
  // HISTORY & MAINTENANCE
  // ============================================

  @Get(':id/history')
  @ApiOperation({ summary: 'Get equipment history' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Equipment history' })
  async getHistory(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.getHistory(id, context);
  }

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Get maintenance records' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Maintenance records' })
  async getMaintenanceRecords(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ) {
    const context = this.buildContext(tenantId, locationId, userId);
    return this.equipmentService.getMaintenanceRecords(id, context);
  }

  @Post(':id/maintenance')
  @ApiOperation({ summary: 'Add maintenance record' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ type: CreateMaintenanceDto })
  @ApiResponse({ status: 201, description: 'Maintenance record added' })
  async addMaintenanceRecord(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Body() dto: CreateMaintenanceDto
  ) {
    const context = this.buildContext(tenantId, locationId, userId);

    const input: Parameters<typeof this.equipmentService.addMaintenanceRecord>[0] = {
      equipmentId: id,
      maintenanceType: dto.maintenanceType,
      description: dto.description,
      cost: dto.cost,
      performedBy: dto.performedBy,
    };
    if (dto.performedAt) input.performedAt = new Date(dto.performedAt);
    if (dto.partsReplaced) input.partsReplaced = dto.partsReplaced;
    if (dto.nextDueDate) input.nextDueDate = new Date(dto.nextDueDate);
    if (dto.notes) input.notes = dto.notes;

    return this.equipmentService.addMaintenanceRecord(input, context);
  }

  // ============================================
  // COST OPERATIONS (Epic 40)
  // ============================================

  @Get(':id/costs')
  @ApiOperation({
    summary: 'Get equipment service costs',
    description:
      'Returns total service costs (ráfordítások) for equipment. ' +
      'Warranty repairs are excluded as per business rules (ADR-051).',
  })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Equipment service costs',
    type: EquipmentCostResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async getCosts(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ): Promise<EquipmentCostResponseDto> {
    const context = this.buildContext(tenantId, locationId, userId);

    // Verify equipment exists
    const equipment = await this.equipmentService.findById(id, context);
    if (!equipment) {
      throw new NotFoundException(`Equipment not found: ${id}`);
    }

    // Get cost summary (with tenant isolation - ADR-001)
    const summary = await this.equipmentCostService.getCostSummary(id, tenantId);

    // Transform to response DTO
    return {
      equipmentId: summary.equipmentId,
      totalServiceCost: summary.totalServiceCost,
      worksheetCount: summary.worksheetCount,
      warrantyWorksheetCount: summary.warrantyWorksheetCount,
      breakdown: summary.breakdown.map(item => ({
        worksheetId: item.worksheetId,
        worksheetNumber: item.worksheetNumber,
        totalCost: item.totalCost,
        completedAt: item.completedAt.toISOString(),
      })),
      lastServiceDate: summary.lastServiceDate?.toISOString() ?? null,
    };
  }

  @Get(':id/profit')
  @ApiOperation({
    summary: 'Get equipment profitability (megtérülés)',
    description:
      'Calculates profit and ROI for rental equipment. ' +
      'PROFIT = totalRentalRevenue - purchasePrice - totalServiceCost. ' +
      'Warranty repairs are excluded from service costs (ADR-051).',
  })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Equipment profitability calculation',
    type: EquipmentProfitResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async getProfit(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string
  ): Promise<EquipmentProfitResponseDto> {
    const context = this.buildContext(tenantId, locationId, userId);

    // Verify equipment exists
    const equipment = await this.equipmentService.findById(id, context);
    if (!equipment) {
      throw new NotFoundException(`Equipment not found: ${id}`);
    }

    // Calculate profit (with tenant isolation - ADR-001)
    const result = await this.equipmentProfitService.calculateProfit(id, tenantId);

    // Transform to response DTO
    const response: EquipmentProfitResponseDto = {
      equipmentId: result.equipmentId,
      purchasePrice: result.purchasePrice,
      totalRentalRevenue: result.totalRentalRevenue,
      totalServiceCost: result.totalServiceCost,
      profit: result.profit,
      roi: result.roi,
      status: EquipmentProfitStatusDto[result.status],
    };

    // Only add error if present (exactOptionalPropertyTypes compliance)
    if (result.error) {
      response.error = result.error;
    }

    return response;
  }

  // ============================================
  // RENTAL HISTORY (Epic 40 - Story 40-3)
  // ============================================

  @Get(':id/rental-history')
  @ApiOperation({
    summary: 'Get equipment rental history (előzmények)',
    description:
      'Returns rental history for equipment with partner info, dates, ' +
      'who issued and returned the equipment, and amounts. ' +
      'Paginated, newest rentals first.',
  })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page (max 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipment rental history',
    type: EquipmentRentalHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async getRentalHistory(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<EquipmentRentalHistoryResponseDto> {
    const context = this.buildContext(tenantId, locationId, userId);

    // Verify equipment exists
    const equipment = await this.equipmentService.findById(id, context);
    if (!equipment) {
      throw new NotFoundException(`Equipment not found: ${id}`);
    }

    // Get rental history (with tenant isolation - ADR-001)
    const result = await this.equipmentHistoryRepository.getRentalHistory(
      id,
      tenantId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20
    );

    // Transform to response DTO
    return {
      equipmentId: result.equipmentId,
      totalRentals: result.totalRentals,
      lastRenterName: result.lastRenterName,
      worksheetCount: result.worksheetCount,
      rentals: result.rentals.map(r => ({
        rentalId: r.rentalId,
        rentalCode: r.rentalCode,
        partnerName: r.partnerName,
        partnerId: r.partnerId,
        startDate: r.startDate.toISOString().split('T')[0] ?? r.startDate.toISOString(),
        expectedEnd: r.expectedEnd.toISOString().split('T')[0] ?? r.expectedEnd.toISOString(),
        actualEnd: r.actualEnd
          ? (r.actualEnd.toISOString().split('T')[0] ?? r.actualEnd.toISOString())
          : null,
        issuedByName: r.issuedByName,
        returnedByName: r.returnedByName,
        itemTotal: r.itemTotal,
        status: r.status,
      })),
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }
}
