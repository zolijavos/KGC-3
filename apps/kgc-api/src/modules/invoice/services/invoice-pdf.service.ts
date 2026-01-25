/**
 * Invoice PDF Service
 * Story 10-3: Számla PDF Generálás
 *
 * Generates PDF documents for invoices using a template-based approach.
 * Integration-ready for external PDF generation services (e.g., puppeteer, pdfkit).
 */

import type { IInvoice, IInvoiceItem } from '@kgc/sales-invoice';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * PDF generation options
 */
export interface PdfGenerationOptions {
  /** Include company logo */
  includeLogo?: boolean;
  /** Include QR code for payment */
  includeQrCode?: boolean;
  /** Paper size (A4, Letter) */
  paperSize?: 'A4' | 'Letter';
  /** Language for labels */
  language?: 'hu' | 'en';
  /** Include duplicate watermark */
  isDuplicate?: boolean;
}

/**
 * PDF generation result
 */
export interface PdfGenerationResult {
  /** PDF binary data */
  buffer: Buffer;
  /** Generated filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * Company information for PDF header
 */
export interface CompanyInfo {
  name: string;
  address: string;
  taxNumber: string;
  bankAccount?: string;
  phone?: string;
  email?: string;
  logo?: Buffer;
}

/**
 * Invoice PDF Service
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  // Hungarian labels
  private readonly labels = {
    hu: {
      invoice: 'SZÁMLA',
      proforma: 'DÍJBEKÉRŐ',
      storno: 'SZTORNÓ SZÁMLA',
      invoiceNumber: 'Számlaszám',
      issueDate: 'Kiállítás dátuma',
      deliveryDate: 'Teljesítés dátuma',
      dueDate: 'Fizetési határidő',
      paymentMethod: 'Fizetési mód',
      seller: 'Eladó',
      buyer: 'Vevő',
      taxNumber: 'Adószám',
      itemNo: 'Ssz.',
      description: 'Megnevezés',
      quantity: 'Mennyiség',
      unit: 'Egység',
      unitPrice: 'Egységár',
      vatRate: 'ÁFA %',
      netAmount: 'Nettó',
      vatAmount: 'ÁFA',
      grossAmount: 'Bruttó',
      subtotal: 'Részösszeg',
      total: 'Összesen',
      totalToPay: 'Fizetendő',
      paidAmount: 'Befizetett',
      remaining: 'Még fizetendő',
      notes: 'Megjegyzés',
      duplicate: 'MÁSOLAT',
      cash: 'Készpénz',
      card: 'Bankkártya',
      transfer: 'Átutalás',
      createdBy: 'Kiállította',
    },
    en: {
      invoice: 'INVOICE',
      proforma: 'PROFORMA INVOICE',
      storno: 'CANCELLATION INVOICE',
      invoiceNumber: 'Invoice Number',
      issueDate: 'Issue Date',
      deliveryDate: 'Delivery Date',
      dueDate: 'Due Date',
      paymentMethod: 'Payment Method',
      seller: 'Seller',
      buyer: 'Buyer',
      taxNumber: 'Tax Number',
      itemNo: 'No.',
      description: 'Description',
      quantity: 'Qty',
      unit: 'Unit',
      unitPrice: 'Unit Price',
      vatRate: 'VAT %',
      netAmount: 'Net',
      vatAmount: 'VAT',
      grossAmount: 'Gross',
      subtotal: 'Subtotal',
      total: 'Total',
      totalToPay: 'Total to Pay',
      paidAmount: 'Paid',
      remaining: 'Remaining',
      notes: 'Notes',
      duplicate: 'DUPLICATE',
      cash: 'Cash',
      card: 'Credit Card',
      transfer: 'Bank Transfer',
      createdBy: 'Created by',
    },
  };

  /**
   * Generate PDF for an invoice
   */
  async generatePdf(
    invoice: IInvoice,
    companyInfo: CompanyInfo,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    this.logger.log(`Generating PDF for invoice: ${invoice.invoiceNumber}`);

    const lang = options.language ?? 'hu';
    const labels = this.labels[lang];

    // Generate HTML content
    const html = this.generateHtml(invoice, companyInfo, labels, options);

    // For now, return HTML as buffer (in production, use puppeteer or similar)
    // This is a placeholder - actual PDF generation would use a library
    const buffer = Buffer.from(html, 'utf-8');

    const filename = this.generateFilename(invoice, options.isDuplicate);

    return {
      buffer,
      filename,
      mimeType: 'text/html', // Would be 'application/pdf' with actual PDF generation
      generatedAt: new Date(),
    };
  }

