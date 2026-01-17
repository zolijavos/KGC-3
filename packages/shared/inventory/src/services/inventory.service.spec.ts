/**
 * @kgc/inventory - InventoryService TDD Tests
 * Story 9-1: Készlet nyilvántartás alap
 * FR4-FR10 lefedés
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from './inventory.service';
import {
  InventoryItem,
  InventoryQuery,
  IInventoryRepository,
  INVENTORY_REPOSITORY,
  StockSummary,
} from '../interfaces/inventory.interface';
import {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  AdjustQuantityInput,
} from '../dto/inventory.dto';

// ============================================
// MOCK REPOSITORY
// ============================================

const createMockRepository = (): IInventoryRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findBySerialNumber: vi.fn(),
  query: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  hardDelete: vi.fn(),
  getStockSummary: vi.fn(),
  getStockSummaries: vi.fn(),
  findBelowMinStock: vi.fn(),
  adjustQuantity: vi.fn(),
  bulkAdjustQuantity: vi.fn(),
});

// ============================================
// TEST DATA - Valid UUIDs
// ============================================

const TEST_IDS = {
  ITEM_1: '11111111-1111-1111-1111-111111111111',
  ITEM_2: '22222222-2222-2222-2222-222222222222',
  TENANT: '33333333-3333-3333-3333-333333333333',
  WAREHOUSE: '44444444-4444-4444-4444-444444444444',
  PRODUCT: '55555555-5555-5555-5555-555555555555',
  USER: '66666666-6666-6666-6666-666666666666',
};

// ============================================
// TEST DATA FACTORY
// ============================================

const createTestItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: TEST_IDS.ITEM_1,
  tenantId: TEST_IDS.TENANT,
  warehouseId: TEST_IDS.WAREHOUSE,
  productId: TEST_IDS.PRODUCT,
  type: 'PRODUCT',
  status: 'AVAILABLE',
  serialNumber: undefined,
  batchNumber: undefined,
  locationCode: 'K1-P2-D3',
  quantity: 10,
  unit: 'db',
  minStockLevel: 5,
  maxStockLevel: 100,
  purchasePrice: 1500,
  lastPurchaseDate: new Date('2026-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: TEST_IDS.USER,
  updatedBy: TEST_IDS.USER,
  isDeleted: false,
  deletedAt: undefined,
  ...overrides,
});

const createTestStockSummary = (overrides: Partial<StockSummary> = {}): StockSummary => ({
  tenantId: TEST_IDS.TENANT,
  warehouseId: TEST_IDS.WAREHOUSE,
  productId: TEST_IDS.PRODUCT,
  productName: 'Teszt termék',
  totalQuantity: 100,
  availableQuantity: 80,
  reservedQuantity: 10,
  inTransitQuantity: 5,
  inServiceQuantity: 3,
  rentedQuantity: 2,
  unit: 'db',
  minStockLevel: 20,
  stockLevelStatus: 'OK',
  lastUpdated: new Date(),
  ...overrides,
});

// ============================================
// TEST SUITE
// ============================================

describe('InventoryService', () => {
  let service: InventoryService;
  let mockRepository: IInventoryRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new InventoryService(mockRepository);
  });

  // ============================================
  // CREATE TESTS
  // ============================================

  describe('create', () => {
    const validInput: CreateInventoryItemInput = {
      warehouseId: TEST_IDS.WAREHOUSE,
      productId: TEST_IDS.PRODUCT,
      type: 'PRODUCT',
      quantity: 10,
      unit: 'db',
      locationCode: 'K1-P2-D3',
    };

    it('készlet tétel létrehozása sikeres input esetén', async () => {
      const expectedItem = createTestItem();
      vi.mocked(mockRepository.create).mockResolvedValue(expectedItem);

      const result = await service.create(TEST_IDS.TENANT, validInput, TEST_IDS.USER);

      expect(result).toEqual(expectedItem);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_IDS.TENANT,
          warehouseId: TEST_IDS.WAREHOUSE,
          productId: TEST_IDS.PRODUCT,
          type: 'PRODUCT',
          quantity: 10,
          unit: 'db',
          locationCode: 'K1-P2-D3',
          status: 'AVAILABLE',
          createdBy: TEST_IDS.USER,
          updatedBy: TEST_IDS.USER,
          isDeleted: false,
        }),
      );
    });

    it('serial number duplikáció ellenőrzése', async () => {
      const inputWithSerial: CreateInventoryItemInput = {
        ...validInput,
        serialNumber: 'SN-12345',
      };
      const existingItem = createTestItem({ serialNumber: 'SN-12345' });
      vi.mocked(mockRepository.findBySerialNumber).mockResolvedValue(existingItem);

      await expect(
        service.create(TEST_IDS.TENANT, inputWithSerial, TEST_IDS.USER),
      ).rejects.toThrow('Serial number már létezik');
    });

    it('hibás warehouseId esetén validációs hiba', async () => {
      const invalidInput = {
        ...validInput,
        warehouseId: 'invalid-uuid',
      };

      await expect(
        service.create(TEST_IDS.TENANT, invalidInput as CreateInventoryItemInput, TEST_IDS.USER),
      ).rejects.toThrow();
    });

    it('negatív mennyiség esetén validációs hiba', async () => {
      const invalidInput = {
        ...validInput,
        quantity: -5,
      };

      await expect(
        service.create(TEST_IDS.TENANT, invalidInput as CreateInventoryItemInput, TEST_IDS.USER),
      ).rejects.toThrow();
    });

    it('érvénytelen helykód formátum esetén validációs hiba', async () => {
      const invalidInput = {
        ...validInput,
        locationCode: 'INVALID_CODE',
      };

      await expect(
        service.create(TEST_IDS.TENANT, invalidInput as CreateInventoryItemInput, TEST_IDS.USER),
      ).rejects.toThrow('Érvénytelen helykód formátum');
    });

    it('RENTAL_EQUIPMENT típusnál serial number kötelező', async () => {
      const rentalInput: CreateInventoryItemInput = {
        ...validInput,
        type: 'RENTAL_EQUIPMENT',
        serialNumber: undefined,
      };

      await expect(
        service.create(TEST_IDS.TENANT, rentalInput, TEST_IDS.USER),
      ).rejects.toThrow('Bérgéphez serial number kötelező');
    });
  });

  // ============================================
  // FIND BY ID TESTS
  // ============================================

  describe('findById', () => {
    it('meglévő tétel visszaadása', async () => {
      const expectedItem = createTestItem();
      vi.mocked(mockRepository.findById).mockResolvedValue(expectedItem);

      const result = await service.findById(TEST_IDS.ITEM_1, TEST_IDS.TENANT);

      expect(result).toEqual(expectedItem);
      expect(mockRepository.findById).toHaveBeenCalledWith(TEST_IDS.ITEM_1, TEST_IDS.TENANT);
    });

    it('nem létező tétel esetén null', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.findById('nonexistent-id', TEST_IDS.TENANT);

      expect(result).toBeNull();
    });

    it('törölt tétel esetén null (soft delete)', async () => {
      const deletedItem = createTestItem({ isDeleted: true });
      vi.mocked(mockRepository.findById).mockResolvedValue(deletedItem);

      const result = await service.findById(TEST_IDS.ITEM_1, TEST_IDS.TENANT);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // FIND BY SERIAL NUMBER TESTS
  // ============================================

  describe('findBySerialNumber', () => {
    it('serial number alapján megtalálja a tételt', async () => {
      const expectedItem = createTestItem({ serialNumber: 'SN-12345' });
      vi.mocked(mockRepository.findBySerialNumber).mockResolvedValue(expectedItem);

      const result = await service.findBySerialNumber('SN-12345', TEST_IDS.TENANT);

      expect(result).toEqual(expectedItem);
    });

    it('nem létező serial number esetén null', async () => {
      vi.mocked(mockRepository.findBySerialNumber).mockResolvedValue(null);

      const result = await service.findBySerialNumber('SN-NONEXISTENT', TEST_IDS.TENANT);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('update', () => {
    const updateInput: UpdateInventoryItemInput = {
      status: 'RESERVED',
      locationCode: 'K2-P3-D4',
    };

    it('készlet tétel frissítése sikeres', async () => {
      const existingItem = createTestItem();
      const updatedItem = createTestItem({ status: 'RESERVED', locationCode: 'K2-P3-D4' });
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedItem);

      const result = await service.update(
        TEST_IDS.ITEM_1,
        TEST_IDS.TENANT,
        updateInput,
        TEST_IDS.USER,
      );

      expect(result).toEqual(updatedItem);
      expect(mockRepository.update).toHaveBeenCalledWith(
        TEST_IDS.ITEM_1,
        TEST_IDS.TENANT,
        expect.objectContaining({
          status: 'RESERVED',
          locationCode: 'K2-P3-D4',
          updatedBy: TEST_IDS.USER,
        }),
      );
    });

    it('nem létező tétel frissítése esetén hiba', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', TEST_IDS.TENANT, updateInput, TEST_IDS.USER),
      ).rejects.toThrow('Készlet tétel nem található');
    });

    it('érvénytelen státusz átmenet ellenőrzése', async () => {
      const soldItem = createTestItem({ status: 'SOLD' });
      vi.mocked(mockRepository.findById).mockResolvedValue(soldItem);

      await expect(
        service.update(
          TEST_IDS.ITEM_1,
          TEST_IDS.TENANT,
          { status: 'AVAILABLE' },
          TEST_IDS.USER,
        ),
      ).rejects.toThrow('Érvénytelen státusz átmenet: SOLD -> AVAILABLE');
    });

    it('üres update input esetén validációs hiba', async () => {
      const existingItem = createTestItem();
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);

      await expect(
        service.update(TEST_IDS.ITEM_1, TEST_IDS.TENANT, {} as UpdateInventoryItemInput, 'user-123'),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // DELETE TESTS
  // ============================================

  describe('delete (soft delete)', () => {
    it('készlet tétel soft delete sikeres ha quantity = 0', async () => {
      const existingItem = createTestItem({ quantity: 0 });
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);

      await service.delete(TEST_IDS.ITEM_1, TEST_IDS.TENANT, TEST_IDS.USER);

      expect(mockRepository.delete).toHaveBeenCalledWith(
        TEST_IDS.ITEM_1,
        TEST_IDS.TENANT,
        TEST_IDS.USER,
      );
    });

    it('nem létező tétel törlése esetén hiba', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        service.delete('nonexistent-id', TEST_IDS.TENANT, TEST_IDS.USER),
      ).rejects.toThrow('Készlet tétel nem található');
    });

    it('RENTED státuszú tétel nem törölhető', async () => {
      const rentedItem = createTestItem({ status: 'RENTED', quantity: 0 });
      vi.mocked(mockRepository.findById).mockResolvedValue(rentedItem);

      await expect(
        service.delete(TEST_IDS.ITEM_1, TEST_IDS.TENANT, TEST_IDS.USER),
      ).rejects.toThrow('Kiadott (RENTED) tétel nem törölhető');
    });

    it('RESERVED státuszú tétel nem törölhető', async () => {
      const reservedItem = createTestItem({ status: 'RESERVED', quantity: 0 });
      vi.mocked(mockRepository.findById).mockResolvedValue(reservedItem);

      await expect(
        service.delete(TEST_IDS.ITEM_1, TEST_IDS.TENANT, TEST_IDS.USER),
      ).rejects.toThrow('Foglalt (RESERVED) tétel nem törölhető');
    });

    it('IN_TRANSIT státuszú tétel nem törölhető', async () => {
      const inTransitItem = createTestItem({ status: 'IN_TRANSIT', quantity: 0 });
      vi.mocked(mockRepository.findById).mockResolvedValue(inTransitItem);

      await expect(
        service.delete(TEST_IDS.ITEM_1, TEST_IDS.TENANT, TEST_IDS.USER),
      ).rejects.toThrow('Szállítás alatt lévő (IN_TRANSIT) tétel nem törölhető');
    });

    it('pozitív mennyiségű tétel nem törölhető', async () => {
      const itemWithStock = createTestItem({ quantity: 10 });
      vi.mocked(mockRepository.findById).mockResolvedValue(itemWithStock);

      await expect(
        service.delete(TEST_IDS.ITEM_1, TEST_IDS.TENANT, TEST_IDS.USER),
      ).rejects.toThrow('Pozitív mennyiségű tétel nem törölhető');
    });
  });

  // ============================================
  // HARD DELETE TESTS (GDPR)
  // ============================================

  describe('hardDelete (GDPR)', () => {
    it('készlet tétel hard delete sikeres', async () => {
      const deletedItem = createTestItem({ isDeleted: true });
      vi.mocked(mockRepository.findById).mockResolvedValue(deletedItem);

      await service.hardDelete(TEST_IDS.ITEM_1, TEST_IDS.TENANT);

      expect(mockRepository.hardDelete).toHaveBeenCalledWith(TEST_IDS.ITEM_1, TEST_IDS.TENANT);
    });

    it('nem törölt tétel hard delete esetén hiba', async () => {
      const activeItem = createTestItem({ isDeleted: false });
      vi.mocked(mockRepository.findById).mockResolvedValue(activeItem);

      await expect(
        service.hardDelete(TEST_IDS.ITEM_1, TEST_IDS.TENANT),
      ).rejects.toThrow('Csak soft deleted tétel törölhető véglegesen');
    });
  });

  // ============================================
  // QUERY TESTS
  // ============================================

  describe('query', () => {
    it('készlet lekérdezés szűrőkkel', async () => {
      const items = [createTestItem(), createTestItem({ id: TEST_IDS.ITEM_2 })];
      vi.mocked(mockRepository.query).mockResolvedValue({
        items,
        total: 2,
        offset: 0,
        limit: 20,
      });

      const query: InventoryQuery = {
        tenantId: TEST_IDS.TENANT,
        warehouseId: TEST_IDS.WAREHOUSE,
        status: 'AVAILABLE',
      };

      const result = await service.query(query);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockRepository.query).toHaveBeenCalledWith(query);
    });

    it('üres eredmény kezelése', async () => {
      vi.mocked(mockRepository.query).mockResolvedValue({
        items: [],
        total: 0,
        offset: 0,
        limit: 20,
      });

      const result = await service.query({ tenantId: TEST_IDS.TENANT });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('több státusz szűrő kezelése', async () => {
      const items = [createTestItem()];
      vi.mocked(mockRepository.query).mockResolvedValue({
        items,
        total: 1,
        offset: 0,
        limit: 20,
      });

      const query: InventoryQuery = {
        tenantId: TEST_IDS.TENANT,
        status: ['AVAILABLE', 'RESERVED'],
      };

      await service.query(query);

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['AVAILABLE', 'RESERVED'],
        }),
      );
    });
  });

  // ============================================
  // ADJUST QUANTITY TESTS
  // ============================================

  describe('adjustQuantity', () => {
    it('mennyiség növelése sikeres', async () => {
      const existingItem = createTestItem({ quantity: 10 });
      const updatedItem = createTestItem({ quantity: 15 });
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);
      vi.mocked(mockRepository.adjustQuantity).mockResolvedValue(updatedItem);

      const result = await service.adjustQuantity(
        TEST_IDS.ITEM_1,
        TEST_IDS.TENANT,
        { adjustment: 5 },
        TEST_IDS.USER,
      );

      expect(result.quantity).toBe(15);
      expect(mockRepository.adjustQuantity).toHaveBeenCalledWith(
        TEST_IDS.ITEM_1,
        TEST_IDS.TENANT,
        5,
        TEST_IDS.USER,
      );
    });

    it('mennyiség csökkentése sikeres', async () => {
      const existingItem = createTestItem({ quantity: 10 });
      const updatedItem = createTestItem({ quantity: 7 });
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);
      vi.mocked(mockRepository.adjustQuantity).mockResolvedValue(updatedItem);

      const result = await service.adjustQuantity(
        TEST_IDS.ITEM_1,
        TEST_IDS.TENANT,
        { adjustment: -3 },
        TEST_IDS.USER,
      );

      expect(result.quantity).toBe(7);
    });

    it('negatívba menő mennyiség esetén hiba', async () => {
      const existingItem = createTestItem({ quantity: 5 });
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);

      await expect(
        service.adjustQuantity(
          TEST_IDS.ITEM_1,
          TEST_IDS.TENANT,
          { adjustment: -10 },
          TEST_IDS.USER,
        ),
      ).rejects.toThrow('A mennyiség nem lehet negatív');
    });

    it('0 módosítás esetén validációs hiba', async () => {
      const existingItem = createTestItem();
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);

      await expect(
        service.adjustQuantity(
          TEST_IDS.ITEM_1,
          TEST_IDS.TENANT,
          { adjustment: 0 } as AdjustQuantityInput,
          TEST_IDS.USER,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // STOCK SUMMARY TESTS (FR4)
  // ============================================

  describe('getStockSummary (FR4: Real-time készletállapot)', () => {
    it('készlet összesítés lekérdezése', async () => {
      const summary = createTestStockSummary();
      vi.mocked(mockRepository.getStockSummary).mockResolvedValue(summary);

      const result = await service.getStockSummary(
        TEST_IDS.TENANT,
        'product-uuid-abc',
        TEST_IDS.WAREHOUSE,
      );

      expect(result).toEqual(summary);
      expect(result?.stockLevelStatus).toBe('OK');
    });

    it('összes raktár összesítése (warehouseId nélkül)', async () => {
      const summary = createTestStockSummary({ warehouseId: undefined });
      vi.mocked(mockRepository.getStockSummary).mockResolvedValue(summary);

      const result = await service.getStockSummary(TEST_IDS.TENANT, 'product-uuid-abc');

      expect(result?.warehouseId).toBeUndefined();
    });

    it('nem létező cikk esetén null', async () => {
      vi.mocked(mockRepository.getStockSummary).mockResolvedValue(null);

      const result = await service.getStockSummary(TEST_IDS.TENANT, 'nonexistent-product');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // STOCK LEVEL STATUS CALCULATION TESTS
  // ============================================

  describe('calculateStockLevelStatus', () => {
    it('OK státusz: elérhető >= min * 1.5', () => {
      const summary = createTestStockSummary({
        availableQuantity: 40,
        minStockLevel: 20,
      });
      vi.mocked(mockRepository.getStockSummary).mockResolvedValue(summary);

      const status = service.calculateStockLevelStatus(40, 20);
      expect(status).toBe('OK');
    });

    it('LOW státusz: min <= elérhető < min * 1.5', () => {
      const status = service.calculateStockLevelStatus(25, 20);
      expect(status).toBe('LOW');
    });

    it('CRITICAL státusz: 0 < elérhető < min', () => {
      const status = service.calculateStockLevelStatus(10, 20);
      expect(status).toBe('CRITICAL');
    });

    it('OUT_OF_STOCK státusz: elérhető = 0', () => {
      const status = service.calculateStockLevelStatus(0, 20);
      expect(status).toBe('OUT_OF_STOCK');
    });

    it('minStockLevel nélkül mindig OK', () => {
      const status = service.calculateStockLevelStatus(5, undefined);
      expect(status).toBe('OK');
    });

    it('minStockLevel = 0 edge case: pozitív készlet = OK', () => {
      // Edge case: minStockLevel = 0 -> min * 1.5 = 0
      // Bármilyen pozitív készlet >= 0, tehát OK
      const status = service.calculateStockLevelStatus(1, 0);
      expect(status).toBe('OK');
    });

    it('minStockLevel = 0 edge case: nulla készlet = OUT_OF_STOCK', () => {
      // Edge case: minStockLevel = 0, készlet = 0
      // OUT_OF_STOCK mert készlet === 0
      const status = service.calculateStockLevelStatus(0, 0);
      expect(status).toBe('OUT_OF_STOCK');
    });
  });

  // ============================================
  // FIND BELOW MIN STOCK TESTS (FR4)
  // ============================================

  describe('findBelowMinStock (FR4: Készlet figyelmeztetés)', () => {
    it('minimum alatt lévő tételek listázása', async () => {
      const summaries = [
        createTestStockSummary({ stockLevelStatus: 'LOW' }),
        createTestStockSummary({ productId: 'prod-2', stockLevelStatus: 'CRITICAL' }),
      ];
      vi.mocked(mockRepository.findBelowMinStock).mockResolvedValue(summaries);

      const result = await service.findBelowMinStock(TEST_IDS.TENANT);

      expect(result).toHaveLength(2);
    });

    it('raktár specifikus lekérdezés', async () => {
      const summaries = [createTestStockSummary({ stockLevelStatus: 'LOW' })];
      vi.mocked(mockRepository.findBelowMinStock).mockResolvedValue(summaries);

      await service.findBelowMinStock(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE);

      expect(mockRepository.findBelowMinStock).toHaveBeenCalledWith(
        TEST_IDS.TENANT,
        TEST_IDS.WAREHOUSE,
      );
    });
  });

  // ============================================
  // BULK ADJUST QUANTITY TESTS
  // ============================================

  describe('bulkAdjustQuantity', () => {
    it('több tétel mennyiségének egyszerre módosítása', async () => {
      const items = [
        createTestItem({ id: TEST_IDS.ITEM_1, quantity: 10 }),
        createTestItem({ id: TEST_IDS.ITEM_2, quantity: 20 }),
      ];
      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce(items[0])
        .mockResolvedValueOnce(items[1]);

      await service.bulkAdjustQuantity(
        TEST_IDS.TENANT,
        {
          adjustments: [
            { id: TEST_IDS.ITEM_1, adjustment: 5 },
            { id: TEST_IDS.ITEM_2, adjustment: -3 },
          ],
          reason: 'Leltár korrekció',
        },
        TEST_IDS.USER,
      );

      expect(mockRepository.bulkAdjustQuantity).toHaveBeenCalledWith(
        [
          { id: TEST_IDS.ITEM_1, tenantId: TEST_IDS.TENANT, adjustment: 5 },
          { id: TEST_IDS.ITEM_2, tenantId: TEST_IDS.TENANT, adjustment: -3 },
        ],
        TEST_IDS.USER,
      );
    });

    it('ha bármelyik tétel negatívba menne, az egész művelet elutasítva', async () => {
      const items = [
        createTestItem({ id: TEST_IDS.ITEM_1, quantity: 10 }),
        createTestItem({ id: TEST_IDS.ITEM_2, quantity: 2 }),
      ];
      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce(items[0])
        .mockResolvedValueOnce(items[1]);

      await expect(
        service.bulkAdjustQuantity(
          TEST_IDS.TENANT,
          {
            adjustments: [
              { id: TEST_IDS.ITEM_1, adjustment: 5 },
              { id: TEST_IDS.ITEM_2, adjustment: -10 }, // 2 - 10 = -8 -> hiba
            ],
            reason: 'Leltár korrekció',
          },
          TEST_IDS.USER,
        ),
      ).rejects.toThrow(`Tétel ${TEST_IDS.ITEM_2} mennyisége negatívba menne`);
    });

    it('100-nál több tétel esetén hiba', async () => {
      // Generate 101 valid UUIDs for this test
      const adjustments = Array.from({ length: 101 }, (_, i) => ({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        adjustment: 1,
      }));

      await expect(
        service.bulkAdjustQuantity(
          TEST_IDS.TENANT,
          { adjustments, reason: 'Test' },
          TEST_IDS.USER,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // CONCURRENT ACCESS TESTS
  // ============================================

  describe('concurrent access (race condition awareness)', () => {
    it('párhuzamos adjustQuantity hívások mindegyike végrehajtódik', async () => {
      /**
       * MEGJEGYZÉS: Ez a teszt dokumentálja, hogy a service réteg nem kezeli
       * automatikusan a race condition-t. A repository implementációnak kell
       * SELECT FOR UPDATE vagy hasonló mechanizmust használnia.
       *
       * A teszt célja: bizonyítani, hogy párhuzamos hívások esetén
       * a repository mindkét hívást megkapja (a konzisztencia a repository feladata).
       */
      const existingItem = createTestItem({ quantity: 100 });
      const updatedItem1 = createTestItem({ quantity: 95 });
      const updatedItem2 = createTestItem({ quantity: 90 });

      // Mindkét híváshoz ugyanazt az eredeti állapotot adjuk vissza (race condition szimuláció)
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);
      vi.mocked(mockRepository.adjustQuantity)
        .mockResolvedValueOnce(updatedItem1)
        .mockResolvedValueOnce(updatedItem2);

      // Párhuzamos végrehajtás
      const [result1, result2] = await Promise.all([
        service.adjustQuantity(TEST_IDS.ITEM_1, TEST_IDS.TENANT, { adjustment: -5 }, 'user-1'),
        service.adjustQuantity(TEST_IDS.ITEM_1, TEST_IDS.TENANT, { adjustment: -10 }, 'user-2'),
      ]);

      // Mindkét hívás végrehajtódott
      expect(mockRepository.adjustQuantity).toHaveBeenCalledTimes(2);
      expect(result1.quantity).toBe(95);
      expect(result2.quantity).toBe(90);

      // FONTOS: A tényleges konzisztencia a repository szintjén biztosítandó!
      // Ez a teszt csak dokumentálja az elvárást.
    });

    it('párhuzamos adjustQuantity - egyik negatívba menne (service szinten sikeres)', async () => {
      /**
       * Ez a teszt dokumentálja, hogy a service szinten a validáció
       * az eredeti quantity alapján történik. Ha közben változik,
       * a repository implementációnak kell kezelnie.
       */
      const existingItem = createTestItem({ quantity: 10 });
      vi.mocked(mockRepository.findById).mockResolvedValue(existingItem);
      vi.mocked(mockRepository.adjustQuantity).mockResolvedValue(createTestItem({ quantity: 5 }));

      // Az első hívás sikeres lesz a service szinten (10 - 8 = 2)
      // A második is sikeres lesz a service szinten (10 - 7 = 3)
      // DE ha közben az első már végrehajtódott, a második negatívba vinné!
      const [result1, result2] = await Promise.all([
        service.adjustQuantity(TEST_IDS.ITEM_1, TEST_IDS.TENANT, { adjustment: -8 }, 'user-1'),
        service.adjustQuantity(TEST_IDS.ITEM_1, TEST_IDS.TENANT, { adjustment: -7 }, 'user-2'),
      ]);

      // Mindkét hívás sikeres a SERVICE szinten
      // A REPOSITORY implementációnak kell megakadályoznia a negatív készletet!
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  // ============================================
  // STATUS TRANSITION VALIDATION TESTS
  // ============================================

  describe('validateStatusTransition', () => {
    it('AVAILABLE -> RESERVED engedélyezett', () => {
      expect(service.isValidStatusTransition('AVAILABLE', 'RESERVED')).toBe(true);
    });

    it('AVAILABLE -> RENTED engedélyezett', () => {
      expect(service.isValidStatusTransition('AVAILABLE', 'RENTED')).toBe(true);
    });

    it('RESERVED -> AVAILABLE engedélyezett (foglalás visszavonás)', () => {
      expect(service.isValidStatusTransition('RESERVED', 'AVAILABLE')).toBe(true);
    });

    it('RENTED -> AVAILABLE engedélyezett (visszavétel)', () => {
      expect(service.isValidStatusTransition('RENTED', 'AVAILABLE')).toBe(true);
    });

    it('SOLD -> AVAILABLE TILTOTT', () => {
      expect(service.isValidStatusTransition('SOLD', 'AVAILABLE')).toBe(false);
    });

    it('SCRAPPED -> bármi TILTOTT', () => {
      expect(service.isValidStatusTransition('SCRAPPED', 'AVAILABLE')).toBe(false);
      expect(service.isValidStatusTransition('SCRAPPED', 'RENTED')).toBe(false);
    });

    it('IN_SERVICE -> AVAILABLE engedélyezett (szerviz kész)', () => {
      expect(service.isValidStatusTransition('IN_SERVICE', 'AVAILABLE')).toBe(true);
    });

    it('DAMAGED -> SCRAPPED engedélyezett', () => {
      expect(service.isValidStatusTransition('DAMAGED', 'SCRAPPED')).toBe(true);
    });

    it('DAMAGED -> IN_SERVICE engedélyezett', () => {
      expect(service.isValidStatusTransition('DAMAGED', 'IN_SERVICE')).toBe(true);
    });
  });
});
