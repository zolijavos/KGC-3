/**
 * Rental Controller - REST API for Rental Management
 * Epic 14-16: Bérlés, Kaució, Szerződés
 *
 * Endpoints:
 * - GET    /rentals          - List rentals with filters
 * - GET    /rentals/:id      - Get rental by ID
 * - POST   /rentals          - Create new rental (checkout)
 * - PATCH  /rentals/:id      - Update rental
 * - PATCH  /rentals/:id/pickup - Confirm equipment pickup
 * - PATCH  /rentals/:id/return - Process equipment return
 * - PATCH  /rentals/:id/extend - Extend rental period
 * - POST   /rentals/:id/cancel - Cancel rental (DRAFT only)
 * - GET    /rentals/statistics - Get rental statistics
 */

import {
  CustomerInfo,
  EquipmentPricingInfo,
  Rental,
  RentalListResult,
  RentalPermissionContext,
  RentalService,
  RentalStatistics,
  RentalStatus,
} from '@kgc/rental-core';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

// ============================================
// DTOs for Swagger with class-validator
// ============================================

class CreateRentalDto {
  @IsUUID()
  @IsNotEmpty()
  partnerId!: string;

  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  plannedEndDate!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ConfirmPickupDto {
  @IsBoolean()
  accessoryChecklistVerified!: boolean;

  @IsBoolean()
  depositCollected!: boolean;

  @IsOptional()
  @IsEnum(['CASH', 'CARD', 'PRE_AUTH'])
  depositMethod?: 'CASH' | 'CARD' | 'PRE_AUTH';

  @IsOptional()
  @IsString()
  notes?: string;
}

class ProcessReturnDto {
  @IsDateString()
  @IsNotEmpty()
  returnDate!: string;

  @IsEnum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
  condition!: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

  @IsOptional()
  @IsString()
  damageNotes?: string;

  @IsOptional()
  @IsEnum(['RETURN', 'RETAIN_PARTIAL', 'RETAIN_FULL'])
  depositAction?: 'RETURN' | 'RETAIN_PARTIAL' | 'RETAIN_FULL';

  @IsOptional()
  @IsNumber()
  @Min(0)
  retainedAmount?: number;

  @IsOptional()
  @IsString()
  retentionReason?: string;
}

class ExtendRentalDto {
  @IsDateString()
  @IsNotEmpty()
  newReturnDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  selfService?: boolean;
}

class CancelRentalDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

// ============================================
// CONTROLLER
// ============================================

@ApiTags('rentals')
@ApiBearerAuth()
@Controller('rentals')
export class RentalController {
  constructor(private readonly rentalService: RentalService) {}

  /**
   * Build permission context from request headers and defaults
   */
  private buildContext(tenantId: string, userId?: string): RentalPermissionContext {
    return {
      tenantId,
      userId: userId ?? 'system',
      locationId: 'default',
      userRole: 'OPERATOR',
      canApplyDiscount: true,
      canWaiveLateFees: false,
      maxDiscountPercentage: 20,
    };
  }

  /**
   * Mock equipment info - in production would come from inventory service
   */
  private getMockEquipment(productId: string): EquipmentPricingInfo {
    return {
      id: productId,
      name: 'Test Equipment',
      dailyRate: 5000,
      weeklyRate: 25000,
      monthlyRate: 80000,
      depositAmount: 50000,
    };
  }

