/**
 * @kgc/accounting - AccountingService
 * Story 43-1: Könyvelői API végpontok
 *
 * Service for providing accounting data to external systems
 */

import { Injectable } from '@nestjs/common';

/** Invoice query parameters */
export interface InvoiceQueryDto {
  tenantId: string;
  from: Date;
  to: Date;
}

/** Transaction query parameters */
export interface TransactionQueryDto {
  tenantId: string;
  from: Date;
  to: Date;
  type?: TransactionType | undefined;
}

/** VAT summary query parameters */
export interface VatSummaryQueryDto {
  tenantId: string;
  month: string; // Format: YYYY-MM
}

/** Invoice record for export */
export interface InvoiceRecord {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  issueDate: Date;
  partnerId: string;
  partnerName: string;
  partnerTaxNumber: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  currency: string;
  status: string;
}

/** Transaction types */
export type TransactionType = 'DEPOSIT_IN' | 'DEPOSIT_OUT' | 'INVOICE_PAYMENT' | 'REFUND';

/** Transaction record for export */
export interface TransactionRecord {
  id: string;
  tenantId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  referenceId: string;
  referenceType: string;
}

/** VAT breakdown by rate */
export interface VatBreakdown {
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  invoiceCount: number;
}

/** VAT summary response */
export interface VatSummary {
  tenantId: string;
  month: string;
  breakdown: VatBreakdown[];
  totals: {
    totalNet: number;
    totalVat: number;
    totalGross: number;
  };
}

/** Invoice list response */
export interface InvoiceListResponse {
  invoices: InvoiceRecord[];
  totals: {
    totalNet: number;
    totalVat: number;
    totalGross: number;
    count: number;
  };
  query: {
    from: string;
    to: string;
  };
}

/** Transaction list response */
export interface TransactionListResponse {
  transactions: TransactionRecord[];
  summary: {
    depositIn: number;
    depositOut: number;
    invoicePayments: number;
    refunds: number;
    netCashflow: number;
  };
  query: {
    from: string;
    to: string;
  };
}

/** API key registration */
export interface ApiKeyRegistration {
  key: string;
  tenantId: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date;
}

/** API key validation result */
export interface ApiKeyValidationResult {
  valid: boolean;
  tenantId?: string | undefined;
  scopes?: string[] | undefined;
  error?: string | undefined;
}

/** API key prefix for accounting keys */
const API_KEY_PREFIX = 'kgc_acc_';

@Injectable()
export class AccountingService {
  private invoices: Map<string, InvoiceRecord> = new Map();
  private transactions: Map<string, TransactionRecord> = new Map();
  private apiKeys: Map<string, ApiKeyRegistration> = new Map();

  /**
   * Get invoices for a given period
   */
  async getInvoices(query: InvoiceQueryDto): Promise<InvoiceListResponse> {
    const filteredInvoices = Array.from(this.invoices.values()).filter(inv => {
      if (inv.tenantId !== query.tenantId) return false;

      const issueTime = inv.issueDate.getTime();
      const fromTime = query.from.getTime();
      const toTime = query.to.getTime();

      return issueTime >= fromTime && issueTime <= toTime;
    });

    const totals = filteredInvoices.reduce(
      (acc, inv) => ({
        totalNet: acc.totalNet + inv.netAmount,
        totalVat: acc.totalVat + inv.vatAmount,
        totalGross: acc.totalGross + inv.grossAmount,
        count: acc.count + 1,
      }),
      { totalNet: 0, totalVat: 0, totalGross: 0, count: 0 }
    );

    return {
      invoices: filteredInvoices,
      totals,
      query: {
        from: query.from.toISOString(),
        to: query.to.toISOString(),
      },
    };
  }

