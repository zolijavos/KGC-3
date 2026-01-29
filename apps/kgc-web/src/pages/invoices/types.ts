// Számla típusok (matching API)

export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'SENT'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOIDED';

export type InvoiceType = 'STANDARD' | 'ADVANCE' | 'FINAL' | 'PROFORMA' | 'CREDIT_NOTE';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'COD';

export interface InvoiceItem {
  id: string;
  itemType: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatPercent: number;
  vatAmount: number;
  totalPrice: number;
  referenceType?: string;
  referenceId?: string;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  partnerId: string;
  type: InvoiceType;
  status: InvoiceStatus;

  // Dates
  issueDate: string;
  dueDate: string;
  deliveryDate?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;

  // Amounts
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;

  // Currency
  currency: string;
  exchangeRate: number;

  // Payment
  paymentMethod?: PaymentMethod;
  paymentRef?: string;

  // NAV
  navStatus?: string;
  navTransactionId?: string;
  navSentAt?: string;
  navConfirmedAt?: string;
  navErrorMessage?: string;

  // PDF
  pdfUrl?: string;
  sentAt?: string;
  sentTo?: string;

  // Void/Storno
  voidedInvoiceId?: string;
  voidReason?: string;
  voidedAt?: string;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Audit
  createdBy: string;
  updatedBy: string;

  // Items (populated)
  items?: InvoiceItem[];

  // Partner info (populated)
  partner?: {
    id: string;
    name: string;
    companyName?: string;
    taxNumber?: string;
    address?: string;
  };
}

export interface InvoiceListFilters {
  search: string;
  status: InvoiceStatus | 'ALL';
  type: InvoiceType | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}
