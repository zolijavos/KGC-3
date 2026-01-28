/**
 * Számlázz.hu Mock Service
 * Sprint 0 Blocker #3: Mock External Services
 *
 * Provides a mock implementation of the Számlázz.hu API for E2E testing.
 * Returns predictable responses without making actual API calls.
 *
 * Scenarios supported:
 * - Successful invoice creation
 * - Invoice cancellation
 * - Error simulation (configurable)
 */

import { Injectable, Logger } from '@nestjs/common';

// Re-use types from nav-online package (interface only)
export interface MockInvoice {
  id?: string;
  tenantId: string;
  internalNumber: string;
  partner: {
    name: string;
    taxNumber?: string;
    email?: string;
    phone?: string;
    zipCode: string;
    city: string;
    address: string;
    euTaxNumber?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPriceNet: number;
    vatRate: string;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }>;
  invoiceDate: Date;
  fulfillmentDate: Date;
  dueDate: Date;
  paymentMethod: string;
  paymentTransactionId?: string;
  notes?: string;
  status?: string;
  externalNumber?: string;
  navReference?: string;
  pdfUrl?: string;
}

export interface MockInvoiceResult {
  success: boolean;
  invoice?: MockInvoice;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface MockSzamlazzhuConfig {
  /** Force errors for testing */
  forceError?: 'AUTH' | 'VALIDATION' | 'NAV' | 'TIMEOUT' | 'RATE_LIMIT' | null;
  /** Delay response (ms) */
  responseDelay?: number;
  /** Custom invoice number prefix */
  invoicePrefix?: string;
}

/**
 * Mock Számlázz.hu Service for testing
 */
@Injectable()
export class MockSzamlazzhuService {
  private readonly logger = new Logger(MockSzamlazzhuService.name);
  private invoiceCounter = 1;
  private createdInvoices: Map<string, MockInvoice> = new Map();
  private config: MockSzamlazzhuConfig;

  constructor(config: MockSzamlazzhuConfig = {}) {
    this.config = {
      forceError: null,
      responseDelay: 50,
      invoicePrefix: 'MOCK',
      ...config,
    };
    this.logger.log('MockSzamlazzhuService initialized');
  }

  /**
   * Reset mock state (for test isolation)
   */
  reset(): void {
    this.invoiceCounter = 1;
    this.createdInvoices.clear();
    this.logger.debug('Mock state reset');
  }

  /**
   * Configure mock behavior
   */
  configure(config: Partial<MockSzamlazzhuConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get all created invoices (for assertions)
   */
  getCreatedInvoices(): MockInvoice[] {
    return Array.from(this.createdInvoices.values());
  }

  /**
   * Mock invoice creation
   */
  async createInvoice(invoice: MockInvoice): Promise<MockInvoiceResult> {
    this.logger.debug(`Mock: Creating invoice for tenant: ${invoice.tenantId}`);

    // Simulate response delay
    if (this.config.responseDelay) {
      await this.delay(this.config.responseDelay);
    }

    // Check for forced errors
    if (this.config.forceError) {
      return this.simulateError(this.config.forceError);
    }

    // Generate mock invoice number
    const invoiceNumber = `${this.config.invoicePrefix}-${new Date().getFullYear()}-${String(this.invoiceCounter++).padStart(6, '0')}`;
    const navReference = `NAV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const createdInvoice: MockInvoice = {
      ...invoice,
      status: 'SUCCESS',
      externalNumber: invoiceNumber,
      navReference,
      pdfUrl: `/mock/invoices/${invoiceNumber}.pdf`,
    };

    this.createdInvoices.set(invoiceNumber, createdInvoice);
    this.logger.log(`Mock: Invoice created: ${invoiceNumber}`);

    return {
      success: true,
      invoice: createdInvoice,
    };
  }

  /**
   * Mock invoice cancellation
   */
  async cancelInvoice(invoice: MockInvoice): Promise<MockInvoiceResult> {
    this.logger.debug(`Mock: Cancelling invoice: ${invoice.externalNumber}`);

    if (this.config.responseDelay) {
      await this.delay(this.config.responseDelay);
    }

    if (this.config.forceError) {
      return this.simulateError(this.config.forceError);
    }

    const existingInvoice = invoice.externalNumber
      ? this.createdInvoices.get(invoice.externalNumber)
      : null;

    if (!existingInvoice && invoice.externalNumber) {
      // Still allow cancellation even if not in our mock store
      this.logger.debug(`Mock: Invoice not found in mock store, allowing cancellation anyway`);
    }

    const cancelledInvoice: MockInvoice = {
      ...invoice,
      status: 'CANCELLED',
    };

    if (invoice.externalNumber) {
      this.createdInvoices.set(invoice.externalNumber, cancelledInvoice);
    }

    this.logger.log(`Mock: Invoice cancelled: ${invoice.externalNumber}`);

    return {
      success: true,
      invoice: cancelledInvoice,
    };
  }

  /**
   * Mock invoice status check
   */
  async getInvoiceStatus(
    invoiceNumber: string
  ): Promise<{ success: boolean; status?: string; navStatus?: string }> {
    this.logger.debug(`Mock: Getting status for: ${invoiceNumber}`);

    if (this.config.responseDelay) {
      await this.delay(this.config.responseDelay);
    }

    const invoice = this.createdInvoices.get(invoiceNumber);

    if (invoice) {
      const result: { success: boolean; status?: string; navStatus?: string } = {
        success: true,
        navStatus: 'ACCEPTED',
      };
      if (invoice.status) {
        result.status = invoice.status;
      }
      return result;
    }

    return {
      success: true,
      status: 'UNKNOWN',
      navStatus: 'UNKNOWN',
    };
  }

  /**
   * Mock PDF download
   */
  async downloadPdf(invoiceNumber: string): Promise<Buffer | null> {
    this.logger.debug(`Mock: Downloading PDF for: ${invoiceNumber}`);

    if (this.config.responseDelay) {
      await this.delay(this.config.responseDelay);
    }

    // Return a minimal valid PDF for testing
    const mockPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer << /Root 1 0 R >>
%%EOF`;

    return Buffer.from(mockPdfContent);
  }

  /**
   * Simulate specific error types
   */
  private simulateError(
    errorType: 'AUTH' | 'VALIDATION' | 'NAV' | 'TIMEOUT' | 'RATE_LIMIT'
  ): MockInvoiceResult {
    const errors: Record<string, { code: string; message: string; retryable: boolean }> = {
      AUTH: { code: '1', message: 'Invalid API key', retryable: false },
      VALIDATION: { code: '3', message: 'Invalid invoice data', retryable: false },
      NAV: { code: '51', message: 'NAV temporary error', retryable: true },
      TIMEOUT: { code: '101', message: 'Request timeout', retryable: true },
      RATE_LIMIT: { code: '102', message: 'Rate limit exceeded', retryable: true },
    };

    const error = errors[errorType];
    this.logger.warn(`Mock: Simulating error: ${errorType}`);

    return {
      success: false,
      error: error ?? { code: '100', message: 'Unknown error', retryable: false },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
