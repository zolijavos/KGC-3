/**
 * Számlázz.hu Service Tests
 * Story 11-1: Számlázz.hu API Integráció
 * @package @kgc/nav-online
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import nock from 'nock';
import { SzamlazzhuService } from '../src/services/szamlazz-hu.service';
import type { Invoice, InvoiceStatus, InvoiceType } from '../src/interfaces/invoice.interface';

// Mock invoice for testing
const createMockInvoice = (overrides?: Partial<Invoice>): Invoice => ({
  id: 'test-invoice-id',
  tenantId: 'test-tenant-id',
  internalNumber: 'KGC-2026-00001',
  type: 'CUSTOMER' as InvoiceType,
  status: 'PENDING' as InvoiceStatus,
  partner: {
    id: 'partner-1',
    name: 'Test Partner Kft.',
    zipCode: '1234',
    city: 'Budapest',
    address: 'Test utca 1.',
    taxNumber: '12345678-2-42',
    isCompany: true,
    email: 'test@example.com',
  },
  invoiceDate: new Date('2026-01-15'),
  fulfillmentDate: new Date('2026-01-15'),
  dueDate: new Date('2026-01-23'),
  paymentMethod: 'átutalás',
  netAmount: 10000,
  vatAmount: 2700,
  grossAmount: 12700,
  currency: 'HUF',
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      quantity: 1,
      unit: 'db',
      unitPriceNet: 10000,
      vatRate: '27',
      netAmount: 10000,
      vatAmount: 2700,
      grossAmount: 12700,
    },
  ],
  createdBy: 'user-1',
  ...overrides,
});

describe('SzamlazzhuService', () => {
  let service: SzamlazzhuService;

  beforeEach(() => {
    service = new SzamlazzhuService({
      apiKey: 'test-api-key',
      sandbox: true,
    });

    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createInvoice', () => {
    it('should successfully create an invoice', async () => {
      const successResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <xmlszamlavalasz>
          <sikeres>true</sikeres>
          <szamlaszam>KGC-2026-00001</szamlaszam>
          <kintpizonosito>NAV-123456</kintpizonosito>
        </xmlszamlavalasz>`;

      nock('https://www.szamlazz.hu')
        .post('/szamla/')
        .reply(200, successResponse, { 'Content-Type': 'application/xml' });

      const invoice = createMockInvoice();
      const result = await service.createInvoice(invoice);

      expect(result.success).toBe(true);
      expect(result.invoice?.externalNumber).toBe('KGC-2026-00001');
      expect(result.invoice?.navReference).toBe('NAV-123456');
      expect(result.invoice?.status).toBe('SUCCESS');
    });

    it('should handle API validation errors', async () => {
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <xmlszamlavalasz>
          <sikeres>false</sikeres>
          <hibakod>4</hibakod>
          <hibauzenet>Invalid tax number format</hibauzenet>
        </xmlszamlavalasz>`;

      nock('https://www.szamlazz.hu')
        .post('/szamla/')
        .reply(200, errorResponse, { 'Content-Type': 'application/xml' });

      const invoice = createMockInvoice();
      const result = await service.createInvoice(invoice);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('4');
      expect(result.error?.message).toBe('Invalid tax number format');
      expect(result.error?.retryable).toBe(false);
    });

    it('should handle network timeout errors as retryable', async () => {
      nock('https://www.szamlazz.hu')
        .post('/szamla/')
        .replyWithError({ code: 'ETIMEDOUT' });

      const invoice = createMockInvoice();
      const result = await service.createInvoice(invoice);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle rate limiting as retryable', async () => {
      nock('https://www.szamlazz.hu').post('/szamla/').reply(429, 'Too Many Requests');

      const invoice = createMockInvoice();
      const result = await service.createInvoice(invoice);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('102'); // RATE_LIMIT
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle service unavailable as retryable', async () => {
      nock('https://www.szamlazz.hu').post('/szamla/').reply(503, 'Service Unavailable');

      const invoice = createMockInvoice();
      const result = await service.createInvoice(invoice);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('100'); // SERVICE_UNAVAILABLE
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('cancelInvoice', () => {
    it('should successfully cancel an invoice', async () => {
      const successResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <xmlszamlavalasz>
          <sikeres>true</sikeres>
          <szamlaszam>KGC-2026-00001-STORNO</szamlaszam>
        </xmlszamlavalasz>`;

      nock('https://www.szamlazz.hu')
        .post('/szamla/')
        .reply(200, successResponse, { 'Content-Type': 'application/xml' });

      const invoice = createMockInvoice({
        externalNumber: 'KGC-2026-00001',
      });
      const result = await service.cancelInvoice(invoice);

      expect(result.success).toBe(true);
      expect(result.invoice?.status).toBe('CANCELLED');
    });
  });

  describe('getInvoiceStatus', () => {
    it('should return invoice status', async () => {
      const statusResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <xmlszamlavalasz>
          <sikeres>true</sikeres>
          <szamlaszam>KGC-2026-00001</szamlaszam>
          <navStatus>ACCEPTED</navStatus>
        </xmlszamlavalasz>`;

      nock('https://www.szamlazz.hu')
        .post('/szamla/')
        .reply(200, statusResponse, { 'Content-Type': 'application/xml' });

      const result = await service.getInvoiceStatus('KGC-2026-00001');

      expect(result.success).toBe(true);
      expect(result.szamlaszam).toBe('KGC-2026-00001');
    });
  });

  describe('downloadPdf', () => {
    it('should download PDF successfully', async () => {
      const pdfContent = Buffer.from('%PDF-1.4 mock content');

      nock('https://www.szamlazz.hu')
        .post('/szamla/')
        .reply(200, pdfContent, { 'Content-Type': 'application/pdf' });

      const result = await service.downloadPdf('KGC-2026-00001');

      expect(result).not.toBeNull();
      expect(result?.toString()).toContain('%PDF');
    });

    it('should return null on download failure', async () => {
      nock('https://www.szamlazz.hu').post('/szamla/').reply(404, 'Not Found');

      const result = await service.downloadPdf('INVALID-NUMBER');

      expect(result).toBeNull();
    });
  });

  describe('XML building', () => {
    it('should escape special characters in XML', async () => {
      const successResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <xmlszamlavalasz>
          <sikeres>true</sikeres>
          <szamlaszam>KGC-2026-00001</szamlaszam>
        </xmlszamlavalasz>`;

      let capturedBody = '';
      nock('https://www.szamlazz.hu')
        .post('/szamla/', (body) => {
          capturedBody = body as string;
          return true;
        })
        .reply(200, successResponse, { 'Content-Type': 'application/xml' });

      const invoice = createMockInvoice({
        partner: {
          id: 'partner-1',
          name: 'Test & Partner <Kft.>',
          zipCode: '1234',
          city: 'Budapest',
          address: 'Test "utca" 1.',
          isCompany: true,
        },
        notes: "Special chars: <>&'\"",
      });

      await service.createInvoice(invoice);

      // Check that special characters are escaped
      expect(capturedBody).toContain('&amp;');
      expect(capturedBody).toContain('&lt;');
      expect(capturedBody).toContain('&gt;');
    });
  });
});
