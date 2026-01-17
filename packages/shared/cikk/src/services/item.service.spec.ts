import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ItemService } from './item.service';
import {
  ItemType,
  ItemStatus,
  CreateItemInput,
  UpdateItemInput,
  ItemFilterOptions,
  DEFAULT_VAT_RATE,
  DEFAULT_UNIT_OF_MEASURE,
} from '../interfaces/item.interface';

/**
 * TDD Tests for ItemService
 * Story 8-1: Cikk CRUD
 * RED phase - minimum 20 tesztek
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const ITEM_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const CATEGORY_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';
const USER_ID = 'd4e5f6a7-b8c9-4123-aef0-234567890123';

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
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
    return callback(mockPrismaService);
  }),
};

// Mock ItemCodeGeneratorService
const mockCodeGeneratorService = {
  generateCode: vi.fn(),
};

// Mock BarcodeService
const mockBarcodeService = {
  validateEAN13: vi.fn(),
  isUnique: vi.fn(),
};

// Mock AuditService
const mockAuditService = {
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
};

describe('ItemService', () => {
  let itemService: ItemService;

  beforeEach(() => {
    vi.clearAllMocks();
    itemService = new ItemService(
      mockPrismaService as any,
      mockCodeGeneratorService as any,
      mockBarcodeService as any,
      mockAuditService as any
    );
  });

  // =========================================
  // CREATE ITEM TESTS (7 tesztek)
  // =========================================
  describe('createItem()', () => {
    const validCreateInput: CreateItemInput = {
      name: 'Makita fúrógép DDF484',
      itemType: ItemType.PRODUCT,
      listPrice: 125000,
    };

    describe('happy path', () => {
      it('should create item with valid data', async () => {
        const generatedCode = 'PRD-20260116-0001';
        const expectedItem = {
          id: ITEM_ID,
          tenantId: TENANT_ID,
          code: generatedCode,
          name: validCreateInput.name,
          description: null,
          itemType: ItemType.PRODUCT,
          status: ItemStatus.ACTIVE,
          listPrice: 125000,
          costPrice: null,
          vatRate: DEFAULT_VAT_RATE,
          unitOfMeasure: DEFAULT_UNIT_OF_MEASURE,
          barcode: null,
          alternativeBarcodes: [],
          categoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue(generatedCode);
        mockPrismaService.item.create.mockResolvedValue(expectedItem);
        mockAuditService.logCreate.mockResolvedValue({});

        const result = await itemService.createItem(TENANT_ID, validCreateInput, USER_ID);

        expect(result).toEqual(expectedItem);
        expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledWith(
          ItemType.PRODUCT,
          TENANT_ID
        );
      });

      it('should use provided code if given', async () => {
        const inputWithCode: CreateItemInput = {
          ...validCreateInput,
          code: 'CUSTOM-001',
        };

        const expectedItem = {
          id: ITEM_ID,
          tenantId: TENANT_ID,
          code: 'CUSTOM-001',
          name: validCreateInput.name,
          itemType: ItemType.PRODUCT,
          status: ItemStatus.ACTIVE,
          listPrice: 125000,
          vatRate: DEFAULT_VAT_RATE,
          unitOfMeasure: DEFAULT_UNIT_OF_MEASURE,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrismaService.item.findFirst.mockResolvedValue(null); // Code not taken
        mockPrismaService.item.create.mockResolvedValue(expectedItem);
        mockAuditService.logCreate.mockResolvedValue({});

        const result = await itemService.createItem(TENANT_ID, inputWithCode, USER_ID);

        expect(result.code).toBe('CUSTOM-001');
        expect(mockCodeGeneratorService.generateCode).not.toHaveBeenCalled();
      });

      it('should set default vatRate to 27%', async () => {
        const generatedCode = 'PRD-20260116-0001';
        mockCodeGeneratorService.generateCode.mockResolvedValue(generatedCode);
        mockPrismaService.item.create.mockResolvedValue({
          id: ITEM_ID,
          vatRate: DEFAULT_VAT_RATE,
        });
        mockAuditService.logCreate.mockResolvedValue({});

        await itemService.createItem(TENANT_ID, validCreateInput, USER_ID);

        expect(mockPrismaService.item.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            vatRate: 27,
          }),
        });
      });

      it('should set default unitOfMeasure to "db"', async () => {
        const generatedCode = 'PRD-20260116-0001';
        mockCodeGeneratorService.generateCode.mockResolvedValue(generatedCode);
        mockPrismaService.item.create.mockResolvedValue({
          id: ITEM_ID,
          unitOfMeasure: DEFAULT_UNIT_OF_MEASURE,
        });
        mockAuditService.logCreate.mockResolvedValue({});

        await itemService.createItem(TENANT_ID, validCreateInput, USER_ID);

        expect(mockPrismaService.item.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            unitOfMeasure: 'db',
          }),
        });
      });

      it('should create audit log entry for new item', async () => {
        const generatedCode = 'PRD-20260116-0001';
        const expectedItem = {
          id: ITEM_ID,
          tenantId: TENANT_ID,
          code: generatedCode,
          name: validCreateInput.name,
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue(generatedCode);
        mockPrismaService.item.create.mockResolvedValue(expectedItem);
        mockAuditService.logCreate.mockResolvedValue({});

        await itemService.createItem(TENANT_ID, validCreateInput, USER_ID);

        expect(mockAuditService.logCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: TENANT_ID,
            userId: USER_ID,
            entityType: 'ITEM',
            entityId: ITEM_ID,
          })
        );
      });
    });

    describe('barcode handling', () => {
      it('should validate EAN-13 barcode if provided', async () => {
        const inputWithBarcode: CreateItemInput = {
          ...validCreateInput,
          barcode: '5901234123457',
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue('PRD-20260116-0001');
        mockBarcodeService.validateEAN13.mockReturnValue(true);
        mockBarcodeService.isUnique.mockResolvedValue(true);
        mockPrismaService.item.create.mockResolvedValue({ id: ITEM_ID });
        mockAuditService.logCreate.mockResolvedValue({});

        await itemService.createItem(TENANT_ID, inputWithBarcode, USER_ID);

        expect(mockBarcodeService.validateEAN13).toHaveBeenCalledWith('5901234123457');
      });

      it('should throw error for invalid EAN-13 barcode', async () => {
        const inputWithInvalidBarcode: CreateItemInput = {
          ...validCreateInput,
          barcode: '1234567890123', // Invalid check digit
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue('PRD-20260116-0001');
        mockBarcodeService.validateEAN13.mockReturnValue(false);

        await expect(
          itemService.createItem(TENANT_ID, inputWithInvalidBarcode, USER_ID)
        ).rejects.toThrow('Érvénytelen EAN-13 vonalkód');
      });
    });

    describe('validation errors', () => {
      it('should throw error if name is empty', async () => {
        const invalidInput = { ...validCreateInput, name: '' };

        await expect(
          itemService.createItem(TENANT_ID, invalidInput as CreateItemInput, USER_ID)
        ).rejects.toThrow('A cikk neve kötelező');
      });

      it('should throw error if listPrice missing for PRODUCT type', async () => {
        const invalidInput: CreateItemInput = {
          name: 'Test Product',
          itemType: ItemType.PRODUCT,
          // listPrice missing
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue('PRD-20260116-0001');

        await expect(itemService.createItem(TENANT_ID, invalidInput, USER_ID)).rejects.toThrow(
          'Listaár kötelező termék és alkatrész típusnál'
        );
      });

      it('should throw error if listPrice missing for PART type', async () => {
        const invalidInput: CreateItemInput = {
          name: 'Test Part',
          itemType: ItemType.PART,
          // listPrice missing
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue('PRT-20260116-0001');

        await expect(itemService.createItem(TENANT_ID, invalidInput, USER_ID)).rejects.toThrow(
          'Listaár kötelező termék és alkatrész típusnál'
        );
      });

      it('should allow SERVICE type without listPrice', async () => {
        const serviceInput: CreateItemInput = {
          name: 'Szerelési díj',
          itemType: ItemType.SERVICE,
          // listPrice not required
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue('SVC-20260116-0001');
        mockPrismaService.item.create.mockResolvedValue({
          id: ITEM_ID,
          itemType: ItemType.SERVICE,
          listPrice: null,
        });
        mockAuditService.logCreate.mockResolvedValue({});

        const result = await itemService.createItem(TENANT_ID, serviceInput, USER_ID);

        expect(result.itemType).toBe(ItemType.SERVICE);
      });

      it('should throw error if code already exists in tenant', async () => {
        const inputWithCode: CreateItemInput = {
          ...validCreateInput,
          code: 'EXISTING-CODE',
        };

        mockPrismaService.item.findFirst.mockResolvedValue({ id: 'existing-id' });

        await expect(itemService.createItem(TENANT_ID, inputWithCode, USER_ID)).rejects.toThrow(
          'A cikkszám már létezik'
        );
      });

      it('should throw error if barcode already exists in tenant', async () => {
        const inputWithBarcode: CreateItemInput = {
          ...validCreateInput,
          barcode: '5901234123457',
        };

        mockCodeGeneratorService.generateCode.mockResolvedValue('PRD-20260116-0001');
        mockBarcodeService.validateEAN13.mockReturnValue(true);
        mockBarcodeService.isUnique.mockResolvedValue(false);

        await expect(
          itemService.createItem(TENANT_ID, inputWithBarcode, USER_ID)
        ).rejects.toThrow('A vonalkód már létezik');
      });

      it('should throw error if name exceeds 255 characters', async () => {
        const invalidInput: CreateItemInput = {
          ...validCreateInput,
          name: 'A'.repeat(256),
        };

        await expect(itemService.createItem(TENANT_ID, invalidInput, USER_ID)).rejects.toThrow(
          'A cikk neve maximum 255 karakter lehet'
        );
      });

      it('should throw error if listPrice is negative', async () => {
        const invalidInput: CreateItemInput = {
          ...validCreateInput,
          listPrice: -100,
        };

        await expect(itemService.createItem(TENANT_ID, invalidInput, USER_ID)).rejects.toThrow(
          'A listaár nem lehet negatív'
        );
      });

      it('should throw error if costPrice is negative', async () => {
        const invalidInput: CreateItemInput = {
          ...validCreateInput,
          costPrice: -50,
        };

        await expect(itemService.createItem(TENANT_ID, invalidInput, USER_ID)).rejects.toThrow(
          'A beszerzési ár nem lehet negatív'
        );
      });

      it('should throw error for invalid VAT rate', async () => {
        const invalidInput: CreateItemInput = {
          ...validCreateInput,
          vatRate: 25, // Invalid - not 0, 5, 18, or 27
        };

        await expect(itemService.createItem(TENANT_ID, invalidInput, USER_ID)).rejects.toThrow(
          'Érvénytelen ÁFA kulcs: 25%'
        );
      });

      it('should accept valid VAT rates (0, 5, 18, 27)', async () => {
        const validVatRates = [0, 5, 18, 27];
        mockCodeGeneratorService.generateCode.mockResolvedValue('PRD-20260116-0001');
        mockAuditService.logCreate.mockResolvedValue({});

        for (const vatRate of validVatRates) {
          mockPrismaService.item.create.mockResolvedValue({
            id: ITEM_ID,
            vatRate,
          });

          const input: CreateItemInput = {
            ...validCreateInput,
            vatRate,
          };

          const result = await itemService.createItem(TENANT_ID, input, USER_ID);
          expect(result.vatRate).toBe(vatRate);
        }
      });
    });
  });

  // =========================================
  // GET ITEM TESTS (3 tesztek)
  // =========================================
  describe('getItemById()', () => {
    it('should return item by id', async () => {
      const expectedItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        code: 'PRD-20260116-0001',
        name: 'Makita fúrógép',
        itemType: ItemType.PRODUCT,
        status: ItemStatus.ACTIVE,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(expectedItem);

      const result = await itemService.getItemById(ITEM_ID, TENANT_ID);

      expect(result).toEqual(expectedItem);
      expect(mockPrismaService.item.findUnique).toHaveBeenCalledWith({
        where: { id: ITEM_ID, tenantId: TENANT_ID },
      });
    });

    it('should return null if item not found', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      const result = await itemService.getItemById(ITEM_ID, TENANT_ID);

      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(itemService.getItemById('invalid-uuid', TENANT_ID)).rejects.toThrow(
        'Érvénytelen cikk ID formátum'
      );
    });
  });

  // =========================================
  // UPDATE ITEM TESTS (4 tesztek)
  // =========================================
  describe('updateItem()', () => {
    const validUpdateInput: UpdateItemInput = {
      name: 'Makita fúrógép DDF484 - Updated',
      listPrice: 135000,
    };

    it('should update item with valid data', async () => {
      const existingItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        code: 'PRD-20260116-0001',
        name: 'Makita fúrógép DDF484',
        itemType: ItemType.PRODUCT,
        status: ItemStatus.ACTIVE,
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

      const result = await itemService.updateItem(ITEM_ID, TENANT_ID, validUpdateInput, USER_ID);

      expect(result.name).toBe('Makita fúrógép DDF484 - Updated');
      expect(result.listPrice).toBe(135000);
    });

    it('should create audit log for update', async () => {
      const existingItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        name: 'Original Name',
        listPrice: 100000,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(existingItem);
      mockPrismaService.item.update.mockResolvedValue({
        ...existingItem,
        ...validUpdateInput,
      });
      mockAuditService.logUpdate.mockResolvedValue({});

      await itemService.updateItem(ITEM_ID, TENANT_ID, validUpdateInput, USER_ID);

      expect(mockAuditService.logUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          entityType: 'ITEM',
          entityId: ITEM_ID,
        })
      );
    });

    it('should throw error if item not found', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      await expect(
        itemService.updateItem(ITEM_ID, TENANT_ID, validUpdateInput, USER_ID)
      ).rejects.toThrow('Cikk nem található');
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(
        itemService.updateItem('invalid-uuid', TENANT_ID, validUpdateInput, USER_ID)
      ).rejects.toThrow('Érvénytelen cikk ID formátum');
    });

    it('should validate barcode on update if changed', async () => {
      const existingItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        barcode: null,
      };

      const updateWithBarcode: UpdateItemInput = {
        barcode: '1234567890123', // Invalid
      };

      mockPrismaService.item.findUnique.mockResolvedValue(existingItem);
      mockBarcodeService.validateEAN13.mockReturnValue(false);

      await expect(
        itemService.updateItem(ITEM_ID, TENANT_ID, updateWithBarcode, USER_ID)
      ).rejects.toThrow('Érvénytelen EAN-13 vonalkód');
    });
  });

  // =========================================
  // DELETE ITEM TESTS (3 tesztek)
  // =========================================
  describe('deleteItem()', () => {
    it('should soft delete item (set status to INACTIVE)', async () => {
      const existingItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        code: 'PRD-20260116-0001',
        name: 'Makita fúrógép',
        status: ItemStatus.ACTIVE,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(existingItem);
      mockPrismaService.item.update.mockResolvedValue({
        ...existingItem,
        status: ItemStatus.INACTIVE,
      });
      mockAuditService.logDelete.mockResolvedValue({});

      const result = await itemService.deleteItem(ITEM_ID, TENANT_ID, USER_ID);

      expect(result.status).toBe(ItemStatus.INACTIVE);
    });

    it('should create audit log for delete', async () => {
      const existingItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        status: ItemStatus.ACTIVE,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(existingItem);
      mockPrismaService.item.update.mockResolvedValue({
        ...existingItem,
        status: ItemStatus.INACTIVE,
      });
      mockAuditService.logDelete.mockResolvedValue({});

      await itemService.deleteItem(ITEM_ID, TENANT_ID, USER_ID);

      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          entityType: 'ITEM',
          entityId: ITEM_ID,
        })
      );
    });

    it('should throw error if item already inactive', async () => {
      const inactiveItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        status: ItemStatus.INACTIVE,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(inactiveItem);

      await expect(itemService.deleteItem(ITEM_ID, TENANT_ID, USER_ID)).rejects.toThrow(
        'Cikk már törölve'
      );
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(itemService.deleteItem('invalid-uuid', TENANT_ID, USER_ID)).rejects.toThrow(
        'Érvénytelen cikk ID formátum'
      );
    });
  });

  // =========================================
  // LIST ITEMS TESTS (5 tesztek)
  // =========================================
  describe('listItems()', () => {
    const mockItems = [
      {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        code: 'PRD-20260116-0001',
        name: 'Makita fúrógép',
        itemType: ItemType.PRODUCT,
        status: ItemStatus.ACTIVE,
      },
      {
        id: 'item-2',
        tenantId: TENANT_ID,
        code: 'PRT-20260116-0001',
        name: 'Szénkefe csomag',
        itemType: ItemType.PART,
        status: ItemStatus.ACTIVE,
      },
    ];

    it('should return paginated list of items', async () => {
      const filter: ItemFilterOptions = { page: 1, limit: 20 };

      mockPrismaService.item.findMany.mockResolvedValue(mockItems);
      mockPrismaService.item.count.mockResolvedValue(2);

      const result = await itemService.listItems(TENANT_ID, filter);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by itemType', async () => {
      const filter: ItemFilterOptions = {
        page: 1,
        limit: 20,
        itemType: ItemType.PRODUCT,
      };

      mockPrismaService.item.findMany.mockResolvedValue([mockItems[0]]);
      mockPrismaService.item.count.mockResolvedValue(1);

      await itemService.listItems(TENANT_ID, filter);

      expect(mockPrismaService.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itemType: ItemType.PRODUCT,
          }),
        })
      );
    });

    it('should search by code, name, or barcode', async () => {
      const filter: ItemFilterOptions = {
        page: 1,
        limit: 20,
        search: 'makita',
      };

      mockPrismaService.item.findMany.mockResolvedValue([mockItems[0]]);
      mockPrismaService.item.count.mockResolvedValue(1);

      const result = await itemService.listItems(TENANT_ID, filter);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { code: { contains: 'makita', mode: 'insensitive' } },
              { name: { contains: 'makita', mode: 'insensitive' } },
              { barcode: { contains: 'makita', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should exclude inactive items by default', async () => {
      const filter: ItemFilterOptions = { page: 1, limit: 20 };

      mockPrismaService.item.findMany.mockResolvedValue(mockItems);
      mockPrismaService.item.count.mockResolvedValue(2);

      await itemService.listItems(TENANT_ID, filter);

      expect(mockPrismaService.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: ItemStatus.INACTIVE },
          }),
        })
      );
    });

    it('should sort by name ascending by default', async () => {
      const filter: ItemFilterOptions = { page: 1, limit: 20 };

      mockPrismaService.item.findMany.mockResolvedValue(mockItems);
      mockPrismaService.item.count.mockResolvedValue(2);

      await itemService.listItems(TENANT_ID, filter);

      expect(mockPrismaService.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  // =========================================
  // FIND BY BARCODE TEST (3 teszt)
  // =========================================
  describe('findByBarcode()', () => {
    it('should find item by barcode within tenant', async () => {
      const expectedItem = {
        id: ITEM_ID,
        tenantId: TENANT_ID,
        barcode: '5901234123457',
        name: 'Makita fúrógép',
      };

      mockPrismaService.item.findFirst.mockResolvedValue(expectedItem);

      const result = await itemService.findByBarcode('5901234123457', TENANT_ID);

      expect(result).toEqual(expectedItem);
      expect(mockPrismaService.item.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          OR: [
            { barcode: '5901234123457' },
            { alternativeBarcodes: { has: '5901234123457' } },
          ],
        },
      });
    });

    it('should return null for empty barcode', async () => {
      const result = await itemService.findByBarcode('', TENANT_ID);

      expect(result).toBeNull();
      expect(mockPrismaService.item.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for whitespace-only barcode', async () => {
      const result = await itemService.findByBarcode('   ', TENANT_ID);

      expect(result).toBeNull();
      expect(mockPrismaService.item.findFirst).not.toHaveBeenCalled();
    });
  });
});
