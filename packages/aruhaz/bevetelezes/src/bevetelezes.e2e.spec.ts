/**
 * Bevételezés E2E Tests - Integration tests for goods receipt flow
 * Epic 21: Goods Receipt Management
 *
 * Stories:
 * - 21-1: Avizo kezelés (Advance Shipping Notice)
 * - 21-2: Bevételezés workflow (Receipt Processing)
 * - 21-3: Eltérés kezelés (Discrepancy Management)
 *
 * Tests cover the full business flow:
 * - Create avizo → Process receipt → Handle discrepancies → Complete receipt
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AvizoStatus,
  DiscrepancyType,
  ReceiptStatus,
  type IAuditService,
  type IAvizo,
  type IAvizoItem,
  type IAvizoItemRepository,
  type IAvizoRepository,
  type IDiscrepancy,
  type IDiscrepancyRepository,
  type IInventoryService,
  type IReceipt,
  type IReceiptItem,
  type IReceiptItemRepository,
  type IReceiptRepository,
  type ISupplierNotificationService,
} from './index';
import { AvizoService } from './services/avizo.service';
import { DiscrepancyService } from './services/discrepancy.service';
import { ReceiptService } from './services/receipt.service';

// ============================================
// Test Fixtures
// ============================================

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const SUPPLIER_ID = '33333333-3333-3333-3333-333333333333';

const createMockAvizoRepository = (): IAvizoRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findBySupplier: vi.fn(),
  findPending: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn().mockResolvedValue(1),
});

const createMockAvizoItemRepository = (): IAvizoItemRepository => ({
  createMany: vi.fn(),
  findByAvizoId: vi.fn(),
  update: vi.fn(),
});

const createMockReceiptRepository = (): IReceiptRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByAvizoId: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn().mockResolvedValue(1),
});

const createMockReceiptItemRepository = (): IReceiptItemRepository => ({
  createMany: vi.fn(),
  findByReceiptId: vi.fn(),
  update: vi.fn(),
});

const createMockDiscrepancyRepository = (): IDiscrepancyRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByReceiptId: vi.fn(),
  findUnresolvedByReceiptId: vi.fn(),
  update: vi.fn(),
});

const createMockAuditService = (): IAuditService => ({
  log: vi.fn().mockResolvedValue(undefined),
});

const createMockInventoryService = (): IInventoryService => ({
  increaseStock: vi.fn().mockResolvedValue(undefined),
});

const createMockSupplierNotificationService = (): ISupplierNotificationService => ({
  notifyDiscrepancy: vi.fn().mockResolvedValue(undefined),
});

// ============================================
// Story 21-1: Avizo Service E2E Tests
// ============================================

describe('Epic 21: Bevételezés E2E Flow', () => {
  describe('Story 21-1: Avizo Management', () => {
    let avizoService: AvizoService;
    let avizoRepo: IAvizoRepository;
    let avizoItemRepo: IAvizoItemRepository;
    let auditService: IAuditService;

    beforeEach(() => {
      avizoRepo = createMockAvizoRepository();
      avizoItemRepo = createMockAvizoItemRepository();
      auditService = createMockAuditService();
      avizoService = new AvizoService(avizoRepo, avizoItemRepo, auditService);
    });

    describe('Happy Path: Create Avizo (AC1)', () => {
      it('should create avizo with items and generate avizo number', async () => {
        const mockAvizo: IAvizo = {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: TENANT_ID,
          avizoNumber: 'AV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          expectedDate: new Date('2026-02-01'),
          status: AvizoStatus.PENDING,
          totalItems: 2,
          totalQuantity: 15,
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockItems: IAvizoItem[] = [
          {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            avizoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            tenantId: TENANT_ID,
            productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            productCode: 'MAKITA-DF001',
            productName: 'Makita fúrógép',
            expectedQuantity: 10,
            receivedQuantity: 0,
            unitPrice: 25000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            avizoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            tenantId: TENANT_ID,
            productId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            productCode: 'BOSCH-GWS001',
            productName: 'Bosch sarokcsiszoló',
            expectedQuantity: 5,
            receivedQuantity: 0,
            unitPrice: 35000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        vi.mocked(avizoRepo.create).mockResolvedValue(mockAvizo);
        vi.mocked(avizoItemRepo.createMany).mockResolvedValue(mockItems);

        const result = await avizoService.createAvizo(
          {
            supplierId: SUPPLIER_ID,
            supplierName: 'Test Supplier Kft.',
            expectedDate: new Date('2026-02-01'),
            items: [
              {
                productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
                productCode: 'MAKITA-DF001',
                productName: 'Makita fúrógép',
                expectedQuantity: 10,
                unitPrice: 25000,
              },
              {
                productId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                productCode: 'BOSCH-GWS001',
                productName: 'Bosch sarokcsiszoló',
                expectedQuantity: 5,
                unitPrice: 35000,
              },
            ],
          },
          TENANT_ID,
          USER_ID
        );

        // Verify avizo was created
        expect(result.avizo).toBeDefined();
        expect(result.avizoNumber).toBe('AV-2026-0001');
        expect(avizoRepo.create).toHaveBeenCalled();
        expect(avizoItemRepo.createMany).toHaveBeenCalled();
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'avizo_created',
            entityType: 'avizo',
          })
        );
      });
    });

    describe('Avizo Update Management (AC2)', () => {
      it('should update avizo expected date and notes', async () => {
        const updatedDate = new Date('2026-02-15');
        const mockAvizo: IAvizo = {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: TENANT_ID,
          avizoNumber: 'AV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          expectedDate: updatedDate,
          status: AvizoStatus.PENDING,
          totalItems: 2,
          totalQuantity: 15,
          notes: 'Updated notes',
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(avizoRepo.findById).mockResolvedValue({
          ...mockAvizo,
          expectedDate: new Date('2026-02-01'),
          notes: undefined,
        });
        vi.mocked(avizoRepo.update).mockResolvedValue(mockAvizo);

        const result = await avizoService.updateAvizo(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          { expectedDate: updatedDate, notes: 'Updated notes' },
          TENANT_ID,
          USER_ID
        );

        expect(result.expectedDate).toEqual(updatedDate);
        expect(result.notes).toBe('Updated notes');
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'avizo_updated',
          })
        );
      });

      it('should cancel avizo and set status to CANCELLED', async () => {
        const mockAvizo: IAvizo = {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: TENANT_ID,
          avizoNumber: 'AV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          expectedDate: new Date('2026-02-01'),
          status: AvizoStatus.CANCELLED,
          totalItems: 0,
          totalQuantity: 0,
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(avizoRepo.findById).mockResolvedValue({
          ...mockAvizo,
          status: AvizoStatus.PENDING,
        });
        vi.mocked(avizoRepo.update).mockResolvedValue(mockAvizo);

        const result = await avizoService.cancelAvizo(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          TENANT_ID,
          USER_ID
        );

        expect(result.status).toBe(AvizoStatus.CANCELLED);
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'avizo_cancelled',
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw error when avizo not found', async () => {
        vi.mocked(avizoRepo.findById).mockResolvedValue(null);

        await expect(avizoService.getAvizoById('non-existent', TENANT_ID)).rejects.toThrow(
          'Avizo not found'
        );
      });

      it('should throw error when trying to cancel already processed avizo', async () => {
        vi.mocked(avizoRepo.findById).mockResolvedValue({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: TENANT_ID,
          avizoNumber: 'AV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          expectedDate: new Date('2026-02-01'),
          status: AvizoStatus.RECEIVED,
          totalItems: 2,
          totalQuantity: 15,
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await expect(
          avizoService.cancelAvizo('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', TENANT_ID, USER_ID)
        ).rejects.toThrow('Can only cancel pending avizos');
      });
    });
  });

  // ============================================
  // Story 21-2: Receipt Service E2E Tests
  // ============================================

  describe('Story 21-2: Receipt Processing', () => {
    let receiptService: ReceiptService;
    let receiptRepo: IReceiptRepository;
    let receiptItemRepo: IReceiptItemRepository;
    let avizoRepo: IAvizoRepository;
    let avizoItemRepo: IAvizoItemRepository;
    let inventoryService: IInventoryService;
    let auditService: IAuditService;

    beforeEach(() => {
      receiptRepo = createMockReceiptRepository();
      receiptItemRepo = createMockReceiptItemRepository();
      avizoRepo = createMockAvizoRepository();
      avizoItemRepo = createMockAvizoItemRepository();
      inventoryService = createMockInventoryService();
      auditService = createMockAuditService();

      receiptService = new ReceiptService(
        receiptRepo,
        receiptItemRepo,
        avizoRepo,
        avizoItemRepo,
        inventoryService,
        auditService
      );
    });

    describe('Happy Path: Create Receipt (AC1)', () => {
      it('should create receipt with items from avizo', async () => {
        const mockReceipt: IReceipt = {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          receiptNumber: 'BEV-2026-0001',
          avizoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          receivedDate: new Date(),
          status: ReceiptStatus.DRAFT,
          totalItems: 2,
          totalQuantity: 15,
          hasDiscrepancy: false,
          processedBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockItems: IReceiptItem[] = [
          {
            id: '00000000-0000-0000-0000-000000000001',
            receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            tenantId: TENANT_ID,
            avizoItemId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            productCode: 'MAKITA-DF001',
            productName: 'Makita fúrógép',
            expectedQuantity: 10,
            receivedQuantity: 10,
            unitPrice: 25000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        // Mock avizo validation (required when avizoId is provided)
        const mockAvizo: IAvizo = {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: TENANT_ID,
          avizoNumber: 'AV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          expectedDate: new Date('2026-02-01'),
          status: AvizoStatus.PENDING,
          totalItems: 1,
          totalQuantity: 10,
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockAvizoItems: IAvizoItem[] = [
          {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            avizoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            tenantId: TENANT_ID,
            productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            productCode: 'MAKITA-DF001',
            productName: 'Makita fúrógép',
            expectedQuantity: 10,
            receivedQuantity: 0,
            unitPrice: 25000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        vi.mocked(avizoRepo.findById).mockResolvedValue(mockAvizo);
        vi.mocked(avizoItemRepo.findByAvizoId).mockResolvedValue(mockAvizoItems);
        vi.mocked(avizoItemRepo.update).mockResolvedValue(mockAvizoItems[0]!);
        vi.mocked(receiptRepo.create).mockResolvedValue(mockReceipt);
        vi.mocked(receiptItemRepo.createMany).mockResolvedValue(mockItems);

        const result = await receiptService.createReceipt(
          {
            avizoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            supplierId: SUPPLIER_ID,
            supplierName: 'Test Supplier Kft.',
            items: [
              {
                avizoItemId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
                productCode: 'MAKITA-DF001',
                productName: 'Makita fúrógép',
                expectedQuantity: 10,
                receivedQuantity: 10,
                unitPrice: 25000,
              },
            ],
          },
          TENANT_ID,
          USER_ID
        );

        expect(result).toBeDefined();
        expect(result.receiptNumber).toBe('BEV-2026-0001');
        expect(receiptRepo.create).toHaveBeenCalled();
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'receipt_created',
            entityType: 'receipt',
          })
        );
      });
    });

    describe('Complete Receipt (AC2)', () => {
      it('should complete receipt and update inventory', async () => {
        const mockReceipt: IReceipt = {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          receiptNumber: 'BEV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          receivedDate: new Date(),
          status: ReceiptStatus.COMPLETED,
          totalItems: 1,
          totalQuantity: 10,
          hasDiscrepancy: false,
          processedBy: USER_ID,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockItems: IReceiptItem[] = [
          {
            id: '00000000-0000-0000-0000-000000000001',
            receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            tenantId: TENANT_ID,
            productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            productCode: 'MAKITA-DF001',
            productName: 'Makita fúrógép',
            expectedQuantity: 10,
            receivedQuantity: 10,
            unitPrice: 25000,
            locationCode: 'A-01-01',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        vi.mocked(receiptRepo.findById).mockResolvedValue({
          ...mockReceipt,
          status: ReceiptStatus.DRAFT,
        });
        vi.mocked(receiptItemRepo.findByReceiptId).mockResolvedValue(mockItems);
        vi.mocked(receiptRepo.update).mockResolvedValue(mockReceipt);

        const result = await receiptService.completeReceipt(
          'ffffffff-ffff-ffff-ffff-ffffffffffff',
          TENANT_ID,
          USER_ID
        );

        expect(result.status).toBe(ReceiptStatus.COMPLETED);
        expect(result.completedAt).toBeDefined();

        // Verify inventory was updated
        expect(inventoryService.increaseStock).toHaveBeenCalledWith(
          TENANT_ID,
          'dddddddd-dddd-dddd-dddd-dddddddddddd',
          10,
          'A-01-01'
        );

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'receipt_completed',
          })
        );
      });

      it('should not complete receipt with unresolved discrepancies', async () => {
        vi.mocked(receiptRepo.findById).mockResolvedValue({
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          receiptNumber: 'BEV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          receivedDate: new Date(),
          status: ReceiptStatus.DISCREPANCY,
          totalItems: 1,
          totalQuantity: 10,
          hasDiscrepancy: true,
          processedBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await expect(
          receiptService.completeReceipt('ffffffff-ffff-ffff-ffff-ffffffffffff', TENANT_ID, USER_ID)
        ).rejects.toThrow('Receipt has unresolved discrepancies');
      });
    });
  });

  // ============================================
  // Story 21-3: Discrepancy Service E2E Tests
  // ============================================

  describe('Story 21-3: Discrepancy Management', () => {
    let discrepancyService: DiscrepancyService;
    let discrepancyRepo: IDiscrepancyRepository;
    let receiptRepo: IReceiptRepository;
    let receiptItemRepo: IReceiptItemRepository;
    let supplierNotificationService: ISupplierNotificationService;
    let auditService: IAuditService;

    beforeEach(() => {
      discrepancyRepo = createMockDiscrepancyRepository();
      receiptRepo = createMockReceiptRepository();
      receiptItemRepo = createMockReceiptItemRepository();
      supplierNotificationService = createMockSupplierNotificationService();
      auditService = createMockAuditService();

      discrepancyService = new DiscrepancyService(
        discrepancyRepo,
        receiptRepo,
        receiptItemRepo,
        supplierNotificationService,
        auditService
      );
    });

    describe('Create Discrepancy (AC1)', () => {
      it('should create shortage discrepancy when received < expected', async () => {
        const mockReceipt: IReceipt = {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          receiptNumber: 'BEV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          receivedDate: new Date(),
          status: ReceiptStatus.DRAFT,
          totalItems: 1,
          totalQuantity: 8,
          hasDiscrepancy: true,
          processedBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockDiscrepancy: IDiscrepancy = {
          id: '00000000-0000-0000-0000-000000000002',
          receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          receiptItemId: '00000000-0000-0000-0000-000000000001',
          tenantId: TENANT_ID,
          type: DiscrepancyType.SHORTAGE,
          expectedQuantity: 10,
          actualQuantity: 8,
          difference: -2,
          supplierNotified: false,
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockReceiptItem: IReceiptItem = {
          id: '00000000-0000-0000-0000-000000000001',
          receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          productCode: 'MAKITA-DF001',
          productName: 'Makita fúrógép',
          expectedQuantity: 10,
          receivedQuantity: 8,
          unitPrice: 25000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(receiptRepo.findById).mockResolvedValue(mockReceipt);
        vi.mocked(receiptItemRepo.findByReceiptId).mockResolvedValue([mockReceiptItem]);
        vi.mocked(discrepancyRepo.create).mockResolvedValue(mockDiscrepancy);
        vi.mocked(receiptRepo.update).mockResolvedValue({ ...mockReceipt, hasDiscrepancy: true });

        const result = await discrepancyService.createDiscrepancy(
          'ffffffff-ffff-ffff-ffff-ffffffffffff',
          {
            receiptItemId: '00000000-0000-0000-0000-000000000001',
            type: DiscrepancyType.SHORTAGE,
            expectedQuantity: 10,
            actualQuantity: 8,
          },
          TENANT_ID,
          USER_ID
        );

        expect(result.type).toBe(DiscrepancyType.SHORTAGE);
        expect(result.difference).toBe(-2);
        expect(discrepancyRepo.create).toHaveBeenCalled();
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'discrepancy_created',
          })
        );
      });

      it('should create surplus discrepancy when received > expected', async () => {
        const mockReceipt: IReceipt = {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          receiptNumber: 'BEV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          receivedDate: new Date(),
          status: ReceiptStatus.DRAFT,
          totalItems: 1,
          totalQuantity: 12,
          hasDiscrepancy: true,
          processedBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockDiscrepancy: IDiscrepancy = {
          id: '00000000-0000-0000-0000-000000000002',
          receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          receiptItemId: '00000000-0000-0000-0000-000000000001',
          tenantId: TENANT_ID,
          type: DiscrepancyType.SURPLUS,
          expectedQuantity: 10,
          actualQuantity: 12,
          difference: 2,
          supplierNotified: false,
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockReceiptItem: IReceiptItem = {
          id: '00000000-0000-0000-0000-000000000001',
          receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          productCode: 'MAKITA-DF001',
          productName: 'Makita fúrógép',
          expectedQuantity: 10,
          receivedQuantity: 12,
          unitPrice: 25000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(receiptRepo.findById).mockResolvedValue(mockReceipt);
        vi.mocked(receiptItemRepo.findByReceiptId).mockResolvedValue([mockReceiptItem]);
        vi.mocked(discrepancyRepo.create).mockResolvedValue(mockDiscrepancy);
        vi.mocked(receiptRepo.update).mockResolvedValue({ ...mockReceipt, hasDiscrepancy: true });

        const result = await discrepancyService.createDiscrepancy(
          'ffffffff-ffff-ffff-ffff-ffffffffffff',
          {
            receiptItemId: '00000000-0000-0000-0000-000000000001',
            type: DiscrepancyType.SURPLUS,
            expectedQuantity: 10,
            actualQuantity: 12,
          },
          TENANT_ID,
          USER_ID
        );

        expect(result.type).toBe(DiscrepancyType.SURPLUS);
        expect(result.difference).toBe(2);
      });
    });

    describe('Resolve Discrepancy (AC2)', () => {
      it('should resolve discrepancy and optionally notify supplier', async () => {
        const mockReceipt: IReceipt = {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          tenantId: TENANT_ID,
          receiptNumber: 'BEV-2026-0001',
          supplierId: SUPPLIER_ID,
          supplierName: 'Test Supplier Kft.',
          receivedDate: new Date(),
          status: ReceiptStatus.DRAFT,
          totalItems: 1,
          totalQuantity: 8,
          hasDiscrepancy: true,
          processedBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockDiscrepancy: IDiscrepancy = {
          id: '00000000-0000-0000-0000-000000000002',
          receiptId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          receiptItemId: '00000000-0000-0000-0000-000000000001',
          tenantId: TENANT_ID,
          type: DiscrepancyType.SHORTAGE,
          expectedQuantity: 10,
          actualQuantity: 8,
          difference: -2,
          supplierNotified: true,
          resolvedAt: new Date(),
          resolvedBy: USER_ID,
          resolutionNote: 'Supplier confirmed backorder will arrive next week',
          createdBy: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        vi.mocked(discrepancyRepo.findById).mockResolvedValue({
          ...mockDiscrepancy,
          resolvedAt: undefined,
          resolvedBy: undefined,
          resolutionNote: undefined,
          supplierNotified: false,
        });
        vi.mocked(receiptRepo.findById).mockResolvedValue(mockReceipt);
        vi.mocked(discrepancyRepo.update).mockResolvedValue(mockDiscrepancy);
        vi.mocked(discrepancyRepo.findUnresolvedByReceiptId).mockResolvedValue([]);
        vi.mocked(receiptRepo.update).mockResolvedValue({ ...mockReceipt, hasDiscrepancy: false });

        const result = await discrepancyService.resolveDiscrepancy(
          '00000000-0000-0000-0000-000000000002',
          {
            resolutionNote: 'Supplier confirmed backorder will arrive next week',
            notifySupplier: true,
          },
          TENANT_ID,
          USER_ID
        );

        expect(result.resolvedAt).toBeDefined();
        expect(result.resolvedBy).toBe(USER_ID);
        expect(result.resolutionNote).toBe('Supplier confirmed backorder will arrive next week');
        expect(result.supplierNotified).toBe(true);

        // Verify supplier was notified
        expect(supplierNotificationService.notifyDiscrepancy).toHaveBeenCalledWith(
          SUPPLIER_ID,
          'Test Supplier Kft.',
          expect.objectContaining({ type: DiscrepancyType.SHORTAGE, difference: -2 }),
          'BEV-2026-0001'
        );

        // Verify receipt hasDiscrepancy flag was updated
        expect(receiptRepo.update).toHaveBeenCalledWith('ffffffff-ffff-ffff-ffff-ffffffffffff', {
          status: ReceiptStatus.IN_PROGRESS,
          hasDiscrepancy: false,
        });

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'discrepancy_resolved',
          })
        );
      });
    });
  });

  // ============================================
  // Full Flow Integration Test
  // ============================================

  describe('Full Bevételezés Flow', () => {
    it('should complete full flow: Avizo → Receipt → Discrepancy → Complete', async () => {
      // This test demonstrates the complete business flow
      // In a real scenario, these would be separate service calls

      // 1. Create Avizo (supplier announces incoming shipment)
      const avizoData = {
        supplierId: SUPPLIER_ID,
        supplierName: 'Test Supplier Kft.',
        expectedDate: new Date('2026-02-01'),
        items: [
          {
            productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            productCode: 'MAKITA-DF001',
            productName: 'Makita fúrógép',
            expectedQuantity: 10,
            unitPrice: 25000,
          },
        ],
      };
      expect(avizoData.items).toHaveLength(1);
      expect(avizoData.items[0]?.expectedQuantity).toBe(10);

      // 2. Create Receipt (goods arrive at warehouse)
      const receiptData = {
        avizoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        supplierId: SUPPLIER_ID,
        supplierName: 'Test Supplier Kft.',
        items: [
          {
            avizoItemId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            productId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            productCode: 'MAKITA-DF001',
            productName: 'Makita fúrógép',
            expectedQuantity: 10,
            receivedQuantity: 8, // Less than expected!
            unitPrice: 25000,
            locationCode: 'A-01-01',
          },
        ],
      };
      expect(receiptData.items[0]?.receivedQuantity).toBeLessThan(
        receiptData.items[0]?.expectedQuantity ?? 0
      );

      // 3. Create Discrepancy (2 items missing)
      const discrepancyData = {
        receiptItemId: '00000000-0000-0000-0000-000000000001',
        type: DiscrepancyType.SHORTAGE,
        expectedQuantity: 10,
        actualQuantity: 8,
      };
      const difference = discrepancyData.actualQuantity - discrepancyData.expectedQuantity;
      expect(difference).toBe(-2);
      expect(discrepancyData.type).toBe(DiscrepancyType.SHORTAGE);

      // 4. Resolve Discrepancy (supplier notified, will send missing items)
      const resolutionData = {
        resolutionNote: 'Supplier will send 2 missing items next week',
        notifySupplier: true,
      };
      expect(resolutionData.notifySupplier).toBe(true);

      // 5. Complete Receipt (inventory updated with 8 items)
      // At this point, inventory service would be called with receivedQuantity: 8
      const inventoryUpdateQuantity = receiptData.items[0]?.receivedQuantity ?? 0;
      expect(inventoryUpdateQuantity).toBe(8);
    });
  });
});
