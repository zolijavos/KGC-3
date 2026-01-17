/**
 * @kgc/inventory - WarehouseService TDD Tests
 * Story 9-3: Multi-warehouse támogatás
 * FR9: Raktárak közötti átmozgatás
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarehouseService } from './warehouse.service';
import {
  Warehouse,
  InventoryTransfer,
  IWarehouseRepository,
  CrossWarehouseStockSummary,
} from '../interfaces/warehouse.interface';
import {
  CreateWarehouseInput,
  CreateTransferInput,
} from '../dto/warehouse.dto';

// ============================================
// TEST DATA - Valid UUIDs
// ============================================

const TEST_IDS = {
  WAREHOUSE_1: '11111111-1111-1111-1111-111111111111',
  WAREHOUSE_2: '22222222-2222-2222-2222-222222222222',
  WAREHOUSE_3: '33333333-3333-3333-3333-333333333333',
  TRANSFER_1: '44444444-4444-4444-4444-444444444444',
  TENANT: '55555555-5555-5555-5555-555555555555',
  USER: '66666666-6666-6666-6666-666666666666',
  ITEM_1: '77777777-7777-7777-7777-777777777777',
  ITEM_2: '88888888-8888-8888-8888-888888888888',
  PRODUCT_1: '99999999-9999-9999-9999-999999999999',
};

// ============================================
// MOCK REPOSITORY
// ============================================

const createMockRepository = (): IWarehouseRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByCode: vi.fn(),
  findDefault: vi.fn(),
  query: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  createTransfer: vi.fn(),
  findTransferById: vi.fn(),
  findTransferByCode: vi.fn(),
  queryTransfers: vi.fn(),
  updateTransfer: vi.fn(),
  getCrossWarehouseStock: vi.fn(),
  hasInventoryItems: vi.fn(),
});

// ============================================
// TEST DATA FACTORY
// ============================================

const createTestWarehouse = (
  overrides: Partial<Warehouse> = {},
): Warehouse => ({
  id: TEST_IDS.WAREHOUSE_1,
  tenantId: TEST_IDS.TENANT,
  code: 'WH-MAIN',
  name: 'Központi Raktár',
  type: 'MAIN',
  status: 'ACTIVE',
  address: 'Test utca 1.',
  city: 'Budapest',
  postalCode: '1234',
  contactName: 'Teszt Elek',
  contactPhone: '+36301234567',
  contactEmail: 'teszt@example.com',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  ...overrides,
});

const createTestTransfer = (
  overrides: Partial<InventoryTransfer> = {},
): InventoryTransfer => ({
  id: TEST_IDS.TRANSFER_1,
  tenantId: TEST_IDS.TENANT,
  transferCode: 'TRF-2026-001',
  sourceWarehouseId: TEST_IDS.WAREHOUSE_1,
  targetWarehouseId: TEST_IDS.WAREHOUSE_2,
  status: 'PENDING',
  reason: 'Készlet átcsoportosítás',
  initiatedBy: TEST_IDS.USER,
  initiatedAt: new Date(),
  items: [
    {
      inventoryItemId: TEST_IDS.ITEM_1,
      quantity: 5,
      unit: 'db',
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================
// TEST SUITE
// ============================================

describe('WarehouseService', () => {
  let service: WarehouseService;
  let mockRepository: IWarehouseRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new WarehouseService(mockRepository);
  });

  // ============================================
  // WAREHOUSE CRUD TESTS
  // ============================================

  describe('createWarehouse', () => {
    const validInput: CreateWarehouseInput = {
      code: 'WH-NEW',
      name: 'Új Raktár',
      type: 'BRANCH',
      city: 'Debrecen',
    };

    it('raktár létrehozása sikeres', async () => {
      const expectedWarehouse = createTestWarehouse({
        id: TEST_IDS.WAREHOUSE_2,
        code: 'WH-NEW',
        name: 'Új Raktár',
        type: 'BRANCH',
      });
      vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
      vi.mocked(mockRepository.create).mockResolvedValue(expectedWarehouse);

      const result = await service.createWarehouse(TEST_IDS.TENANT, validInput);

      expect(result).toEqual(expectedWarehouse);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_IDS.TENANT,
          code: 'WH-NEW',
          name: 'Új Raktár',
          type: 'BRANCH',
        }),
      );
    });

    it('duplikált kód esetén hiba', async () => {
      const existingWarehouse = createTestWarehouse({ code: 'WH-NEW' });
      vi.mocked(mockRepository.findByCode).mockResolvedValue(existingWarehouse);

      await expect(
        service.createWarehouse(TEST_IDS.TENANT, validInput),
      ).rejects.toThrow('A raktár kód már létezik');
    });

    it('első raktár automatikusan default', async () => {
      vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
      vi.mocked(mockRepository.findDefault).mockResolvedValue(null);
      vi.mocked(mockRepository.create).mockResolvedValue(createTestWarehouse());

      await service.createWarehouse(TEST_IDS.TENANT, validInput);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isDefault: true,
        }),
      );
    });

    it('érvénytelen kód formátum esetén hiba', async () => {
      const invalidInput = {
        ...validInput,
        code: 'invalid code!', // szóköz és felkiáltójel tiltott
      };

      await expect(
        service.createWarehouse(TEST_IDS.TENANT, invalidInput as CreateWarehouseInput),
      ).rejects.toThrow();
    });
  });

  describe('findWarehouseById', () => {
    it('meglévő raktár visszaadása', async () => {
      const expectedWarehouse = createTestWarehouse();
      vi.mocked(mockRepository.findById).mockResolvedValue(expectedWarehouse);

      const result = await service.findWarehouseById(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT);

      expect(result).toEqual(expectedWarehouse);
    });

    it('törölt raktár esetén null', async () => {
      const deletedWarehouse = createTestWarehouse({ isDeleted: true });
      vi.mocked(mockRepository.findById).mockResolvedValue(deletedWarehouse);

      const result = await service.findWarehouseById(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT);

      expect(result).toBeNull();
    });
  });

  describe('queryWarehouses', () => {
    it('raktárak listázása', async () => {
      const warehouses = [
        createTestWarehouse(),
        createTestWarehouse({ id: TEST_IDS.WAREHOUSE_2, code: 'WH-2' }),
      ];
      vi.mocked(mockRepository.query).mockResolvedValue({
        warehouses,
        total: 2,
        offset: 0,
        limit: 20,
      });

      const result = await service.queryWarehouses({
        tenantId: TEST_IDS.TENANT,
      });

      expect(result.warehouses).toHaveLength(2);
    });

    it('típus szerinti szűrés', async () => {
      vi.mocked(mockRepository.query).mockResolvedValue({
        warehouses: [createTestWarehouse({ type: 'MAIN' })],
        total: 1,
        offset: 0,
        limit: 20,
      });

      await service.queryWarehouses({
        tenantId: TEST_IDS.TENANT,
        type: 'MAIN',
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MAIN' }),
      );
    });
  });

  describe('setDefaultWarehouse', () => {
    it('alapértelmezett raktár beállítása', async () => {
      const warehouse = createTestWarehouse({ isDefault: false });
      const currentDefault = createTestWarehouse({
        id: TEST_IDS.WAREHOUSE_2,
        isDefault: true,
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(warehouse);
      vi.mocked(mockRepository.findDefault).mockResolvedValue(currentDefault);
      vi.mocked(mockRepository.update).mockResolvedValue(
        createTestWarehouse({ isDefault: true }),
      );

      await service.setDefaultWarehouse(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT);

      // Előző default törlése
      expect(mockRepository.update).toHaveBeenCalledWith(
        TEST_IDS.WAREHOUSE_2,
        TEST_IDS.TENANT,
        expect.objectContaining({ isDefault: false }),
      );
      // Új default beállítása
      expect(mockRepository.update).toHaveBeenCalledWith(
        TEST_IDS.WAREHOUSE_1,
        TEST_IDS.TENANT,
        expect.objectContaining({ isDefault: true }),
      );
    });
  });

  // ============================================
  // DELETE WAREHOUSE TESTS
  // ============================================

  describe('deleteWarehouse', () => {
    it('raktár törlése sikeres ha nincs készlet', async () => {
      const warehouse = createTestWarehouse({ isDefault: false });
      vi.mocked(mockRepository.findById).mockResolvedValue(warehouse);
      vi.mocked(mockRepository.hasInventoryItems).mockResolvedValue(false);

      await service.deleteWarehouse(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT);

      expect(mockRepository.delete).toHaveBeenCalledWith(
        TEST_IDS.WAREHOUSE_1,
        TEST_IDS.TENANT,
      );
    });

    it('alapértelmezett raktár nem törölhető', async () => {
      const defaultWarehouse = createTestWarehouse({ isDefault: true });
      vi.mocked(mockRepository.findById).mockResolvedValue(defaultWarehouse);

      await expect(
        service.deleteWarehouse(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT),
      ).rejects.toThrow('Alapértelmezett raktár nem törölhető');
    });

    it('készletet tartalmazó raktár nem törölhető', async () => {
      const warehouse = createTestWarehouse({ isDefault: false });
      vi.mocked(mockRepository.findById).mockResolvedValue(warehouse);
      vi.mocked(mockRepository.hasInventoryItems).mockResolvedValue(true);

      await expect(
        service.deleteWarehouse(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT),
      ).rejects.toThrow('Készletet tartalmazó raktár nem törölhető');
    });

    it('nem létező raktár törlése esetén hiba', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        service.deleteWarehouse(TEST_IDS.WAREHOUSE_1, TEST_IDS.TENANT),
      ).rejects.toThrow('Raktár nem található');
    });
  });

  // ============================================
  // TRANSFER TESTS (FR9)
  // ============================================

  describe('createTransfer (FR9: Raktárak közötti átmozgatás)', () => {
    const validInput: CreateTransferInput = {
      sourceWarehouseId: TEST_IDS.WAREHOUSE_1,
      targetWarehouseId: TEST_IDS.WAREHOUSE_2,
      reason: 'Készlet átcsoportosítás',
      items: [
        { inventoryItemId: TEST_IDS.ITEM_1, quantity: 5, unit: 'db' },
      ],
    };

    it('transfer létrehozása sikeres', async () => {
      const sourceWarehouse = createTestWarehouse({ id: TEST_IDS.WAREHOUSE_1 });
      const targetWarehouse = createTestWarehouse({ id: TEST_IDS.WAREHOUSE_2 });
      const expectedTransfer = createTestTransfer();

      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce(sourceWarehouse)
        .mockResolvedValueOnce(targetWarehouse);
      vi.mocked(mockRepository.createTransfer).mockResolvedValue(expectedTransfer);

      const result = await service.createTransfer(
        TEST_IDS.TENANT,
        validInput,
        TEST_IDS.USER,
      );

      expect(result).toEqual(expectedTransfer);
      expect(result.status).toBe('PENDING');
    });

    it('azonos forrás és cél raktár esetén hiba', async () => {
      const sameWarehouseInput = {
        ...validInput,
        targetWarehouseId: TEST_IDS.WAREHOUSE_1, // same as source
      };

      await expect(
        service.createTransfer(TEST_IDS.TENANT, sameWarehouseInput, TEST_IDS.USER),
      ).rejects.toThrow('A forrás és cél raktár nem lehet azonos');
    });

    it('nem létező forrás raktár esetén hiba', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        service.createTransfer(TEST_IDS.TENANT, validInput, TEST_IDS.USER),
      ).rejects.toThrow('Forrás raktár nem található');
    });

    it('inaktív cél raktár esetén hiba', async () => {
      const sourceWarehouse = createTestWarehouse({ id: TEST_IDS.WAREHOUSE_1 });
      const inactiveWarehouse = createTestWarehouse({
        id: TEST_IDS.WAREHOUSE_2,
        status: 'INACTIVE',
      });

      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce(sourceWarehouse)
        .mockResolvedValueOnce(inactiveWarehouse);

      await expect(
        service.createTransfer(TEST_IDS.TENANT, validInput, TEST_IDS.USER),
      ).rejects.toThrow('Cél raktár nem aktív');
    });

    it('üres tétel lista esetén hiba', async () => {
      const emptyItemsInput = {
        ...validInput,
        items: [],
      };

      await expect(
        service.createTransfer(TEST_IDS.TENANT, emptyItemsInput as CreateTransferInput, TEST_IDS.USER),
      ).rejects.toThrow();
    });
  });

  describe('startTransfer', () => {
    it('transfer indítása sikeres', async () => {
      const pendingTransfer = createTestTransfer({ status: 'PENDING' });
      const inTransitTransfer = createTestTransfer({ status: 'IN_TRANSIT' });

      vi.mocked(mockRepository.findTransferById).mockResolvedValue(pendingTransfer);
      vi.mocked(mockRepository.updateTransfer).mockResolvedValue(inTransitTransfer);

      const result = await service.startTransfer(
        TEST_IDS.TRANSFER_1,
        TEST_IDS.TENANT,
      );

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('nem PENDING státuszú transfer nem indítható', async () => {
      const completedTransfer = createTestTransfer({ status: 'COMPLETED' });
      vi.mocked(mockRepository.findTransferById).mockResolvedValue(completedTransfer);

      await expect(
        service.startTransfer(TEST_IDS.TRANSFER_1, TEST_IDS.TENANT),
      ).rejects.toThrow('Csak PENDING státuszú transfer indítható');
    });
  });

  describe('completeTransfer', () => {
    it('transfer befejezése sikeres', async () => {
      const inTransitTransfer = createTestTransfer({ status: 'IN_TRANSIT' });
      const completedTransfer = createTestTransfer({
        status: 'COMPLETED',
        completedBy: TEST_IDS.USER,
        completedAt: new Date(),
      });

      vi.mocked(mockRepository.findTransferById).mockResolvedValue(inTransitTransfer);
      vi.mocked(mockRepository.updateTransfer).mockResolvedValue(completedTransfer);

      const result = await service.completeTransfer(
        TEST_IDS.TRANSFER_1,
        TEST_IDS.TENANT,
        TEST_IDS.USER,
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.completedBy).toBe(TEST_IDS.USER);
    });

    it('nem IN_TRANSIT státuszú transfer nem fejezhető be', async () => {
      const pendingTransfer = createTestTransfer({ status: 'PENDING' });
      vi.mocked(mockRepository.findTransferById).mockResolvedValue(pendingTransfer);

      await expect(
        service.completeTransfer(TEST_IDS.TRANSFER_1, TEST_IDS.TENANT, TEST_IDS.USER),
      ).rejects.toThrow('Csak IN_TRANSIT státuszú transfer fejezhető be');
    });
  });

  describe('cancelTransfer', () => {
    it('transfer visszavonása sikeres', async () => {
      const pendingTransfer = createTestTransfer({ status: 'PENDING' });
      const cancelledTransfer = createTestTransfer({ status: 'CANCELLED' });

      vi.mocked(mockRepository.findTransferById).mockResolvedValue(pendingTransfer);
      vi.mocked(mockRepository.updateTransfer).mockResolvedValue(cancelledTransfer);

      const result = await service.cancelTransfer(
        TEST_IDS.TRANSFER_1,
        TEST_IDS.TENANT,
        'Téves küldés',
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('COMPLETED transfer nem vonható vissza', async () => {
      const completedTransfer = createTestTransfer({ status: 'COMPLETED' });
      vi.mocked(mockRepository.findTransferById).mockResolvedValue(completedTransfer);

      await expect(
        service.cancelTransfer(TEST_IDS.TRANSFER_1, TEST_IDS.TENANT, 'Téves'),
      ).rejects.toThrow('COMPLETED státuszú transfer nem vonható vissza');
    });
  });

  // ============================================
  // CROSS-WAREHOUSE STOCK TESTS
  // ============================================

  describe('getCrossWarehouseStock', () => {
    it('összesített készlet lekérdezése', async () => {
      const stockSummary: CrossWarehouseStockSummary[] = [
        {
          productId: TEST_IDS.PRODUCT_1,
          productName: 'Teszt termék',
          unit: 'db',
          totalQuantity: 100,
          warehouseBreakdown: [
            {
              warehouseId: TEST_IDS.WAREHOUSE_1,
              warehouseName: 'Központi',
              warehouseCode: 'WH-MAIN',
              quantity: 60,
              availableQuantity: 50,
            },
            {
              warehouseId: TEST_IDS.WAREHOUSE_2,
              warehouseName: 'Fiók',
              warehouseCode: 'WH-BRANCH',
              quantity: 40,
              availableQuantity: 35,
            },
          ],
        },
      ];

      vi.mocked(mockRepository.getCrossWarehouseStock).mockResolvedValue(stockSummary);

      const result = await service.getCrossWarehouseStock(TEST_IDS.TENANT);

      expect(result).toHaveLength(1);
      expect(result[0]?.totalQuantity).toBe(100);
      expect(result[0]?.warehouseBreakdown).toHaveLength(2);
    });

    it('üres eredmény kezelése', async () => {
      vi.mocked(mockRepository.getCrossWarehouseStock).mockResolvedValue([]);

      const result = await service.getCrossWarehouseStock(TEST_IDS.TENANT);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // TRANSFER CODE GENERATION
  // ============================================

  describe('generateTransferCode', () => {
    it('egyedi kód generálása (UUID alapú)', () => {
      const code1 = service.generateTransferCode();
      const code2 = service.generateTransferCode();

      // Új formátum: TRF-YYYY-XXXXXXXX (8 hex karakter)
      expect(code1).toMatch(/^TRF-\d{4}-[A-F0-9]{8}$/);
      expect(code1).not.toBe(code2);
    });
  });
});
