/**
 * Company Vehicle Controller
 * Epic 34: Járműnyilvántartás (ADR-027)
 * REST API endpoints for céges gépkocsik
 */

import {
  AssignCompanyVehicleInput,
  COMPANY_VEHICLE_REPOSITORY,
  CompanyVehicleType,
  CreateCompanyVehicleInput,
  ICompanyVehicleRepository,
  UpdateCompanyVehicleInput,
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

@ApiTags('Céges Gépkocsik')
@Controller('company-vehicles')
export class CompanyVehicleController {
  constructor(
    @Inject(COMPANY_VEHICLE_REPOSITORY)
    private readonly repository: ICompanyVehicleRepository
  ) {}

  @Get()
  @ApiOperation({ summary: 'Céges gépkocsik listázása' })
  @ApiQuery({ name: 'vehicleType', required: false, enum: CompanyVehicleType })
  @ApiQuery({ name: 'status', required: false, enum: VehicleStatus })
  @ApiQuery({ name: 'assignedTenantId', required: false })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Gépkocsik listája' })
  async findAll(
    @Query('vehicleType') vehicleType?: CompanyVehicleType,
    @Query('status') status?: VehicleStatus,
    @Query('assignedTenantId') assignedTenantId?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string
  ) {
    const filter = {
      ...(vehicleType && { vehicleType }),
      ...(status && { status }),
      ...(assignedTenantId && { assignedTenantId }),
      ...(expiringWithinDays && { expiringWithinDays: parseInt(expiringWithinDays, 10) }),
    };

    const vehicles = await this.repository.findAll(filter);
    return { data: vehicles };
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Lejáró dokumentumú gépkocsik' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Napon belül lejáró (default: 60)',
  })
  @ApiResponse({ status: 200, description: 'Lejáró gépkocsik listája' })
  async findExpiring(@Query('days') days?: string) {
    const withinDays = days ? parseInt(days, 10) : 60;
    const vehicles = await this.repository.findExpiringDocuments(withinDays);
    return { data: vehicles };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Céges gépkocsi részletei' })
  @ApiResponse({ status: 200, description: 'Gépkocsi adatai' })
  @ApiResponse({ status: 404, description: 'Gépkocsi nem található' })
  async findById(@Param('id') id: string) {
    const vehicle = await this.repository.findById(id);
    if (!vehicle) {
      return { error: { code: 'NOT_FOUND', message: 'Céges gépkocsi nem található' } };
    }
    return { data: vehicle };
  }

  @Post()
  @ApiOperation({ summary: 'Új céges gépkocsi létrehozása (admin only)' })
  @ApiResponse({ status: 201, description: 'Gépkocsi létrehozva' })
  @ApiResponse({ status: 400, description: 'Validációs hiba' })
  async create(@Body() data: CreateCompanyVehicleInput & { createdBy: string }) {
    const { createdBy, ...vehicleData } = data;
    const vehicle = await this.repository.create(vehicleData, createdBy);
    return { data: vehicle };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Céges gépkocsi módosítása' })
  @ApiResponse({ status: 200, description: 'Gépkocsi frissítve' })
  @ApiResponse({ status: 404, description: 'Gépkocsi nem található' })
  async update(@Param('id') id: string, @Body() data: UpdateCompanyVehicleInput) {
    const vehicle = await this.repository.update(id, data);
    return { data: vehicle };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Céges gépkocsi törlése (admin only)' })
  @ApiResponse({ status: 204, description: 'Gépkocsi törölve' })
  async delete(@Param('id') id: string) {
    await this.repository.delete(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Gépkocsi hozzárendelése tenanthoz/felhasználóhoz' })
  @ApiResponse({ status: 200, description: 'Hozzárendelés frissítve' })
  async assign(@Param('id') id: string, @Body() data: AssignCompanyVehicleInput) {
    const vehicle = await this.repository.assign(id, data);
    return { data: vehicle };
  }
}
