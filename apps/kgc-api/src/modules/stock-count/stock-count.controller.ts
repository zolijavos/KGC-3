/**
 * StockCount Controller
 * Epic 24: Leltár (Stock Count)
 * REST API endpoints for stock count management
 *
 * RBAC: Tenant-scoped access per ADR-032
 * - VIEW: Raktáros+ megtekintheti a leltárakat
 * - UPDATE: Raktáros+ rögzíthet számlálást
 * - ADJUST: Boltvezető+ jóváhagyhat korrekciókat
 *
 * Stories:
 * - 24-1: Leltár Indítás (CRUD, lifecycle)
 * - 24-2: Leltár Rögzítés (counting, barcode)
 * - 24-3: Leltár Eltérés és Korrekció (variance, adjustments)
 */

import { JwtAuthGuard } from '@kgc/auth';
import { AuthenticatedRequest } from '@kgc/common';
import {
  CountingMode,
  CountRecordingService,
  StockCountService,
  StockCountStatus,
  StockCountType,
  VarianceReasonCategory,
  VarianceService,
} from '@kgc/leltar';
import { Permission, PermissionGuard, RequirePermission } from '@kgc/users';
import {
  BadRequestException,
  Body,
  Controller,
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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

/** Service injection tokens */
export const STOCK_COUNT_SERVICE = Symbol('STOCK_COUNT_SERVICE');
export const COUNT_RECORDING_SERVICE = Symbol('COUNT_RECORDING_SERVICE');
export const VARIANCE_SERVICE = Symbol('VARIANCE_SERVICE');

/** Maximum items per page */
const MAX_PAGE_LIMIT = 100;

/** Maximum items in batch count */
const MAX_BATCH_COUNT_ITEMS = 500;

/** Valid stock count types for validation */
const VALID_STOCK_COUNT_TYPES: string[] = Object.values(StockCountType);

// ============================================
// DTOs
// ============================================

/** Create Stock Count Input */
interface CreateStockCountInput {
  locationId: string;
  warehouseId: string;
  type: StockCountType;
  name: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  freezeStock?: boolean;
  responsibleUserId: string;
  categoryIds?: string[];
  zoneIds?: string[];
  notes?: string;
}

/** Suspend Stock Count Input */
interface SuspendInput {
  reason: string;
}

/** Cancel Stock Count Input */
interface CancelInput {
  reason: string;
}

/** Toggle Stock Freeze Input */
interface ToggleFreezeInput {
  freeze: boolean;
}

/** Start Counter Session Input */
interface StartSessionInput {
  assignedZone?: string;
}

/** Record Count Input */
interface RecordCountInput {
  countedQuantity: number;
  mode: CountingMode;
  notes?: string;
}

/** Batch Count Input */
interface BatchCountInput {
  items: Array<{
    productId?: string;
    barcode?: string;
    countedQuantity: number;
  }>;
}

/** Mark For Recount Input */
interface MarkRecountInput {
  reason: string;
}

/** Document Variance Reason Input */
interface DocumentVarianceInput {
  category: VarianceReasonCategory;
  description: string;
}

/** Reject Adjustment Input */
interface RejectAdjustmentInput {
  reason: string;
}

/** Export Variances Input */
interface ExportVariancesQuery {
  format?: 'CSV' | 'XLSX';
}

@ApiTags('Leltár (Stock Count)')
@ApiSecurity('bearer')
@Controller('stock-counts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StockCountController {
  constructor(
    @Inject(STOCK_COUNT_SERVICE)
    private readonly stockCountService: StockCountService,
    @Inject(COUNT_RECORDING_SERVICE)
    private readonly countRecordingService: CountRecordingService,
    @Inject(VARIANCE_SERVICE)
    private readonly varianceService: VarianceService
  ) {}

  // ============================================
  // STOCK COUNT CRUD (24-1)
  // ============================================

  @Post()
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Leltár létrehozása' })
  @ApiResponse({ status: 201, description: 'Leltár létrehozva' })
  @ApiResponse({ status: 400, description: 'Hibás adatok' })
  async createStockCount(@Req() req: AuthenticatedRequest, @Body() input: CreateStockCountInput) {
    const tenantId = req.user.tenantId;

    // Validate required fields
    if (!input.locationId?.trim()) {
      throw new BadRequestException('Telephely megadása kötelező');
    }
    if (!input.warehouseId?.trim()) {
      throw new BadRequestException('Raktár megadása kötelező');
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('Név megadása kötelező');
    }
    if (!input.responsibleUserId?.trim()) {
      throw new BadRequestException('Felelős megadása kötelező');
    }
    if (!input.scheduledStartDate || !input.scheduledEndDate) {
      throw new BadRequestException('Ütemezett időszak megadása kötelező');
    }
    if (!input.type || !VALID_STOCK_COUNT_TYPES.includes(input.type)) {
      throw new BadRequestException(
        `Érvénytelen leltár típus. Engedélyezett: ${VALID_STOCK_COUNT_TYPES.join(', ')}`
      );
    }

    const scheduledStartDate = new Date(input.scheduledStartDate);
    const scheduledEndDate = new Date(input.scheduledEndDate);

    if (isNaN(scheduledStartDate.getTime()) || isNaN(scheduledEndDate.getTime())) {
      throw new BadRequestException('Érvénytelen dátum formátum');
    }
    if (scheduledEndDate <= scheduledStartDate) {
      throw new BadRequestException('Befejezés dátum nem lehet korábbi mint a kezdés');
    }

    const stockCount = await this.stockCountService.createStockCount({
      tenantId,
      locationId: input.locationId.trim(),
      warehouseId: input.warehouseId.trim(),
      type: input.type,
      name: input.name.trim(),
      scheduledStartDate,
      scheduledEndDate,
      freezeStock: input.freezeStock,
      responsibleUserId: input.responsibleUserId.trim(),
      categoryIds: input.categoryIds,
      zoneIds: input.zoneIds,
      notes: input.notes?.trim(),
    });

    return { data: stockCount };
  }

  @Get()
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Leltárak listázása' })
  @ApiQuery({ name: 'status', required: false, enum: StockCountStatus })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leltárak listája' })
  async listStockCounts(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: StockCountStatus,
    @Query('warehouseId') warehouseId?: string,
    @Query('locationId') locationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const tenantId = req.user.tenantId;

    // Parse and cap limit
    let parsedLimit = 50;
    if (limit && !isNaN(parseInt(limit, 10))) {
      parsedLimit = Math.min(parseInt(limit, 10), MAX_PAGE_LIMIT);
    }

    const rawOffset = offset && !isNaN(parseInt(offset, 10)) ? parseInt(offset, 10) : 0;
    const parsedOffset = Math.max(0, rawOffset); // Ensure non-negative offset

    const stockCounts = await this.stockCountService.listStockCounts({
      tenantId,
      status,
      warehouseId: warehouseId?.trim(),
      locationId: locationId?.trim(),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    return { data: stockCounts };
  }

  @Get(':id')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Leltár részletei' })
  @ApiResponse({ status: 200, description: 'Leltár részletei' })
  @ApiResponse({ status: 404, description: 'Leltár nem található' })
  async getStockCount(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const stockCount = await this.stockCountService.getStockCount(id);

    if (!stockCount) {
      throw new NotFoundException('Leltár nem található');
    }

    // Tenant isolation check would be done at repository level
    return { data: stockCount };
  }

  @Post(':id/start')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leltár indítása' })
  @ApiResponse({ status: 200, description: 'Leltár elindítva' })
  @ApiResponse({ status: 400, description: 'Leltár nem indítható' })
  async startStockCount(@Param('id') id: string) {
    const sanitizedId = id.trim();
    if (!sanitizedId) {
      throw new BadRequestException('Leltár azonosító kötelező');
    }
    const stockCount = await this.stockCountService.startStockCount(sanitizedId);
    return { data: stockCount };
  }

  @Post(':id/suspend')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leltár felfüggesztése' })
  @ApiResponse({ status: 200, description: 'Leltár felfüggesztve' })
  @ApiResponse({ status: 400, description: 'Leltár nem függeszthető fel' })
  async suspendStockCount(@Param('id') id: string, @Body() input: SuspendInput) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('Felfüggesztés oka kötelező');
    }

    const stockCount = await this.stockCountService.suspendStockCount(id, input.reason.trim());
    return { data: stockCount };
  }

  @Post(':id/resume')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leltár folytatása' })
  @ApiResponse({ status: 200, description: 'Leltár folytatva' })
  @ApiResponse({ status: 400, description: 'Leltár nem folytatható' })
  async resumeStockCount(@Param('id') id: string) {
    const sanitizedId = id.trim();
    if (!sanitizedId) {
      throw new BadRequestException('Leltár azonosító kötelező');
    }
    const stockCount = await this.stockCountService.resumeStockCount(sanitizedId);
    return { data: stockCount };
  }

  @Post(':id/cancel')
  @RequirePermission(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leltár visszavonása' })
  @ApiResponse({ status: 200, description: 'Leltár visszavonva' })
  @ApiResponse({ status: 400, description: 'Leltár nem vonható vissza' })
  async cancelStockCount(@Param('id') id: string, @Body() input: CancelInput) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('Visszavonás oka kötelező');
    }

    const stockCount = await this.stockCountService.cancelStockCount(id, input.reason.trim());
    return { data: stockCount };
  }

  @Patch(':id/freeze')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Készlet fagyasztás be/ki' })
  @ApiResponse({ status: 200, description: 'Fagyasztás módosítva' })
  async toggleStockFreeze(@Param('id') id: string, @Body() input: ToggleFreezeInput) {
    if (input.freeze === undefined) {
      throw new BadRequestException('freeze paraméter kötelező');
    }

    const stockCount = await this.stockCountService.toggleStockFreeze(id, input.freeze);
    return { data: stockCount };
  }

  // ============================================
  // COUNT RECORDING (24-2)
  // ============================================

  @Post(':id/sessions')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Számláló session indítása' })
  @ApiResponse({ status: 201, description: 'Session elindítva' })
  async startCounterSession(
    @Param('id') stockCountId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: StartSessionInput
  ) {
    const userId = req.user.id;
    const session = await this.countRecordingService.startCounterSession(
      stockCountId,
      userId,
      input.assignedZone?.trim()
    );
    return { data: session };
  }

  @Post(':id/sessions/:sessionId/end')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Számláló session befejezése' })
  @ApiResponse({ status: 200, description: 'Session befejezve' })
  async endCounterSession(@Param('sessionId') sessionId: string) {
    const session = await this.countRecordingService.endCounterSession(sessionId);
    return { data: session };
  }

  @Get(':id/sessions')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Aktív sessionök lekérdezése' })
  @ApiResponse({ status: 200, description: 'Aktív sessionök' })
  async getActiveSessions(@Param('id') stockCountId: string) {
    const sessions = await this.countRecordingService.getActiveSessions(stockCountId);
    return { data: sessions };
  }

  @Post(':id/items/:itemId/count')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Számlálás rögzítése' })
  @ApiResponse({ status: 200, description: 'Számlálás rögzítve' })
  @ApiResponse({ status: 400, description: 'Hibás adatok' })
  async recordCount(
    @Param('itemId') itemId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: RecordCountInput
  ) {
    const userId = req.user.id;

    if (input.countedQuantity === undefined || input.countedQuantity < 0) {
      throw new BadRequestException('Érvényes mennyiség szükséges');
    }
    if (!input.mode) {
      throw new BadRequestException('Számlálási mód kötelező');
    }

    const item = await this.countRecordingService.recordCount({
      itemId,
      countedQuantity: input.countedQuantity,
      userId,
      mode: input.mode,
      notes: input.notes?.trim(),
    });

    return { data: item };
  }

  @Post(':id/batch-count')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tömeges számlálás rögzítése' })
  @ApiResponse({ status: 200, description: 'Számlálások rögzítve' })
  async recordBatchCount(
    @Param('id') stockCountId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: BatchCountInput
  ) {
    const userId = req.user.id;

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('Legalább egy tétel szükséges');
    }
    if (input.items.length > MAX_BATCH_COUNT_ITEMS) {
      throw new BadRequestException(`Maximum ${MAX_BATCH_COUNT_ITEMS} tétel rögzíthető egyszerre`);
    }

    const results = await this.countRecordingService.recordBatchCount({
      stockCountId,
      userId,
      items: input.items,
    });

    return { data: results };
  }

  @Get(':id/items')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Leltár tételek lekérdezése' })
  @ApiQuery({ name: 'uncountedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'zone', required: false })
  @ApiQuery({ name: 'recountOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Tételek listája' })
  async getCountItems(
    @Param('id') stockCountId: string,
    @Query('uncountedOnly') uncountedOnly?: string,
    @Query('zone') zone?: string,
    @Query('recountOnly') recountOnly?: string
  ) {
    const items = await this.countRecordingService.getCountItems(stockCountId, {
      uncountedOnly: uncountedOnly === 'true',
      zone: zone?.trim(),
      recountOnly: recountOnly === 'true',
    });

    return { data: items };
  }

  @Get(':id/items/barcode/:barcode')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Tétel keresése vonalkóddal' })
  @ApiResponse({ status: 200, description: 'Tétel' })
  @ApiResponse({ status: 404, description: 'Tétel nem található' })
  async findItemByBarcode(@Param('id') stockCountId: string, @Param('barcode') barcode: string) {
    const sanitizedBarcode = barcode.trim();
    if (!sanitizedBarcode) {
      throw new BadRequestException('Vonalkód megadása kötelező');
    }

    const item = await this.countRecordingService.findItemByBarcode(stockCountId, sanitizedBarcode);

    if (!item) {
      throw new NotFoundException('Tétel nem található ezzel a vonalkóddal');
    }

    return { data: item };
  }

  @Post(':id/items/:itemId/undo')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Számlálás visszavonása' })
  @ApiResponse({ status: 200, description: 'Számlálás visszavonva' })
  async undoCount(@Param('itemId') itemId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const item = await this.countRecordingService.undoCount(itemId, userId);
    return { data: item };
  }

  @Post(':id/items/:itemId/recount')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Újraszámlálás megjelölése' })
  @ApiResponse({ status: 200, description: 'Újraszámlálásra jelölve' })
  async markForRecount(@Param('itemId') itemId: string, @Body() input: MarkRecountInput) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('Újraszámlálás oka kötelező');
    }

    const item = await this.countRecordingService.markForRecount(itemId, input.reason.trim());
    return { data: item };
  }

  @Get(':id/progress')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Számlálás haladásának lekérdezése' })
  @ApiResponse({ status: 200, description: 'Haladás' })
  async getCountingProgress(@Param('id') stockCountId: string) {
    const progress = await this.countRecordingService.getCountingProgress(stockCountId);
    return { data: progress };
  }

  // ============================================
  // VARIANCE & ADJUSTMENTS (24-3)
  // ============================================

  @Get(':id/variances')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Eltérések lekérdezése' })
  @ApiResponse({ status: 200, description: 'Eltérések listája' })
  async getVariances(@Param('id') stockCountId: string) {
    const variances = await this.varianceService.getVariances(stockCountId);
    return { data: variances };
  }

  @Patch(':id/items/:itemId/variance-reason')
  @RequirePermission(Permission.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Eltérés ok dokumentálása' })
  @ApiResponse({ status: 200, description: 'Ok rögzítve' })
  async documentVarianceReason(
    @Param('itemId') itemId: string,
    @Body() input: DocumentVarianceInput
  ) {
    if (!input.category) {
      throw new BadRequestException('Ok kategória kötelező');
    }
    if (!input.description?.trim() || input.description.trim().length < 5) {
      throw new BadRequestException('Leírás kötelező (min. 5 karakter)');
    }

    const variance = await this.varianceService.documentVarianceReason(
      itemId,
      input.category,
      input.description.trim()
    );

    return { data: variance };
  }

  @Get(':id/variance-summary')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Eltérés összesítő' })
  @ApiResponse({ status: 200, description: 'Összesítő' })
  async getVarianceSummary(@Param('id') stockCountId: string) {
    const summary = await this.varianceService.getVarianceSummary(stockCountId);
    return { data: summary };
  }

  @Post(':id/adjustments')
  @RequirePermission(Permission.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Korrekció létrehozása' })
  @ApiResponse({ status: 201, description: 'Korrekció létrehozva' })
  async createAdjustment(@Param('id') stockCountId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const adjustment = await this.varianceService.createAdjustment(stockCountId, userId);
    return { data: adjustment };
  }

  @Get(':id/adjustments/:adjustmentId')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Korrekció részletei' })
  @ApiResponse({ status: 200, description: 'Korrekció' })
  @ApiResponse({ status: 404, description: 'Korrekció nem található' })
  async getAdjustment(@Param('adjustmentId') adjustmentId: string) {
    const adjustment = await this.varianceService.getAdjustment(adjustmentId);

    if (!adjustment) {
      throw new NotFoundException('Korrekció nem található');
    }

    return { data: adjustment };
  }

  @Post(':id/adjustments/:adjustmentId/approve')
  @RequirePermission(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Korrekció jóváhagyása' })
  @ApiResponse({ status: 200, description: 'Korrekció jóváhagyva' })
  async approveAdjustment(
    @Param('adjustmentId') adjustmentId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user.id;
    const adjustment = await this.varianceService.approveAdjustment(adjustmentId, userId);
    return { data: adjustment };
  }

  @Post(':id/adjustments/:adjustmentId/reject')
  @RequirePermission(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Korrekció elutasítása' })
  @ApiResponse({ status: 200, description: 'Korrekció elutasítva' })
  async rejectAdjustment(
    @Param('adjustmentId') adjustmentId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: RejectAdjustmentInput
  ) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('Elutasítás oka kötelező');
    }

    const userId = req.user.id;
    const adjustment = await this.varianceService.rejectAdjustment(
      adjustmentId,
      userId,
      input.reason.trim()
    );

    return { data: adjustment };
  }

  @Post(':id/adjustments/:adjustmentId/apply')
  @RequirePermission(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Korrekció végrehajtása' })
  @ApiResponse({ status: 200, description: 'Korrekció végrehajtva' })
  async applyAdjustment(
    @Param('adjustmentId') adjustmentId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user.id;
    const adjustment = await this.varianceService.applyAdjustment(adjustmentId, userId);
    return { data: adjustment };
  }

  @Post(':id/complete')
  @RequirePermission(Permission.INVENTORY_ADJUST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leltár lezárása' })
  @ApiResponse({ status: 200, description: 'Leltár lezárva' })
  @ApiResponse({ status: 400, description: 'Leltár nem zárható le' })
  async completeStockCount(@Param('id') stockCountId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    await this.varianceService.completeStockCount(stockCountId, userId);
    return { data: { success: true }, message: 'Leltár sikeresen lezárva' };
  }

  @Get(':id/export')
  @RequirePermission(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Eltérések exportálása' })
  @ApiQuery({ name: 'format', required: false, enum: ['CSV', 'XLSX'] })
  @ApiResponse({ status: 200, description: 'Export fájl' })
  async exportVariances(
    @Param('id') stockCountId: string,
    @Res() res: Response,
    @Query('format') format?: string
  ) {
    const exportFormat: 'CSV' | 'XLSX' = format === 'XLSX' ? 'XLSX' : 'CSV';
    const buffer = await this.varianceService.exportVariances(stockCountId, exportFormat);

    const contentType =
      exportFormat === 'XLSX'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    const extension = exportFormat === 'XLSX' ? 'xlsx' : 'csv';
    // Sanitize filename - remove unsafe characters to prevent path traversal
    const safeId = stockCountId.replace(/[^a-zA-Z0-9-_]/g, '');
    const filename = `elteresek-${safeId}.${extension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  }
}
