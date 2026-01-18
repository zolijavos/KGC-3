import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuoteAcceptanceService, IQuoteWorksheetRepository, IWorksheet, WorksheetStatus } from './quote-acceptance.service';
import { IQuoteRepository, IAuditService } from './quote.service';
import { IQuote, QuoteStatus } from '../interfaces/quote.interface';

const mockQuoteRepository: IQuoteRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByWorksheetId: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockWorksheetRepository: IQuoteWorksheetRepository = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('QuoteAcceptanceService', () => {
  let service: QuoteAcceptanceService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-2';

  const mockQuote: IQuote = {
    id: 'quote-1',
    tenantId: mockTenantId,
    quoteNumber: 'AJ-2026-0001',
    worksheetId: 'ws-1',
    partnerId: 'partner-1',
    status: QuoteStatus.SENT,
    netTotal: 3000,
    vatAmount: 810,
    grossTotal: 3810,
    validFrom: new Date(),
    validUntil: new Date(),
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockWorksheet: IWorksheet = {
    id: 'ws-1',
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    status: WorksheetStatus.VARHATO,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuoteAcceptanceService(mockQuoteRepository, mockWorksheetRepository, mockAuditService);
  });

  it('should accept a quote and update worksheet status', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuote);
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockQuoteRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockQuote, ...data }),
    );

    const updatedQuote = await service.acceptQuote('quote-1', mockTenantId, mockUserId);

    expect(updatedQuote.status).toBe(QuoteStatus.ACCEPTED);
    expect(mockWorksheetRepository.update).toHaveBeenCalledWith('ws-1', {
      status: WorksheetStatus.FOLYAMATBAN,
    });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'quote_accepted',
        entityType: 'quote',
      }),
    );
  });

  it('should throw an error if the quote is not in SENT status', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockQuote,
      status: QuoteStatus.DRAFT,
    });
    await expect(service.acceptQuote('quote-1', mockTenantId, mockUserId)).rejects.toThrow(
      'Only sent quotes can be accepted',
    );
  });

  it('should throw an error if the quote is not found', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.acceptQuote('quote-1', mockTenantId, mockUserId)).rejects.toThrow('Quote not found');
  });

  it('should throw an error if the worksheet is not found', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuote);
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.acceptQuote('quote-1', mockTenantId, mockUserId)).rejects.toThrow('Worksheet not found');
  });

  it('should throw an error on tenant mismatch', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuote);
    await expect(service.acceptQuote('quote-1', 'other-tenant', mockUserId)).rejects.toThrow('Access denied');
  });

  it('should reject a quote', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuote);
    (mockQuoteRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockQuote, ...data }),
    );

    const rejectedQuote = await service.rejectQuote('quote-1', mockTenantId, mockUserId, 'Too expensive');

    expect(rejectedQuote.status).toBe(QuoteStatus.REJECTED);
    expect(rejectedQuote.responseNote).toBe('Too expensive');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'quote_rejected',
        entityType: 'quote',
      }),
    );
  });

  it('should only allow rejection of SENT quotes', async () => {
    (mockQuoteRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockQuote,
      status: QuoteStatus.ACCEPTED,
    });
    await expect(service.rejectQuote('quote-1', mockTenantId, mockUserId)).rejects.toThrow(
      'Only sent quotes can be rejected',
    );
  });
});
