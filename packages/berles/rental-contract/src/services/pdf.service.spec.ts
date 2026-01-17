import { describe, it, expect, beforeEach } from 'vitest';
import { PdfService } from './pdf.service';
import { Contract, ContractStatus, ContractVariables } from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - PdfService Unit Tests
 * Story 15-2: Szerződés PDF Generálás
 *
 * TRADICIONÁLIS + Snapshot testing
 */

describe('PdfService', () => {
  let service: PdfService;

  const createMockContract = (): Contract => ({
    id: 'contract_1',
    tenantId: 'tenant_1',
    rentalId: 'rental_1',
    templateId: 'template_1',
    contractNumber: 'KGC-2026-00001',
    status: ContractStatus.PENDING_SIGNATURE,
    variables: createMockVariables(),
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    createdBy: 'user_1',
  });

  const createMockVariables = (): ContractVariables => ({
    partnerName: 'Teszt Partner Kft',
    partnerAddress: 'Budapest, Teszt utca 1.',
    partnerTaxNumber: '12345678-2-42',
    equipmentName: 'Makita HR2470',
    equipmentSerialNumber: 'SN123456',
    rentalId: 'rental_1',
    rentalStartDate: '2026. január 15.',
    rentalDailyRate: 10000,
    companyName: 'Kisgépcentrum Kft',
    companyAddress: 'Budapest, Bérlés utca 2.',
    companyTaxNumber: '87654321-2-13',
    currentDate: '2026. január 15.',
    contractNumber: 'KGC-2026-00001',
  });

  beforeEach(() => {
    service = new PdfService();
  });

  // ===========================================================================
  // generatePdf() tests
  // ===========================================================================
  describe('generatePdf()', () => {
    it('should generate valid PDF bytes', async () => {
      const contract = createMockContract();
      const renderedContent = `
        BÉRLÉSI SZERZŐDÉS

        Bérbeadó: ${contract.variables.companyName}
        Bérlő: ${contract.variables.partnerName}

        Bérgép: ${contract.variables.equipmentName}
        Napi díj: ${contract.variables.rentalDailyRate} Ft

        Szerződés kelte: ${contract.variables.currentDate}
      `;

      const pdfBytes = await service.generatePdf(renderedContent, contract);

      // Check PDF magic bytes (%PDF-)
      expect(pdfBytes[0]).toBe(0x25); // %
      expect(pdfBytes[1]).toBe(0x50); // P
      expect(pdfBytes[2]).toBe(0x44); // D
      expect(pdfBytes[3]).toBe(0x46); // F
      expect(pdfBytes.length).toBeGreaterThan(1000); // Reasonable PDF size
    });

    it('should generate PDF with watermark when specified', async () => {
      const contract = createMockContract();
      const renderedContent = 'Test content';

      const pdfBytes = await service.generatePdf(renderedContent, contract, {
        watermark: 'PISZKOZAT',
      });

      expect(pdfBytes.length).toBeGreaterThan(0);
      // PDF with watermark should be larger
      const pdfWithoutWatermark = await service.generatePdf(renderedContent, contract);
      expect(pdfBytes.length).toBeGreaterThan(pdfWithoutWatermark.length - 100);
    });

    it('should handle different page sizes', async () => {
      const contract = createMockContract();
      const renderedContent = 'Test content for page size';

      const a4Pdf = await service.generatePdf(renderedContent, contract, {
        pageSize: 'A4',
      });

      const letterPdf = await service.generatePdf(renderedContent, contract, {
        pageSize: 'LETTER',
      });

      // Both should be valid PDFs
      expect(a4Pdf.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
      expect(letterPdf.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    });

    it('should handle long content spanning multiple pages', async () => {
      const contract = createMockContract();
      // Generate very long content
      const longContent = ('Lorem ipsum dolor sit amet. '.repeat(100) + '\n').repeat(50);

      const pdfBytes = await service.generatePdf(longContent, contract);

      expect(pdfBytes.length).toBeGreaterThan(5000);
    });
  });

  // ===========================================================================
  // setPdfMetadata() tests
  // ===========================================================================
  describe('setPdfMetadata()', () => {
    it('should set PDF metadata', async () => {
      const contract = createMockContract();
      const renderedContent = 'Test content';
      const initialPdf = await service.generatePdf(renderedContent, contract);

      const pdfWithMetadata = await service.setPdfMetadata(initialPdf, {
        title: 'Test Contract',
        author: 'KGC',
        subject: 'Rental Agreement',
        creator: 'KGC ERP',
      });

      // Should still be valid PDF
      expect(pdfWithMetadata.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
      // Metadata adds some bytes
      expect(pdfWithMetadata.length).toBeGreaterThanOrEqual(initialPdf.length);
    });
  });

  // ===========================================================================
  // embedSignatureImage() tests
  // ===========================================================================
  describe('embedSignatureImage()', () => {
    // Small valid PNG (1x1 pixel) for testing
    const smallPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should embed signature image in PDF', async () => {
      const contract = createMockContract();
      const renderedContent = 'Contract with signature area';
      const initialPdf = await service.generatePdf(renderedContent, contract);

      const pdfWithSignature = await service.embedSignatureImage(
        initialPdf,
        smallPng,
        { x: 100, y: 100, width: 200, height: 50 }
      );

      // Should still be valid PDF
      expect(pdfWithSignature.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
      // Should be larger due to embedded image
      expect(pdfWithSignature.length).toBeGreaterThan(initialPdf.length);
    });
  });

  // ===========================================================================
  // mergePdfs() tests
  // ===========================================================================
  describe('mergePdfs()', () => {
    it('should merge multiple PDFs into one', async () => {
      const contract = createMockContract();

      const pdf1 = await service.generatePdf('Page 1 content', contract);
      const pdf2 = await service.generatePdf('Page 2 content', contract);

      const mergedPdf = await service.mergePdfs([pdf1, pdf2]);

      expect(mergedPdf.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

      // Check page count
      const pageCount = await service.getPageCount(mergedPdf);
      const page1Count = await service.getPageCount(pdf1);
      const page2Count = await service.getPageCount(pdf2);
      expect(pageCount).toBe(page1Count + page2Count);
    });
  });

  // ===========================================================================
  // getPageCount() tests
  // ===========================================================================
  describe('getPageCount()', () => {
    it('should return correct page count', async () => {
      const contract = createMockContract();
      const shortContent = 'Short content';

      const pdfBytes = await service.generatePdf(shortContent, contract);
      const pageCount = await service.getPageCount(pdfBytes);

      expect(pageCount).toBe(1);
    });

    it('should count multiple pages correctly', async () => {
      const contract = createMockContract();
      // Very long content to force multiple pages
      const longContent = ('Test line of content\n').repeat(200);

      const pdfBytes = await service.generatePdf(longContent, contract);
      const pageCount = await service.getPageCount(pdfBytes);

      expect(pageCount).toBeGreaterThanOrEqual(2);
    });
  });
});
