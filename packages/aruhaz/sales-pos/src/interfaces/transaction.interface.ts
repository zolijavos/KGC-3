/**
 * @kgc/sales-pos - Sale Transaction Interfaces
 * Epic 22: Point of Sale - Story 22-1
 */

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

export interface ISaleTransaction {
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
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ISaleItem {
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

export interface ITransactionCreateResult {
  transaction: ISaleTransaction;
  transactionNumber: string;
}

/**
 * Repository interface for SaleTransaction
 * Implemented in apps/kgc-api with Prisma
 */
export interface ITransactionRepository {
  findById(id: string): Promise<ISaleTransaction | null>;
  findByTransactionNumber(transactionNumber: string): Promise<ISaleTransaction | null>;
  findBySession(sessionId: string): Promise<ISaleTransaction[]>;
  create(data: Omit<ISaleTransaction, 'id' | 'createdAt'>): Promise<ISaleTransaction>;
  update(id: string, data: Partial<ISaleTransaction>): Promise<ISaleTransaction>;
  getNextSequenceNumber(tenantId: string, year: number): Promise<number>;
}

/**
 * Repository interface for SaleItem
 * Implemented in apps/kgc-api with Prisma
 */
export interface ISaleItemRepository {
  findById(id: string): Promise<ISaleItem | null>;
  findByTransaction(transactionId: string): Promise<ISaleItem[]>;
  create(data: Omit<ISaleItem, 'id'>): Promise<ISaleItem>;
  update(id: string, data: Partial<ISaleItem>): Promise<ISaleItem>;
  delete(id: string): Promise<void>;
  deleteByTransaction(transactionId: string): Promise<void>;
}
