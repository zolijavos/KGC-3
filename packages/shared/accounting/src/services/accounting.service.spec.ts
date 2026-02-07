/**
 * @kgc/accounting - AccountingService Tests
 * Story 43-1: Könyvelői API végpontok
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  AccountingService,
  InvoiceQueryDto,
  TransactionQueryDto,
  VatBreakdown,
  VatSummaryQueryDto,
} from './accounting.service';

describe('AccountingService', () => {
  let service: AccountingService;

  beforeEach(() => {
    service = new AccountingService();
  });

  describe('getInvoices', () => {
    it('should return invoices for a given month', async () => {
      const query: InvoiceQueryDto = {
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      };

      const result = await service.getInvoices(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.invoices)).toBe(true);
    });

    it('should return invoice with required fields', async () => {
      // Add test invoice
      service.addInvoiceForTest({
        id: 'inv-1',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'partner-1',
        partnerName: 'Test Partner Kft.',
        partnerTaxNumber: '12345678-2-42',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      const query: InvoiceQueryDto = {
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      };

      const result = await service.getInvoices(query);

      expect(result.invoices).toHaveLength(1);
      const invoice = result.invoices[0];
      expect(invoice?.invoiceNumber).toBe('KGC-2026-00001');
      expect(invoice?.netAmount).toBe(100000);
      expect(invoice?.vatAmount).toBe(27000);
      expect(invoice?.grossAmount).toBe(127000);
      expect(invoice?.partnerName).toBe('Test Partner Kft.');
    });

    it('should filter invoices by tenant', async () => {
      service.addInvoiceForTest({
        id: 'inv-1',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 50000,
        vatAmount: 13500,
        grossAmount: 63500,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      service.addInvoiceForTest({
        id: 'inv-2',
        tenantId: 'tenant-2',
        invoiceNumber: 'OTHER-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'partner-2',
        partnerName: 'Partner 2',
        partnerTaxNumber: '22222222-2-22',
        netAmount: 80000,
        vatAmount: 21600,
        grossAmount: 101600,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      const result = await service.getInvoices({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0]?.tenantId).toBe('tenant-1');
    });

    it('should filter invoices by date range', async () => {
      service.addInvoiceForTest({
        id: 'inv-jan',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'p-1',
        partnerName: 'Partner',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 10000,
        vatAmount: 2700,
        grossAmount: 12700,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      service.addInvoiceForTest({
        id: 'inv-feb',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00002',
        issueDate: new Date('2026-02-15'),
        partnerId: 'p-1',
        partnerName: 'Partner',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 20000,
        vatAmount: 5400,
        grossAmount: 25400,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      const result = await service.getInvoices({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0]?.invoiceNumber).toBe('KGC-2026-00001');
    });

    it('should include totals in response', async () => {
      service.addInvoiceForTest({
        id: 'inv-1',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-10'),
        partnerId: 'p-1',
        partnerName: 'Partner',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      service.addInvoiceForTest({
        id: 'inv-2',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00002',
        issueDate: new Date('2026-01-20'),
        partnerId: 'p-2',
        partnerName: 'Partner 2',
        partnerTaxNumber: '22222222-2-22',
        netAmount: 50000,
        vatAmount: 13500,
        grossAmount: 63500,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      const result = await service.getInvoices({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result.totals.totalNet).toBe(150000);
      expect(result.totals.totalVat).toBe(40500);
      expect(result.totals.totalGross).toBe(190500);
      expect(result.totals.count).toBe(2);
    });
  });

  describe('getTransactions', () => {
    it('should return transactions for a given period', async () => {
      const query: TransactionQueryDto = {
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      };

      const result = await service.getTransactions(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
    });

    it('should return transaction with type and amount', async () => {
      service.addTransactionForTest({
        id: 'tx-1',
        tenantId: 'tenant-1',
        type: 'DEPOSIT_IN',
        amount: 50000,
        currency: 'HUF',
        date: new Date('2026-01-15'),
        description: 'Kaució bevétel - Bérlés #R-2026-001',
        referenceId: 'rental-1',
        referenceType: 'RENTAL',
      });

      const result = await service.getTransactions({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result.transactions).toHaveLength(1);
      const tx = result.transactions[0];
      expect(tx?.type).toBe('DEPOSIT_IN');
      expect(tx?.amount).toBe(50000);
      expect(tx?.description).toContain('Kaució bevétel');
    });

    it('should categorize deposit in and out transactions', async () => {
      service.addTransactionForTest({
        id: 'tx-in',
        tenantId: 'tenant-1',
        type: 'DEPOSIT_IN',
        amount: 50000,
        currency: 'HUF',
        date: new Date('2026-01-10'),
        description: 'Kaució bevétel',
        referenceId: 'rental-1',
        referenceType: 'RENTAL',
      });

      service.addTransactionForTest({
        id: 'tx-out',
        tenantId: 'tenant-1',
        type: 'DEPOSIT_OUT',
        amount: 50000,
        currency: 'HUF',
        date: new Date('2026-01-20'),
        description: 'Kaució visszautalás',
        referenceId: 'rental-1',
        referenceType: 'RENTAL',
      });

      const result = await service.getTransactions({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result.summary.depositIn).toBe(50000);
      expect(result.summary.depositOut).toBe(50000);
    });

    it('should include invoice payment transactions', async () => {
      service.addTransactionForTest({
        id: 'tx-payment',
        tenantId: 'tenant-1',
        type: 'INVOICE_PAYMENT',
        amount: 127000,
        currency: 'HUF',
        date: new Date('2026-01-15'),
        description: 'Számla befizetés - KGC-2026-00001',
        referenceId: 'inv-1',
        referenceType: 'INVOICE',
      });

      const result = await service.getTransactions({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]?.type).toBe('INVOICE_PAYMENT');
      expect(result.summary.invoicePayments).toBe(127000);
    });

    it('should filter transactions by type', async () => {
      service.addTransactionForTest({
        id: 'tx-1',
        tenantId: 'tenant-1',
        type: 'DEPOSIT_IN',
        amount: 50000,
        currency: 'HUF',
        date: new Date('2026-01-10'),
        description: 'Kaució',
        referenceId: 'r-1',
        referenceType: 'RENTAL',
      });

      service.addTransactionForTest({
        id: 'tx-2',
        tenantId: 'tenant-1',
        type: 'INVOICE_PAYMENT',
        amount: 100000,
        currency: 'HUF',
        date: new Date('2026-01-15'),
        description: 'Számla',
        referenceId: 'i-1',
        referenceType: 'INVOICE',
      });

      const result = await service.getTransactions({
        tenantId: 'tenant-1',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
        type: 'DEPOSIT_IN',
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]?.type).toBe('DEPOSIT_IN');
    });
  });

  describe('getVatSummary', () => {
    it('should return VAT summary for a given month', async () => {
      const query: VatSummaryQueryDto = {
        tenantId: 'tenant-1',
        month: '2026-01',
      };

      const result = await service.getVatSummary(query);

      expect(result).toBeDefined();
      expect(result.month).toBe('2026-01');
      expect(Array.isArray(result.breakdown)).toBe(true);
    });

    it('should break down VAT by rate', async () => {
      service.addInvoiceForTest({
        id: 'inv-27',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'p-1',
        partnerName: 'Partner',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      service.addInvoiceForTest({
        id: 'inv-5',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00002',
        issueDate: new Date('2026-01-20'),
        partnerId: 'p-2',
        partnerName: 'Partner 2',
        partnerTaxNumber: '22222222-2-22',
        netAmount: 50000,
        vatAmount: 2500,
        grossAmount: 52500,
        vatRate: 5,
        currency: 'HUF',
        status: 'PAID',
      });

      const result = await service.getVatSummary({
        tenantId: 'tenant-1',
        month: '2026-01',
      });

      expect(result.breakdown).toHaveLength(2);

      const vat27 = result.breakdown.find((b: VatBreakdown) => b.vatRate === 27);
      expect(vat27?.netAmount).toBe(100000);
      expect(vat27?.vatAmount).toBe(27000);
      expect(vat27?.grossAmount).toBe(127000);

      const vat5 = result.breakdown.find((b: VatBreakdown) => b.vatRate === 5);
      expect(vat5?.netAmount).toBe(50000);
      expect(vat5?.vatAmount).toBe(2500);
      expect(vat5?.grossAmount).toBe(52500);
    });

    it('should include totals in VAT summary', async () => {
      service.addInvoiceForTest({
        id: 'inv-1',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-10'),
        partnerId: 'p-1',
        partnerName: 'Partner',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      service.addInvoiceForTest({
        id: 'inv-2',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00002',
        issueDate: new Date('2026-01-20'),
        partnerId: 'p-2',
        partnerName: 'Partner 2',
        partnerTaxNumber: '22222222-2-22',
        netAmount: 50000,
        vatAmount: 2500,
        grossAmount: 52500,
        vatRate: 5,
        currency: 'HUF',
        status: 'PAID',
      });

      const result = await service.getVatSummary({
        tenantId: 'tenant-1',
        month: '2026-01',
      });

      expect(result.totals.totalNet).toBe(150000);
      expect(result.totals.totalVat).toBe(29500);
      expect(result.totals.totalGross).toBe(179500);
    });

    it('should filter by tenant', async () => {
      service.addInvoiceForTest({
        id: 'inv-t1',
        tenantId: 'tenant-1',
        invoiceNumber: 'KGC-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'p-1',
        partnerName: 'Partner',
        partnerTaxNumber: '11111111-1-11',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      service.addInvoiceForTest({
        id: 'inv-t2',
        tenantId: 'tenant-2',
        invoiceNumber: 'OTHER-2026-00001',
        issueDate: new Date('2026-01-15'),
        partnerId: 'p-2',
        partnerName: 'Other Partner',
        partnerTaxNumber: '22222222-2-22',
        netAmount: 200000,
        vatAmount: 54000,
        grossAmount: 254000,
        vatRate: 27,
        currency: 'HUF',
        status: 'PAID',
      });

      const result = await service.getVatSummary({
        tenantId: 'tenant-1',
        month: '2026-01',
      });

      expect(result.totals.totalNet).toBe(100000);
    });
  });

  describe('API key validation', () => {
    it('should validate API key format', () => {
      const validKey = 'kgc_acc_1234567890abcdef';
      const invalidKey = 'invalid-key';

      expect(service.isValidApiKeyFormat(validKey)).toBe(true);
      expect(service.isValidApiKeyFormat(invalidKey)).toBe(false);
    });

    it('should check API key has accounting scope', async () => {
      service.registerApiKey({
        key: 'kgc_acc_valid12345',
        tenantId: 'tenant-1',
        scopes: ['accounting:read'],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.validateApiKey('kgc_acc_valid12345');

      expect(result.valid).toBe(true);
      expect(result.tenantId).toBe('tenant-1');
      expect(result.scopes).toContain('accounting:read');
    });
  });
});
