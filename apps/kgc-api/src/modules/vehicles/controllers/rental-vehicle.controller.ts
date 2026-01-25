/**
 * Rental Vehicle Controller
 * Epic 34: Járműnyilvántartás (ADR-027)
 * REST API endpoints for bérgép járművek
 *
 * RBAC: Tenant-scoped access per ADR-032
 * - VIEW: Minden bolt megtekintheti a saját járműveit
 * - CREATE/UPDATE/DELETE: Boltvezető+ szint
 */

import { JwtAuthGuard } from '@kgc/auth';
import { AuthenticatedRequest } from '@kgc/common';
import { Permission, PermissionGuard, RequirePermission } from '@kgc/users';
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

@ApiTags('Bérgép Járművek')
@ApiSecurity('bearer')
@Controller('rental-vehicles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RentalVehicleController {
  constructor(
    @Inject(RENTAL_VEHICLE_REPOSITORY)
    private readonly repository: IRentalVehicleRepository
  ) {}

  @Get()
  @RequirePermission(Permission.VEHICLE_VIEW)
  @ApiOperation({ summary: 'Bérgép járművek listázása' })
  @ApiQuery({ name: 'vehicleType', required: false, enum: RentalVehicleType })
  @ApiQuery({ name: 'status', required: false, enum: VehicleStatus })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Járművek listája' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleType') vehicleType?: RentalVehicleType,
    @Query('status') status?: VehicleStatus,
    @Query('expiringWithinDays') expiringWithinDays?: string
  ) {
    // SECURITY FIX: tenantId from JWT, not query parameter
    const tenantId = req.user.tenantId;

    // INPUT VALIDATION: Parse and validate expiringWithinDays
    let parsedDays: number | undefined;
    if (expiringWithinDays) {
      const parsed = parseInt(expiringWithinDays, 10);
      parsedDays = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
    }

    const filter = {
      ...(vehicleType && { vehicleType }),
      ...(status && { status }),
      ...(parsedDays && { expiringWithinDays: parsedDays }),
    };

    const vehicles = await this.repository.findAll(tenantId, filter);
    return { data: vehicles };
  }

  @Get('expiring')
  @RequirePermission(Permission.VEHICLE_VIEW)
  @ApiOperation({ summary: 'Lejáró dokumentumú járművek' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: `Napon belül lejáró (default: ${DEFAULT_EXPIRING_DAYS})`,
  })
  @ApiResponse({ status: 200, description: 'Lejáró járművek listája' })
  async findExpiring(@Req() req: AuthenticatedRequest, @Query('days') days?: string) {
    const tenantId = req.user.tenantId;
    const parsed = days ? parseInt(days, 10) : NaN;
    const withinDays = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_EXPIRING_DAYS;
    const vehicles = await this.repository.findExpiringDocuments(tenantId, withinDays);
    return { data: vehicles };
  }

  @Get('expiring/detailed')
  @RequirePermission(Permission.VEHICLE_VIEW)
  @ApiOperation({ summary: 'Részletes lejáró dokumentumok (strukturált)' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: `Napon belül lejáró (default: ${DEFAULT_EXPIRING_DAYS})`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lejáró dokumentumok részletes listája (dokumentum típussal, napokkal)',
  })
  async findExpiringDetailed(@Req() req: AuthenticatedRequest, @Query('days') days?: string) {
    const tenantId = req.user.tenantId;
    const parsed = days ? parseInt(days, 10) : NaN;
    const withinDays = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_EXPIRING_DAYS;
    const documents = await this.repository.findExpiringDocumentsDetailed(tenantId, withinDays);
    return { data: documents };
  }

  @Get(':id')
  @RequirePermission(Permission.VEHICLE_VIEW)
  @ApiOperation({ summary: 'Bérgép jármű részletei' })
  @ApiResponse({ status: 200, description: 'Jármű adatai' })
  @ApiResponse({ status: 404, description: 'Jármű nem található' })
  async findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const vehicle = await this.repository.findById(id, tenantId);
    if (!vehicle) {
      // HTTP FIX: Throw proper 404 instead of 200 with error object
      throw new NotFoundException('Bérgép jármű nem található');
    }
    return { data: vehicle };
  }

  @Post()
  @RequirePermission(Permission.VEHICLE_CREATE)
  @ApiOperation({ summary: 'Új bérgép jármű létrehozása' })
  @ApiResponse({ status: 201, description: 'Jármű létrehozva' })
  @ApiResponse({ status: 400, description: 'Validációs hiba' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async create(@Req() req: AuthenticatedRequest, @Body() data: CreateRentalVehicleInput) {
    // SECURITY FIX: tenantId and createdBy from JWT, not request body
    const tenantId = req.user.tenantId;
    const createdBy = req.user.id;
    const vehicle = await this.repository.create(tenantId, data, createdBy);
    return { data: vehicle };
  }

  @Patch(':id')
  @RequirePermission(Permission.VEHICLE_UPDATE)
  @ApiOperation({ summary: 'Bérgép jármű módosítása' })
  @ApiResponse({ status: 200, description: 'Jármű frissítve' })
  @ApiResponse({ status: 404, description: 'Jármű nem található' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateRentalVehicleInput
  ) {
    const tenantId = req.user.tenantId;
    const vehicle = await this.repository.update(id, tenantId, data);
    return { data: vehicle };
  }

  @Delete(':id')
  @RequirePermission(Permission.VEHICLE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bérgép jármű törlése' })
  @ApiResponse({ status: 204, description: 'Jármű törölve' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    await this.repository.delete(id, tenantId);
  }

  @Patch(':id/link-bergep')
  @RequirePermission(Permission.VEHICLE_UPDATE)
  @ApiOperation({ summary: 'Bérgép kapcsolása a járműhöz' })
  @ApiResponse({ status: 200, description: 'Bérgép kapcsolva' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async linkToRentalEquipment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() data: { rentalEquipmentId: string }
  ) {
    const tenantId = req.user.tenantId;
    const vehicle = await this.repository.linkToRentalEquipment(
      id,
      tenantId,
      data.rentalEquipmentId
    );
    return { data: vehicle };
  }
}
