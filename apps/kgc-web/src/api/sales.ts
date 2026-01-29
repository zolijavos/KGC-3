/**
 * Sales API Client
 * Interacts with POS transaction endpoints
 */

import { api } from './client';

// Enums matching backend
export enum SaleStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  VOUCHER = 'VOUCHER',
  CREDIT = 'CREDIT',
}

// Types
export interface SaleTransaction {
  id: string;
  tenantId: string;
  sessionId: string;
  transactionNumber: string;
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  changeAmount: number;
  invoiceId?: string;
  receiptNumber?: string;
  status: SaleStatus;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface SaleItem {
  id: string;
  transactionId: string;
  tenantId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  inventoryDeducted: boolean;
  warehouseId?: string;
}

export interface TransactionFilter {
  status?: SaleStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// API functions
export const salesApi = {
  /**
   * Get all transactions with optional filters
   */
  getTransactions: async (filter?: TransactionFilter): Promise<SaleTransaction[]> => {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.dateFrom) params.append('dateFrom', filter.dateFrom);
    if (filter?.dateTo) params.append('dateTo', filter.dateTo);

    const queryString = params.toString();
    const endpoint = queryString ? `/pos/transactions?${queryString}` : '/pos/transactions';
    return api.get<SaleTransaction[]>(endpoint);
  },

  /**
   * Get a single transaction by ID
   */
  getTransaction: async (id: string): Promise<SaleTransaction> => {
    return api.get<SaleTransaction>(`/pos/transactions/${id}`);
  },

  /**
   * Get transaction items
   */
  getTransactionItems: async (transactionId: string): Promise<SaleItem[]> => {
    return api.get<SaleItem[]>(`/pos/transactions/${transactionId}/items`);
  },

  /**
   * Void a transaction
   */
  voidTransaction: async (id: string, reason: string): Promise<SaleTransaction> => {
    return api.post<SaleTransaction>(`/pos/transactions/${id}/void`, { reason });
  },
};
