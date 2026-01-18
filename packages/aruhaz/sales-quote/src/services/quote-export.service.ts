/**
 * @kgc/sales-quote - QuoteExportService
 * Epic 18: Story 18-3 - Arajanlat PDF es Email
 */

import { Injectable } from '@nestjs/common';
import { IQuote } from '../interfaces/quote.interface';

export interface IPartner {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
}

export interface IPartnerRepository {
  findById(id: string): Promise<IPartner | null>;
}

export interface IEmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface IEmailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: IEmailAttachment[];
}

export interface IEmailService {
  send(message: IEmailMessage): Promise<void>;
}

@Injectable()
export class QuoteExportService {
  constructor(
    private readonly partnerRepository: IPartnerRepository,
    private readonly emailService: IEmailService,
  ) {}

  async generatePdf(quote: IQuote, tenantId: string): Promise<Buffer> {
    const partner = await this.partnerRepository.findById(quote.partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }
    if (partner.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const docDefinition = {
      content: [
        { text: 'Arajanlat', style: 'header' },
        { text: `Arajanlat szama: ${quote.quoteNumber}` },
        { text: `Kelt: ${quote.createdAt.toLocaleDateString()}` },
        { text: `Ervenyes: ${quote.validUntil.toLocaleDateString()}` },
        { text: `Partner: ${partner.name}` },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              ['Megnevezes', 'Mennyiseg', 'Egysegar', 'Osszesen'],
              ...quote.items.map((item) => [
                item.description,
                item.quantity,
                `${item.unitPrice} Ft`,
                `${item.lineTotal} Ft`,
              ]),
            ],
          },
        },
        { text: `Netto osszesen: ${quote.netTotal} Ft` },
        { text: `AFA (27%): ${quote.vatAmount} Ft` },
        { text: `Brutto osszesen: ${quote.grossTotal} Ft`, style: 'total' },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        total: { fontSize: 14, bold: true },
      },
    };

    return Buffer.from(JSON.stringify(docDefinition));
  }

  async sendQuoteByEmail(quote: IQuote, pdfBuffer: Buffer, recipientEmail: string): Promise<void> {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error('Invalid email format');
    }

    await this.emailService.send({
      to: recipientEmail,
      subject: `Arajanlat: ${quote.quoteNumber}`,
      html: `<p>Tisztelt Partnerunk!</p><p>Mellekelten kuldjuk a ${quote.quoteNumber} szamu arajanlatot.</p>`,
      attachments: [
        {
          filename: `arajanlat-${quote.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
