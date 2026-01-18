import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuoteExportService, IPartnerRepository, IEmailService, IPartner } from './quote-export.service';
import { IQuote, QuoteStatus, QuoteItemType } from '../interfaces/quote.interface';

const mockPartnerRepository: IPartnerRepository = {
  findById: vi.fn(),
};

const mockEmailService: IEmailService = {
  send: vi.fn(),
};

describe('QuoteExportService', () => {
  let service: QuoteExportService;

  const mockQuote: IQuote = {
    id: 'quote-1',
    tenantId: 'tenant-1',
    quoteNumber: 'AJ-2026-0001',
    worksheetId: 'ws-1',
    partnerId: 'partner-1',
    status: QuoteStatus.DRAFT,
    netTotal: 3000,
    vatAmount: 810,
    grossTotal: 3810,
    validFrom: new Date(),
    validUntil: new Date(),
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        quoteId: 'quote-1',
        tenantId: 'tenant-1',
        type: QuoteItemType.PART,
        description: 'Szenkefe',
        quantity: 2,
        unitPrice: 1500,
        discountPercent: 0,
        lineTotal: 3000,
        createdAt: new Date(),
      },
    ],
  };

  const mockPartner: IPartner = {
    id: 'partner-1',
    tenantId: 'tenant-1',
    name: 'Teszt Partner',
    email: 'test@partner.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuoteExportService(mockPartnerRepository, mockEmailService);
    (mockPartnerRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockPartner);
  });

  it('should generate a PDF buffer', async () => {
    const pdfBuffer = await service.generatePdf(mockQuote, 'tenant-1');
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should send an email with the PDF attachment', async () => {
    const pdfBuffer = await service.generatePdf(mockQuote, 'tenant-1');
    await service.sendQuoteByEmail(mockQuote, pdfBuffer, 'test@example.com');
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Arajanlat: AJ-2026-0001',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'arajanlat-AJ-2026-0001.pdf',
          }),
        ]),
      }),
    );
  });

  it('should throw error when partner not found', async () => {
    (mockPartnerRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.generatePdf(mockQuote, 'tenant-1')).rejects.toThrow('Partner not found');
  });

  it('should throw error on tenant mismatch', async () => {
    await expect(service.generatePdf(mockQuote, 'other-tenant')).rejects.toThrow('Access denied');
  });

  it('should throw error on invalid email format', async () => {
    const pdfBuffer = await service.generatePdf(mockQuote, 'tenant-1');
    await expect(service.sendQuoteByEmail(mockQuote, pdfBuffer, 'invalid-email')).rejects.toThrow(
      'Invalid email format',
    );
  });

  it('should include partner name in PDF content', async () => {
    const pdfBuffer = await service.generatePdf(mockQuote, 'tenant-1');
    const content = JSON.parse(pdfBuffer.toString());
    const hasPartnerName = content.content.some(
      (item: { text?: string }) => item.text && item.text.includes('Teszt Partner'),
    );
    expect(hasPartnerName).toBe(true);
  });
});
