/**
 * Invoices API Client
 * Epic 10: Invoice Core
 */

import { api } from './client';

// ============================================
// TYPES (matching backend schema)
// ============================================

export type InvoiceType = 'STANDARD' | 'ADVANCE' | 'FINAL' | 'PROFORMA' | 'CREDIT_NOTE';
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
  pdfGenAt?: string;
  sentAt?: string;
  sentTo?: string;

  // Void/Storno
  voidedInvoiceId?: string;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Audit
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;

  // Relations (populated)
  items?: InvoiceItem[];
  partner?: {
    id: string;
    name: string;
    companyName?: string;
    taxNumber?: string;
    address?: string;
  };
}

export interface InvoiceListResponse {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface InvoiceResponse {
  data: Invoice;
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalRevenue: number;
  unpaidTotal: number;
}

export interface InvoiceFilters {
  type?: InvoiceType;
  status?: InvoiceStatus;
  partnerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of invoices with filters
 */
export async function getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
  const params = new URLSearchParams();

  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.partnerId) params.append('partnerId', filters.partnerId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);
  if (filters.page !== undefined) params.append('page', filters.page.toString());
  if (filters.pageSize !== undefined) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const endpoint = queryString ? `/invoices?${queryString}` : '/invoices';

  // The controller returns PaginatedResult<IInvoice> which has data and meta
  const response = await api.get<{
    data: Invoice[];
    total: number;
    page: number;
    pageSize: number;
  }>(endpoint);

  return {
    data: response.data ?? [],
    meta: {
      total: response.total ?? 0,
      page: response.page ?? 1,
      pageSize: response.pageSize ?? 20,
      hasMore: (response.page ?? 1) * (response.pageSize ?? 20) < (response.total ?? 0),
    },
  };
}

/**
 * Get single invoice by ID
 */
export async function getInvoiceById(id: string): Promise<InvoiceResponse> {
  const invoice = await api.get<Invoice>(`/invoices/${id}`);
  return { data: invoice };
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(): Promise<{ data: InvoiceStats }> {
  // Note: If there's no stats endpoint, we calculate from list
  // For now we'll call the list endpoint and aggregate
  const response = await getInvoices({ pageSize: 1000 });
  const invoices = response.data ?? [];

  const stats: InvoiceStats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'DRAFT').length,
    sent: invoices.filter(i => i.status === 'SENT').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    totalRevenue: invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + Number(i.totalAmount), 0),
    unpaidTotal: invoices
      .filter(i => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
      .reduce((sum, i) => sum + Number(i.balanceDue), 0),
  };

  return { data: stats };
}

/**
 * Create invoice
 */
export async function createInvoice(data: {
  partnerId: string;
  partnerName: string;
  partnerAddress: string;
  partnerTaxNumber?: string;
  type?: InvoiceType;
  invoiceDate?: string;
  fulfillmentDate?: string;
  dueDate?: string;
  paymentMethod: PaymentMethod;
  currency?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPriceNet: number;
    vatRate: string;
    productId?: string;
    discountPercent?: number;
  }>;
}): Promise<InvoiceResponse> {
  const invoice = await api.post<Invoice>('/invoices', data);
  return { data: invoice };
}

/**
 * Update invoice
 */
export async function updateInvoice(
  id: string,
  data: {
    dueDate?: string;
    notes?: string;
    internalNotes?: string;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
  }
): Promise<InvoiceResponse> {
  const invoice = await api.patch<Invoice>(`/invoices/${id}`, data);
  return { data: invoice };
}

/**
 * Delete invoice (draft only)
 */
export async function deleteInvoice(id: string): Promise<void> {
  return api.delete<void>(`/invoices/${id}`);
}

/**
 * Issue invoice (DRAFT -> ISSUED)
 */
export async function issueInvoice(id: string): Promise<InvoiceResponse> {
  const invoice = await api.patch<Invoice>(`/invoices/${id}/issue`);
  return { data: invoice };
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceAsSent(id: string): Promise<InvoiceResponse> {
  const invoice = await api.patch<Invoice>(`/invoices/${id}/send`);
  return { data: invoice };
}

/**
 * Record payment on invoice
 */
export async function recordPayment(
  id: string,
  data: {
    amount: number;
    paymentDate?: string;
    paymentMethod?: PaymentMethod;
    reference?: string;
  }
): Promise<InvoiceResponse> {
  const invoice = await api.post<Invoice>(`/invoices/${id}/payment`, data);
  return { data: invoice };
}

/**
 * Create storno invoice
 */
export async function createStornoInvoice(
  id: string,
  data: {
    reason: string;
    partialItems?: Array<{ lineNumber: number; quantity: number }>;
  }
): Promise<InvoiceResponse> {
  const invoice = await api.post<Invoice>(`/invoices/${id}/storno`, data);
  return { data: invoice };
}

/**
 * Get NAV status for invoice
 */
export async function getNavStatus(id: string): Promise<{
  data: {
    invoiceId: string;
    status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
    transactionId?: string;
    submittedAt?: string;
    acceptedAt?: string;
    errorMessage?: string;
  };
}> {
  return api.get(`/invoices/${id}/nav-status`);
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePdf(
  id: string,
  options?: { duplicate?: boolean; language?: 'hu' | 'en' }
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options?.duplicate) params.append('duplicate', 'true');
  if (options?.language) params.append('language', options.language);

  const queryString = params.toString();
  const endpoint = queryString ? `/invoices/${id}/pdf?${queryString}` : `/invoices/${id}/pdf`;

  // This returns a blob for file download
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download PDF');
  }

  return response.blob();
}
