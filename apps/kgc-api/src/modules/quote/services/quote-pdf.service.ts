/**
 * Quote PDF Service
 * Epic 18: Story 18-3 - Arajanlat PDF generalas
 *
 * Valodi PDF generalas pdf-lib hasznalataval
 * Magyar ekezetkezelés ASCII megfelelokkel (pdf-lib korlatozas)
 */

import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

// Quote interfaces - reuse from repositories
import { IQuote, IQuoteItem } from '../repositories';

/** PDF generation options */
export interface QuotePdfOptions {
  includeTerms?: boolean;
  includeLogo?: boolean;
  watermark?: string;
  language?: 'hu' | 'en';
}

/** Partner info for PDF */
export interface QuotePartnerInfo {
  name: string;
  address?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
}

/** Company info for PDF header */
export interface QuoteCompanyInfo {
  name: string;
  address: string;
  taxNumber: string;
  phone?: string;
  email?: string;
  website?: string;
}

/** A4 page dimensions in points */
const PAGE_SIZE = { width: 595.28, height: 841.89 };
const MARGINS = { top: 60, right: 50, bottom: 60, left: 50 };
const LINE_HEIGHT = 14;
const FONT_SIZE = { title: 18, header: 12, body: 10, small: 8 };

@Injectable()
export class QuotePdfService {
  /**
   * Generate PDF for a quote
   */
  async generatePdf(
    quote: IQuote,
    items: IQuoteItem[],
    partner: QuotePartnerInfo,
    company: QuoteCompanyInfo,
    options: QuotePdfOptions = {}
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
    let yPosition = PAGE_SIZE.height - MARGINS.top;

    // Watermark if specified
    if (options.watermark) {
      this.addWatermark(page, font, options.watermark);
    }

    // Header - Company info
    yPosition = this.drawCompanyHeader(page, boldFont, font, company, yPosition);

    // Title
    yPosition -= 30;
    const title = options.language === 'en' ? 'QUOTATION' : 'ARAJANLAT';
    page.drawText(title, {
      x: PAGE_SIZE.width / 2 - boldFont.widthOfTextAtSize(title, FONT_SIZE.title) / 2,
      y: yPosition,
      size: FONT_SIZE.title,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Quote number and dates
    yPosition -= 30;
    yPosition = this.drawQuoteInfo(page, boldFont, font, quote, yPosition, options.language);

    // Partner info
    yPosition -= 20;
    yPosition = this.drawPartnerInfo(page, boldFont, font, partner, yPosition, options.language);

    // Line separator
    yPosition -= 15;
    page.drawLine({
      start: { x: MARGINS.left, y: yPosition },
      end: { x: PAGE_SIZE.width - MARGINS.right, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Items table
    yPosition -= 20;
    const tableResult = this.drawItemsTable(
      pdfDoc,
      page,
      boldFont,
      font,
      items,
      yPosition,
      options.language
    );
    page = tableResult.page;
    yPosition = tableResult.yPosition;

    // Totals
    yPosition -= 20;
    yPosition = this.drawTotals(page, boldFont, font, quote, yPosition, options.language);

    // Terms and notes
    if (options.includeTerms && (quote.terms || quote.introduction)) {
      yPosition -= 30;

      // Check if we need a new page
      if (yPosition < MARGINS.bottom + 100) {
        page = pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
        yPosition = PAGE_SIZE.height - MARGINS.top;
        if (options.watermark) {
          this.addWatermark(page, font, options.watermark);
        }
      }

      yPosition = this.drawTermsAndNotes(page, boldFont, font, quote, yPosition, options.language);
    }

    // Footer
    this.drawFooter(page, font, pdfDoc.getPageCount());

    // Set metadata
    pdfDoc.setTitle(`${options.language === 'en' ? 'Quote' : 'Arajanlat'} ${quote.quoteNumber}`);
    pdfDoc.setAuthor(company.name);
    pdfDoc.setSubject(`Quote for ${partner.name}`);
    pdfDoc.setCreator('KGC ERP v7.0');
    pdfDoc.setCreationDate(new Date());

    return pdfDoc.save();
  }

  /**
   * Sanitize Hungarian characters for pdf-lib standard fonts
   */
  private sanitize(text: string): string {
    const charMap: Record<string, string> = {
      á: 'a',
      Á: 'A',
      é: 'e',
      É: 'E',
      í: 'i',
      Í: 'I',
      ó: 'o',
      Ó: 'O',
      ö: 'o',
      Ö: 'O',
      ő: 'o',
      Ő: 'O',
      ú: 'u',
      Ú: 'U',
      ü: 'u',
      Ü: 'U',
      ű: 'u',
      Ű: 'U',
    };
    return text
      .split('')
      .map(char => charMap[char] ?? char)
      .join('');
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number, language?: string): string {
    if (language === 'en') {
      return `${amount.toLocaleString('en-US')} HUF`;
    }
    return `${amount.toLocaleString('hu-HU')} Ft`;
  }

  /**
   * Draw company header
   */
  private drawCompanyHeader(
    page: PDFPage,
    boldFont: PDFFont,
    font: PDFFont,
    company: QuoteCompanyInfo,
    yPosition: number
  ): number {
    const sanitizedName = this.sanitize(company.name);
    page.drawText(sanitizedName, {
      x: MARGINS.left,
      y: yPosition,
      size: FONT_SIZE.header,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= LINE_HEIGHT;
    page.drawText(this.sanitize(company.address), {
      x: MARGINS.left,
      y: yPosition,
      size: FONT_SIZE.small,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= LINE_HEIGHT;
    page.drawText(`Adoszam: ${company.taxNumber}`, {
      x: MARGINS.left,
      y: yPosition,
      size: FONT_SIZE.small,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    if (company.phone || company.email) {
      yPosition -= LINE_HEIGHT;
      const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
      page.drawText(contactInfo, {
        x: MARGINS.left,
        y: yPosition,
        size: FONT_SIZE.small,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    return yPosition;
  }

  /**
   * Draw quote info (number, dates)
   */
  private drawQuoteInfo(
    page: PDFPage,
    boldFont: PDFFont,
    font: PDFFont,
    quote: IQuote,
    yPosition: number,
    language?: string
  ): number {
    const labels =
      language === 'en'
        ? { number: 'Quote No:', date: 'Date:', validUntil: 'Valid Until:' }
        : { number: 'Arajanlat szama:', date: 'Kelt:', validUntil: 'Ervenyes:' };

    // Quote number
    page.drawText(`${labels.number} ${quote.quoteNumber}`, {
      x: PAGE_SIZE.width - MARGINS.right - 150,
      y: yPosition,
      size: FONT_SIZE.body,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Created date
    yPosition -= LINE_HEIGHT;
    const createdDate =
      quote.createdAt instanceof Date
        ? quote.createdAt.toLocaleDateString('hu-HU')
        : new Date(quote.createdAt).toLocaleDateString('hu-HU');
    page.drawText(`${labels.date} ${createdDate}`, {
      x: PAGE_SIZE.width - MARGINS.right - 150,
      y: yPosition,
      size: FONT_SIZE.small,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Valid until
    yPosition -= LINE_HEIGHT;
    const validDate =
      quote.validUntil instanceof Date
        ? quote.validUntil.toLocaleDateString('hu-HU')
        : new Date(quote.validUntil).toLocaleDateString('hu-HU');
    page.drawText(`${labels.validUntil} ${validDate}`, {
      x: PAGE_SIZE.width - MARGINS.right - 150,
      y: yPosition,
      size: FONT_SIZE.small,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    return yPosition;
  }

  /**
   * Draw partner info
   */
  private drawPartnerInfo(
    page: PDFPage,
    boldFont: PDFFont,
    font: PDFFont,
    partner: QuotePartnerInfo,
    yPosition: number,
    language?: string
  ): number {
    const label = language === 'en' ? 'Customer:' : 'Partner:';

    page.drawText(label, {
      x: MARGINS.left,
      y: yPosition,
      size: FONT_SIZE.body,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= LINE_HEIGHT;
    page.drawText(this.sanitize(partner.name), {
      x: MARGINS.left,
      y: yPosition,
      size: FONT_SIZE.body,
      font: font,
      color: rgb(0, 0, 0),
    });

    if (partner.address) {
      yPosition -= LINE_HEIGHT;
      page.drawText(this.sanitize(partner.address), {
        x: MARGINS.left,
        y: yPosition,
        size: FONT_SIZE.small,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    if (partner.taxNumber) {
      yPosition -= LINE_HEIGHT;
      page.drawText(`Adoszam: ${partner.taxNumber}`, {
        x: MARGINS.left,
        y: yPosition,
        size: FONT_SIZE.small,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    return yPosition;
  }

  /**
   * Draw items table
   */
  private drawItemsTable(
    pdfDoc: PDFDocument,
    page: PDFPage,
    boldFont: PDFFont,
    font: PDFFont,
    items: IQuoteItem[],
    yPosition: number,
    language?: string
  ): { page: PDFPage; yPosition: number } {
    const headers =
      language === 'en'
        ? ['Description', 'Qty', 'Unit', 'Unit Price', 'Total']
        : ['Megnevezes', 'Menny.', 'Egys.', 'Egysegar', 'Osszesen'];

    // Column X positions (widths: 220, 40, 40, 80, 80)
    const colX = [
      MARGINS.left,
      MARGINS.left + 220,
      MARGINS.left + 260,
      MARGINS.left + 300,
      MARGINS.left + 380,
    ];

    // Table header background
    page.drawRectangle({
      x: MARGINS.left - 5,
      y: yPosition - 5,
      width: PAGE_SIZE.width - MARGINS.left - MARGINS.right + 10,
      height: LINE_HEIGHT + 6,
      color: rgb(0.95, 0.95, 0.95),
    });

    // Header row
    headers.forEach((header, i) => {
      const x = colX[i];
      if (x !== undefined) {
        page.drawText(header, {
          x,
          y: yPosition,
          size: FONT_SIZE.small,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
      }
    });

    yPosition -= LINE_HEIGHT + 8;

    // Item rows
    for (const item of items) {
      // Check for page break
      if (yPosition < MARGINS.bottom + 50) {
        this.drawFooter(page, font, pdfDoc.getPageCount());
        page = pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
        yPosition = PAGE_SIZE.height - MARGINS.top;
      }

      // Description (may need wrapping)
      const description = this.sanitize(item.description);
      const truncatedDesc =
        description.length > 40 ? description.substring(0, 37) + '...' : description;

      const rowData = [
        truncatedDesc,
        item.quantity.toString(),
        item.unit,
        this.formatCurrency(item.unitPrice, language),
        this.formatCurrency(item.totalPrice, language),
      ];

      rowData.forEach((text, i) => {
        const x = colX[i];
        if (x !== undefined) {
          page.drawText(text, {
            x,
            y: yPosition,
            size: FONT_SIZE.small,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
      });

      yPosition -= LINE_HEIGHT + 4;
    }

    // Bottom line
    page.drawLine({
      start: { x: MARGINS.left, y: yPosition + 2 },
      end: { x: PAGE_SIZE.width - MARGINS.right, y: yPosition + 2 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    return { page, yPosition };
  }

  /**
   * Draw totals section
   */
  private drawTotals(
    page: PDFPage,
    boldFont: PDFFont,
    font: PDFFont,
    quote: IQuote,
    yPosition: number,
    language?: string
  ): number {
    const labels =
      language === 'en'
        ? { subtotal: 'Subtotal:', vat: 'VAT (27%):', total: 'Grand Total:' }
        : { subtotal: 'Netto osszesen:', vat: 'AFA (27%):', total: 'Brutto osszesen:' };

    const rightX = PAGE_SIZE.width - MARGINS.right - 100;
    const valueX = PAGE_SIZE.width - MARGINS.right - 10;

    // Subtotal
    page.drawText(labels.subtotal, { x: rightX, y: yPosition, size: FONT_SIZE.body, font: font });
    const subtotalText = this.formatCurrency(quote.subtotal, language);
    page.drawText(subtotalText, {
      x: valueX - font.widthOfTextAtSize(subtotalText, FONT_SIZE.body),
      y: yPosition,
      size: FONT_SIZE.body,
      font: font,
    });

    // VAT
    yPosition -= LINE_HEIGHT;
    page.drawText(labels.vat, { x: rightX, y: yPosition, size: FONT_SIZE.body, font: font });
    const vatText = this.formatCurrency(quote.vatAmount, language);
    page.drawText(vatText, {
      x: valueX - font.widthOfTextAtSize(vatText, FONT_SIZE.body),
      y: yPosition,
      size: FONT_SIZE.body,
      font: font,
    });

    // Total (bold)
    yPosition -= LINE_HEIGHT + 5;
    page.drawText(labels.total, {
      x: rightX,
      y: yPosition,
      size: FONT_SIZE.header,
      font: boldFont,
    });
    const totalText = this.formatCurrency(quote.totalAmount, language);
    page.drawText(totalText, {
      x: valueX - boldFont.widthOfTextAtSize(totalText, FONT_SIZE.header),
      y: yPosition,
      size: FONT_SIZE.header,
      font: boldFont,
    });

    return yPosition;
  }

  /**
   * Draw terms and notes
   */
  private drawTermsAndNotes(
    page: PDFPage,
    boldFont: PDFFont,
    font: PDFFont,
    quote: IQuote,
    yPosition: number,
    language?: string
  ): number {
    if (quote.introduction) {
      const label = language === 'en' ? 'Introduction:' : 'Bevezeto:';
      page.drawText(label, { x: MARGINS.left, y: yPosition, size: FONT_SIZE.body, font: boldFont });
      yPosition -= LINE_HEIGHT;

      const introLines = this.wrapText(this.sanitize(quote.introduction), font, FONT_SIZE.small);
      for (const line of introLines) {
        page.drawText(line, { x: MARGINS.left, y: yPosition, size: FONT_SIZE.small, font: font });
        yPosition -= LINE_HEIGHT;
      }
    }

    if (quote.terms) {
      yPosition -= LINE_HEIGHT;
      const label = language === 'en' ? 'Terms & Conditions:' : 'Feltetelek:';
      page.drawText(label, { x: MARGINS.left, y: yPosition, size: FONT_SIZE.body, font: boldFont });
      yPosition -= LINE_HEIGHT;

      const termsLines = this.wrapText(this.sanitize(quote.terms), font, FONT_SIZE.small);
      for (const line of termsLines) {
        page.drawText(line, { x: MARGINS.left, y: yPosition, size: FONT_SIZE.small, font: font });
        yPosition -= LINE_HEIGHT;
      }
    }

    return yPosition;
  }

  /**
   * Draw footer with page number
   */
  private drawFooter(page: PDFPage, font: PDFFont, pageNumber: number): void {
    const text = `${pageNumber}. oldal`;
    page.drawText(text, {
      x: PAGE_SIZE.width / 2 - font.widthOfTextAtSize(text, FONT_SIZE.small) / 2,
      y: MARGINS.bottom - 30,
      size: FONT_SIZE.small,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Generated by
    const generatedText = 'KGC ERP v7.0';
    page.drawText(generatedText, {
      x: PAGE_SIZE.width - MARGINS.right - font.widthOfTextAtSize(generatedText, FONT_SIZE.small),
      y: MARGINS.bottom - 30,
      size: FONT_SIZE.small,
      font: font,
      color: rgb(0.7, 0.7, 0.7),
    });
  }

  /**
   * Add watermark
   */
  private addWatermark(page: PDFPage, font: PDFFont, text: string): void {
    page.drawText(this.sanitize(text), {
      x: PAGE_SIZE.width / 2 - 80,
      y: PAGE_SIZE.height / 2,
      size: 50,
      font: font,
      color: rgb(0.9, 0.9, 0.9),
      opacity: 0.3,
    });
  }

  /**
   * Wrap text to fit width
   */
  private wrapText(text: string, font: PDFFont, fontSize: number): string[] {
    const maxWidth = PAGE_SIZE.width - MARGINS.left - MARGINS.right;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
