/**
 * POS Transaction Service Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPosTransaction } from '../interfaces/pos-transaction.interface';
import type {
  IAuditService,
  IInventoryService,
  IPosTransactionRepository,
  IProductInfo,
  IProductService,
} from './pos-transaction.service';
import { PosTransactionService } from './pos-transaction.service';

// Valid UUIDs for testing
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const LOCATION_ID = '550e8400-e29b-41d4-a716-446655440002';
const REGISTER_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440004';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440005';
const TRANSACTION_ID = '550e8400-e29b-41d4-a716-446655440006';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440007';
const _PAYMENT_ID = '550e8400-e29b-41d4-a716-446655440008';

describe('PosTransactionService', () => {
  let service: PosTransactionService;
  let mockRepository: IPosTransactionRepository;
  let mockProductService: IProductService;
  let mockInventoryService: IInventoryService;
  let mockAuditService: IAuditService;

  const mockProduct: IProductInfo = {
    id: PRODUCT_ID,
    name: 'Test Product',
    sku: 'SKU-001',
    barcode: '1234567890',
    unitPrice: 1000,
    vatRate: 27,
    stockQuantity: 100,
  };

  const mockTransaction: IPosTransaction = {
    id: TRANSACTION_ID,
    tenantId: TENANT_ID,
    locationId: LOCATION_ID,
    registerId: REGISTER_ID,
    transactionNumber: 'TX-2026-0001',
    operatorId: USER_ID,
    items: [],
    payments: [],
    status: 'PENDING',
    netTotal: 0,
    vatTotal: 0,
    grossTotal: 0,
    paidAmount: 0,
    changeAmount: 0,
    navSubmitted: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockTransaction),
      findById: vi.fn().mockResolvedValue(mockTransaction),
      update: vi
        .fn()
        .mockImplementation((id, data) => Promise.resolve({ ...mockTransaction, ...data })),
      findByRegisterAndDate: vi.fn().mockResolvedValue([]),
      generateTransactionNumber: vi.fn().mockResolvedValue('TX-2026-0001'),
    };

    mockProductService = {
      findById: vi.fn().mockResolvedValue(mockProduct),
      findByBarcode: vi.fn().mockResolvedValue(mockProduct),
    };

    mockInventoryService = {
      checkAvailability: vi
        .fn()
        .mockResolvedValue({ success: true, reserved: [], unavailable: [] }),
      reserveStock: vi.fn().mockResolvedValue(undefined),
      commitStock: vi.fn().mockResolvedValue(undefined),
      releaseStock: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new PosTransactionService(
      mockRepository as unknown as IPosTransactionRepository,
      mockProductService as unknown as IProductService,
      mockInventoryService as unknown as IInventoryService,
      mockAuditService as unknown as IAuditService
    );
  });

  describe('createTransaction', () => {
    it('should create a new transaction with empty cart', async () => {
      const input = {
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        registerId: REGISTER_ID,
        operatorId: USER_ID,
      };

      const result = await service.createTransaction(input);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'POS_TRANSACTION_CREATED',
        'PosTransaction',
        expect.any(String),
        expect.objectContaining({ transactionNumber: 'TX-2026-0001' })
      );
    });

    it('should throw error for invalid input', async () => {
      const input = {
        tenantId: 'invalid',
        locationId: LOCATION_ID,
        registerId: REGISTER_ID,
        operatorId: USER_ID,
      };

      await expect(service.createTransaction(input)).rejects.toThrow();
    });
  });

  describe('addItem', () => {
    it('should add item to cart by product ID', async () => {
      const result = await service.addItem(TRANSACTION_ID, {
        productId: PRODUCT_ID,
        quantity: 2,
      });

      expect(result.items).toHaveLength(1);
      expect(mockProductService.findById).toHaveBeenCalledWith(PRODUCT_ID);
      expect(mockInventoryService.checkAvailability).toHaveBeenCalled();
    });

    it('should add item to cart by barcode', async () => {
      const result = await service.addItem(TRANSACTION_ID, {
        barcode: '1234567890',
        quantity: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(mockProductService.findByBarcode).toHaveBeenCalledWith('1234567890');
    });

    it('should throw error when product not found', async () => {
      mockProductService.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      await expect(
        service.addItem(TRANSACTION_ID, { productId: unknownId, quantity: 1 })
      ).rejects.toThrow('Termék nem található');
    });

    it('should throw error when stock unavailable', async () => {
      mockInventoryService.checkAvailability = vi.fn().mockResolvedValue({
        success: false,
        reserved: [],
        unavailable: [{ productId: PRODUCT_ID, requestedQty: 100, availableQty: 5 }],
      });

      await expect(
        service.addItem(TRANSACTION_ID, { productId: PRODUCT_ID, quantity: 100 })
      ).rejects.toThrow('Nincs elegendő készlet');
    });

    it('should throw error when transaction not PENDING', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockTransaction,
        status: 'COMPLETED',
      });

      await expect(
        service.addItem(TRANSACTION_ID, { productId: PRODUCT_ID, quantity: 1 })
      ).rejects.toThrow('Csak PENDING státuszú tranzakcióhoz adható tétel');
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const transactionWithItem = {
        ...mockTransaction,
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            productName: 'Test',
            sku: 'SKU-001',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 27,
            discountPercent: 0,
            netAmount: 1000,
            vatAmount: 270,
            grossAmount: 1270,
          },
        ],
      };
      mockRepository.findById = vi.fn().mockResolvedValue(transactionWithItem);

      const result = await service.removeItem(TRANSACTION_ID, ITEM_ID);

      expect(result.items).toHaveLength(0);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'POS_ITEM_REMOVED',
        'PosTransaction',
        TRANSACTION_ID,
        { itemId: ITEM_ID }
      );
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      const transactionWithItem = {
        ...mockTransaction,
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            productName: 'Test',
            sku: 'SKU-001',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 27,
            discountPercent: 0,
            netAmount: 1000,
            vatAmount: 270,
            grossAmount: 1270,
          },
        ],
      };
      mockRepository.findById = vi.fn().mockResolvedValue(transactionWithItem);

      const result = await service.updateItemQuantity(TRANSACTION_ID, ITEM_ID, 3);

      expect(result.items[0]?.quantity).toBe(3);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'POS_ITEM_QUANTITY_UPDATED',
        'PosTransaction',
        TRANSACTION_ID,
        expect.objectContaining({ oldQuantity: 1, newQuantity: 3 })
      );
    });
  });

  describe('applyItemDiscount', () => {
    it('should apply discount to item', async () => {
      const transactionWithItem = {
        ...mockTransaction,
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            productName: 'Test',
            sku: 'SKU-001',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 27,
            discountPercent: 0,
            netAmount: 1000,
            vatAmount: 270,
            grossAmount: 1270,
          },
        ],
      };
      mockRepository.findById = vi.fn().mockResolvedValue(transactionWithItem);

      const result = await service.applyItemDiscount(TRANSACTION_ID, ITEM_ID, 10);

      expect(result.items[0]?.discountPercent).toBe(10);
      expect(result.items[0]?.netAmount).toBe(900); // 1000 - 10%
    });

    it('should throw error for invalid discount', async () => {
      await expect(service.applyItemDiscount(TRANSACTION_ID, ITEM_ID, 150)).rejects.toThrow(
        'Kedvezmény 0-100% között lehet'
      );
    });
  });

  describe('addPayment', () => {
    it('should add payment to transaction', async () => {
      const result = await service.addPayment(TRANSACTION_ID, {
        method: 'CASH',
        amount: 1000,
      });

      expect(result.payments).toHaveLength(1);
      expect(result.status).toBe('PROCESSING');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'POS_PAYMENT_ADDED',
        'PosTransaction',
        TRANSACTION_ID,
        expect.objectContaining({ method: 'CASH', amount: 1000 })
      );
    });

    it('should calculate change amount', async () => {
      const transactionWithTotal = {
        ...mockTransaction,
        grossTotal: 1000,
      };
      mockRepository.findById = vi.fn().mockResolvedValue(transactionWithTotal);

      const result = await service.addPayment(TRANSACTION_ID, {
        method: 'CASH',
        amount: 1500,
      });

      expect(result.paidAmount).toBe(1500);
      expect(result.changeAmount).toBe(500);
    });
  });

  describe('completeTransaction', () => {
    it('should complete transaction when fully paid', async () => {
      const paidTransaction = {
        ...mockTransaction,
        status: 'PROCESSING',
        grossTotal: 1000,
        paidAmount: 1000,
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            productName: 'Test',
            sku: 'SKU-001',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 27,
            discountPercent: 0,
            netAmount: 1000,
            vatAmount: 270,
            grossAmount: 1270,
          },
        ],
      };
      mockRepository.findById = vi.fn().mockResolvedValue(paidTransaction);

      const result = await service.completeTransaction(TRANSACTION_ID);

      expect(result.status).toBe('COMPLETED');
      expect(result.receiptNumber).toBeDefined();
      expect(mockInventoryService.reserveStock).toHaveBeenCalled();
      expect(mockInventoryService.commitStock).toHaveBeenCalled();
    });

    it('should throw error when payment insufficient', async () => {
      const underpaidTransaction = {
        ...mockTransaction,
        status: 'PROCESSING',
        grossTotal: 1000,
        paidAmount: 500,
        items: [{ id: ITEM_ID }],
      };
      mockRepository.findById = vi.fn().mockResolvedValue(underpaidTransaction);

      await expect(service.completeTransaction(TRANSACTION_ID)).rejects.toThrow(
        'Fizetés nem elegendő'
      );
    });

    it('should throw error for empty cart', async () => {
      const emptyTransaction = {
        ...mockTransaction,
        status: 'PROCESSING',
        grossTotal: 0,
        paidAmount: 0,
        items: [],
      };
      mockRepository.findById = vi.fn().mockResolvedValue(emptyTransaction);

      await expect(service.completeTransaction(TRANSACTION_ID)).rejects.toThrow(
        'Üres kosár nem zárható le'
      );
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel pending transaction', async () => {
      const result = await service.cancelTransaction(TRANSACTION_ID, 'Customer changed mind');

      expect(result.status).toBe('CANCELLED');
      expect(result.notes).toBe('Customer changed mind');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'POS_TRANSACTION_CANCELLED',
        'PosTransaction',
        TRANSACTION_ID,
        { reason: 'Customer changed mind' }
      );
    });

    it('should release stock when cancelling processing transaction', async () => {
      const processingTransaction = {
        ...mockTransaction,
        status: 'PROCESSING',
      };
      mockRepository.findById = vi.fn().mockResolvedValue(processingTransaction);

      await service.cancelTransaction(TRANSACTION_ID, 'Cancelled');

      expect(mockInventoryService.releaseStock).toHaveBeenCalledWith(TRANSACTION_ID);
    });

    it('should throw error when cancelling completed transaction', async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: 'COMPLETED',
      };
      mockRepository.findById = vi.fn().mockResolvedValue(completedTransaction);

      await expect(service.cancelTransaction(TRANSACTION_ID, 'Reason')).rejects.toThrow(
        'Lezárt vagy visszáruzott tranzakció nem vonható vissza'
      );
    });
  });

  describe('getTransaction', () => {
    it('should return transaction by ID', async () => {
      const result = await service.getTransaction(TRANSACTION_ID);

      expect(result).toEqual(mockTransaction);
      expect(mockRepository.findById).toHaveBeenCalledWith(TRANSACTION_ID);
    });

    it('should return null for non-existent transaction', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      const result = await service.getTransaction(unknownId);

      expect(result).toBeNull();
    });
  });

  describe('getDailyTransactions', () => {
    it('should return daily transactions for register', async () => {
      const mockTransactions = [mockTransaction];
      mockRepository.findByRegisterAndDate = vi.fn().mockResolvedValue(mockTransactions);

      const result = await service.getDailyTransactions(REGISTER_ID, new Date());

      expect(result).toEqual(mockTransactions);
    });
  });

  describe('checkStockAvailability', () => {
    it('should check stock availability', async () => {
      const items = [{ productId: PRODUCT_ID, quantity: 5 }];

      const result = await service.checkStockAvailability(items);

      expect(mockInventoryService.checkAvailability).toHaveBeenCalledWith(items);
      expect(result.success).toBe(true);
    });
  });
});
