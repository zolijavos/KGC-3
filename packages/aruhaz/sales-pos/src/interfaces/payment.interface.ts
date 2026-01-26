/**
 * @kgc/sales-pos - Payment Interfaces
 * Epic 22: Point of Sale - Story 22-2 Payment Methods
 */

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  VOUCHER = 'VOUCHER',
  CREDIT = 'CREDIT',
}

export interface ISalePayment {
  id: string;
  transactionId: string;
  tenantId: string;
  method: PaymentMethod;
  amount: number;
  cardTransactionId?: string;
  cardLastFour?: string;
  cardBrand?: string;
  transferReference?: string;
  voucherCode?: string;
  receivedAt: Date;
}

export interface IPaymentCreateResult {
  payment: ISalePayment;
  transactionPaidAmount: number;
  transactionChangeAmount: number;
  isFullyPaid: boolean;
}

/**
 * Repository interface for SalePayment
 * Implemented in apps/kgc-api with Prisma
 */
export interface IPaymentRepository {
  findById(id: string): Promise<ISalePayment | null>;
  findByTransaction(transactionId: string): Promise<ISalePayment[]>;
  create(data: Omit<ISalePayment, 'id' | 'receivedAt'>): Promise<ISalePayment>;
  delete(id: string): Promise<void>;
  deleteByTransaction(transactionId: string): Promise<void>;
  sumByTransaction(transactionId: string): Promise<number>;
}

/**
 * MyPos Service Interface (STUB)
 * Actual implementation will be in @kgc/mypos package
 */
export interface IMyPosService {
  processCardPayment(params: { amount: number; currency: string; reference: string }): Promise<{
    success: boolean;
    transactionId?: string;
    cardLastFour?: string;
    cardBrand?: string;
    errorMessage?: string;
  }>;

  refundPayment(transactionId: string): Promise<{ success: boolean; errorMessage?: string }>;
}

/**
 * Inventory Service Interface (STUB)
 * Actual implementation will be in @kgc/inventory package
 */
export interface IInventoryService {
  deductStock(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reference: string;
    tenantId: string;
  }): Promise<{ success: boolean; newQuantity?: number; errorMessage?: string }>;

  checkAvailability(productId: string, warehouseId: string, tenantId: string): Promise<number>;
}

/**
 * Payment processing result types
 */
export interface ICashPaymentResult extends IPaymentCreateResult {
  changeAmount: number;
}

export interface ICardPaymentResult extends IPaymentCreateResult {
  cardTransactionId: string;
  cardLastFour: string;
  cardBrand: string;
}

export interface IInventoryDeductionResult {
  itemId: string;
  productId: string;
  success: boolean;
  newQuantity?: number;
  errorMessage?: string;
}
