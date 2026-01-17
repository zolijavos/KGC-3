/**
 * NAV Service
 * Main orchestrator for NAV Online invoice operations
 * Stories: 11-1, 11-2, 11-3, 11-4
 * @package @kgc/nav-online
 */

import { Injectable, Logger } from '@nestjs/common';
import { SzamlazzhuService } from './szamlazz-hu.service';
import { RetryService } from './retry.service';
import type {
  Invoice,
  NavSubmissionResult,
} from '../interfaces/invoice.interface';
import type { SzamlazzhuConfig } from '../interfaces/szamlazz-hu.interface';
import type { RetryConfig } from '../interfaces/retry.interface';

/**
 * NAV Service Configuration
 */
export interface NavServiceConfig {
  szamlazzhu: Partial<SzamlazzhuConfig>;
  retry?: Partial<RetryConfig>;
}

/**
 * NAV Service
 * Orchestrates invoice creation, submission, and retry logic
 */
@Injectable()
export class NavService {
  private readonly logger = new Logger(NavService.name);
  private readonly szamlazzhuService: SzamlazzhuService;
  private readonly retryService: RetryService;

  constructor(config: NavServiceConfig) {
    this.szamlazzhuService = new SzamlazzhuService(config.szamlazzhu);
    this.retryService = new RetryService(config.retry);

    this.logger.log('NAV Service initialized');
  }

  /**
   * Számla létrehozása és beküldése NAV-nak
   */
  async createAndSubmitInvoice(invoice: Invoice): Promise<NavSubmissionResult> {
    this.logger.log(`Creating invoice for tenant: ${invoice.tenantId}, partner: ${invoice.partner.id}`);

    const result = await this.retryService.executeWithRetry(
      async () => {
        const invoiceResult = await this.szamlazzhuService.createInvoice(invoice);

        if (!invoiceResult.success) {
          const error = new Error(invoiceResult.error?.message ?? 'Invoice creation failed');
          (error as Error & { code: string }).code = invoiceResult.error?.code ?? 'UNKNOWN';
          throw error;
        }

        return invoiceResult;
      },
      (attempt, error) => {
        this.logger.warn(`Invoice creation retry attempt ${attempt}: ${error.message}`);
      },
    );

    if (result.success && result.result?.invoice) {
      const createdInvoice = result.result.invoice;

      const successResult: NavSubmissionResult = {
        success: true,
        navStatus: 'SUBMITTED',
      };
      if (createdInvoice.navReference !== undefined) {
        successResult.transactionId = createdInvoice.navReference;
      }
      return successResult;
    }

    const failResult: NavSubmissionResult = {
      success: false,
    };
    if (result.error !== undefined) {
      failResult.error = result.error;
    }
    return failResult;
  }

  /**
   * Számla sztornózása
   */
  async cancelInvoice(invoice: Invoice): Promise<NavSubmissionResult> {
    this.logger.log(`Cancelling invoice: ${invoice.externalNumber}`);

    if (!invoice.externalNumber) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE',
          message: 'Invoice has no external number - cannot cancel',
          retryable: false,
        },
      };
    }

    const result = await this.retryService.executeWithRetry(
      async () => {
        const cancelResult = await this.szamlazzhuService.cancelInvoice(invoice);

        if (!cancelResult.success) {
          const error = new Error(cancelResult.error?.message ?? 'Invoice cancellation failed');
          (error as Error & { code: string }).code = cancelResult.error?.code ?? 'UNKNOWN';
          throw error;
        }

        return cancelResult;
      },
      (attempt, error) => {
        this.logger.warn(`Invoice cancellation retry attempt ${attempt}: ${error.message}`);
      },
    );

    if (result.success) {
      return {
        success: true,
        navStatus: 'SUBMITTED',
      };
    }

    const cancelFailResult: NavSubmissionResult = {
      success: false,
    };
    if (result.error !== undefined) {
      cancelFailResult.error = result.error;
    }
    return cancelFailResult;
  }

  /**
   * Számla státusz lekérdezése
   */
  async getInvoiceStatus(invoiceNumber: string): Promise<NavSubmissionResult> {
    this.logger.debug(`Getting status for invoice: ${invoiceNumber}`);

    const response = await this.szamlazzhuService.getInvoiceStatus(invoiceNumber);

    if (response.success) {
      const statusResult: NavSubmissionResult = {
        success: true,
      };
      if (response.navTransactionId !== undefined) {
        statusResult.transactionId = response.navTransactionId;
      }
      if (response.navStatus !== undefined) {
        statusResult.navStatus = response.navStatus;
      }
      return statusResult;
    }

    return {
      success: false,
      error: {
        code: String(response.errorCode),
        message: response.errorMessage ?? 'Status check failed',
        retryable: false,
      },
    };
  }

  /**
   * PDF letöltése
   */
  async downloadInvoicePdf(invoiceNumber: string): Promise<Buffer | null> {
    return this.szamlazzhuService.downloadPdf(invoiceNumber);
  }

  /**
   * Ellenőrzi, hogy a hiba újrapróbálható-e
   */
  isRetryableError(errorCode: string): boolean {
    return this.retryService.isRetryable(errorCode);
  }

  /**
   * Következő retry időpont számítása
   */
  getNextRetryTime(attempt: number): Date {
    return this.retryService.calculateNextRetryAt(attempt);
  }

  /**
   * Maximum retry elérve-e
   */
  isMaxRetriesReached(attempts: number): boolean {
    return this.retryService.isMaxRetriesReached(attempts);
  }
}