  /**
   * Mock customer info - in production would come from partner service
   */
  private getMockCustomer(partnerId: string): CustomerInfo {
    return {
      id: partnerId,
      name: 'Test Customer',
    };
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List rentals with filters' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiQuery({ name: 'status', required: false, enum: RentalStatus })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'equipmentId', required: false })
  @ApiQuery({ name: 'overdueOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Rental list with pagination' })
  async list(
    @Headers('X-Tenant-ID') tenantId: string,
    @Query('status') status?: RentalStatus,
    @Query('customerId') customerId?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<{
    data: Rental[];
    meta: { total: number; page: number; pageSize: number; hasMore: boolean };
  }> {
    const context = this.buildContext(tenantId);

    const filter = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(equipmentId && { equipmentId }),
      ...(overdueOnly === 'true' && { overdueOnly: true }),
      ...(search && { search }),
    };

    const result: RentalListResult = await this.rentalService.findMany(filter, context);

    return {
      data: result.rentals,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      },
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get rental statistics' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiResponse({ status: 200, description: 'Rental statistics' })
  async getStatistics(
    @Headers('X-Tenant-ID') tenantId: string
  ): Promise<{ data: RentalStatistics }> {
    const context = this.buildContext(tenantId);
    const stats = await this.rentalService.getStatistics(context);
    return { data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental by ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiResponse({ status: 200, description: 'Rental details' })
  @ApiResponse({ status: 404, description: 'Rental not found' })
  async getById(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ data: Rental }> {
    const context = this.buildContext(tenantId);

    try {
      const rental = await this.rentalService.findById(id, context);
      return { data: rental };
    } catch {
      throw new NotFoundException(`Rental not found: ${id}`);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new rental (checkout)' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiBody({ type: CreateRentalDto })
  @ApiResponse({ status: 201, description: 'Rental created' })
  async create(
    @Headers('X-Tenant-ID') tenantId: string,
    @Body() dto: CreateRentalDto
  ): Promise<{ data: Rental }> {
    const context = this.buildContext(tenantId);
    const equipment = this.getMockEquipment(dto.productId);
    const customer = this.getMockCustomer(dto.partnerId);

    const rental = await this.rentalService.checkout(
      {
        customerId: dto.partnerId,
        equipmentId: dto.productId,
        startDate: new Date(dto.startDate),
        expectedReturnDate: new Date(dto.plannedEndDate),
        depositAmount: dto.depositAmount ?? equipment.depositAmount,
        notes: dto.notes,
      },
      equipment,
      customer,
      context
    );

    return { data: rental };
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  @Patch(':id/pickup')
  @ApiOperation({ summary: 'Confirm equipment pickup (DRAFT -> ACTIVE)' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiBody({ type: ConfirmPickupDto })
  @ApiResponse({ status: 200, description: 'Pickup confirmed' })
  async confirmPickup(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmPickupDto
  ): Promise<{ data: Rental }> {
    const context = this.buildContext(tenantId);

    const rental = await this.rentalService.confirmPickup(
      {
        rentalId: id,
        accessoryChecklistVerified: dto.accessoryChecklistVerified,
        depositCollected: dto.depositCollected,
        depositMethod: dto.depositMethod,
        notes: dto.notes,
      },
      context
    );

    return { data: rental };
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Process equipment return (ACTIVE/OVERDUE -> RETURNED)' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiBody({ type: ProcessReturnDto })
  @ApiResponse({ status: 200, description: 'Return processed' })
  async processReturn(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ProcessReturnDto
  ): Promise<{ data: Rental }> {
    const context = this.buildContext(tenantId);

    const rental = await this.rentalService.processReturn(
      {
        rentalId: id,
        returnDate: new Date(dto.returnDate),
        accessoryChecklistVerified: true,
        equipmentCondition: dto.condition,
        damageNotes: dto.damageNotes,
        depositAction: dto.depositAction ?? 'RETURN',
        retainedAmount: dto.retainedAmount,
        retentionReason: dto.retentionReason,
      },
      context
    );

    return { data: rental };
  }

  @Patch(':id/extend')
  @ApiOperation({ summary: 'Extend rental period' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiBody({ type: ExtendRentalDto })
  @ApiResponse({ status: 200, description: 'Rental extended' })
  async extendRental(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ExtendRentalDto
  ): Promise<{ data: Rental }> {
    const context = this.buildContext(tenantId);

    // Get current rental to find equipment
    const currentRental = await this.rentalService.findById(id, context);
    const equipment = this.getMockEquipment(currentRental.equipmentId);

    const rental = await this.rentalService.extendRental(
      {
        rentalId: id,
        newReturnDate: new Date(dto.newReturnDate),
        reason: dto.reason,
        selfService: dto.selfService ?? false,
      },
      equipment,
      context
    );

    return { data: rental };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel rental (DRAFT only)' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiBody({ type: CancelRentalDto })
  @ApiResponse({ status: 200, description: 'Rental cancelled' })
  async cancel(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelRentalDto
  ): Promise<{ data: Rental }> {
    const context = this.buildContext(tenantId);

    const rental = await this.rentalService.cancel(
      {
        rentalId: id,
        reason: dto.reason,
      },
      context
    );

    return { data: rental };
  }

  // ============================================
  // HISTORY
  // ============================================

  @Get(':id/history')
  @ApiOperation({ summary: 'Get rental history/audit log' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiResponse({ status: 200, description: 'Rental history' })
  async getHistory(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ data: unknown[] }> {
    const context = this.buildContext(tenantId);
    const history = await this.rentalService.getHistory(id, context);
    return { data: history };
  }
}
