/**
 * POS (Point of Sale) API Types
 * Based on ADR-046 and backend @kgc/sales-pos implementation
 */

// ============================================
// Enums (matching backend Prisma models)
// ============================================

export enum CashRegisterStatus {
  OPEN = 'OPEN',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

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

// ============================================
// Session Types
// ============================================

export interface CashRegisterSession {
  id: string;
  tenantId: string;
  locationId: string;
  sessionNumber: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  variance: number | null;
  varianceNote: string | null;
  openedBy: string;
  closedBy: string | null;
  status: CashRegisterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OpenSessionDto {
  locationId: string;
  openingBalance: number;
}

export interface CloseSessionDto {
  closingBalance: number;
  varianceNote?: string;
}

export interface SuspendSessionDto {
  reason?: string;
}

// ============================================
// Transaction Types
// ============================================

export interface SaleTransaction {
  id: string;
  tenantId: string;
  sessionId: string;
  transactionNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerTaxNumber: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  changeAmount: number;
  invoiceId: string | null;
  receiptNumber: string | null;
  status: SaleStatus;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  items: SaleItem[];
  payments: SalePayment[];
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
  warehouseId: string | null;
}

export interface CreateTransactionDto {
  sessionId: string;
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string;
}

export interface AddItemDto {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent?: number;
  warehouseId?: string;
}

export interface UpdateItemDto {
  quantity?: number;
  discountPercent?: number;
}

export interface VoidTransactionDto {
  reason: string;
}

// ============================================
// Payment Types
// ============================================

export interface SalePayment {
  id: string;
  transactionId: string;
  tenantId: string;
  method: PaymentMethod;
  amount: number;
  cardTransactionId: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  transferReference: string | null;
  voucherCode: string | null;
  receivedAt: string;
}

export interface ProcessCashPaymentDto {
  receivedAmount: number;
}

export interface ProcessCardPaymentDto {
  amount: number;
}

export interface AddPartialPaymentDto {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface CashPaymentResult {
  payment: SalePayment;
  changeAmount: number;
  transaction: SaleTransaction;
}

export interface CardPaymentResult {
  payment: SalePayment;
  transaction: SaleTransaction;
  cardTransactionId: string;
  cardLastFour: string;
  cardBrand: string;
}

// ============================================
// Z-Report Types
// ============================================

export interface ZReport {
  sessionId: string;
  sessionNumber: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number;
  closingBalance: number;
  expectedBalance: number;
  variance: number;
  varianceApproved: boolean;
  varianceNote: string | null;

  // Transaction summary
  totalTransactions: number;
  completedTransactions: number;
  voidedTransactions: number;

  // Payment summary
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  voucherTotal: number;
  creditTotal: number;

  // Sales summary
  grossSales: number;
  discounts: number;
  netSales: number;
  taxCollected: number;

  // Change given
  changeGiven: number;
}

export interface ApproveVarianceDto {
  note: string;
}

// ============================================
// Product Search Types (for POS)
// ============================================

export interface POSProduct {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string;
  price: number;
  vatRate: number;
  stock: number;
  unit: string;
}

export interface ProductSearchParams {
  search?: string;
  barcode?: string;
  category?: string;
  limit?: number;
}

// ============================================
// Customer Types (for POS)
// ============================================

export interface POSCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  type: 'INDIVIDUAL' | 'COMPANY';
}

export interface CustomerSearchParams {
  search?: string;
  taxNumber?: string;
  limit?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
