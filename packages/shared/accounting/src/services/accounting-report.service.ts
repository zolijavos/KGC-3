/**
 * @kgc/accounting - AccountingReportService
 * Story 43-2: Könyvelői riportok
 *
 * Service for generating accounting reports in various formats
 */

import { Injectable } from '@nestjs/common';

/** CSV export options */
export interface CsvExportOptions {
  tenantId: string;
  month: string; // Format: YYYY-MM
  encoding: 'utf-8' | 'utf-8-bom';
}

/** Excel export options */
export interface ExcelExportOptions {
  tenantId: string;
  period: string; // Format: YYYY-MM or YYYY-Q1/Q2/Q3/Q4
  format: 'xlsx' | 'xls';
}

/** Deposit report options */
export interface DepositReportOptions {
  tenantId: string;
  format: 'csv' | 'xlsx' | 'pdf';
}

/** Invoice row for reports */
export interface InvoiceReportRow {
  invoiceNumber: string;
  issueDate: string;
  partnerName: string;
  partnerTaxNumber: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
}

/** VAT row for reports */
export interface VatReportRow {
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  invoiceCount: number;
}

/** Deposit row for reports */
export interface DepositReportRow {
  depositId: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  type: 'CARD_HOLD' | 'CASH' | 'TRANSFER';
  createdAt: string;
  rentalId: string;
  status: 'ACTIVE' | 'RELEASED' | 'FORFEITED';
}

/** CSV export result */
export interface CsvExportResult {
  content: string;
  filename: string;
  encoding: 'utf-8' | 'utf-8-bom';
  mimeType: string;
  rowCount: number;
}

/** Excel export result */
export interface ExcelExportResult {
  // In real implementation, this would be a Buffer
  worksheets: string[];
  filename: string;
  summaryData: VatReportRow[];
  totals: {
    totalNet: number;
    totalVat: number;
    totalGross: number;
  };
}

/** Deposit report result */
export interface DepositReportResult {
  deposits: DepositReportRow[];
  totalAmount: number;
  depositCount: number;
  filename: string;
}

/** Generic report data */
export interface ReportData {
  invoices?: InvoiceReportRow[] | undefined;
  vat?: VatReportRow[] | undefined;
  deposits?: DepositReportRow[] | undefined;
}

/** Report type names in Hungarian */
const REPORT_NAMES: Record<string, string> = {
  invoices: 'szamlak',
  vat: 'afa',
  deposits: 'kaucio',
};

@Injectable()
export class AccountingReportService {
  private invoiceData: InvoiceReportRow[] = [];
  private vatData: VatReportRow[] = [];
  private depositData: DepositReportRow[] = [];

  /**
   * Generate invoice CSV report
   */
  async generateInvoiceCsv(options: CsvExportOptions): Promise<CsvExportResult> {
    const headers = [
      'Számlaszám',
      'Dátum',
      'Partner',
      'Adószám',
      'Nettó',
      'ÁFA',
      'Bruttó',
      'ÁFA kulcs',
    ];

    const rows = this.invoiceData.map(inv => [
      inv.invoiceNumber,
      inv.issueDate,
      inv.partnerName,
      inv.partnerTaxNumber,
      inv.netAmount.toString(),
      inv.vatAmount.toString(),
      inv.grossAmount.toString(),
      `${inv.vatRate}%`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');

    return {
      content: csvContent,
      filename: `kgc_szamlak_${options.month}.csv`,
      encoding: options.encoding,
      mimeType: 'text/csv; charset=utf-8',
      rowCount: rows.length,
    };
  }

  /**
   * Generate VAT Excel report
   */
  async generateVatExcel(options: ExcelExportOptions): Promise<ExcelExportResult> {
    const worksheets = ['Összesítő', 'Részletes', 'NAV formátum'];

    const totals = this.vatData.reduce(
      (acc, row) => ({
        totalNet: acc.totalNet + row.netAmount,
        totalVat: acc.totalVat + row.vatAmount,
        totalGross: acc.totalGross + row.grossAmount,
      }),
      { totalNet: 0, totalVat: 0, totalGross: 0 }
    );

    return {
      worksheets,
      filename: `kgc_afa_${options.period}.xlsx`,
      summaryData: this.vatData,
      totals,
    };
  }

  /**
   * Generate deposit report
   */
  async generateDepositReport(options: DepositReportOptions): Promise<DepositReportResult> {
    const totalAmount = this.depositData.reduce((sum, d) => sum + d.amount, 0);

    return {
      deposits: this.depositData,
      totalAmount,
      depositCount: this.depositData.length,
      filename: `kgc_kaucio_egyenleg.${options.format}`,
    };
  }

  /**
   * Get filename for a report
   */
  getFilename(reportType: string, period: string, format: string): string {
    const name = REPORT_NAMES[reportType] ?? reportType;
    return `kgc_${name}_${period}.${format}`;
  }

  /**
   * Add invoice data (for testing)
   */
  addInvoiceData(invoice: InvoiceReportRow): void {
    this.invoiceData.push(invoice);
  }

  /**
   * Add VAT data (for testing)
   */
  addVatData(vat: VatReportRow): void {
    this.vatData.push(vat);
  }

  /**
   * Add deposit data (for testing)
   */
  addDepositData(deposit: DepositReportRow): void {
    this.depositData.push(deposit);
  }
}
