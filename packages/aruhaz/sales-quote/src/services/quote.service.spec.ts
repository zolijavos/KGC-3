import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuoteService, IQuoteRepository, IWorksheetRepository, IAuditService } from './quote.service';
import { CreateQuoteDto } from '../dto/quote.dto';
import { QuoteStatus, QuoteItemType } from '../interfaces/quote.interface';

const mockQuoteRepository: IQuoteRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByWorksheetId: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockWorksheetRepository: IWorksheetRepository = {
  findById: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('QuoteService', () => {
  let service: QuoteService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockWorksheetId = '770e8400-e29b-41d4-a716-446655440002';

  const validCreateDto: CreateQuoteDto = {
    worksheetId: mockWorksheetId,
    items: [
      {
        type: QuoteItemType.PART,
        description: 'Szenkefe',
        quantity: 2,
        unitPrice: 1500,
        discountPercent: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuoteService(
      mockQuoteRepository,
      mockWorksheetRepository,
      mockAuditService,
    );
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockWorksheetId,
      tenantId: mockTenantId,
      partnerId: 'partner-1',
    });
    (mockQuoteRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
  });

  it('should create a quote with DRAFT status', async () => {
    (mockQuoteRepository.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (data) => ({ id: 'quote-1', ...data }),
    );
    const { quote } = await service.createQuote(validCreateDto, mockTenantId, mockUserId);
    expect(quote.status).toBe(QuoteStatus.DRAFT);
  });

  it('should calculate totals correctly', async () => {
    (mockQuoteRepository.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (data) => ({ id: 'quote-1', ...data }),
    );
    const { quote } = await service.createQuote(validCreateDto, mockTenantId, mockUserId);
    expect(quote.netTotal).toBe(3000);
    expect(quote.vatAmount).toBe(810);
    expect(quote.grossTotal).toBe(3810);
  });

  it('should generate correct quote number format', async () => {
    (mockQuoteRepository.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (data) => ({ id: 'quote-1', ...data }),
    );
    const { quoteNumber } = await service.createQuote(validCreateDto, mockTenantId, mockUserId);
    const year = new Date().getFullYear();
    expect(quoteNumber).toBe(`AJ-${year}-0001`);
  });

  it('should throw error when worksheet not found', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.createQuote(validCreateDto, mockTenantId, mockUserId)).rejects.toThrow(
      'Munkalap nem talalhato',
    );
  });

  it('should throw error on tenant mismatch', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockWorksheetId,
      tenantId: 'other-tenant',
      partnerId: 'partner-1',
    });
    await expect(service.createQuote(validCreateDto, mockTenantId, mockUserId)).rejects.toThrow(
      'Hozzaferes megtagadva',
    );
  });

  it('should call audit service on creation', async () => {
    (mockQuoteRepository.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (data) => ({ id: 'quote-1', ...data }),
    );
    await service.createQuote(validCreateDto, mockTenantId, mockUserId);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'quote_created',
        entityType: 'quote',
      }),
    );
  });

  it('should apply discount percentage correctly', async () => {
    const dtoWithDiscount: CreateQuoteDto = {
      worksheetId: mockWorksheetId,
      items: [
        {
          type: QuoteItemType.LABOR,
          description: 'Munkadij',
          quantity: 1,
          unitPrice: 10000,
          discountPercent: 20,
        },
      ],
    };
    (mockQuoteRepository.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (data) => ({ id: 'quote-1', ...data }),
    );
    const { quote } = await service.createQuote(dtoWithDiscount, mockTenantId, mockUserId);
    expect(quote.netTotal).toBe(8000);
    expect(quote.vatAmount).toBe(2160);
    expect(quote.grossTotal).toBe(10160);
  });
});
