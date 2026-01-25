/**
 * Company Vehicle Controller
 * Epic 34: Járműnyilvántartás (ADR-027)
 * REST API endpoints for céges gépkocsik
 *
 * RBAC: Central management per ADR-032
 * - VIEW: VEHICLE_VIEW vagy VEHICLE_MANAGE_COMPANY
 * - CREATE/UPDATE/DELETE/ASSIGN: VEHICLE_MANAGE_COMPANY (admin)
 */

import { JwtAuthGuard } from '@kgc/auth';
import { AuthenticatedRequest } from '@kgc/common';
import { Permission, PermissionGuard, RequirePermission } from '@kgc/users';
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
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

/** Default expiring documents query days */
const DEFAULT_EXPIRING_DAYS = 60;

@ApiTags('Céges Gépkocsik')
@ApiSecurity('bearer')
@Controller('company-vehicles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CompanyVehicleController {
  constructor(
    @Inject(COMPANY_VEHICLE_REPOSITORY)
    private readonly repository: ICompanyVehicleRepository
  ) {}

  @Get()
  @RequirePermission([Permission.VEHICLE_VIEW, Permission.VEHICLE_MANAGE_COMPANY], 'ANY')
  @ApiOperation({ summary: 'Céges gépkocsik listázása' })
  @ApiQuery({ name: 'vehicleType', required: false, enum: CompanyVehicleType })
  @ApiQuery({ name: 'status', required: false, enum: VehicleStatus })
  @ApiQuery({ name: 'assignedTenantId', required: false })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Gépkocsik listája' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async findAll(
    @Query('vehicleType') vehicleType?: CompanyVehicleType,
    @Query('status') status?: VehicleStatus,
    @Query('assignedTenantId') assignedTenantId?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string
  ) {
    // INPUT VALIDATION: Parse and validate expiringWithinDays
    let parsedDays: number | undefined;
    if (expiringWithinDays) {
      const parsed = parseInt(expiringWithinDays, 10);
      parsedDays = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
    }

    const filter = {
      ...(vehicleType && { vehicleType }),
      ...(status && { status }),
      ...(assignedTenantId && { assignedTenantId }),
      ...(parsedDays && { expiringWithinDays: parsedDays }),
    };

    const vehicles = await this.repository.findAll(filter);
    return { data: vehicles };
  }

  @Get('expiring')
  @RequirePermission([Permission.VEHICLE_VIEW, Permission.VEHICLE_MANAGE_COMPANY], 'ANY')
  @ApiOperation({ summary: 'Lejáró dokumentumú gépkocsik' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: `Napon belül lejáró (default: ${DEFAULT_EXPIRING_DAYS})`,
  })
  @ApiResponse({ status: 200, description: 'Lejáró gépkocsik listája' })
  async findExpiring(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : NaN;
    const withinDays = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_EXPIRING_DAYS;
    const vehicles = await this.repository.findExpiringDocuments(withinDays);
    return { data: vehicles };
  }

  @Get('expiring/detailed')
  @RequirePermission([Permission.VEHICLE_VIEW, Permission.VEHICLE_MANAGE_COMPANY], 'ANY')
  @ApiOperation({ summary: 'Részletes lejáró dokumentumok (strukturált)' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: `Napon belül lejáró (default: ${DEFAULT_EXPIRING_DAYS})`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lejáró dokumentumok részletes listája (KGFB, CASCO, műszaki, matrica)',
  })
  async findExpiringDetailed(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : NaN;
    const withinDays = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_EXPIRING_DAYS;
    const documents = await this.repository.findExpiringDocumentsDetailed(withinDays);
    return { data: documents };
  }

  @Get(':id')
  @RequirePermission([Permission.VEHICLE_VIEW, Permission.VEHICLE_MANAGE_COMPANY], 'ANY')
  @ApiOperation({ summary: 'Céges gépkocsi részletei' })
  @ApiResponse({ status: 200, description: 'Gépkocsi adatai' })
  @ApiResponse({ status: 404, description: 'Gépkocsi nem található' })
  async findById(@Param('id') id: string) {
    const vehicle = await this.repository.findById(id);
    if (!vehicle) {
      // HTTP FIX: Throw proper 404 instead of 200 with error object
      throw new NotFoundException('Céges gépkocsi nem található');
    }
    return { data: vehicle };
  }

  @Post()
  @RequirePermission(Permission.VEHICLE_MANAGE_COMPANY)
  @ApiOperation({ summary: 'Új céges gépkocsi létrehozása (admin only)' })
  @ApiResponse({ status: 201, description: 'Gépkocsi létrehozva' })
  @ApiResponse({ status: 400, description: 'Validációs hiba' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async create(@Req() req: AuthenticatedRequest, @Body() data: CreateCompanyVehicleInput) {
    // SECURITY FIX: createdBy from JWT, not request body
    const createdBy = req.user.id;
    const vehicle = await this.repository.create(data, createdBy);
    return { data: vehicle };
  }

  @Patch(':id')
  @RequirePermission(Permission.VEHICLE_MANAGE_COMPANY)
  @ApiOperation({ summary: 'Céges gépkocsi módosítása' })
  @ApiResponse({ status: 200, description: 'Gépkocsi frissítve' })
  @ApiResponse({ status: 404, description: 'Gépkocsi nem található' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async update(@Param('id') id: string, @Body() data: UpdateCompanyVehicleInput) {
    const vehicle = await this.repository.update(id, data);
    return { data: vehicle };
  }

  @Delete(':id')
  @RequirePermission(Permission.VEHICLE_MANAGE_COMPANY)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Céges gépkocsi törlése (admin only)' })
  @ApiResponse({ status: 204, description: 'Gépkocsi törölve' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async delete(@Param('id') id: string) {
    await this.repository.delete(id);
  }

  @Patch(':id/assign')
  @RequirePermission(Permission.VEHICLE_MANAGE_COMPANY)
  @ApiOperation({ summary: 'Gépkocsi hozzárendelése tenanthoz/felhasználóhoz' })
  @ApiResponse({ status: 200, description: 'Hozzárendelés frissítve' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async assign(@Param('id') id: string, @Body() data: AssignCompanyVehicleInput) {
    const vehicle = await this.repository.assign(id, data);
    return { data: vehicle };
  }
}
