/**
 * Invoice Interfaces
 * @package @kgc/sales-invoice
 */

import type { VatRate } from '../services/vat-calculator';
import type { InvoiceStatus } from '../services/invoice-status';

/**
 * Számla típus
 */
export type InvoiceType =
  | 'STANDARD'
  | 'PROFORMA'
  | 'CORRECTION'
  | 'STORNO'
  | 'ADVANCE'
  | 'FINAL';

/**
 * Fizetési mód
 */
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'COD';

/**
 * Számla tétel
 */
export interface IInvoiceItem {
  id?: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  vatRate: VatRate;
  vatPercentage: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  discountPercent?: number;
  discountAmount?: number;
  productId?: string;
  rentalItemId?: string;
  serviceItemId?: string;
}

/**
 * Számla entitás
 */
export interface IInvoice {
  id: string;
  tenantId: string;

  // Azonosítók
  invoiceNumber: string;
  prefix: string;
  sequenceNumber: number;

  // Típus és státusz
  type: InvoiceType;
  status: InvoiceStatus;

  // Partner
  partnerId: string;
  partnerName: string;
  partnerTaxNumber?: string;
  partnerAddress: string;

  // Kapcsolódó entitások
  rentalId?: string;
  serviceOrderId?: string;
  quotationId?: string;

  // Hivatkozott számla
  referencedInvoiceId?: string;

  // Dátumok
  invoiceDate: Date;
  fulfillmentDate: Date;
  dueDate: Date;
  paidAt?: Date;

  // Fizetés
  paymentMethod: PaymentMethod;
  paymentReference?: string;

  // Összegek
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  paidAmount: number;
  currency: string;

  // NAV
  navStatus?: string;
  navTransactionId?: string;
  navSubmittedAt?: Date;

  // PDF
  pdfUrl?: string;
  pdfGeneratedAt?: Date;

  // Megjegyzés
  notes?: string;
  internalNotes?: string;

  // RBAC
  isConfidential: boolean;
  visibleToRoles: string[];

  // Tételek
  items: IInvoiceItem[];

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

/**
 * Számla létrehozási input
 */
export interface CreateInvoiceInput {
  tenantId: string;
  type?: InvoiceType;
  partnerId: string;
  partnerName: string;
  partnerTaxNumber?: string;
  partnerAddress: string;
  rentalId?: string;
  serviceOrderId?: string;
  quotationId?: string;
  invoiceDate?: Date;
  fulfillmentDate?: Date;
  dueDate?: Date;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  internalNotes?: string;
  isConfidential?: boolean;
  visibleToRoles?: string[];
  items: CreateInvoiceItemInput[];
  createdBy: string;
}

/**
 * Számla tétel létrehozási input
 */
export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  vatRate: VatRate;
  discountPercent?: number;
  productId?: string;
  rentalItemId?: string;
  serviceItemId?: string;
}

/**
 * Számla frissítési input
 */
export interface UpdateInvoiceInput {
  notes?: string;
  internalNotes?: string;
  dueDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  isConfidential?: boolean;
  visibleToRoles?: string[];
  updatedBy: string;
}

/**
 * Számla szűrési opciók
 */
export interface InvoiceFilterOptions {
  tenantId: string;
  status?: InvoiceStatus | InvoiceStatus[];
  type?: InvoiceType | InvoiceType[];
  partnerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  includeConfidential?: boolean;
  userRoles?: string[];
}

/**
 * Lapozási opciók
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Lapozott eredmény
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
