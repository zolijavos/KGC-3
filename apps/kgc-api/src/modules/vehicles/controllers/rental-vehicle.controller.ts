/**
 * Rental Vehicle Controller
 * Epic 34: Járműnyilvántartás (ADR-027)
 * REST API endpoints for bérgép járművek
 */

import {
  CreateRentalVehicleInput,
  IRentalVehicleRepository,
  RENTAL_VEHICLE_REPOSITORY,
  RentalVehicleType,
  UpdateRentalVehicleInput,
  VehicleStatus,
} from '@kgc/vehicles';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Bérgép Járművek')
@Controller('rental-vehicles')
export class RentalVehicleController {
  constructor(
    @Inject(RENTAL_VEHICLE_REPOSITORY)
    private readonly repository: IRentalVehicleRepository
  ) {}

  @Get()
  @ApiOperation({ summary: 'Bérgép járművek listázása' })
  @ApiQuery({ name: 'vehicleType', required: false, enum: RentalVehicleType })
  @ApiQuery({ name: 'status', required: false, enum: VehicleStatus })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Járművek listája' })
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('vehicleType') vehicleType?: RentalVehicleType,
    @Query('status') status?: VehicleStatus,
    @Query('expiringWithinDays') expiringWithinDays?: string
  ) {
    const filter = {
      ...(vehicleType && { vehicleType }),
      ...(status && { status }),
      ...(expiringWithinDays && { expiringWithinDays: parseInt(expiringWithinDays, 10) }),
    };

    const vehicles = await this.repository.findAll(tenantId, filter);
    return { data: vehicles };
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Lejáró dokumentumú járművek' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Napon belül lejáró (default: 60)',
  })
  @ApiResponse({ status: 200, description: 'Lejáró járművek listája' })
  async findExpiring(@Query('tenantId') tenantId: string, @Query('days') days?: string) {
    const withinDays = days ? parseInt(days, 10) : 60;
    const vehicles = await this.repository.findExpiringDocuments(tenantId, withinDays);
    return { data: vehicles };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bérgép jármű részletei' })
  @ApiResponse({ status: 200, description: 'Jármű adatai' })
  @ApiResponse({ status: 404, description: 'Jármű nem található' })
  async findById(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    const vehicle = await this.repository.findById(id, tenantId);
    if (!vehicle) {
      return { error: { code: 'NOT_FOUND', message: 'Bérgép jármű nem található' } };
    }
    return { data: vehicle };
  }

  @Post()
  @ApiOperation({ summary: 'Új bérgép jármű létrehozása' })
  @ApiResponse({ status: 201, description: 'Jármű létrehozva' })
  @ApiResponse({ status: 400, description: 'Validációs hiba' })
  async create(
    @Query('tenantId') tenantId: string,
    @Body() data: CreateRentalVehicleInput & { createdBy: string }
  ) {
    const { createdBy, ...vehicleData } = data;
    const vehicle = await this.repository.create(tenantId, vehicleData, createdBy);
    return { data: vehicle };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Bérgép jármű módosítása' })
  @ApiResponse({ status: 200, description: 'Jármű frissítve' })
  @ApiResponse({ status: 404, description: 'Jármű nem található' })
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() data: UpdateRentalVehicleInput
  ) {
    const vehicle = await this.repository.update(id, tenantId, data);
    return { data: vehicle };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bérgép jármű törlése' })
  @ApiResponse({ status: 204, description: 'Jármű törölve' })
  async delete(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    await this.repository.delete(id, tenantId);
  }

  @Patch(':id/link-bergep')
  @ApiOperation({ summary: 'Bérgép kapcsolása a járműhöz' })
  @ApiResponse({ status: 200, description: 'Bérgép kapcsolva' })
  async linkToRentalEquipment(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() data: { rentalEquipmentId: string }
  ) {
    const vehicle = await this.repository.linkToRentalEquipment(
      id,
      tenantId,
      data.rentalEquipmentId
    );
    return { data: vehicle };
  }
}
