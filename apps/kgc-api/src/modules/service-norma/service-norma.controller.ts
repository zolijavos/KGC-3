/**
 * ServiceNorma Controller
 * Epic 20: Szerviz Norma Kezelés (ADR-020)
 * REST API endpoints for service norm management
 *
 * RBAC: Tenant-scoped access per ADR-032
 * - VIEW: Szervizes+ megtekintheti a norma tételeket
 * - CREATE: Boltvezető+ importálhat norma listát
 * - WARRANTY: Technikus+ használhat garanciás kalkulációt
 *
 * Endpoints:
 * - GET    /service-norms             - Lista szűréssel
 * - GET    /service-norms/stats       - Statisztikák
 * - GET    /service-norms/manufacturers - Gyártók listája
 * - GET    /service-norms/categories/:manufacturer - Kategóriák gyártónként
 * - GET    /service-norms/:id         - Egy tétel részletei
 * - GET    /service-norms/by-code/:manufacturer/:normCode - Keresés kóddal
 * - POST   /service-norms             - Új tétel létrehozása
 * - POST   /service-norms/import      - Bulk import
 * - POST   /service-norms/calculate   - Munkadíj kalkuláció
 * - PATCH  /service-norms/:id         - Frissítés
 * - DELETE /service-norms/:id         - Inaktiválás
 */

