/**
 * Invoice Controller - REST API for Invoice Management
 * Epic 10: Invoice Core
 *
 * Endpoints:
 * - GET    /invoices          - List invoices with filters
 * - GET    /invoices/:id      - Get invoice by ID
 * - POST   /invoices          - Create new invoice
 * - PATCH  /invoices/:id      - Update invoice
 * - DELETE /invoices/:id      - Delete draft invoice
 * - PATCH  /invoices/:id/issue - Issue invoice (DRAFT -> ISSUED)
 * - PATCH  /invoices/:id/send  - Mark as sent
 * - PATCH  /invoices/:id/payment - Record payment
 * - POST   /invoices/:id/storno - Create storno invoice
 * - GET    /invoices/:id/pdf   - Download PDF
 */

import {
  CreateInvoiceInput,
  IInvoice,
  InvoiceFilterOptions,
  InvoiceRbacService,
  InvoiceService,
  InvoiceStatus,
  InvoiceType,
  PaginatedResult,
  StornoService,
  UpdateInvoiceInput,
  VatRate,
} from '@kgc/sales-invoice';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
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
import type { Response } from 'express';
import { PrismaInvoiceRepository } from '../repositories/prisma-invoice.repository';
import { InvoicePdfService, PdfGenerationOptions } from '../services/invoice-pdf.service';

// ============================================
// DTOs for Swagger with class-validator
// ============================================

class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @Min(0)
  unitPriceNet!: number;

  @IsString()
  @IsNotEmpty()
  vatRate!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;
}

class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  partnerId!: string;

  @IsString()
  @IsNotEmpty()
  partnerName!: string;

  @IsString()
  @IsNotEmpty()
  partnerAddress!: string;

  @IsOptional()
  @IsString()
  partnerTaxNumber?: string;

  @IsOptional()
  @IsEnum(['STANDARD', 'PROFORMA', 'STORNO', 'CREDIT_NOTE'])
  type?: InvoiceType;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  fulfillmentDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibleToRoles?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}

class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibleToRoles?: string[];

  @IsString()
  @IsNotEmpty()
  updatedBy!: string;
}

class RecordPaymentDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

class PartialStornoItemDto {
  @IsNumber()
  @Min(1)
  lineNumber!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

class CreateStornoDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialStornoItemDto)
  partialItems?: PartialStornoItemDto[];
}

