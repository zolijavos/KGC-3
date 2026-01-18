/**
 * @kgc/sales-quote - QuoteService
 * Epic 18: Story 18-1 - Arajanlat generalas
 */

import { Injectable } from '@nestjs/common';
import { IQuote, IQuoteCreateResult, QuoteStatus } from '../interfaces/quote.interface';
import { CreateQuoteDto, CreateQuoteSchema } from '../dto/quote.dto';

/** Hungarian VAT rate (27%) - configurable for future extensibility */
const VAT_RATE = 0.27;

export interface IQuoteRepository {
  create(data: Partial<IQuote>): Promise<IQuote>;
  findById(id: string): Promise<IQuote | null>;
  findByWorksheetId(worksheetId: string): Promise<IQuote[]>;
  update(id: string, data: Partial<IQuote>): Promise<IQuote>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
}

export interface IWorksheetRepository {
  findById(id: string): Promise<{ id: string; tenantId: string; partnerId: string } | null>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly worksheetRepository: IWorksheetRepository,
    private readonly auditService: IAuditService,
  ) {}

  async createQuote(
    input: CreateQuoteDto,
    tenantId: string,
    userId: string,
  ): Promise<IQuoteCreateResult> {
    const validationResult = CreateQuoteSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new Error(firstError?.message ?? 'Invalid input');
    }

    const validInput = validationResult.data;

    const worksheet = await this.worksheetRepository.findById(validInput.worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    const year = new Date().getFullYear();
    const sequence = await this.quoteRepository.getNextSequence(tenantId, year);
    const quoteNumber = `AJ-${year}-${sequence.toString().padStart(4, '0')}`;

    let netTotal = 0;
    const items = validInput.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
      netTotal += lineTotal;
      return { ...item, lineTotal };
    });

    const vatAmount = Math.round(netTotal * VAT_RATE);
    const grossTotal = netTotal + vatAmount;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validInput.validityDays);

    const createData: Partial<IQuote> = {
      tenantId,
      quoteNumber,
      worksheetId: validInput.worksheetId,
      partnerId: worksheet.partnerId,
      status: QuoteStatus.DRAFT,
      items: items as IQuote['items'],
      netTotal,
      vatAmount,
      grossTotal,
      validFrom: new Date(),
      validUntil,
      createdBy: userId,
    };
    if (validInput.customerNote) {
      createData.customerNote = validInput.customerNote;
    }
    if (validInput.internalNote) {
      createData.internalNote = validInput.internalNote;
    }

    const quote = await this.quoteRepository.create(createData);

    await this.auditService.log({
      action: 'quote_created',
      entityType: 'quote',
      entityId: quote.id,
      userId,
      tenantId,
      metadata: {
        quoteNumber: quote.quoteNumber,
        worksheetId: quote.worksheetId,
        netTotal: quote.netTotal,
      },
    });

    return { quote, quoteNumber };
  }
}
