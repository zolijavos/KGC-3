/**
 * @kgc/sales-pos - PaymentService Unit Tests
 * Epic 22: Story 22-2 - Payment Methods
 * TDD: Red-Green-Refactor - Tests written FIRST
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IInventoryService,
  IMyPosService,
  IPaymentRepository,
  ISalePayment,
  PaymentMethod,
} from '../interfaces/payment.interface.js';
import {
  ISaleItem,
  ISaleItemRepository,
  ISaleTransaction,
  ITransactionRepository,
  PaymentStatus,
  SaleStatus,
} from '../interfaces/transaction.interface.js';
import { PaymentService } from './payment.service.js';

// Mock repositories and services
const createMockPaymentRepository = (): IPaymentRepository => ({
  findById: vi.fn(),
  findByTransaction: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  deleteByTransaction: vi.fn(),
  sumByTransaction: vi.fn(),
});

const createMockTransactionRepository = (): ITransactionRepository => ({
  findById: vi.fn(),
  findByTransactionNumber: vi.fn(),
  findBySession: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getNextSequenceNumber: vi.fn(),
});

const createMockSaleItemRepository = (): ISaleItemRepository => ({
  findById: vi.fn(),
  findByTransaction: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteByTransaction: vi.fn(),
});

const createMockMyPosService = (): IMyPosService => ({
  processCardPayment: vi.fn(),
  refundPayment: vi.fn(),
});

const createMockInventoryService = (): IInventoryService => ({
  deductStock: vi.fn(),
  checkAvailability: vi.fn(),
});

const createMockTransaction = (overrides: Partial<ISaleTransaction> = {}): ISaleTransaction => ({
  id: 'txn-123',
  tenantId: 'tenant-1',
  sessionId: 'session-1',
  transactionNumber: 'ELADAS-2026-0001',
  subtotal: 10000,
  taxAmount: 2700,
  discountAmount: 0,
  total: 12700,
  paymentStatus: PaymentStatus.PENDING,
  paidAmount: 0,
  changeAmount: 0,
  status: SaleStatus.PENDING_PAYMENT,
  createdBy: 'user-1',
  createdAt: new Date(),
  ...overrides,
});

const createMockPayment = (overrides: Partial<ISalePayment> = {}): ISalePayment => ({
  id: 'payment-123',
  transactionId: 'txn-123',
  tenantId: 'tenant-1',
  method: PaymentMethod.CASH,
  amount: 12700,
  receivedAt: new Date(),
  ...overrides,
});

const createMockSaleItem = (overrides: Partial<ISaleItem> = {}): ISaleItem => ({
  id: 'item-123',
  transactionId: 'txn-123',
  tenantId: 'tenant-1',
  productId: 'product-1',
  productCode: 'PRD001',
  productName: 'Test Product',
  quantity: 2,
  unitPrice: 5000,
  taxRate: 27,
  discountPercent: 0,
  lineSubtotal: 10000,
  lineTax: 2700,
  lineTotal: 12700,
  inventoryDeducted: false,
  warehouseId: 'warehouse-1',
  ...overrides,
});

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: IPaymentRepository;
  let transactionRepository: ITransactionRepository;
  let saleItemRepository: ISaleItemRepository;
  let myPosService: IMyPosService;
  let inventoryService: IInventoryService;

  beforeEach(() => {
    paymentRepository = createMockPaymentRepository();
    transactionRepository = createMockTransactionRepository();
    saleItemRepository = createMockSaleItemRepository();
    myPosService = createMockMyPosService();
    inventoryService = createMockInventoryService();

    service = new PaymentService(
      paymentRepository,
      transactionRepository,
      saleItemRepository,
      myPosService,
      inventoryService
    );
  });

  describe('processCashPayment', () => {
    // AC1: Cash payment tests

    it('should process cash payment with exact amount', async () => {
      const transaction = createMockTransaction();
      const payment = createMockPayment();

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(0);
      vi.mocked(paymentRepository.create).mockResolvedValue(payment);
      vi.mocked(transactionRepository.update).mockResolvedValue({
        ...transaction,
        paidAmount: 12700,
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });

      const result = await service.processCashPayment(
        'txn-123',
        { receivedAmount: 12700 },
        'tenant-1'
      );

      expect(result.payment.method).toBe(PaymentMethod.CASH);
      expect(result.changeAmount).toBe(0);
      expect(result.isFullyPaid).toBe(true);
    });

    it('should calculate change when overpaid', async () => {
      const transaction = createMockTransaction({ total: 12700 });
      const payment = createMockPayment({ amount: 12700 });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(0);
      vi.mocked(paymentRepository.create).mockResolvedValue(payment);
      vi.mocked(transactionRepository.update).mockResolvedValue({
        ...transaction,
        paidAmount: 12700,
        changeAmount: 2300,
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });

      const result = await service.processCashPayment(
        'txn-123',
        { receivedAmount: 15000 },
        'tenant-1'
      );

      expect(result.changeAmount).toBe(2300); // 15000 - 12700
      expect(result.isFullyPaid).toBe(true);
    });

    it('should throw error when received amount is less than total', async () => {
      const transaction = createMockTransaction({ total: 12700 });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(0);

      await expect(
        service.processCashPayment('txn-123', { receivedAmount: 10000 }, 'tenant-1')
      ).rejects.toThrow('Insufficient payment');
    });

    it('should throw error when transaction not found', async () => {
      vi.mocked(transactionRepository.findById).mockResolvedValue(null);

      await expect(
        service.processCashPayment('txn-123', { receivedAmount: 15000 }, 'tenant-1')
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw error when transaction is not PENDING_PAYMENT', async () => {
      const transaction = createMockTransaction({ status: SaleStatus.IN_PROGRESS });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(
        service.processCashPayment('txn-123', { receivedAmount: 15000 }, 'tenant-1')
      ).rejects.toThrow('Transaction is not in PENDING_PAYMENT status');
    });

    it('should throw error when transaction already paid', async () => {
      const transaction = createMockTransaction({ paymentStatus: PaymentStatus.PAID });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(
        service.processCashPayment('txn-123', { receivedAmount: 15000 }, 'tenant-1')
      ).rejects.toThrow('Transaction is already paid');
    });
  });

  describe('processCardPayment', () => {
    // AC2: Card payment tests

    it('should process card payment via MyPos stub', async () => {
      const transaction = createMockTransaction();
      const payment = createMockPayment({
        method: PaymentMethod.CARD,
        cardTransactionId: 'mypos-txn-456',
        cardLastFour: '1234',
        cardBrand: 'VISA',
      });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(0);
      vi.mocked(myPosService.processCardPayment).mockResolvedValue({
        success: true,
        transactionId: 'mypos-txn-456',
        cardLastFour: '1234',
        cardBrand: 'VISA',
      });
      vi.mocked(paymentRepository.create).mockResolvedValue(payment);
      vi.mocked(transactionRepository.update).mockResolvedValue({
        ...transaction,
        paidAmount: 12700,
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });

      const result = await service.processCardPayment('txn-123', 'tenant-1');

      expect(result.payment.method).toBe(PaymentMethod.CARD);
      expect(result.cardTransactionId).toBe('mypos-txn-456');
      expect(result.cardLastFour).toBe('1234');
      expect(result.cardBrand).toBe('VISA');
      expect(result.isFullyPaid).toBe(true);
    });

    it('should throw error when MyPos payment fails', async () => {
      const transaction = createMockTransaction();

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(0);
      vi.mocked(myPosService.processCardPayment).mockResolvedValue({
        success: false,
        errorMessage: 'Card declined',
      });

      await expect(service.processCardPayment('txn-123', 'tenant-1')).rejects.toThrow(
        'Card payment failed: Card declined'
      );
    });
  });

  describe('addPartialPayment', () => {
    // AC3: Mixed payment tests

    it('should add partial cash payment', async () => {
      const transaction = createMockTransaction({ total: 50000 });
      const payment = createMockPayment({ amount: 30000 });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(0);
      vi.mocked(paymentRepository.create).mockResolvedValue(payment);
      vi.mocked(transactionRepository.update).mockResolvedValue({
        ...transaction,
        paidAmount: 30000,
        paymentStatus: PaymentStatus.PARTIAL,
      });

      const result = await service.addPartialPayment(
        'txn-123',
        { method: PaymentMethod.CASH, amount: 30000 },
        'tenant-1'
      );

      expect(result.payment.amount).toBe(30000);
      expect(result.isFullyPaid).toBe(false);
      expect(result.transactionPaidAmount).toBe(30000);
    });

    it('should mark as fully paid when sum equals total', async () => {
      const transaction = createMockTransaction({ total: 50000 });
      const payment = createMockPayment({ amount: 20000, method: PaymentMethod.CARD });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(30000); // Already paid 30000
      vi.mocked(paymentRepository.create).mockResolvedValue(payment);
      vi.mocked(transactionRepository.update).mockResolvedValue({
        ...transaction,
        paidAmount: 50000,
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });

      const result = await service.addPartialPayment(
        'txn-123',
        {
          method: PaymentMethod.CARD,
          amount: 20000,
          cardTransactionId: 'card-123',
          cardLastFour: '4321',
          cardBrand: 'MC',
        },
        'tenant-1'
      );

      expect(result.isFullyPaid).toBe(true);
      expect(result.transactionPaidAmount).toBe(50000);
    });

    it('should throw error when payment exceeds remaining amount', async () => {
      const transaction = createMockTransaction({ total: 50000 });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.sumByTransaction).mockResolvedValue(40000);

      await expect(
        service.addPartialPayment(
          'txn-123',
          { method: PaymentMethod.CASH, amount: 20000 },
          'tenant-1'
        )
      ).rejects.toThrow('Payment amount exceeds remaining balance');
    });
  });

  describe('completePayment', () => {
    // AC4: Inventory deduction tests

    it('should deduct inventory for all items', async () => {
      const transaction = createMockTransaction({
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });
      const items = [
        createMockSaleItem({ id: 'item-1', productId: 'prod-1', quantity: 2 }),
        createMockSaleItem({ id: 'item-2', productId: 'prod-2', quantity: 1 }),
      ];

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(saleItemRepository.findByTransaction).mockResolvedValue(items);
      vi.mocked(inventoryService.deductStock).mockResolvedValue({ success: true, newQuantity: 10 });
      vi.mocked(saleItemRepository.update).mockImplementation(async (id, data) => ({
        ...items.find(i => i.id === id)!,
        ...data,
      }));

      const result = await service.completePayment('txn-123', 'tenant-1');

      expect(inventoryService.deductStock).toHaveBeenCalledTimes(2);
      expect(result.deductionResults).toHaveLength(2);
      expect(result.deductionResults.every(r => r.success)).toBe(true);
    });

    it('should mark inventoryDeducted true on items', async () => {
      const transaction = createMockTransaction({
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });
      const items = [createMockSaleItem({ inventoryDeducted: false })];

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(saleItemRepository.findByTransaction).mockResolvedValue(items);
      vi.mocked(inventoryService.deductStock).mockResolvedValue({ success: true });
      vi.mocked(saleItemRepository.update).mockResolvedValue({
        ...items[0]!,
        inventoryDeducted: true,
      });

      await service.completePayment('txn-123', 'tenant-1');

      expect(saleItemRepository.update).toHaveBeenCalledWith('item-123', {
        inventoryDeducted: true,
      });
    });

    it('should continue on inventory error and log warning', async () => {
      const transaction = createMockTransaction({
        paymentStatus: PaymentStatus.PAID,
        status: SaleStatus.COMPLETED,
      });
      const items = [createMockSaleItem()];

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(saleItemRepository.findByTransaction).mockResolvedValue(items);
      vi.mocked(inventoryService.deductStock).mockResolvedValue({
        success: false,
        errorMessage: 'Insufficient stock',
      });

      const result = await service.completePayment('txn-123', 'tenant-1');

      expect(result.deductionResults[0]!.success).toBe(false);
      expect(result.deductionResults[0]!.errorMessage).toBe('Insufficient stock');
      // Transaction should still complete (warning only)
    });

    it('should throw error when transaction not fully paid', async () => {
      const transaction = createMockTransaction({ paymentStatus: PaymentStatus.PARTIAL });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(service.completePayment('txn-123', 'tenant-1')).rejects.toThrow(
        'Transaction is not fully paid'
      );
    });
  });

  describe('refundPayments', () => {
    // AC5: Void/refund tests

    it('should delete all payments for voided transaction', async () => {
      const transaction = createMockTransaction({ status: SaleStatus.VOIDED });
      const payments = [
        createMockPayment({ id: 'pay-1', method: PaymentMethod.CASH }),
        createMockPayment({ id: 'pay-2', method: PaymentMethod.CARD }),
      ];

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.findByTransaction).mockResolvedValue(payments);
      vi.mocked(paymentRepository.deleteByTransaction).mockResolvedValue(undefined);

      await service.refundPayments('txn-123', 'tenant-1');

      expect(paymentRepository.deleteByTransaction).toHaveBeenCalledWith('txn-123');
    });

    it('should call MyPos refund for card payments', async () => {
      const transaction = createMockTransaction({ status: SaleStatus.VOIDED });
      const payments = [
        createMockPayment({
          id: 'pay-1',
          method: PaymentMethod.CARD,
          cardTransactionId: 'mypos-123',
        }),
      ];

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.findByTransaction).mockResolvedValue(payments);
      vi.mocked(myPosService.refundPayment).mockResolvedValue({ success: true });
      vi.mocked(paymentRepository.deleteByTransaction).mockResolvedValue(undefined);

      await service.refundPayments('txn-123', 'tenant-1');

      expect(myPosService.refundPayment).toHaveBeenCalledWith('mypos-123');
    });

    it('should throw error when transaction is not voided', async () => {
      const transaction = createMockTransaction({ status: SaleStatus.COMPLETED });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(service.refundPayments('txn-123', 'tenant-1')).rejects.toThrow(
        'Can only refund voided transactions'
      );
    });
  });

  describe('getPayments', () => {
    it('should return payments for transaction', async () => {
      const transaction = createMockTransaction();
      const payments = [createMockPayment(), createMockPayment({ id: 'pay-2' })];

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);
      vi.mocked(paymentRepository.findByTransaction).mockResolvedValue(payments);

      const result = await service.getPayments('txn-123', 'tenant-1');

      expect(result).toHaveLength(2);
    });

    it('should throw error on tenant mismatch', async () => {
      const transaction = createMockTransaction({ tenantId: 'other-tenant' });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(service.getPayments('txn-123', 'tenant-1')).rejects.toThrow('Access denied');
    });
  });

  describe('validation', () => {
    // AC5: Validation tests

    it('should reject payment on already PAID transaction', async () => {
      const transaction = createMockTransaction({ paymentStatus: PaymentStatus.PAID });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(
        service.processCashPayment('txn-123', { receivedAmount: 15000 }, 'tenant-1')
      ).rejects.toThrow('Transaction is already paid');
    });

    it('should only allow payment on PENDING_PAYMENT status', async () => {
      const transaction = createMockTransaction({ status: SaleStatus.IN_PROGRESS });

      vi.mocked(transactionRepository.findById).mockResolvedValue(transaction);

      await expect(
        service.processCashPayment('txn-123', { receivedAmount: 15000 }, 'tenant-1')
      ).rejects.toThrow('Transaction is not in PENDING_PAYMENT status');
    });
  });
});
