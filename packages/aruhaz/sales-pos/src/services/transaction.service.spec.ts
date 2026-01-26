import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddItemDto, CreateTransactionDto, VoidTransactionDto } from '../dto/transaction.dto.js';
import {
  CashRegisterStatus,
  ICashRegisterSession,
  ISessionRepository,
} from '../interfaces/session.interface.js';
import {
  ISaleItem,
  ISaleItemRepository,
  ISaleTransaction,
  ITransactionRepository,
  PaymentStatus,
  SaleStatus,
} from '../interfaces/transaction.interface.js';
import { IAuditService, TransactionService } from './transaction.service.js';

const mockTransactionRepository: ITransactionRepository = {
  findById: vi.fn(),
  findByTransactionNumber: vi.fn(),
  findBySession: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getNextSequenceNumber: vi.fn(),
};

const mockSaleItemRepository: ISaleItemRepository = {
  findById: vi.fn(),
  findByTransaction: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteByTransaction: vi.fn(),
};

const mockSessionRepository: ISessionRepository = {
  findById: vi.fn(),
  findBySessionNumber: vi.fn(),
  findCurrentByLocation: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getNextSequenceNumber: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('TransactionService', () => {
  let service: TransactionService;

  const mockTenantId = '00000000-0000-0000-0000-000000000100';
  const mockUserId = '00000000-0000-0000-0000-000000000101';
  const mockSessionId = '00000000-0000-0000-0000-000000000102';
  const mockCustomerId = '00000000-0000-0000-0000-000000000001';

  const mockSession: ICashRegisterSession = {
    id: mockSessionId,
    tenantId: mockTenantId,
    locationId: '00000000-0000-0000-0000-000000000103',
    sessionNumber: 'KASSZA-2026-0001',
    openedAt: new Date(),
    openingBalance: 50000,
    status: CashRegisterStatus.OPEN,
    openedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransactionId = '00000000-0000-0000-0000-000000000104';
  const mockSaleItemId = '00000000-0000-0000-0000-000000000105';
  const mockProductId = '00000000-0000-0000-0000-000000000106';

  const mockTransaction: ISaleTransaction = {
    id: mockTransactionId,
    tenantId: mockTenantId,
    sessionId: mockSessionId,
    transactionNumber: 'ELADAS-2026-0001',
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    total: 0,
    paymentStatus: PaymentStatus.PENDING,
    paidAmount: 0,
    changeAmount: 0,
    status: SaleStatus.IN_PROGRESS,
    createdBy: mockUserId,
    createdAt: new Date(),
  };

  const mockSaleItem: ISaleItem = {
    id: mockSaleItemId,
    transactionId: mockTransactionId,
    tenantId: mockTenantId,
    productId: mockProductId,
    productCode: 'MAK-001',
    productName: 'Akkumulátor 18V',
    quantity: 2,
    unitPrice: 10000,
    taxRate: 27,
    discountPercent: 0,
    lineSubtotal: 20000,
    lineTax: 5400,
    lineTotal: 25400,
    inventoryDeducted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TransactionService(
      mockTransactionRepository,
      mockSaleItemRepository,
      mockSessionRepository,
      mockAuditService
    );
  });

  describe('createTransaction()', () => {
    describe('happy path', () => {
      it('should create transaction for open session', async () => {
        const dto: CreateTransactionDto = {
          sessionId: mockSessionId,
        };

        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        (
          mockTransactionRepository.getNextSequenceNumber as ReturnType<typeof vi.fn>
        ).mockResolvedValue(1);
        (mockTransactionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockTransaction
        );

        const result = await service.createTransaction(dto, mockTenantId, mockUserId);

        expect(result.transactionNumber).toMatch(/^ELADAS-\d{4}-\d{4}$/);
        expect(result.transaction.status).toBe(SaleStatus.IN_PROGRESS);
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'transaction_created',
          })
        );
      });

      it('should create transaction with customer info', async () => {
        const dto: CreateTransactionDto = {
          sessionId: mockSessionId,
          customerId: mockCustomerId,
          customerName: 'Nagy János',
          customerTaxNumber: '12345678-1-42',
        };

        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        (
          mockTransactionRepository.getNextSequenceNumber as ReturnType<typeof vi.fn>
        ).mockResolvedValue(1);
        (mockTransactionRepository.create as ReturnType<typeof vi.fn>).mockImplementation(
          async data => ({
            ...mockTransaction,
            ...data,
          })
        );

        await service.createTransaction(dto, mockTenantId, mockUserId);

        expect(mockTransactionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customerId: mockCustomerId,
            customerName: 'Nagy János',
            customerTaxNumber: '12345678-1-42',
          })
        );
      });
    });

    describe('error handling', () => {
      it('should throw error for closed session', async () => {
        const closedSession = { ...mockSession, status: CashRegisterStatus.CLOSED };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          closedSession
        );

        const dto: CreateTransactionDto = { sessionId: mockSessionId };

        await expect(service.createTransaction(dto, mockTenantId, mockUserId)).rejects.toThrow(
          'Session is not open'
        );
      });

      it('should throw error for tenant mismatch on session', async () => {
        const otherTenantSession = {
          ...mockSession,
          tenantId: '00000000-0000-0000-0000-000000000999',
        };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          otherTenantSession
        );

        const dto: CreateTransactionDto = { sessionId: mockSessionId };

        await expect(service.createTransaction(dto, mockTenantId, mockUserId)).rejects.toThrow(
          'Session not found'
        );
      });
    });
  });

  describe('addItem()', () => {
    it('should add item to transaction', async () => {
      const dto: AddItemDto = {
        productId: mockProductId,
        productCode: 'MAK-001',
        productName: 'Akkumulátor 18V',
        quantity: 2,
        unitPrice: 10000,
        taxRate: 27,
        discountPercent: 0,
      };

      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );
      (mockSaleItemRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSaleItem);
      (mockSaleItemRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockSaleItem,
      ]);
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockTransaction, ...data })
      );

      const result = await service.addItem(mockTransactionId, dto, mockTenantId);

      expect(result.lineSubtotal).toBe(20000);
      expect(result.lineTax).toBe(5400);
      expect(result.lineTotal).toBe(25400);
    });

    it('should recalculate transaction totals after adding item', async () => {
      const dto: AddItemDto = {
        productId: mockProductId,
        productCode: 'MAK-001',
        productName: 'Akkumulátor 18V',
        quantity: 2,
        unitPrice: 10000,
        taxRate: 27,
      };

      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );
      (mockSaleItemRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSaleItem);
      (mockSaleItemRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockSaleItem,
      ]);
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockTransaction, ...data })
      );

      await service.addItem(mockTransactionId, dto, mockTenantId);

      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        expect.objectContaining({
          subtotal: 20000,
          taxAmount: 5400,
          total: 25400,
        })
      );
    });

    it('should throw error for completed transaction', async () => {
      const completedTransaction = { ...mockTransaction, status: SaleStatus.COMPLETED };
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        completedTransaction
      );

      const dto: AddItemDto = {
        productId: mockProductId,
        productCode: 'MAK-001',
        productName: 'Item',
        quantity: 1,
        unitPrice: 100,
        taxRate: 27,
      };

      await expect(service.addItem(mockTransactionId, dto, mockTenantId)).rejects.toThrow(
        'Cannot modify completed or voided transaction'
      );
    });
  });

  describe('removeItem()', () => {
    it('should remove item from transaction', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );
      (mockSaleItemRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSaleItem);
      (mockSaleItemRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockTransaction, ...data })
      );

      await service.removeItem(mockTransactionId, mockSaleItemId, mockTenantId);

      expect(mockSaleItemRepository.delete).toHaveBeenCalledWith(mockSaleItemId);
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        expect.objectContaining({
          subtotal: 0,
          taxAmount: 0,
          total: 0,
        })
      );
    });
  });

  describe('updateItem()', () => {
    it('should update item quantity', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );
      (mockSaleItemRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSaleItem);
      (mockSaleItemRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockSaleItem, ...data })
      );
      (mockSaleItemRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockSaleItem,
      ]);
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockTransaction, ...data })
      );

      await service.updateItem(mockTransactionId, mockSaleItemId, { quantity: 3 }, mockTenantId);

      expect(mockSaleItemRepository.update).toHaveBeenCalledWith(
        mockSaleItemId,
        expect.objectContaining({
          quantity: 3,
        })
      );
    });
  });

  describe('voidTransaction()', () => {
    describe('happy path', () => {
      it('should void IN_PROGRESS transaction', async () => {
        const dto: VoidTransactionDto = { reason: 'Customer cancelled' };

        (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockTransaction
        );
        (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
          async (id, data) => ({ ...mockTransaction, ...data })
        );

        const result = await service.voidTransaction(
          mockTransactionId,
          dto,
          mockTenantId,
          mockUserId
        );

        expect(result.status).toBe(SaleStatus.VOIDED);
        expect(result.voidReason).toBe('Customer cancelled');
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'transaction_voided',
          })
        );
      });

      it('should void PENDING_PAYMENT transaction', async () => {
        const pendingTransaction = { ...mockTransaction, status: SaleStatus.PENDING_PAYMENT };
        (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          pendingTransaction
        );
        (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
          async (id, data) => ({ ...pendingTransaction, ...data })
        );

        const dto: VoidTransactionDto = { reason: 'Customer cancelled' };
        const result = await service.voidTransaction(
          mockTransactionId,
          dto,
          mockTenantId,
          mockUserId
        );

        expect(result.status).toBe(SaleStatus.VOIDED);
      });
    });

    describe('error handling', () => {
      it('should throw error for completed transaction', async () => {
        const completedTransaction = { ...mockTransaction, status: SaleStatus.COMPLETED };
        (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          completedTransaction
        );

        const dto: VoidTransactionDto = { reason: 'Test' };

        await expect(
          service.voidTransaction(mockTransactionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Cannot void completed or already voided transaction');
      });

      it('should throw error for already voided transaction', async () => {
        const voidedTransaction = { ...mockTransaction, status: SaleStatus.VOIDED };
        (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          voidedTransaction
        );

        const dto: VoidTransactionDto = { reason: 'Test' };

        await expect(
          service.voidTransaction(mockTransactionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Cannot void completed or already voided transaction');
      });

      it('should require void reason', async () => {
        (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockTransaction
        );

        const dto = { reason: '' } as VoidTransactionDto;

        await expect(
          service.voidTransaction(mockTransactionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Validation failed');
      });
    });
  });

  describe('setCustomer()', () => {
    it('should set customer on transaction', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockTransaction, ...data })
      );

      await service.setCustomer(
        mockTransactionId,
        {
          customerId: mockCustomerId,
          customerName: 'Nagy János',
          customerTaxNumber: '12345678-1-42',
        },
        mockTenantId
      );

      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        expect.objectContaining({
          customerId: mockCustomerId,
          customerName: 'Nagy János',
          customerTaxNumber: '12345678-1-42',
        })
      );
    });

    it('should call update with empty object when no customer data provided', async () => {
      const transactionWithCustomer = {
        ...mockTransaction,
        customerId: mockCustomerId,
        customerName: 'Old Customer',
      };
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        transactionWithCustomer
      );
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...transactionWithCustomer, ...data })
      );

      await service.setCustomer(mockTransactionId, {}, mockTenantId);

      // When input is empty, update should be called with empty object
      // (actual customer clearing should be handled at repository level if needed)
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(mockTransactionId, {});
    });
  });

  describe('getTransactionById()', () => {
    it('should return transaction by id', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );

      const result = await service.getTransactionById(mockTransactionId, mockTenantId);

      expect(result).toEqual(mockTransaction);
    });

    it('should throw error when not found', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getTransactionById(mockTransactionId, mockTenantId)).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );

      await expect(service.getTransactionById(mockTransactionId, 'other-tenant')).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('completeTransaction()', () => {
    it('should change status to PENDING_PAYMENT when items exist', async () => {
      const transactionWithTotal = { ...mockTransaction, total: 25400 };
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        transactionWithTotal
      );
      (mockSaleItemRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockSaleItem,
      ]);
      (mockTransactionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...transactionWithTotal, ...data })
      );

      const result = await service.completeTransaction(mockTransactionId, mockTenantId);

      expect(result.status).toBe(SaleStatus.PENDING_PAYMENT);
    });

    it('should throw error for empty transaction', async () => {
      (mockTransactionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTransaction
      );
      (mockSaleItemRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(service.completeTransaction(mockTransactionId, mockTenantId)).rejects.toThrow(
        'Cannot complete transaction with no items'
      );
    });
  });
});
