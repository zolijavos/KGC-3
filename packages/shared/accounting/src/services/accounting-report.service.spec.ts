/**
 * @kgc/accounting - AccountingReportService Tests
 * Story 43-2: Könyvelői riportok
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  AccountingReportService,
  CsvExportOptions,
  ExcelExportOptions,
  VatReportRow,
} from './accounting-report.service';

describe('AccountingReportService', () => {
  let service: AccountingReportService;

  beforeEach(() => {
    service = new AccountingReportService();
  });

  describe('generateInvoiceCsv', () => {
    it('should generate CSV with correct headers', async () => {
      const options: CsvExportOptions = {
        tenantId: 'tenant-1',
        month: '2026-01',
        encoding: 'utf-8-bom',
      };

      const result = await service.generateInvoiceCsv(options);

      expect(result.content).toContain('Számlaszám');
      expect(result.content).toContain('Dátum');
      expect(result.content).toContain('Partner');
      expect(result.content).toContain('Nettó');
      expect(result.content).toContain('ÁFA');
      expect(result.content).toContain('Bruttó');
      expect(result.filename).toBe('kgc_szamlak_2026-01.csv');
    });

    it('should include invoice data in CSV', async () => {
      service.addInvoiceData({
        invoiceNumber: 'KGC-2026-00001',
        issueDate: '2026-01-15',
        partnerName: 'Test Partner Kft.',
        partnerTaxNumber: '12345678-2-42',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        vatRate: 27,
      });

      const result = await service.generateInvoiceCsv({
        tenantId: 'tenant-1',
        month: '2026-01',
        encoding: 'utf-8-bom',
      });

      expect(result.content).toContain('KGC-2026-00001');
      expect(result.content).toContain('Test Partner Kft.');
      expect(result.content).toContain('100000');
      expect(result.content).toContain('27000');
      expect(result.content).toContain('127000');
    });

    it('should use UTF-8 BOM encoding for Excel compatibility', async () => {
      const result = await service.generateInvoiceCsv({
        tenantId: 'tenant-1',
        month: '2026-01',
        encoding: 'utf-8-bom',
      });

      // UTF-8 BOM starts with EF BB BF (but we store as string, so check metadata)
      expect(result.encoding).toBe('utf-8-bom');
      expect(result.mimeType).toBe('text/csv; charset=utf-8');
    });

    it('should handle empty data', async () => {
      const result = await service.generateInvoiceCsv({
        tenantId: 'tenant-1',
        month: '2026-01',
        encoding: 'utf-8-bom',
      });

      expect(result.content).toBeDefined();
      expect(result.rowCount).toBe(0);
    });
  });

  describe('generateVatExcel', () => {
    it('should generate Excel with multiple worksheets', async () => {
      const options: ExcelExportOptions = {
        tenantId: 'tenant-1',
        period: '2026-Q1',
        format: 'xlsx',
      };

      const result = await service.generateVatExcel(options);

      expect(result.worksheets).toContain('Összesítő');
      expect(result.worksheets).toContain('Részletes');
      expect(result.worksheets).toContain('NAV formátum');
      expect(result.filename).toBe('kgc_afa_2026-Q1.xlsx');
    });

    it('should include VAT breakdown by rate', async () => {
      service.addVatData({
        vatRate: 27,
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        invoiceCount: 5,
      });

      service.addVatData({
        vatRate: 5,
        netAmount: 50000,
        vatAmount: 2500,
        grossAmount: 52500,
        invoiceCount: 2,
      });

      const result = await service.generateVatExcel({
        tenantId: 'tenant-1',
        period: '2026-Q1',
        format: 'xlsx',
      });

      expect(result.summaryData).toHaveLength(2);
      const vat27 = result.summaryData.find((d: VatReportRow) => d.vatRate === 27);
      expect(vat27?.netAmount).toBe(100000);
      expect(vat27?.invoiceCount).toBe(5);
    });

    it('should calculate quarter totals correctly', async () => {
      service.addVatData({
        vatRate: 27,
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        invoiceCount: 3,
      });

      service.addVatData({
        vatRate: 5,
        netAmount: 50000,
        vatAmount: 2500,
        grossAmount: 52500,
        invoiceCount: 2,
      });

      const result = await service.generateVatExcel({
        tenantId: 'tenant-1',
        period: '2026-Q1',
        format: 'xlsx',
      });

      expect(result.totals.totalNet).toBe(150000);
      expect(result.totals.totalVat).toBe(29500);
      expect(result.totals.totalGross).toBe(179500);
    });
  });

  describe('generateDepositReport', () => {
    it('should list all open deposits', async () => {
      service.addDepositData({
        depositId: 'dep-1',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        amount: 50000,
        type: 'CARD_HOLD',
        createdAt: '2026-01-10',
        rentalId: 'rental-1',
        status: 'ACTIVE',
      });

      service.addDepositData({
        depositId: 'dep-2',
        partnerId: 'partner-2',
        partnerName: 'Other Partner',
        amount: 80000,
        type: 'CASH',
        createdAt: '2026-01-15',
        rentalId: 'rental-2',
        status: 'ACTIVE',
      });

      const result = await service.generateDepositReport({
        tenantId: 'tenant-1',
        format: 'csv',
      });

      expect(result.deposits).toHaveLength(2);
      expect(result.deposits[0]?.partnerName).toBe('Test Partner');
      expect(result.deposits[1]?.amount).toBe(80000);
    });

    it('should include required fields in deposit report', async () => {
      service.addDepositData({
        depositId: 'dep-1',
        partnerId: 'partner-1',
        partnerName: 'Test Partner Kft.',
        amount: 75000,
        type: 'CARD_HOLD',
        createdAt: '2026-01-10',
        rentalId: 'rental-1',
        status: 'ACTIVE',
      });

      const result = await service.generateDepositReport({
        tenantId: 'tenant-1',
        format: 'csv',
      });

      const deposit = result.deposits[0];
      expect(deposit?.partnerName).toBe('Test Partner Kft.');
      expect(deposit?.amount).toBe(75000);
      expect(deposit?.type).toBe('CARD_HOLD');
      expect(deposit?.createdAt).toBe('2026-01-10');
    });

    it('should calculate total deposit amount', async () => {
      service.addDepositData({
        depositId: 'dep-1',
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        amount: 50000,
        type: 'CARD_HOLD',
        createdAt: '2026-01-10',
        rentalId: 'rental-1',
        status: 'ACTIVE',
      });

      service.addDepositData({
        depositId: 'dep-2',
        partnerId: 'partner-2',
        partnerName: 'Partner 2',
        amount: 80000,
        type: 'CASH',
        createdAt: '2026-01-15',
        rentalId: 'rental-2',
        status: 'ACTIVE',
      });

      const result = await service.generateDepositReport({
        tenantId: 'tenant-1',
        format: 'csv',
      });

      expect(result.totalAmount).toBe(130000);
      expect(result.depositCount).toBe(2);
    });
  });

  describe('getFilename', () => {
    it('should generate correct CSV filename', () => {
      const filename = service.getFilename('invoices', '2026-01', 'csv');
      expect(filename).toBe('kgc_szamlak_2026-01.csv');
    });

    it('should generate correct Excel filename', () => {
      const filename = service.getFilename('vat', '2026-Q1', 'xlsx');
      expect(filename).toBe('kgc_afa_2026-Q1.xlsx');
    });
  });
});
