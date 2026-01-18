/**
 * @kgc/sales-quote - QuoteAcceptanceService
 * Epic 18: Story 18-4 - Arajanlat Elfogadas -> Munkalap
 */

import { Injectable } from '@nestjs/common';
import { IQuote, QuoteStatus } from '../interfaces/quote.interface';
import { IQuoteRepository, IAuditService } from './quote.service';

export enum WorksheetStatus {
  FELVETT = 'FELVETT',
  VARHATO = 'VARHATO',
  FOLYAMATBAN = 'FOLYAMATBAN',
  KESZ = 'KESZ',
  KIADVA = 'KIADVA',
}

export interface IWorksheet {
  id: string;
  tenantId: string;
  worksheetNumber: string;
  status: WorksheetStatus;
}

export interface IQuoteWorksheetRepository {
  findById(id: string): Promise<IWorksheet | null>;
  update(id: string, data: Partial<IWorksheet>): Promise<IWorksheet>;
}

@Injectable()
export class QuoteAcceptanceService {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly worksheetRepository: IQuoteWorksheetRepository,
    private readonly auditService: IAuditService,
  ) {}

  async acceptQuote(quoteId: string, tenantId: string, userId: string): Promise<IQuote> {
    const quote = await this.quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }
    if (quote.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (quote.status !== QuoteStatus.SENT) {
      throw new Error('Only sent quotes can be accepted');
    }

    const worksheet = await this.worksheetRepository.findById(quote.worksheetId);
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }

    const updatedQuote = await this.quoteRepository.update(quote.id, {
      status: QuoteStatus.ACCEPTED,
      respondedAt: new Date(),
      responseNote: `Elfogadva ${userId} altal`,
    });

    await this.worksheetRepository.update(worksheet.id, {
      status: WorksheetStatus.FOLYAMATBAN,
    });

    await this.auditService.log({
      action: 'quote_accepted',
      entityType: 'quote',
      entityId: quote.id,
      userId,
      tenantId,
      metadata: {
        quoteNumber: quote.quoteNumber,
        worksheetId: quote.worksheetId,
      },
    });

    return updatedQuote;
  }

  async rejectQuote(quoteId: string, tenantId: string, userId: string, reason?: string): Promise<IQuote> {
    const quote = await this.quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }
    if (quote.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (quote.status !== QuoteStatus.SENT) {
      throw new Error('Only sent quotes can be rejected');
    }

    const updatedQuote = await this.quoteRepository.update(quote.id, {
      status: QuoteStatus.REJECTED,
      respondedAt: new Date(),
      responseNote: reason ?? `Elutasitva ${userId} altal`,
    });

    await this.auditService.log({
      action: 'quote_rejected',
      entityType: 'quote',
      entityId: quote.id,
      userId,
      tenantId,
      metadata: {
        quoteNumber: quote.quoteNumber,
        reason: reason ?? 'No reason provided',
      },
    });

    return updatedQuote;
  }
}