  /**
   * Generate HTML representation of invoice (template for PDF)
   */
  private generateHtml(
    invoice: IInvoice,
    companyInfo: CompanyInfo,
    labels: Record<string, string>,
    options: PdfGenerationOptions
  ): string {
    const title = this.getInvoiceTitle(invoice.type, labels);
    const paymentMethodLabel = this.getPaymentMethodLabel(invoice.paymentMethod, labels);

    return `<!DOCTYPE html>
<html lang="${options.language ?? 'hu'}">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company-info { text-align: left; }
    .invoice-info { text-align: right; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party-title { font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .number { text-align: right; }
    .totals { margin-top: 20px; }
    .totals-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
    .totals-label { width: 150px; text-align: right; margin-right: 10px; }
    .totals-value { width: 100px; text-align: right; font-weight: bold; }
    .grand-total { font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
    .notes { margin-top: 30px; padding: 10px; background-color: #f9f9f9; }
    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #666; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px; color: rgba(200, 200, 200, 0.3); pointer-events: none; }
  </style>
</head>
<body>
  ${options.isDuplicate ? `<div class="watermark">${labels['duplicate']}</div>` : ''}

  <div class="header">
    <div class="company-info">
      <strong>${escapeHtml(companyInfo.name)}</strong><br>
      ${escapeHtml(companyInfo.address)}<br>
      ${escapeHtml(labels['taxNumber'])}: ${escapeHtml(companyInfo.taxNumber)}
      ${companyInfo.bankAccount ? `<br>Bankszámla: ${escapeHtml(companyInfo.bankAccount)}` : ''}
      ${companyInfo.phone ? `<br>Tel: ${escapeHtml(companyInfo.phone)}` : ''}
      ${companyInfo.email ? `<br>Email: ${escapeHtml(companyInfo.email)}` : ''}
    </div>
    <div class="invoice-info">
      <div class="title">${escapeHtml(title)}</div>
      <strong>${escapeHtml(labels['invoiceNumber'])}:</strong> ${escapeHtml(invoice.invoiceNumber)}<br>
      <strong>${escapeHtml(labels['issueDate'])}:</strong> ${this.formatDate(invoice.invoiceDate)}<br>
      <strong>${escapeHtml(labels['deliveryDate'])}:</strong> ${this.formatDate(invoice.fulfillmentDate)}<br>
      <strong>${escapeHtml(labels['dueDate'])}:</strong> ${this.formatDate(invoice.dueDate)}<br>
      <strong>${escapeHtml(labels['paymentMethod'])}:</strong> ${escapeHtml(paymentMethodLabel)}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-title">${escapeHtml(labels['buyer'])}</div>
      <strong>${escapeHtml(invoice.partnerName)}</strong><br>
      ${escapeHtml(invoice.partnerAddress)}<br>
      ${invoice.partnerTaxNumber ? `${escapeHtml(labels['taxNumber'])}: ${escapeHtml(invoice.partnerTaxNumber)}` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${escapeHtml(labels['itemNo'])}</th>
        <th>${escapeHtml(labels['description'])}</th>
        <th class="number">${escapeHtml(labels['quantity'])}</th>
        <th>${escapeHtml(labels['unit'])}</th>
        <th class="number">${escapeHtml(labels['unitPrice'])}</th>
        <th class="number">${escapeHtml(labels['vatRate'])}</th>
        <th class="number">${escapeHtml(labels['netAmount'])}</th>
        <th class="number">${escapeHtml(labels['vatAmount'])}</th>
        <th class="number">${escapeHtml(labels['grossAmount'])}</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, index) => this.generateItemRow(item, index + 1)).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">${escapeHtml(labels['netAmount'])}:</span>
      <span class="totals-value">${this.formatCurrency(invoice.netAmount, invoice.currency)}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">${escapeHtml(labels['vatAmount'])}:</span>
      <span class="totals-value">${this.formatCurrency(invoice.vatAmount, invoice.currency)}</span>
    </div>
    <div class="totals-row grand-total">
      <span class="totals-label">${escapeHtml(labels['totalToPay'])}:</span>
      <span class="totals-value">${this.formatCurrency(invoice.grossAmount, invoice.currency)}</span>
    </div>
    ${
      invoice.paidAmount > 0
        ? `
    <div class="totals-row">
      <span class="totals-label">${escapeHtml(labels['paidAmount'])}:</span>
      <span class="totals-value">${this.formatCurrency(invoice.paidAmount, invoice.currency)}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">${escapeHtml(labels['remaining'])}:</span>
      <span class="totals-value">${this.formatCurrency(invoice.grossAmount - invoice.paidAmount, invoice.currency)}</span>
    </div>
    `
        : ''
    }
  </div>

  ${
    invoice.notes
      ? `
  <div class="notes">
    <strong>${escapeHtml(labels['notes'])}:</strong><br>
    ${escapeHtml(invoice.notes)}
  </div>
  `
      : ''
  }

  <div class="footer">
    ${escapeHtml(labels['createdBy'])}: ${escapeHtml(invoice.createdBy ?? 'N/A')} |
    Generálva: ${this.formatDate(new Date())}
  </div>
</body>
</html>`;
  }

