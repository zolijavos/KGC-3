/**
 * NAV Controller
 * REST API endpoints for NAV Online integration
 * @package @kgc/nav-online
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NavService } from './services/nav.service';
import { InvoiceQueueService } from './services/invoice-queue.service';
import { CreateInvoiceDto, validateCreateInvoice } from './dto/create-invoice.dto';
import type { NavSubmissionResponseDto, ErrorResponseDto } from './dto/invoice-response.dto';
import type { Invoice, InvoiceType, InvoiceStatus } from './interfaces/invoice.interface';

/**
 * NAV Controller
 * Handles invoice creation and NAV submission endpoints
 */
@Controller('api/v1/nav')
export class NavController {
  private readonly logger = new Logger(NavController.name);

  constructor(
    private readonly navService: NavService,
    private readonly queueService?: InvoiceQueueService,
  ) {}

  /**
   * POST /api/v1/nav/invoices
   * Számla létrehozása és beküldése NAV-nak
   *
   * FONTOS: Rate limiting szükséges production-ben!
   * Ajánlott: @nestjs/throttler használata:
   * - @Throttle({ default: { limit: 10, ttl: 60000 } }) - max 10 számla/perc/user
   * - Tenant-szintű limit is szükséges a Számlázz.hu API költségek miatt
   */
  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(
    @Body() body: unknown,
  ): Promise<NavSubmissionResponseDto | ErrorResponseDto> {
    this.logger.log('Creating invoice');

    try {
      // Validate input
      const dto = validateCreateInvoice(body);

      // Transform DTO to Invoice (simplified - in production fetch partner data)
      const invoiceId = randomUUID();
      const invoice: Invoice = {
        id: invoiceId,
        tenantId: dto.tenantId,
        internalNumber: this.generateInternalNumber(),
        type: dto.type as InvoiceType,
        status: 'PENDING' as InvoiceStatus,
        partner: {
          id: dto.partnerId,
          name: '', // Should be fetched from partner service
          zipCode: '',
          city: '',
          address: '',
          isCompany: false,
        },
        invoiceDate: dto.invoiceDate ?? new Date(),
        fulfillmentDate: dto.fulfillmentDate ?? new Date(),
        dueDate: dto.dueDate ?? this.calculateDueDate(dto.paymentMethod),
        paymentMethod: dto.paymentMethod,
        netAmount: this.calculateNetAmount(dto.items),
        vatAmount: this.calculateVatAmount(dto.items),
        grossAmount: this.calculateGrossAmount(dto.items),
        currency: 'HUF',
        items: dto.items.map((item, index) => {
          const invoiceItem: Invoice['items'][number] = {
            id: `item-${index}`,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceNet: item.unitPriceNet,
            vatRate: item.vatRate,
            netAmount: item.quantity * item.unitPriceNet,
            vatAmount: this.calculateItemVat(item.quantity * item.unitPriceNet, item.vatRate),
            grossAmount:
              item.quantity * item.unitPriceNet +
              this.calculateItemVat(item.quantity * item.unitPriceNet, item.vatRate),
          };
          if (item.productId !== undefined) {
            invoiceItem.productId = item.productId;
          }
          return invoiceItem;
        }),
        createdBy: dto.createdBy,
      };
      if (dto.rentalId !== undefined) {
        invoice.rentalId = dto.rentalId;
      }
      if (dto.serviceOrderId !== undefined) {
        invoice.serviceOrderId = dto.serviceOrderId;
      }
      if (dto.paymentTransactionId !== undefined) {
        invoice.paymentTransactionId = dto.paymentTransactionId;
      }
      if (dto.notes !== undefined) {
        invoice.notes = dto.notes;
      }

      // Submit to NAV
      const result = await this.navService.createAndSubmitInvoice(invoice);

      if (result.success) {
        return {
          success: true,
          invoiceId: invoiceId,
          invoiceNumber: invoice.internalNumber,
          navTransactionId: result.transactionId ?? null,
          navStatus: result.navStatus ?? null,
          pdfUrl: invoice.pdfUrl ?? null,
          error: null,
        };
      }

      // Add to retry queue on failure
      if (result.error?.retryable && this.queueService) {
        await this.queueService.addToQueue(invoice.tenantId, invoiceId);
      }

      return {
        success: false,
        invoiceId: invoiceId,
        invoiceNumber: invoice.internalNumber,
        navTransactionId: null,
        navStatus: null,
        pdfUrl: null,
        error: result.error ?? null,
      };
    } catch (error) {
      this.logger.error(`Invoice creation failed: ${(error as Error).message}`);

      if ((error as Error).name === 'ZodError') {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid invoice data',
            details: (error as { errors?: unknown[] }).errors,
          },
        });
      }

      throw error;
    }
  }

  /**
   * GET /api/v1/nav/invoices/:invoiceNumber/status
   * Számla NAV státusz lekérdezése
   */
  @Get('invoices/:invoiceNumber/status')
  async getInvoiceStatus(
    @Param('invoiceNumber') invoiceNumber: string,
  ): Promise<NavSubmissionResponseDto | ErrorResponseDto> {
    this.logger.debug(`Getting status for invoice: ${invoiceNumber}`);

    const result = await this.navService.getInvoiceStatus(invoiceNumber);

    if (result.success) {
      return {
        success: true,
        invoiceId: '',
        invoiceNumber,
        navTransactionId: result.transactionId ?? null,
        navStatus: result.navStatus ?? null,
        pdfUrl: null,
        error: null,
      };
    }

    throw new NotFoundException({
      success: false,
      error: {
        code: result.error?.code ?? 'NOT_FOUND',
        message: result.error?.message ?? 'Invoice not found',
      },
    });
  }

  /**
   * POST /api/v1/nav/invoices/:invoiceNumber/cancel
   * Számla sztornózása
   */
  @Post('invoices/:invoiceNumber/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelInvoice(
    @Param('invoiceNumber') invoiceNumber: string,
  ): Promise<NavSubmissionResponseDto | ErrorResponseDto> {
    this.logger.log(`Cancelling invoice: ${invoiceNumber}`);

    // In production, fetch the invoice from database
    throw new BadRequestException({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Invoice lookup required - implement invoice repository',
      },
    });
  }

  /**
   * GET /api/v1/nav/invoices/:invoiceNumber/pdf
   * PDF letöltése
   */
  @Get('invoices/:invoiceNumber/pdf')
  async downloadPdf(@Param('invoiceNumber') invoiceNumber: string): Promise<Buffer> {
    this.logger.debug(`Downloading PDF for invoice: ${invoiceNumber}`);

    const pdf = await this.navService.downloadInvoicePdf(invoiceNumber);

    if (!pdf) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PDF_NOT_FOUND',
          message: 'PDF not available for this invoice',
        },
      });
    }

    return pdf;
  }

  /**
   * GET /api/v1/nav/queue/stats
   * Queue statisztikák
   */
  @Get('queue/stats')
  async getQueueStats(@Query('tenantId') tenantId?: string) {
    if (!this.queueService) {
      return { enabled: false };
    }

    return {
      enabled: true,
      stats: await this.queueService.getQueueStats(tenantId),
    };
  }

  /**
   * POST /api/v1/nav/queue/process
   * Manuális queue feldolgozás
   */
  @Post('queue/process')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerQueueProcessing() {
    if (!this.queueService) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'QUEUE_DISABLED',
          message: 'Queue processing is not enabled',
        },
      });
    }

    await this.queueService.triggerProcessing();

    return { success: true, message: 'Queue processing triggered' };
  }

  // Helper methods

  private generateInternalNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `KGC-${year}-${random}`;
  }

  private calculateDueDate(paymentMethod: string): Date {
    const dueDate = new Date();

    if (paymentMethod === 'átutalás') {
      dueDate.setDate(dueDate.getDate() + 8); // 8 days for transfer
    }
    // Cash/card: due date = invoice date

    return dueDate;
  }

  private calculateNetAmount(items: CreateInvoiceDto['items']): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPriceNet, 0);
  }

  private calculateVatAmount(items: CreateInvoiceDto['items']): number {
    return items.reduce((sum, item) => {
      const net = item.quantity * item.unitPriceNet;
      return sum + this.calculateItemVat(net, item.vatRate);
    }, 0);
  }

  private calculateGrossAmount(items: CreateInvoiceDto['items']): number {
    return this.calculateNetAmount(items) + this.calculateVatAmount(items);
  }

  private calculateItemVat(netAmount: number, vatRate: string): number {
    const vatRates = new Map<string, number>([
      ['27', 0.27],
      ['18', 0.18],
      ['5', 0.05],
      ['0', 0],
      ['AAM', 0],
      ['TAM', 0],
      ['EU', 0],
      ['EUK', 0],
      ['MAA', 0],
      ['F.AFA', 0],
      ['K.AFA', 0],
    ]);

    const rate = vatRates.get(vatRate);
    if (rate === undefined) {
      this.logger.warn(`Unknown VAT rate: ${vatRate}, defaulting to 27%`);
      return Math.round(netAmount * 0.27);
    }

    return Math.round(netAmount * rate);
  }
}
