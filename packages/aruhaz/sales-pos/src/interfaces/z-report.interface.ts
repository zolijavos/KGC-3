/**
 * @kgc/sales-pos - Z-Report Interfaces
 * Epic 22: Point of Sale - Story 22-3 Napi pénztárzárás
 */

import { PaymentMethod } from './payment.interface.js';

/**
 * Payment method breakdown for Z-report
 */
export interface IPaymentMethodBreakdown {
  method: PaymentMethod;
  count: number;
  total: number;
}

/**
 * Z-Report summary data
 */
export interface IZReportSummary {
  // Session info
  sessionId: string;
  sessionNumber: string;
  locationId: string;
  tenantId: string;

  // Time info
  openedAt: Date;
  closedAt: Date;
  generatedAt: Date;

  // Balances
  openingBalance: number;
  expectedBalance: number;
  closingBalance: number;
  variance: number;
  varianceNote?: string;

  // Sales totals
  totalSales: number;
  totalRefunds: number;
  netSales: number;

  // Tax breakdown
  totalTax: number;

  // Payment breakdown
  paymentBreakdown: IPaymentMethodBreakdown[];

  // Transaction statistics
  transactionCount: number;
  completedCount: number;
  voidedCount: number;

  // Operator info
  openedBy: string;
  closedBy: string;
}

/**
 * Full Z-Report with details
 */
export interface IZReport extends IZReportSummary {
  // Can include transaction details if needed
  includesDetails?: boolean;
}

/**
 * Z-Report generation result
 */
export interface IZReportGenerateResult {
  report: IZReport;
  jsonExport?: string;
  pdfBuffer?: Buffer;
}

/**
 * PDF Generator Service Interface (STUB)
 * Actual implementation will use PDFKit or similar
 */
export interface IPdfGeneratorService {
  generateZReport(report: IZReport, companyInfo: ICompanyInfo): Promise<Buffer>;
}

/**
 * Company info for PDF header
 */
export interface ICompanyInfo {
  name: string;
  address: string;
  taxNumber: string;
  phone?: string;
  email?: string;
}