  /**
   * Generate item row HTML
   */
  private generateItemRow(item: IInvoiceItem, lineNumber: number): string {
    return `
      <tr>
        <td>${lineNumber}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="number">${item.quantity}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td class="number">${this.formatNumber(item.unitPriceNet)}</td>
        <td class="number">${item.vatPercentage}%</td>
        <td class="number">${this.formatNumber(item.netAmount)}</td>
        <td class="number">${this.formatNumber(item.vatAmount)}</td>
        <td class="number">${this.formatNumber(item.grossAmount)}</td>
      </tr>
    `;
  }

  /**
   * Get invoice title based on type
   */
  private getInvoiceTitle(type: string, labels: Record<string, string>): string {
    switch (type) {
      case 'PROFORMA':
        return labels['proforma'] ?? 'PROFORMA';
      case 'STORNO':
        return labels['storno'] ?? 'STORNO';
      default:
        return labels['invoice'] ?? 'INVOICE';
    }
  }

  /**
   * Get payment method label
   */
  private getPaymentMethodLabel(method: string, labels: Record<string, string>): string {
    switch (method) {
      case 'CASH':
        return labels['cash'] ?? 'Cash';
      case 'CARD':
        return labels['card'] ?? 'Card';
      case 'TRANSFER':
        return labels['transfer'] ?? 'Transfer';
      default:
        return method;
    }
  }

  /**
   * Generate filename for PDF
   */
  private generateFilename(invoice: IInvoice, isDuplicate?: boolean): string {
    const suffix = isDuplicate ? '_masolat' : '';
    return `szamla_${invoice.invoiceNumber.replace(/[/\\]/g, '-')}${suffix}.pdf`;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('hu-HU');
  }

  /**
   * Format number for display
   */
  private formatNumber(value: number): string {
    return value.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  /**
   * Format currency for display
   */
  private formatCurrency(value: number, currency: string): string {
    const formatted = this.formatNumber(value);
    return `${formatted} ${currency}`;
  }
}