import { JwtAuthGuard } from '@kgc/auth';
import { AuthenticatedRequest } from '@kgc/common';
import { Permission, PermissionGuard, RequirePermission } from '@kgc/users';
import {
  BadRequestException,
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

import {
  DifficultyLevel,
  IServiceNormRepository,
  SERVICE_NORM_REPOSITORY,
  ServiceNormFilterDto,
} from '../service/repositories';

/** Maximum items per import to prevent DoS */
const MAX_IMPORT_ITEMS = 10000;

/** Maximum limit for pagination to prevent DoS */
const MAX_PAGE_LIMIT = 500;

/** Create Service Norm Input DTO */
interface CreateServiceNormInput {
  manufacturer: string;
  normCode: string;
  description: string;
  laborMinutes: number;
  laborRate: number;
  difficultyLevel?: DifficultyLevel;
  productCategory?: string;
  repairType?: string;
  validFrom: string; // ISO date string
  validUntil?: string;
  externalId?: string;
}

/** Update Service Norm Input DTO */
interface UpdateServiceNormInput {
  description?: string;
  laborMinutes?: number;
  laborRate?: number;
  difficultyLevel?: DifficultyLevel;
  productCategory?: string;
  repairType?: string;
  validUntil?: string;
  isActive?: boolean;
}

/** Bulk Import Input DTO */
interface BulkImportInput {
  importSource: string;
  items: Array<{
    manufacturer: string;
    normCode: string;
    description: string;
    laborMinutes: number;
    laborRate: number;
    difficultyLevel?: DifficultyLevel;
    productCategory?: string;
    repairType?: string;
    validFrom: string;
    validUntil?: string;
    externalId?: string;
  }>;
}

/** Labor Calculation Input DTO */
interface CalculateLaborInput {
  manufacturer: string;
  normCode: string;
}

@ApiTags('Szerviz Norma')
@ApiSecurity('bearer')
@Controller('service-norms')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ServiceNormaController {
  constructor(
    @Inject(SERVICE_NORM_REPOSITORY)
    private readonly normRepository: IServiceNormRepository
  ) {}

  // ============================================
  // STATISTICS ENDPOINTS (must be before :id routes!)
  // ============================================

  @Get('stats')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Norma statisztikák' })
  @ApiResponse({ status: 200, description: 'Statisztikák' })
  async getStatistics(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;

    const [total, active, inactive, manufacturers] = await Promise.all([
      this.normRepository.countByTenant(tenantId),
      this.normRepository.countByTenant(tenantId, { isActive: true }),
      this.normRepository.countByTenant(tenantId, { isActive: false }),
      this.normRepository.getManufacturers(tenantId),
    ]);

    return {
      data: {
        total,
        active,
        inactive,
        manufacturerCount: manufacturers.length,
        manufacturers,
      },
    };
  }

  @Get('manufacturers')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Gyártók listája' })
  @ApiResponse({ status: 200, description: 'Gyártók' })
  async getManufacturers(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const manufacturers = await this.normRepository.getManufacturers(tenantId);

    return { data: manufacturers };
  }

  @Get('categories/:manufacturer')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Kategóriák gyártónként' })
  @ApiResponse({ status: 200, description: 'Kategóriák' })
  async getCategories(
    @Param('manufacturer') manufacturer: string,
    @Req() req: AuthenticatedRequest
  ) {
    const tenantId = req.user.tenantId;
    const sanitizedManufacturer = manufacturer.trim();

    if (!sanitizedManufacturer) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }

    const categories = await this.normRepository.getCategories(tenantId, sanitizedManufacturer);

    return { data: categories };
  }

  // ============================================
  // CRUD ENDPOINTS
  // ============================================

  @Get()
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Norma tételek listázása' })
  @ApiQuery({ name: 'manufacturer', required: false })
  @ApiQuery({ name: 'productCategory', required: false })
  @ApiQuery({ name: 'repairType', required: false })
  @ApiQuery({ name: 'difficultyLevel', required: false, enum: DifficultyLevel })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'validAt', required: false, type: Date })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Norma tételek listája' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('manufacturer') manufacturer?: string,
    @Query('productCategory') productCategory?: string,
    @Query('repairType') repairType?: string,
    @Query('difficultyLevel') difficultyLevel?: DifficultyLevel,
    @Query('isActive') isActive?: string,
    @Query('validAt') validAt?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const tenantId = req.user.tenantId;

    // Parse and validate dates
    const parsedValidAt = validAt ? new Date(validAt) : undefined;

    // Parse and cap limit to prevent DoS
    let parsedLimit: number | undefined;
    if (limit && !isNaN(parseInt(limit, 10))) {
      parsedLimit = Math.min(parseInt(limit, 10), MAX_PAGE_LIMIT);
    }

    const filter: Partial<ServiceNormFilterDto> = {
      ...(manufacturer?.trim() && { manufacturer: manufacturer.trim() }),
      ...(productCategory?.trim() && { productCategory: productCategory.trim() }),
      ...(repairType?.trim() && { repairType: repairType.trim() }),
      ...(difficultyLevel && { difficultyLevel }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(parsedValidAt && !isNaN(parsedValidAt.getTime()) && { validAt: parsedValidAt }),
      ...(search?.trim() && { search: search.trim() }),
      ...(parsedLimit && { limit: parsedLimit }),
      ...(offset && !isNaN(parseInt(offset, 10)) && { offset: parseInt(offset, 10) }),
    };

    const norms = await this.normRepository.findAll(tenantId, filter);
    const total = await this.normRepository.countByTenant(tenantId, filter);

    return { data: norms, total };
  }

  @Get('by-code/:manufacturer/:normCode')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Norma keresése gyártó és kód alapján' })
  @ApiResponse({ status: 200, description: 'Norma tétel' })
  @ApiResponse({ status: 404, description: 'Norma nem található' })
  async findByCode(
    @Param('manufacturer') manufacturer: string,
    @Param('normCode') normCode: string,
    @Req() req: AuthenticatedRequest
  ) {
    const tenantId = req.user.tenantId;
    const sanitizedManufacturer = manufacturer.trim();
    const sanitizedNormCode = normCode.trim();

    if (!sanitizedManufacturer) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }
    if (!sanitizedNormCode) {
      throw new BadRequestException('Norma kód megadása kötelező');
    }

    const norm = await this.normRepository.findByNormCode(
      tenantId,
      sanitizedManufacturer,
      sanitizedNormCode
    );

    if (!norm) {
      throw new NotFoundException('Norma tétel nem található');
    }

    return { data: norm };
  }

  @Get(':id')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Norma tétel részletei' })
  @ApiResponse({ status: 200, description: 'Norma tétel' })
  @ApiResponse({ status: 404, description: 'Norma nem található' })
  async findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const norm = await this.normRepository.findById(id, tenantId);

    if (!norm) {
      throw new NotFoundException('Norma tétel nem található');
    }

    return { data: norm };
  }

  @Post()
  @RequirePermission(Permission.SERVICE_CREATE)
  @ApiOperation({ summary: 'Új norma tétel létrehozása' })
  @ApiResponse({ status: 201, description: 'Norma létrehozva' })
  @ApiResponse({ status: 400, description: 'Hibás adatok' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async create(@Req() req: AuthenticatedRequest, @Body() input: CreateServiceNormInput) {
    const tenantId = req.user.tenantId;

    // Validate required fields
    if (!input.manufacturer?.trim()) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }
    if (!input.normCode?.trim()) {
      throw new BadRequestException('Norma kód megadása kötelező');
    }
    if (!input.description?.trim()) {
      throw new BadRequestException('Leírás megadása kötelező');
    }
    if (!input.laborMinutes || input.laborMinutes <= 0) {
      throw new BadRequestException('Norma percek pozitív szám kell legyen');
    }
    if (!input.laborRate || input.laborRate <= 0) {
      throw new BadRequestException('Óradíj pozitív szám kell legyen');
    }
    if (!input.validFrom) {
      throw new BadRequestException('Érvényesség kezdete kötelező');
    }

    const validFrom = new Date(input.validFrom);
    if (isNaN(validFrom.getTime())) {
      throw new BadRequestException('Érvénytelen érvényesség kezdete dátum');
    }

    let validUntil: Date | undefined;
    if (input.validUntil) {
      validUntil = new Date(input.validUntil);
      if (isNaN(validUntil.getTime())) {
        throw new BadRequestException('Érvénytelen érvényesség vége dátum');
      }
      if (validUntil <= validFrom) {
        throw new BadRequestException('Érvényesség vége nem lehet korábbi mint a kezdete');
      }
    }

    const norm = await this.normRepository.create(tenantId, {
      manufacturer: input.manufacturer,
      normCode: input.normCode,
      description: input.description,
      laborMinutes: input.laborMinutes,
      laborRate: input.laborRate,
      difficultyLevel: input.difficultyLevel,
      productCategory: input.productCategory,
      repairType: input.repairType,
      validFrom,
      validUntil,
      externalId: input.externalId,
    });

    return { data: norm };
  }

  @Post('import')
  @RequirePermission(Permission.SERVICE_CREATE)
  @ApiOperation({ summary: 'Norma tételek tömeges importálása' })
  @ApiResponse({ status: 200, description: 'Import eredmény' })
  @ApiResponse({ status: 400, description: 'Hibás adatok' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async bulkImport(@Req() req: AuthenticatedRequest, @Body() input: BulkImportInput) {
    const tenantId = req.user.tenantId;

    // Validate import source
    if (!input.importSource?.trim()) {
      throw new BadRequestException('Import forrás megadása kötelező');
    }

    // Validate items array
    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('Legalább egy tétel megadása kötelező');
    }

    // Check import limit to prevent DoS
    if (input.items.length > MAX_IMPORT_ITEMS) {
      throw new BadRequestException(`Maximum ${MAX_IMPORT_ITEMS} tétel importálható egyszerre`);
    }

    // Transform and validate items for repository format
    const importItems = input.items.map((item, index) => {
      const validFrom = new Date(item.validFrom);
      if (isNaN(validFrom.getTime())) {
        throw new BadRequestException(
          `Tétel ${index + 1}: Érvénytelen validFrom dátum: ${item.validFrom}`
        );
      }

      let validUntil: Date | undefined;
      if (item.validUntil) {
        validUntil = new Date(item.validUntil);
        if (isNaN(validUntil.getTime())) {
          throw new BadRequestException(
            `Tétel ${index + 1}: Érvénytelen validUntil dátum: ${item.validUntil}`
          );
        }
        if (validUntil <= validFrom) {
          throw new BadRequestException(
            `Tétel ${index + 1}: validUntil nem lehet korábbi mint validFrom`
          );
        }
      }

      return {
        manufacturer: item.manufacturer,
        normCode: item.normCode,
        description: item.description,
        laborMinutes: item.laborMinutes,
        laborRate: item.laborRate,
        difficultyLevel: item.difficultyLevel,
        productCategory: item.productCategory,
        repairType: item.repairType,
        validFrom,
        validUntil,
        externalId: item.externalId,
      };
    });

    const result = await this.normRepository.bulkImport(tenantId, importItems, input.importSource);

    return { data: result };
  }

  @Post('calculate')
  @RequirePermission(Permission.SERVICE_WARRANTY)
  @ApiOperation({ summary: 'Munkadíj kalkuláció norma alapján' })
  @ApiResponse({ status: 200, description: 'Kalkuláció eredménye' })
  @ApiResponse({ status: 404, description: 'Norma nem található' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async calculateLaborCost(@Req() req: AuthenticatedRequest, @Body() input: CalculateLaborInput) {
    const tenantId = req.user.tenantId;

    // Validate required fields
    if (!input.manufacturer?.trim()) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }
    if (!input.normCode?.trim()) {
      throw new BadRequestException('Norma kód megadása kötelező');
    }

    const result = await this.normRepository.calculateLaborCost(
      tenantId,
      input.manufacturer,
      input.normCode
    );

    if (!result) {
      throw new NotFoundException(
        `Érvényes norma nem található: ${input.manufacturer} - ${input.normCode}`
      );
    }

    return { data: result };
  }

  @Patch(':id')
  @RequirePermission(Permission.SERVICE_UPDATE)
  @ApiOperation({ summary: 'Norma tétel módosítása' })
  @ApiResponse({ status: 200, description: 'Norma frissítve' })
  @ApiResponse({ status: 404, description: 'Norma nem található' })
  @ApiResponse({ status: 400, description: 'Hibás adatok' })
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: UpdateServiceNormInput
  ) {
    const tenantId = req.user.tenantId;

    // Verify norm exists
    const existing = await this.normRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Norma tétel nem található');
    }

    // Validate optional fields if provided
    if (input.laborMinutes !== undefined && input.laborMinutes <= 0) {
      throw new BadRequestException('Norma percek pozitív szám kell legyen');
    }
    if (input.laborRate !== undefined && input.laborRate <= 0) {
      throw new BadRequestException('Óradíj pozitív szám kell legyen');
    }

    let validUntil: Date | undefined;
    if (input.validUntil) {
      validUntil = new Date(input.validUntil);
      if (isNaN(validUntil.getTime())) {
        throw new BadRequestException('Érvénytelen érvényesség vége dátum');
      }
      if (validUntil <= existing.validFrom) {
        throw new BadRequestException('Érvényesség vége nem lehet korábbi mint a kezdete');
      }
    }

    const updated = await this.normRepository.update(id, tenantId, {
      description: input.description,
      laborMinutes: input.laborMinutes,
      laborRate: input.laborRate,
      difficultyLevel: input.difficultyLevel,
      productCategory: input.productCategory,
      repairType: input.repairType,
      validUntil,
      isActive: input.isActive,
    });

    return { data: updated };
  }

  @Delete(':id')
  @RequirePermission(Permission.SERVICE_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Norma tétel inaktiválása' })
  @ApiResponse({ status: 204, description: 'Norma inaktiválva' })
  @ApiResponse({ status: 404, description: 'Norma nem található' })
  async deactivate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;

    // Verify norm exists
    const existing = await this.normRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Norma tétel nem található');
    }

    if (!existing.isActive) {
      throw new BadRequestException('Norma tétel már inaktív');
    }

    await this.normRepository.deactivate(id, tenantId);
  }

  // ============================================
  // MANUFACTURER-SPECIFIC ENDPOINTS
  // ============================================

  @Get('manufacturer/:manufacturer/active')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Aktív normák gyártónként' })
  @ApiResponse({ status: 200, description: 'Aktív normák' })
  async getActiveByManufacturer(
    @Param('manufacturer') manufacturer: string,
    @Req() req: AuthenticatedRequest,
    @Query('validAt') validAt?: string
  ) {
    const tenantId = req.user.tenantId;
    const sanitizedManufacturer = manufacturer.trim();

    if (!sanitizedManufacturer) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }

    let validAtDate: Date | undefined;
    if (validAt) {
      validAtDate = new Date(validAt);
      if (isNaN(validAtDate.getTime())) {
        throw new BadRequestException('Érvénytelen dátum');
      }
    }

    const norms = await this.normRepository.findActiveNorms(
      tenantId,
      sanitizedManufacturer,
      validAtDate
    );

    return { data: norms };
  }

  @Get('manufacturer/:manufacturer')
  @RequirePermission(Permission.SERVICE_VIEW)
  @ApiOperation({ summary: 'Összes norma gyártónként' })
  @ApiResponse({ status: 200, description: 'Normák' })
  async getByManufacturer(
    @Param('manufacturer') manufacturer: string,
    @Req() req: AuthenticatedRequest
  ) {
    const tenantId = req.user.tenantId;
    const sanitizedManufacturer = manufacturer.trim();

    if (!sanitizedManufacturer) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }

    const norms = await this.normRepository.findByManufacturer(tenantId, sanitizedManufacturer);

    return { data: norms };
  }
}
