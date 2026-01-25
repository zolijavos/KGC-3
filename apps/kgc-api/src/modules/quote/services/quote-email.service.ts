/**
 * Quote Email Service
 * Epic 18: Story 18-3 - Arajanlat email kuldes
 *
 * Email kuldes PDF melleklettel
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IQuote } from '../repositories';

/** Email message interface */
export interface IEmailMessage {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: IEmailAttachment[];
}

/** Email attachment interface */
export interface IEmailAttachment {
  filename: string;
  content: Buffer | Uint8Array;
  contentType: string;
}

/** Email service interface for DI */
export interface IEmailService {
  send(message: IEmailMessage): Promise<void>;
}

/** Email service injection token */
export const EMAIL_SERVICE = 'EMAIL_SERVICE';

/** Quote email template options */
export interface QuoteEmailOptions {
  language?: 'hu' | 'en';
  customSubject?: string;
  customBody?: string;
  ccAddresses?: string[];
  includeIntroduction?: boolean;
}

/** Partner info for email */
export interface QuoteEmailPartnerInfo {
  name: string;
  email: string;
  contactPerson?: string;
}

@Injectable()
export class QuoteEmailService {
  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService
  ) {}

  /**
   * Send quote by email with PDF attachment
   */
  async sendQuote(
    quote: IQuote,
    pdfBuffer: Uint8Array | Buffer,
    partner: QuoteEmailPartnerInfo,
    companyName: string,
    options: QuoteEmailOptions = {}
  ): Promise<void> {
    // Validate email
    if (!this.isValidEmail(partner.email)) {
      throw new BadRequestException(`Invalid email address: ${partner.email}`);
    }

    // Build email
    const subject = this.buildSubject(quote, options);
    const html = this.buildHtmlBody(quote, partner, companyName, options);

    // Convert Uint8Array to Buffer if needed
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    const message: IEmailMessage = {
      to: partner.email,
      subject,
      html,
      attachments: [
        {
          filename: `arajanlat-${quote.quoteNumber}.pdf`,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Add CC if specified
    if (options.ccAddresses && options.ccAddresses.length > 0) {
      message.cc = options.ccAddresses.filter(email => this.isValidEmail(email));
    }

    await this.emailService.send(message);
  }

  /**
   * Build email subject line
   */
  private buildSubject(quote: IQuote, options: QuoteEmailOptions): string {
    if (options.customSubject) {
      return options.customSubject;
    }

    return options.language === 'en'
      ? `Quotation: ${quote.quoteNumber}`
      : `Arajanlat: ${quote.quoteNumber}`;
  }

  /**
   * Build HTML email body
   */
  private buildHtmlBody(
    quote: IQuote,
    partner: QuoteEmailPartnerInfo,
    companyName: string,
    options: QuoteEmailOptions
  ): string {
    if (options.customBody) {
      return options.customBody;
    }

    const isEnglish = options.language === 'en';
    const validUntil =
      quote.validUntil instanceof Date
        ? quote.validUntil.toLocaleDateString(isEnglish ? 'en-US' : 'hu-HU')
        : new Date(quote.validUntil).toLocaleDateString(isEnglish ? 'en-US' : 'hu-HU');

    const greeting = partner.contactPerson
      ? isEnglish
        ? `Dear ${partner.contactPerson},`
        : `Tisztelt ${partner.contactPerson}!`
      : isEnglish
        ? 'Dear Customer,'
        : 'Tisztelt Partnerunk!';

    const introduction =
      options.includeIntroduction && quote.introduction
        ? `<p>${this.escapeHtml(quote.introduction)}</p>`
        : '';

    if (isEnglish) {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .quote-info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${companyName}</h2>
  </div>

  <p>${greeting}</p>

  <p>Please find attached our quotation <strong>${quote.quoteNumber}</strong>.</p>

  ${introduction}

  <div class="quote-info">
    <p><strong>Quote Number:</strong> ${quote.quoteNumber}</p>
    <p><strong>Valid Until:</strong> ${validUntil}</p>
    <p><strong>Total Amount:</strong> ${quote.totalAmount.toLocaleString('en-US')} HUF</p>
  </div>

  <p>If you have any questions, please don't hesitate to contact us.</p>

  <p>Best regards,<br>${companyName}</p>

  <div class="footer">
    <p>This email was sent automatically from KGC ERP system.</p>
  </div>
</body>
</html>`;
    }

    // Hungarian version
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .quote-info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${companyName}</h2>
  </div>

  <p>${greeting}</p>

  <p>Mellekeltjuk a <strong>${quote.quoteNumber}</strong> szamu arajanlatunkat.</p>

  ${introduction}

  <div class="quote-info">
    <p><strong>Arajanlat szama:</strong> ${quote.quoteNumber}</p>
    <p><strong>Ervenyes:</strong> ${validUntil}</p>
    <p><strong>Vegosszeg:</strong> ${quote.totalAmount.toLocaleString('hu-HU')} Ft</p>
  </div>

  <p>Kerdes eseten kerem, keressen bennunket bizalommal.</p>

  <p>Udvozlettel,<br>${companyName}</p>

  <div class="footer">
    <p>Ezt az emailt a KGC ERP rendszer kuldte automatikusan.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => htmlEntities[char] ?? char);
  }
}
