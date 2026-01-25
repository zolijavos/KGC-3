/**
 * Quote Controller
 * Epic 18: Árajánlat (ADR-027)
 * REST API endpoints for quotation management
 *
 * RBAC: Tenant-scoped access per ADR-032
 * - VIEW: Boltvezető+ megtekintheti az árajánlatokat
 * - CREATE: Szervizes+ létrehozhat árajánlatot
 * - CONVERT: Boltvezető+ konvertálhat munkalappá
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
  Optional,
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

import {
  EXPLODED_VIEW_REPOSITORY,
  ExplodedViewFilterDto,
  IExplodedViewRepository,
  IQuoteItem,
  IQuoteItemRepository,
  IQuoteRepository,
  QUOTE_ITEM_REPOSITORY,
  QUOTE_REPOSITORY,
  QuoteFilterDto,
  QuoteStatus,
} from './repositories';

import {
  IWorksheetItemRepository,
  IWorksheetRepository,
  WORKSHEET_ITEM_REPOSITORY,
  WORKSHEET_REPOSITORY,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
} from '../service/repositories';

import { QUOTE_EMAIL_SERVICE, QUOTE_PDF_SERVICE } from './quote.module';
import {
  QuoteEmailOptions,
  QuoteEmailPartnerInfo,
  QuoteEmailService,
} from './services/quote-email.service';
import {
  QuoteCompanyInfo,
  QuotePartnerInfo,
  QuotePdfOptions,
  QuotePdfService,
} from './services/quote-pdf.service';

/** Default validity days for new quotes */
const DEFAULT_VALIDITY_DAYS = 14;

/** Hungarian VAT rate */
const VAT_RATE = 0.27;

/** Quote number format: AJ-YYYY-NNNN */
const formatQuoteNumber = (year: number, sequence: number): string => {
  return `AJ-${year}-${String(sequence).padStart(4, '0')}`;
};

/** Create Quote Input DTO */
interface CreateQuoteInput {
  partnerId: string;
  worksheetId?: string;
  validityDays?: number;
  introduction?: string;
  terms?: string;
  notes?: string;
  items: CreateQuoteItemInput[];
}

/** Create Quote Item Input DTO */
interface CreateQuoteItemInput {
  itemType: 'PART' | 'LABOR' | 'OTHER';
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  explodedPartNumber?: string;
  notes?: string;
}

/** Update Quote Input DTO */
interface UpdateQuoteInput {
  validUntil?: Date;
  introduction?: string;
  terms?: string;
  notes?: string;
}

/** Accept/Reject Quote Input DTO */
interface QuoteResponseInput {
  rejectionReason?: string;
}

/** PDF Generation Input DTO */
interface GeneratePdfInput {
  includeTerms?: boolean;
  language?: 'hu' | 'en';
  watermark?: string;
}

/** Send Email Input DTO */
interface SendEmailInput {
  recipientEmail?: string;
  language?: 'hu' | 'en';
  customSubject?: string;
  customBody?: string;
  ccAddresses?: string[];
  includeIntroduction?: boolean;
}

/** Company info - would normally come from tenant config */
const DEFAULT_COMPANY_INFO: QuoteCompanyInfo = {
  name: 'Kisgepcentrum Kft.',
  address: 'Budapest, Kossuth u. 1.',
  taxNumber: '12345678-2-42',
  phone: '+36 1 234 5678',
  email: 'info@kisgepcentrum.hu',
};

