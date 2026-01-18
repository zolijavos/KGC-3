/**
 * @kgc/sales-quote - Quote Interfaces
 * Epic 18: Quotations
 */

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export enum QuoteItemType {
  PART = 'PART',
  LABOR = 'LABOR',
  OTHER = 'OTHER',
}

export interface IQuoteItem {
  id: string;
  quoteId: string;
  tenantId: string;
  type: QuoteItemType;
  itemId?: string;
  itemCode?: string;
  description: string;
  explodedViewPosition?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  createdAt: Date;
}

export interface IQuote {
  id: string;
  tenantId: string;
  quoteNumber: string;
  worksheetId: string;
  partnerId: string;
  status: QuoteStatus;
  items: IQuoteItem[];
  netTotal: number;
  vatAmount: number;
  grossTotal: number;
  validFrom: Date;
  validUntil: Date;
  customerNote?: string;
  internalNote?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  respondedAt?: Date;
  responseNote?: string;
}

export interface IQuoteCreateResult {
  quote: IQuote;
  quoteNumber: string;
}