  /**
   * Get transactions for a given period
   */
  async getTransactions(query: TransactionQueryDto): Promise<TransactionListResponse> {
    let filteredTransactions = Array.from(this.transactions.values()).filter(tx => {
      if (tx.tenantId !== query.tenantId) return false;

      const txTime = tx.date.getTime();
      const fromTime = query.from.getTime();
      const toTime = query.to.getTime();

      return txTime >= fromTime && txTime <= toTime;
    });

    // Filter by type if specified
    if (query.type) {
      filteredTransactions = filteredTransactions.filter(tx => tx.type === query.type);
    }

    const summary = filteredTransactions.reduce(
      (acc, tx) => {
        switch (tx.type) {
          case 'DEPOSIT_IN':
            acc.depositIn += tx.amount;
            break;
          case 'DEPOSIT_OUT':
            acc.depositOut += tx.amount;
            break;
          case 'INVOICE_PAYMENT':
            acc.invoicePayments += tx.amount;
            break;
          case 'REFUND':
            acc.refunds += tx.amount;
            break;
        }
        return acc;
      },
      { depositIn: 0, depositOut: 0, invoicePayments: 0, refunds: 0, netCashflow: 0 }
    );

    summary.netCashflow =
      summary.depositIn + summary.invoicePayments - summary.depositOut - summary.refunds;

    return {
      transactions: filteredTransactions,
      summary,
      query: {
        from: query.from.toISOString(),
        to: query.to.toISOString(),
      },
    };
  }

  /**
   * Get VAT summary for a given month
   */
  async getVatSummary(query: VatSummaryQueryDto): Promise<VatSummary> {
    // Parse month string to date range
    const [year, month] = query.month.split('-').map(Number);
    const monthStart = new Date(year ?? 2026, (month ?? 1) - 1, 1);
    const monthEnd = new Date(year ?? 2026, month ?? 1, 0, 23, 59, 59, 999);

    const monthInvoices = Array.from(this.invoices.values()).filter(inv => {
      if (inv.tenantId !== query.tenantId) return false;

      const issueTime = inv.issueDate.getTime();
      return issueTime >= monthStart.getTime() && issueTime <= monthEnd.getTime();
    });

    // Group by VAT rate
    const vatGroups = new Map<number, { invoices: InvoiceRecord[] }>();

    for (const inv of monthInvoices) {
      const existing = vatGroups.get(inv.vatRate);
      if (existing) {
        existing.invoices.push(inv);
      } else {
        vatGroups.set(inv.vatRate, { invoices: [inv] });
      }
    }

    // Build breakdown
    const breakdown: VatBreakdown[] = [];
    let totalNet = 0;
    let totalVat = 0;
    let totalGross = 0;

    for (const [vatRate, group] of vatGroups) {
      const groupTotals = group.invoices.reduce(
        (acc, inv) => ({
          netAmount: acc.netAmount + inv.netAmount,
          vatAmount: acc.vatAmount + inv.vatAmount,
          grossAmount: acc.grossAmount + inv.grossAmount,
          invoiceCount: acc.invoiceCount + 1,
        }),
        { netAmount: 0, vatAmount: 0, grossAmount: 0, invoiceCount: 0 }
      );

      breakdown.push({
        vatRate,
        ...groupTotals,
      });

      totalNet += groupTotals.netAmount;
      totalVat += groupTotals.vatAmount;
      totalGross += groupTotals.grossAmount;
    }

    // Sort by VAT rate descending
    breakdown.sort((a, b) => b.vatRate - a.vatRate);

    return {
      tenantId: query.tenantId,
      month: query.month,
      breakdown,
      totals: {
        totalNet,
        totalVat,
        totalGross,
      },
    };
  }

  /**
   * Validate API key format
   */
  isValidApiKeyFormat(key: string): boolean {
    return key.startsWith(API_KEY_PREFIX) && key.length >= API_KEY_PREFIX.length + 10;
  }

  /**
   * Validate API key and return tenant info
   */
  async validateApiKey(key: string): Promise<ApiKeyValidationResult> {
    if (!this.isValidApiKeyFormat(key)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const registration = this.apiKeys.get(key);

    if (!registration) {
      return { valid: false, error: 'API key not found' };
    }

    if (registration.expiresAt < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    return {
      valid: true,
      tenantId: registration.tenantId,
      scopes: registration.scopes,
    };
  }

  /**
   * Register API key (for testing)
   */
  registerApiKey(registration: ApiKeyRegistration): void {
    this.apiKeys.set(registration.key, registration);
  }

  /**
   * Add invoice (for testing)
   */
  addInvoiceForTest(invoice: InvoiceRecord): void {
    this.invoices.set(invoice.id, invoice);
  }

  /**
   * Add transaction (for testing)
   */
  addTransactionForTest(transaction: TransactionRecord): void {
    this.transactions.set(transaction.id, transaction);
  }
}