@ApiTags('Árajánlat')
@ApiSecurity('bearer')
@Controller('quotes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QuoteController {
  constructor(
    @Inject(QUOTE_REPOSITORY)
    private readonly quoteRepository: IQuoteRepository,
    @Inject(QUOTE_ITEM_REPOSITORY)
    private readonly itemRepository: IQuoteItemRepository,
    @Inject(EXPLODED_VIEW_REPOSITORY)
    private readonly explodedViewRepository: IExplodedViewRepository,
    @Inject(QUOTE_PDF_SERVICE)
    private readonly pdfService: QuotePdfService,
    @Optional()
    @Inject(QUOTE_EMAIL_SERVICE)
    private readonly emailService?: QuoteEmailService,
    @Optional()
    @Inject(WORKSHEET_REPOSITORY)
    private readonly worksheetRepository?: IWorksheetRepository,
    @Optional()
    @Inject(WORKSHEET_ITEM_REPOSITORY)
    private readonly worksheetItemRepository?: IWorksheetItemRepository
  ) {}

  // ============================================
  // STATISTICS ENDPOINTS (must be before :id routes!)
  // ============================================

  @Get('stats/summary')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Árajánlat statisztikák' })
  @ApiResponse({ status: 200, description: 'Statisztikák' })
  async getStatistics(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;

    const [draft, sent, accepted, rejected, expired, converted, total] = await Promise.all([
      this.quoteRepository.countByTenant(tenantId, { status: QuoteStatus.DRAFT }),
      this.quoteRepository.countByTenant(tenantId, { status: QuoteStatus.SENT }),
      this.quoteRepository.countByTenant(tenantId, { status: QuoteStatus.ACCEPTED }),
      this.quoteRepository.countByTenant(tenantId, { status: QuoteStatus.REJECTED }),
      this.quoteRepository.countByTenant(tenantId, { status: QuoteStatus.EXPIRED }),
      this.quoteRepository.countByTenant(tenantId, { status: QuoteStatus.CONVERTED }),
      this.quoteRepository.countByTenant(tenantId),
    ]);

    const conversionRate = total > 0 ? Math.round(((accepted + converted) / total) * 100) : 0;

    return {
      data: {
        draft,
        sent,
        accepted,
        rejected,
        expired,
        converted,
        total,
        conversionRate,
      },
    };
  }

  // ============================================
  // PDF AND EMAIL ENDPOINTS
  // ============================================

  @Post(':id/generate-pdf')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'PDF generálás árajánlathoz' })
  @ApiResponse({ status: 200, description: 'PDF fájl', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  async generatePdf(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Body() input: GeneratePdfInput = {}
  ) {
    const tenantId = req.user.tenantId;

    const quote = await this.quoteRepository.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }

    const items = await this.itemRepository.findByQuoteId(id);

    // TODO: Get real partner info from partner repository
    const partner: QuotePartnerInfo = {
      name: 'Partner név', // Would come from Partner repository
      address: 'Partner cím',
      taxNumber: '12345678-2-42',
    };

    const pdfOptions: QuotePdfOptions = {
      includeTerms: input.includeTerms ?? true,
      language: input.language ?? 'hu',
      ...(input.watermark !== undefined && { watermark: input.watermark }),
    };

    const pdfBytes = await this.pdfService.generatePdf(
      quote,
      items,
      partner,
      DEFAULT_COMPANY_INFO,
      pdfOptions
    );

    const filename = `arajanlat-${quote.quoteNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    res.send(Buffer.from(pdfBytes));
  }

  @Post(':id/send-email')
  @RequirePermission(Permission.QUOTE_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Árajánlat küldése email-ben' })
  @ApiResponse({ status: 200, description: 'Email elküldve' })
  @ApiResponse({ status: 400, description: 'Email szolgáltatás nem elérhető' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  async sendEmail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: SendEmailInput
  ) {
    if (!this.emailService) {
      throw new BadRequestException('Email szolgáltatás nem konfigurált');
    }

    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const quote = await this.quoteRepository.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }

    // Only DRAFT and SENT quotes can be emailed
    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException('Csak DRAFT vagy SENT státuszú árajánlat küldhető email-ben');
    }

    const items = await this.itemRepository.findByQuoteId(id);

    // TODO: Get real partner info from partner repository
    const partner: QuoteEmailPartnerInfo = {
      name: 'Partner név', // Would come from Partner repository
      email: input.recipientEmail ?? 'partner@example.com', // Would come from Partner repository
    };

    if (!input.recipientEmail && !partner.email) {
      throw new BadRequestException('Címzett email cím megadása kötelező');
    }

    // Generate PDF for attachment
    const pdfPartner: QuotePartnerInfo = {
      name: partner.name,
    };
    const pdfBytes = await this.pdfService.generatePdf(
      quote,
      items,
      pdfPartner,
      DEFAULT_COMPANY_INFO,
      { language: input.language ?? 'hu', includeTerms: true }
    );

    // Send email
    const emailOptions: QuoteEmailOptions = {
      language: input.language ?? 'hu',
      includeIntroduction: input.includeIntroduction ?? true,
      ...(input.customSubject !== undefined && { customSubject: input.customSubject }),
      ...(input.customBody !== undefined && { customBody: input.customBody }),
      ...(input.ccAddresses !== undefined && { ccAddresses: input.ccAddresses }),
    };

    await this.emailService.sendQuote(
      quote,
      pdfBytes,
      { ...partner, email: input.recipientEmail ?? partner.email },
      DEFAULT_COMPANY_INFO.name,
      emailOptions
    );

    // Update quote status to SENT if it was DRAFT
    if (quote.status === QuoteStatus.DRAFT) {
      await this.quoteRepository.changeStatus(id, tenantId, QuoteStatus.SENT, userId);
    }

    return {
      data: { success: true },
      message: 'Árajánlat elküldve email-ben',
    };
  }

  // ============================================
  // QUOTE CRUD ENDPOINTS
  // ============================================

  @Get()
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Árajánlatok listázása' })
  @ApiQuery({ name: 'status', required: false, enum: QuoteStatus })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'worksheetId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date })
  @ApiQuery({ name: 'dateTo', required: false, type: Date })
  @ApiQuery({ name: 'validOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Árajánlatok listája' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: QuoteStatus,
    @Query('partnerId') partnerId?: string,
    @Query('worksheetId') worksheetId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('validOnly') validOnly?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const tenantId = req.user.tenantId;

    // Parse and validate dates
    const parsedDateFrom = dateFrom ? new Date(dateFrom) : undefined;
    const parsedDateTo = dateTo ? new Date(dateTo) : undefined;

    const filter: Partial<QuoteFilterDto> = {
      ...(status && { status }),
      ...(partnerId && { partnerId }),
      ...(worksheetId && { worksheetId }),
      ...(parsedDateFrom && !isNaN(parsedDateFrom.getTime()) && { dateFrom: parsedDateFrom }),
      ...(parsedDateTo && !isNaN(parsedDateTo.getTime()) && { dateTo: parsedDateTo }),
      ...(validOnly === 'true' && { validOnly: true }),
      ...(search && { search }),
      ...(limit && !isNaN(parseInt(limit, 10)) && { limit: parseInt(limit, 10) }),
      ...(offset && !isNaN(parseInt(offset, 10)) && { offset: parseInt(offset, 10) }),
    };

    const quotes = await this.quoteRepository.findAll(tenantId, filter);
    const total = await this.quoteRepository.countByTenant(tenantId, filter);

    return { data: quotes, total };
  }

  @Get(':id')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Árajánlat részletei' })
  @ApiResponse({ status: 200, description: 'Árajánlat részletei' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  async findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const quote = await this.quoteRepository.findById(id, tenantId);

    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }

    // Get items for the quote
    const items = await this.itemRepository.findByQuoteId(id);

    return { data: { ...quote, items } };
  }

  @Get('by-number/:quoteNumber')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Árajánlat keresése számmal' })
  @ApiResponse({ status: 200, description: 'Árajánlat részletei' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  async findByNumber(@Param('quoteNumber') quoteNumber: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const quote = await this.quoteRepository.findByNumber(tenantId, quoteNumber);

    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }

    const items = await this.itemRepository.findByQuoteId(quote.id);

    return { data: { ...quote, items } };
  }

  @Post()
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({ summary: 'Új árajánlat létrehozása' })
  @ApiResponse({ status: 201, description: 'Árajánlat létrehozva' })
  @ApiResponse({ status: 400, description: 'Hibás adatok' })
  @ApiResponse({ status: 403, description: 'Nincs jogosultság' })
  async create(@Req() req: AuthenticatedRequest, @Body() input: CreateQuoteInput) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Validate input
    if (!input.partnerId) {
      throw new BadRequestException('Partner megadása kötelező');
    }
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Legalább egy tétel megadása kötelező');
    }

    // Validate item values
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException('Mennyiség nem lehet nulla vagy negatív');
      }
      if (item.unitPrice < 0) {
        throw new BadRequestException('Egységár nem lehet negatív');
      }
    }

    // Generate quote number
    const year = new Date().getFullYear();
    const sequence = await this.quoteRepository.getNextSequence(tenantId, year);
    const quoteNumber = formatQuoteNumber(year, sequence);

    // Calculate validity
    const validityDays = input.validityDays ?? DEFAULT_VALIDITY_DAYS;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // Calculate totals from items
    let subtotal = 0;
    for (const item of input.items) {
      subtotal += item.quantity * item.unitPrice;
    }
    const vatAmount = Math.round(subtotal * VAT_RATE);
    const totalAmount = subtotal + vatAmount;

    // Create quote
    const quote = await this.quoteRepository.create({
      tenantId,
      quoteNumber,
      partnerId: input.partnerId,
      status: QuoteStatus.DRAFT,
      validUntil,
      subtotal,
      discountAmount: 0,
      vatAmount,
      totalAmount,
      createdBy: userId,
      updatedBy: userId,
      ...(input.worksheetId !== undefined && { worksheetId: input.worksheetId }),
      ...(input.introduction !== undefined && { introduction: input.introduction }),
      ...(input.terms !== undefined && { terms: input.terms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    });

    // Create quote items
    const createdItems: IQuoteItem[] = [];
    for (const itemInput of input.items) {
      const item = await this.itemRepository.create({
        quoteId: quote.id,
        itemType: itemInput.itemType,
        description: itemInput.description,
        quantity: itemInput.quantity,
        unit: itemInput.unit,
        unitPrice: itemInput.unitPrice,
        totalPrice: itemInput.quantity * itemInput.unitPrice,
        ...(itemInput.productId !== undefined && { productId: itemInput.productId }),
        ...(itemInput.explodedPartNumber !== undefined && {
          explodedPartNumber: itemInput.explodedPartNumber,
        }),
        ...(itemInput.notes !== undefined && { notes: itemInput.notes }),
      });
      createdItems.push(item);
    }

    return { data: { ...quote, items: createdItems } };
  }

  @Patch(':id')
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({ summary: 'Árajánlat módosítása' })
  @ApiResponse({ status: 200, description: 'Árajánlat módosítva' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak DRAFT státuszú árajánlat módosítható' })
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: UpdateQuoteInput
  ) {
    const tenantId = req.user.tenantId;

    // Check quote exists and is DRAFT
    const existing = await this.quoteRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (existing.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Csak DRAFT státuszú árajánlat módosítható');
    }

    const updated = await this.quoteRepository.update(id, tenantId, {
      updatedBy: req.user.id,
      ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
      ...(input.introduction !== undefined && { introduction: input.introduction }),
      ...(input.terms !== undefined && { terms: input.terms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    });

    return { data: updated };
  }

  @Delete(':id')
  @RequirePermission(Permission.QUOTE_CREATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Árajánlat törlése' })
  @ApiResponse({ status: 204, description: 'Árajánlat törölve' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak DRAFT státuszú árajánlat törölhető' })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;

    const existing = await this.quoteRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (existing.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Csak DRAFT státuszú árajánlat törölhető');
    }

    // Delete items first, then quote
    const items = await this.itemRepository.findByQuoteId(id);
    for (const item of items) {
      await this.itemRepository.delete(item.id);
    }

    // Note: Quote delete would need to be added to repository
    // For now, change status to indicate deletion
    await this.quoteRepository.update(id, tenantId, {
      status: QuoteStatus.EXPIRED,
      notes: `Törölve: ${new Date().toISOString()}`,
      updatedBy: req.user.id,
    });
  }

  // ============================================
  // QUOTE ITEM ENDPOINTS
  // ============================================

  @Post(':id/items')
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({ summary: 'Tétel hozzáadása árajánlathoz' })
  @ApiResponse({ status: 201, description: 'Tétel hozzáadva' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak DRAFT státuszú árajánlathoz adható tétel' })
  async addItem(
    @Param('id') quoteId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateQuoteItemInput
  ) {
    const tenantId = req.user.tenantId;

    const quote = await this.quoteRepository.findById(quoteId, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Csak DRAFT státuszú árajánlathoz adható tétel');
    }

    // Validate item values
    if (input.quantity <= 0) {
      throw new BadRequestException('Mennyiség nem lehet nulla vagy negatív');
    }
    if (input.unitPrice < 0) {
      throw new BadRequestException('Egységár nem lehet negatív');
    }

    const item = await this.itemRepository.create({
      quoteId,
      itemType: input.itemType,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: input.unitPrice,
      totalPrice: input.quantity * input.unitPrice,
      ...(input.productId !== undefined && { productId: input.productId }),
      ...(input.explodedPartNumber !== undefined && {
        explodedPartNumber: input.explodedPartNumber,
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
    });

    // Recalculate quote totals
    const allItems = await this.itemRepository.findByQuoteId(quoteId);
    const subtotal = allItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const vatAmount = Math.round(subtotal * VAT_RATE);
    const totalAmount = subtotal + vatAmount;

    await this.quoteRepository.update(quoteId, tenantId, {
      subtotal,
      vatAmount,
      totalAmount,
      updatedBy: req.user.id,
    });

    return { data: item };
  }

  @Delete(':id/items/:itemId')
  @RequirePermission(Permission.QUOTE_CREATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tétel eltávolítása árajánlatból' })
  @ApiResponse({ status: 204, description: 'Tétel eltávolítva' })
  @ApiResponse({ status: 404, description: 'Árajánlat vagy tétel nem található' })
  async removeItem(
    @Param('id') quoteId: string,
    @Param('itemId') itemId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const tenantId = req.user.tenantId;

    const quote = await this.quoteRepository.findById(quoteId, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Csak DRAFT státuszú árajánlatból törölhető tétel');
    }

    const item = await this.itemRepository.findById(itemId);
    if (!item || item.quoteId !== quoteId) {
      throw new NotFoundException('Tétel nem található');
    }

    await this.itemRepository.delete(itemId);

    // Recalculate quote totals
    const allItems = await this.itemRepository.findByQuoteId(quoteId);
    const subtotal = allItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const vatAmount = Math.round(subtotal * VAT_RATE);
    const totalAmount = subtotal + vatAmount;

    await this.quoteRepository.update(quoteId, tenantId, {
      subtotal,
      vatAmount,
      totalAmount,
      updatedBy: req.user.id,
    });
  }

  // ============================================
  // EXPLODED VIEW ENDPOINTS (Story 18-2)
  // ============================================

  @Get('exploded-views/search')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Gépmodell keresés robbantott ábrához' })
  @ApiQuery({ name: 'manufacturer', required: false })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiResponse({ status: 200, description: 'Gépmodellek listája' })
  async searchMachineModels(
    @Req() req: AuthenticatedRequest,
    @Query('manufacturer') manufacturer?: string,
    @Query('searchTerm') searchTerm?: string
  ) {
    const tenantId = req.user.tenantId;
    const filter: Partial<ExplodedViewFilterDto> = {};

    if (manufacturer) {
      filter.manufacturer = manufacturer;
    }
    if (searchTerm) {
      filter.searchTerm = searchTerm;
    }

    const models = await this.explodedViewRepository.searchMachineModels(tenantId, filter);

    return { data: models };
  }

  @Get('exploded-views/by-model/:machineModelId')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Robbantott ábra lekérése gépmodell alapján' })
  @ApiResponse({ status: 200, description: 'Robbantott ábra adatai' })
  @ApiResponse({ status: 404, description: 'Robbantott ábra nem található' })
  async getExplodedView(
    @Param('machineModelId') machineModelId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const tenantId = req.user.tenantId;

    if (!machineModelId.trim()) {
      throw new BadRequestException('Gépmodell azonosító megadása kötelező');
    }

    const explodedView = await this.explodedViewRepository.findByMachineModelId(
      machineModelId.trim(),
      tenantId
    );

    if (!explodedView) {
      throw new NotFoundException('Robbantott ábra nem található ehhez a gépmodellhez');
    }

    return { data: explodedView };
  }

  @Get('exploded-views/by-manufacturer/:manufacturer')
  @RequirePermission(Permission.QUOTE_VIEW)
  @ApiOperation({ summary: 'Robbantott ábrák gyártó alapján' })
  @ApiResponse({ status: 200, description: 'Robbantott ábrák listája' })
  async getExplodedViewsByManufacturer(
    @Param('manufacturer') manufacturer: string,
    @Req() req: AuthenticatedRequest
  ) {
    const tenantId = req.user.tenantId;

    if (!manufacturer.trim()) {
      throw new BadRequestException('Gyártó megadása kötelező');
    }

    const explodedViews = await this.explodedViewRepository.findByManufacturer(
      manufacturer.trim(),
      tenantId
    );

    return { data: explodedViews };
  }

  @Post(':id/add-from-exploded')
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({ summary: 'Alkatrészek hozzáadása robbantott ábrából' })
  @ApiResponse({ status: 200, description: 'Tételek hozzáadva' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak DRAFT státuszú árajánlathoz adható tétel' })
  async addItemsFromExplodedView(
    @Param('id') quoteId: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: { machineModelId: string; selections: { hotspotId: string; quantity: number }[] }
  ) {
    const tenantId = req.user.tenantId;

    // Validate input
    if (!input.machineModelId) {
      throw new BadRequestException('Gépmodell azonosító megadása kötelező');
    }
    if (!input.selections || input.selections.length === 0) {
      throw new BadRequestException('Legalább egy alkatrész kiválasztása kötelező');
    }

    // Check quote exists and is DRAFT
    const quote = await this.quoteRepository.findById(quoteId, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Csak DRAFT státuszú árajánlathoz adható tétel');
    }

    // Get exploded view
    const explodedView = await this.explodedViewRepository.findByMachineModelId(
      input.machineModelId,
      tenantId
    );
    if (!explodedView) {
      throw new NotFoundException('Robbantott ábra nem található');
    }

    // Add items from selections
    const addedItems: IQuoteItem[] = [];
    for (const selection of input.selections) {
      const hotspot = explodedView.hotspots.find(h => h.id === selection.hotspotId);
      if (!hotspot) {
        throw new BadRequestException(`Hotspot nem található: ${selection.hotspotId}`);
      }

      if (selection.quantity <= 0) {
        throw new BadRequestException('Mennyiség nem lehet nulla vagy negatív');
      }

      const item = await this.itemRepository.create({
        quoteId,
        itemType: 'PART',
        productId: hotspot.itemId,
        description: hotspot.itemName,
        quantity: selection.quantity,
        unit: 'db',
        unitPrice: hotspot.unitPrice,
        totalPrice: selection.quantity * hotspot.unitPrice,
        explodedPartNumber: hotspot.position,
      });
      addedItems.push(item);
    }

    // Recalculate quote totals
    const allItems = await this.itemRepository.findByQuoteId(quoteId);
    const subtotal = allItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const vatAmount = Math.round(subtotal * VAT_RATE);
    const totalAmount = subtotal + vatAmount;

    await this.quoteRepository.update(quoteId, tenantId, {
      subtotal,
      vatAmount,
      totalAmount,
      updatedBy: req.user.id,
    });

    return {
      data: { addedItems, itemCount: addedItems.length },
      message: `${addedItems.length} tétel hozzáadva a robbantott ábrából`,
    };
  }

  // ============================================
  // QUOTE STATUS ENDPOINTS
  // ============================================

  @Post(':id/send')
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({ summary: 'Árajánlat küldése' })
  @ApiResponse({ status: 200, description: 'Árajánlat elküldve' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak DRAFT státuszú árajánlat küldhető' })
  async send(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const quote = await this.quoteRepository.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Csak DRAFT státuszú árajánlat küldhető');
    }

    const updated = await this.quoteRepository.changeStatus(id, tenantId, QuoteStatus.SENT, userId);

    return { data: updated };
  }

  @Post(':id/accept')
  @RequirePermission(Permission.QUOTE_CONVERT)
  @ApiOperation({ summary: 'Árajánlat elfogadása' })
  @ApiResponse({ status: 200, description: 'Árajánlat elfogadva' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak SENT/VIEWED státuszú árajánlat fogadható el' })
  async accept(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const quote = await this.quoteRepository.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.VIEWED) {
      throw new BadRequestException('Csak SENT vagy VIEWED státuszú árajánlat fogadható el');
    }

    const updated = await this.quoteRepository.changeStatus(
      id,
      tenantId,
      QuoteStatus.ACCEPTED,
      userId
    );

    return { data: updated };
  }

  @Post(':id/reject')
  @RequirePermission(Permission.QUOTE_CONVERT)
  @ApiOperation({ summary: 'Árajánlat elutasítása' })
  @ApiResponse({ status: 200, description: 'Árajánlat elutasítva' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({
    status: 400,
    description: 'Csak SENT/VIEWED státuszú árajánlat utasítható el',
  })
  async reject(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: QuoteResponseInput
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const quote = await this.quoteRepository.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.VIEWED) {
      throw new BadRequestException('Csak SENT vagy VIEWED státuszú árajánlat utasítható el');
    }

    // Update with rejection reason if provided
    if (input.rejectionReason) {
      await this.quoteRepository.update(id, tenantId, {
        rejectionReason: input.rejectionReason,
        updatedBy: userId,
      });
    }

    const updated = await this.quoteRepository.changeStatus(
      id,
      tenantId,
      QuoteStatus.REJECTED,
      userId
    );

    return { data: updated };
  }

  @Post(':id/convert-to-worksheet')
  @RequirePermission(Permission.QUOTE_CONVERT)
  @ApiOperation({ summary: 'Árajánlat konvertálása munkalappá' })
  @ApiResponse({ status: 200, description: 'Munkalap létrehozva' })
  @ApiResponse({ status: 404, description: 'Árajánlat nem található' })
  @ApiResponse({ status: 400, description: 'Csak ACCEPTED státuszú árajánlat konvertálható' })
  async convertToWorksheet(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Verify worksheet repository is available
    if (!this.worksheetRepository || !this.worksheetItemRepository) {
      throw new BadRequestException('Munkalap konverzió nem elérhető');
    }

    const quote = await this.quoteRepository.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException('Árajánlat nem található');
    }
    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Csak ACCEPTED státuszú árajánlat konvertálható munkalappá');
    }
    if (quote.convertedToWorksheetId) {
      throw new BadRequestException('Árajánlat már konvertálva lett');
    }

    // Get quote items
    const quoteItems = await this.itemRepository.findByQuoteId(id);

    // Generate worksheet number
    const year = new Date().getFullYear();
    const sequence = await this.worksheetRepository.getNextSequence(tenantId, year);
    const worksheetNumber = `ML-${year}-${String(sequence).padStart(5, '0')}`;

    // Build device name from quote (from notes or items)
    const deviceName = quote.notes
      ? quote.notes.substring(0, 100)
      : quoteItems.length > 0
        ? (quoteItems[0]?.description ?? 'Árajánlatból konvertált munkalap')
        : 'Árajánlatból konvertált munkalap';

    // Create worksheet from quote
    const worksheet = await this.worksheetRepository.create({
      tenantId,
      worksheetNumber,
      type: WorksheetType.FIZETOS,
      status: WorksheetStatus.FELVEVE,
      priority: WorksheetPriority.NORMAL,
      partnerId: quote.partnerId,
      deviceName,
      faultDescription: `Árajánlat alapján: ${quote.quoteNumber}`,
      internalNote: `Konvertálva árajánlatból: ${quote.quoteNumber} (${new Date().toISOString()})`,
      receivedAt: new Date(),
      createdBy: userId,
    });

    // Create worksheet items from quote items
    for (const quoteItem of quoteItems) {
      // Map quote item type to worksheet item type
      const worksheetItemType: 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB' =
        quoteItem.itemType === 'PART'
          ? 'ALKATRESZ'
          : quoteItem.itemType === 'LABOR'
            ? 'MUNKADIJ'
            : 'EGYEB';

      await this.worksheetItemRepository.create({
        worksheetId: worksheet.id,
        tenantId,
        description: quoteItem.description,
        quantity: quoteItem.quantity,
        unitPrice: quoteItem.unitPrice,
        vatRate: 27, // Hungarian VAT
        netAmount: quoteItem.totalPrice,
        grossAmount: Math.round(quoteItem.totalPrice * 1.27),
        itemType: worksheetItemType,
        ...(quoteItem.productId !== undefined && { productId: quoteItem.productId }),
        ...(quoteItem.notes !== undefined && { notes: quoteItem.notes }),
      });
    }

    // Update quote with converted worksheet ID
    await this.quoteRepository.update(id, tenantId, {
      convertedToWorksheetId: worksheet.id,
      updatedBy: userId,
    });

    // Change quote status to CONVERTED
    const updated = await this.quoteRepository.changeStatus(
      id,
      tenantId,
      QuoteStatus.CONVERTED,
      userId
    );

    return {
      data: {
        quote: updated,
        worksheet: {
          id: worksheet.id,
          worksheetNumber: worksheet.worksheetNumber,
          status: worksheet.status,
        },
      },
      message: `Munkalap létrehozva: ${worksheet.worksheetNumber}`,
    };
  }
}
