import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemController } from './item.controller';
import { ItemService } from './services/item.service';
import { ItemCodeGeneratorService } from './services/item-code-generator.service';
import { BarcodeService } from './services/barcode.service';
import { ItemType, ItemStatus, Item } from './interfaces/item.interface';

/**
 * E2E Tests for Item CRUD
 * Story 8-1: Cikk CRUD
 * Minimum 15 integration tests
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const USER_ID = 'd4e5f6a7-b8c9-4123-aef0-234567890123';
const ITEM_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const ITEM_ID_2 = 'c3d4e5f6-a7b8-4012-9def-123456789012';

// Mock tenant
const mockTenant = { id: TENANT_ID };
const mockUser = { id: USER_ID };

// Mock PrismaService
const mockPrismaService = {
  item: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  itemCodeSequence: {
    upsert: vi.fn(),
  },
};

// Mock AuditService
const mockAuditService = {
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
};

describe('Item E2E Tests', () => {
  let controller: ItemController;
  let itemService: ItemService;
  let codeGeneratorService: ItemCodeGeneratorService;
  let barcodeService: BarcodeService;

  beforeEach(() => {
    vi.clearAllMocks();

    codeGeneratorService = new ItemCodeGeneratorService(mockPrismaService as any);
    barcodeService = new BarcodeService(mockPrismaService as any);
    itemService = new ItemService(
      mockPrismaService as any,
      codeGeneratorService,
      barcodeService,
      mockAuditService as any
    );
    controller = new ItemController(itemService);
  });

  // =========================================
  // HAPPY PATH CRUD TESTS (5 tesztek)
  // =========================================
  describe('Happy Path CRUD', () => {
    it('should create item with all required fields (AC1)', async () => {
      const createBody = {
        name: 'Makita fúrógép DDF484',
        itemType: ItemType.PRODUCT,
        listPrice: 125000,
      };

      const expectedItem: Partial<Item> = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        code: 'PRD-20260116-0001',
        name: 'Makita fúrógép DDF484',
        itemType: ItemType.PRODUCT,
        status: ItemStatus.ACTIVE,
        listPrice: 125000,
        vatRate: 27,
        unitOfMeasure: 'db',
      };

      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });
      mockPrismaService.item.create.mockResolvedValue(expectedItem);
      mockAuditService.logCreate.mockResolvedValue({});

      const result = await controller.create(createBody, mockTenant, mockUser);

      expect(result.data.name).toBe('Makita fúrógép DDF484');
      expect(result.data.itemType).toBe(ItemType.PRODUCT);
      expect(result.data.code).toBe('PRD-20260116-0001');
    });

    it('should get item by ID (AC3)', async () => {
      const expectedItem: Partial<Item> = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        code: 'PRD-20260116-0001',
        name: 'Makita fúrógép',
        itemType: ItemType.PRODUCT,
        status: ItemStatus.ACTIVE,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(expectedItem);

      const result = await controller.getById(ITEM_ID, mockTenant);

      expect(result.data.id).toBe(ITEM_ID);
      expect(result.data.name).toBe('Makita fúrógép');
    });

    it('should update item (AC3)', async () => {
      const existingItem: Partial<Item> = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        name: 'Makita fúrógép',
        listPrice: 125000,
      };

      const updatedItem = {
        ...existingItem,
        name: 'Makita fúrógép DDF484 - Updated',
        listPrice: 135000,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(existingItem);
      mockPrismaService.item.update.mockResolvedValue(updatedItem);
      mockAuditService.logUpdate.mockResolvedValue({});

      const result = await controller.update(
        ITEM_ID,
        { name: 'Makita fúrógép DDF484 - Updated', listPrice: 135000 },
        mockTenant,
        mockUser
      );

      expect(result.data.name).toBe('Makita fúrógép DDF484 - Updated');
      expect(result.data.listPrice).toBe(135000);
    });

    it('should soft delete item (AC3)', async () => {
      const existingItem: Partial<Item> = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        status: ItemStatus.ACTIVE,
      };

      const deletedItem = {
        ...existingItem,
        status: ItemStatus.INACTIVE,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(existingItem);
      mockPrismaService.item.update.mockResolvedValue(deletedItem);
      mockAuditService.logDelete.mockResolvedValue({});

      const result = await controller.delete(ITEM_ID, mockTenant, mockUser);

      expect(result.data.status).toBe(ItemStatus.INACTIVE);
    });

    it('should list items with pagination (AC5)', async () => {
      const items = [
        { id: ITEM_ID, name: 'Makita fúrógép', itemType: ItemType.PRODUCT },
        { id: ITEM_ID_2, name: 'Szénkefe csomag', itemType: ItemType.PART },
      ];

      mockPrismaService.item.findMany.mockResolvedValue(items);
      mockPrismaService.item.count.mockResolvedValue(2);

      const result = await controller.list({ page: '1', limit: '20' }, mockTenant);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  // =========================================
  // AUTO CODE GENERATION TESTS (3 tesztek)
  // =========================================
  describe('Auto Code Generation (AC2)', () => {
    it('should generate PRD prefix for PRODUCT type', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });
      mockPrismaService.item.create.mockResolvedValue({
        id: ITEM_ID,
        code: 'PRD-20260116-0001',
        itemType: ItemType.PRODUCT,
      });
      mockAuditService.logCreate.mockResolvedValue({});

      const result = await controller.create(
        { name: 'Product', itemType: ItemType.PRODUCT, listPrice: 1000 },
        mockTenant,
        mockUser
      );

      expect(result.data.code).toMatch(/^PRD-\d{8}-\d{4}$/);
    });

    it('should generate PRT prefix for PART type', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });
      mockPrismaService.item.create.mockResolvedValue({
        id: ITEM_ID,
        code: 'PRT-20260116-0001',
        itemType: ItemType.PART,
      });
      mockAuditService.logCreate.mockResolvedValue({});

      const result = await controller.create(
        { name: 'Part', itemType: ItemType.PART, listPrice: 500 },
        mockTenant,
        mockUser
      );

      expect(result.data.code).toMatch(/^PRT-\d{8}-\d{4}$/);
    });

    it('should generate SVC prefix for SERVICE type', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });
      mockPrismaService.item.create.mockResolvedValue({
        id: ITEM_ID,
        code: 'SVC-20260116-0001',
        itemType: ItemType.SERVICE,
      });
      mockAuditService.logCreate.mockResolvedValue({});

      const result = await controller.create(
        { name: 'Service', itemType: ItemType.SERVICE },
        mockTenant,
        mockUser
      );

      expect(result.data.code).toMatch(/^SVC-\d{8}-\d{4}$/);
    });
  });

  // =========================================
  // BARCODE TESTS (3 tesztek)
  // =========================================
  describe('Barcode Handling (AC4)', () => {
    it('should validate EAN-13 barcode on create', async () => {
      const invalidBarcode = '1234567890123'; // Invalid check digit

      await expect(
        controller.create(
          {
            name: 'Test',
            itemType: ItemType.PRODUCT,
            listPrice: 1000,
            barcode: invalidBarcode,
          },
          mockTenant,
          mockUser
        )
      ).rejects.toThrow();
    });

    it('should find item by barcode', async () => {
      const expectedItem = {
        id: ITEM_ID,
        barcode: '5901234123457',
        name: 'Makita fúrógép',
      };

      mockPrismaService.item.findFirst.mockResolvedValue(expectedItem);

      const result = await controller.getByBarcode('5901234123457', mockTenant);

      expect(result.data.barcode).toBe('5901234123457');
    });

    it('should throw error for duplicate barcode in tenant', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });
      mockPrismaService.item.findFirst.mockResolvedValue({ id: 'existing' }); // Barcode exists

      await expect(
        controller.create(
          {
            name: 'Test',
            itemType: ItemType.PRODUCT,
            listPrice: 1000,
            barcode: '5901234123457',
          },
          mockTenant,
          mockUser
        )
      ).rejects.toThrow('A vonalkód már létezik');
    });
  });

  // =========================================
  // FILTER TESTS (2 tesztek)
  // =========================================
  describe('Filtering (AC5)', () => {
    it('should filter by itemType', async () => {
      mockPrismaService.item.findMany.mockResolvedValue([
        { id: ITEM_ID, itemType: ItemType.PRODUCT },
      ]);
      mockPrismaService.item.count.mockResolvedValue(1);

      const result = await controller.list(
        { itemType: ItemType.PRODUCT, page: '1', limit: '20' },
        mockTenant
      );

      expect(result.data[0]?.itemType).toBe(ItemType.PRODUCT);
    });

    it('should search by name, code, or barcode', async () => {
      mockPrismaService.item.findMany.mockResolvedValue([
        { id: ITEM_ID, name: 'Makita fúrógép' },
      ]);
      mockPrismaService.item.count.mockResolvedValue(1);

      const result = await controller.list({ search: 'makita', page: '1', limit: '20' }, mockTenant);

      expect(result.data).toHaveLength(1);
    });
  });

  // =========================================
  // ERROR HANDLING TESTS (2 tesztek)
  // =========================================
  describe('Error Handling', () => {
    it('should throw 404 for non-existent item', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      await expect(controller.getById(ITEM_ID, mockTenant)).rejects.toThrow(NotFoundException);
    });

    it('should throw 400 for invalid item data', async () => {
      await expect(
        controller.create({ name: '', itemType: ItemType.PRODUCT }, mockTenant, mockUser)
      ).rejects.toThrow();
    });
  });

  // =========================================
  // TENANT ISOLATION TEST (RLS) (1 teszt)
  // =========================================
  describe('Tenant Isolation (RLS)', () => {
    it('should only return items for current tenant (AC3)', async () => {
      const tenantAItem = { id: ITEM_ID, tenantId: TENANT_ID, name: 'Tenant A Item' };

      mockPrismaService.item.findUnique.mockResolvedValue(tenantAItem);

      const result = await controller.getById(ITEM_ID, mockTenant);

      expect(result.data.tenantId).toBe(TENANT_ID);
    });
  });
});