// ============================================
// CONTROLLER
// ============================================

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly stornoService: StornoService,
    private readonly rbacService: InvoiceRbacService,
    private readonly pdfService: InvoicePdfService,
    private readonly repository: PrismaInvoiceRepository
  ) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List invoices with filters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['STANDARD', 'PROFORMA', 'STORNO', 'CREDIT_NOTE'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
  })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Invoice list with pagination' })
  async list(
    @Query('tenantId') tenantId: string,
    @Query('type') type?: InvoiceType,
    @Query('status') status?: InvoiceStatus,
    @Query('partnerId') partnerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<PaginatedResult<IInvoice>> {
    const filter: InvoiceFilterOptions = { tenantId };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (partnerId) filter.partnerId = partnerId;
    if (dateFrom) filter.dateFrom = new Date(dateFrom);
    if (dateTo) filter.dateTo = new Date(dateTo);
    if (search) filter.search = search;

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };

    return this.repository.findMany(filter, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getById(@Param('id') id: string): Promise<IInvoice> {
    const invoice = await this.repository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${id}`);
    }
    return invoice;
  }

  @Post()
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async create(@Body() dto: CreateInvoiceDto): Promise<IInvoice> {
    // Map items with proper handling of optional properties (exactOptionalPropertyTypes)
    const mappedItems = dto.items.map(item => {
      const mappedItem: CreateInvoiceInput['items'][0] = {
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceNet: item.unitPriceNet,
        vatRate: item.vatRate as VatRate,
      };
      if (item.productId !== undefined) mappedItem.productId = item.productId;
      if (item.discountPercent !== undefined) mappedItem.discountPercent = item.discountPercent;
      return mappedItem;
    });

    const input: CreateInvoiceInput = {
      tenantId: dto.tenantId,
      partnerId: dto.partnerId,
      partnerName: dto.partnerName,
      partnerAddress: dto.partnerAddress,
      paymentMethod: dto.paymentMethod as 'CASH' | 'CARD' | 'TRANSFER' | 'COD',
      items: mappedItems,
      createdBy: dto.createdBy,
    };

    if (dto.partnerTaxNumber) input.partnerTaxNumber = dto.partnerTaxNumber;
    if (dto.type) input.type = dto.type;
    if (dto.invoiceDate) input.invoiceDate = new Date(dto.invoiceDate);
    if (dto.fulfillmentDate) input.fulfillmentDate = new Date(dto.fulfillmentDate);
    if (dto.dueDate) input.dueDate = new Date(dto.dueDate);
    if (dto.notes) input.notes = dto.notes;
    if (dto.isConfidential !== undefined) input.isConfidential = dto.isConfidential;
    if (dto.visibleToRoles) input.visibleToRoles = dto.visibleToRoles;

    return this.invoiceService.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update invoice (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto): Promise<IInvoice> {
    const input: UpdateInvoiceInput = {
      updatedBy: dto.updatedBy,
    };

    if (dto.dueDate) input.dueDate = new Date(dto.dueDate);
    if (dto.notes) input.notes = dto.notes;
    if (dto.internalNotes) input.internalNotes = dto.internalNotes;
    if (dto.paymentMethod)
      input.paymentMethod = dto.paymentMethod as 'CASH' | 'CARD' | 'TRANSFER' | 'COD';
    if (dto.paymentReference) input.paymentReference = dto.paymentReference;
    if (dto.isConfidential !== undefined) input.isConfidential = dto.isConfidential;
    if (dto.visibleToRoles) input.visibleToRoles = dto.visibleToRoles;

    return this.invoiceService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.invoiceService.delete(id);
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  @Patch(':id/issue')
  @ApiOperation({ summary: 'Issue invoice (DRAFT -> ISSUED)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Invoice issued' })
  async issue(@Param('id') id: string, @Query('userId') userId: string): Promise<IInvoice> {
    return this.invoiceService.changeStatus(id, 'ISSUED', userId);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Invoice marked as sent' })
  async markAsSent(@Param('id') id: string, @Query('userId') userId: string): Promise<IInvoice> {
    return this.invoiceService.changeStatus(id, 'SENT', userId);
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Record payment on invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiBody({ type: RecordPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment recorded' })
  async recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto): Promise<IInvoice> {
    return this.invoiceService.recordPayment(id, dto.amount, dto.userId, dto.reference);
  }

  // ============================================
  // STORNO OPERATIONS
  // ============================================

  @Post(':id/storno')
  @ApiOperation({ summary: 'Create storno (cancellation) invoice' })
  @ApiParam({ name: 'id', description: 'Original Invoice ID' })
  @ApiBody({ type: CreateStornoDto })
  @ApiResponse({ status: 201, description: 'Storno invoice created' })
  async createStorno(@Param('id') id: string, @Body() dto: CreateStornoDto): Promise<IInvoice> {
    if (dto.partialItems && dto.partialItems.length > 0) {
      return this.stornoService.createPartialStorno(id, dto.userId, dto.reason, dto.partialItems);
    }
    return this.stornoService.createStorno(id, dto.userId, dto.reason);
  }

  // ============================================
  // PDF OPERATIONS
  // ============================================

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'duplicate', required: false, type: Boolean })
  @ApiQuery({ name: 'language', required: false, enum: ['hu', 'en'] })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @Header('Content-Type', 'text/html') // Would be 'application/pdf' with real PDF
  async downloadPdf(
    @Param('id') id: string,
    @Query('duplicate') duplicate?: string,
    @Query('language') language?: 'hu' | 'en',
    @Res() res?: Response
  ): Promise<void> {
    const invoice = await this.repository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${id}`);
    }

    // Default company info (should come from tenant config in production)
    const companyInfo = {
      name: 'KGC Kisgépcentrum Kft.',
      address: '1234 Budapest, Példa utca 1.',
      taxNumber: '12345678-2-42',
      bankAccount: '12345678-12345678-12345678',
      phone: '+36 1 234 5678',
      email: 'info@kgc.hu',
    };

    const options: PdfGenerationOptions = {
      isDuplicate: duplicate === 'true',
      language: language ?? 'hu',
    };

    const result = await this.pdfService.generatePdf(invoice, companyInfo, options);

    if (res) {
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.send(result.buffer);
    }
  }

  // ============================================
  // RBAC CHECK ENDPOINTS
  // ============================================

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Check user permissions on invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'roles', required: true, description: 'Comma-separated user roles' })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async checkPermissions(
    @Param('id') id: string,
    @Query('roles') rolesStr: string
  ): Promise<{
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canIssue: boolean;
    canCancel: boolean;
    canRecordPayment: boolean;
  }> {
    const invoice = await this.repository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${id}`);
    }

    const roles = rolesStr.split(',').map(r => r.trim());

    return {
      canView: this.rbacService.canView(invoice, roles),
      canEdit: this.rbacService.canEdit(invoice, roles),
      canDelete: this.rbacService.canDelete(invoice, roles),
      canIssue: this.rbacService.canIssue(invoice, roles),
      canCancel: this.rbacService.canCancel(invoice, roles),
      canRecordPayment: this.rbacService.canRecordPayment(invoice, roles),
    };
  }
}
