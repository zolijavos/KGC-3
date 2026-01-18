/**
 * @kgc/inventory - TrackingService TDD Tests
 * Story 9-5: Serial number és batch tracking
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateBatchInput, CreateSerialNumberInput } from '../dto/tracking.dto';
import { Batch, ITrackingRepository, SerialNumber } from '../interfaces/tracking.interface';
import { TrackingService } from './tracking.service';

// ============================================
// TEST DATA - Valid UUIDs
// ============================================

const TEST_IDS = {
  SERIAL_1: '11111111-1111-1111-1111-111111111111',
  SERIAL_2: '22222222-2222-2222-2222-222222222222',
  BATCH_1: '33333333-3333-3333-3333-333333333333',
  BATCH_2: '44444444-4444-4444-4444-444444444444',
  TENANT: '55555555-5555-5555-5555-555555555555',
  PRODUCT: '66666666-6666-6666-6666-666666666666',
  WAREHOUSE: '77777777-7777-7777-7777-777777777777',
  INVENTORY_ITEM: '88888888-8888-8888-8888-888888888888',
  SUPPLIER: '99999999-9999-9999-9999-999999999999',
};

// ============================================
// MOCK REPOSITORY
// ============================================

const createMockRepository = (): ITrackingRepository => ({
  // Serial Number Methods
  createSerialNumber: vi.fn(),
  findSerialNumberById: vi.fn(),
  findSerialNumberByValue: vi.fn(),
  querySerialNumbers: vi.fn(),
  updateSerialNumber: vi.fn(),
  serialNumberExists: vi.fn(),
  getExpiringWarranties: vi.fn(),

  // Batch Methods
  createBatch: vi.fn(),
  findBatchById: vi.fn(),
  findBatchByNumber: vi.fn(),
  queryBatches: vi.fn(),
  updateBatch: vi.fn(),
  adjustBatchQuantity: vi.fn(),
  batchExists: vi.fn(),
  getExpiringBatches: vi.fn(),
  getLowStockBatches: vi.fn(),
});

// ============================================
// TEST DATA FACTORIES
// ============================================

const createTestSerialNumber = (overrides: Partial<SerialNumber> = {}): SerialNumber => ({
  id: TEST_IDS.SERIAL_1,
  tenantId: TEST_IDS.TENANT,
  serialNumber: 'SN-2026-001',
  productId: TEST_IDS.PRODUCT,
  inventoryItemId: TEST_IDS.INVENTORY_ITEM,
  warehouseId: TEST_IDS.WAREHOUSE,
  locationCode: 'A-01-01',
  status: 'AVAILABLE',
  manufacturerSerialNumber: 'MFG-12345',
  manufacturingDate: new Date('2025-01-01'),
  warrantyExpiryDate: new Date('2027-01-01'),
  purchaseDate: new Date('2026-01-01'),
  purchasePrice: 50000,
  currentValue: 45000,
  createdAt: new Date(),
  ...overrides,
});

const createTestBatch = (overrides: Partial<Batch> = {}): Batch => ({
  id: TEST_IDS.BATCH_1,
  tenantId: TEST_IDS.TENANT,
  batchNumber: 'BATCH-2026-001',
  productId: TEST_IDS.PRODUCT,
  warehouseId: TEST_IDS.WAREHOUSE,
  status: 'ACTIVE',
  originalQuantity: 100,
  currentQuantity: 80,
  unit: 'db',
  manufacturingDate: new Date('2025-12-01'),
  expiryDate: new Date('2027-12-01'),
  supplierBatchNumber: 'SUP-BATCH-001',
  supplierId: TEST_IDS.SUPPLIER,
  receivedDate: new Date('2026-01-01'),
  unitCost: 1500,
  createdAt: new Date(),
  ...overrides,
});

// ============================================
// TEST SUITE
// ============================================

describe('TrackingService', () => {
  let service: TrackingService;
  let mockRepository: ITrackingRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new TrackingService(mockRepository);
  });

  // ============================================
  // SERIAL NUMBER TESTS
  // ============================================

  describe('Serial Number Management', () => {
    describe('createSerialNumber', () => {
      const validInput: CreateSerialNumberInput = {
        serialNumber: 'SN-2026-001',
        productId: TEST_IDS.PRODUCT,
        inventoryItemId: TEST_IDS.INVENTORY_ITEM,
        warehouseId: TEST_IDS.WAREHOUSE,
        status: 'AVAILABLE',
      };

      it('serial number létrehozása sikeres', async () => {
        const expectedSerial = createTestSerialNumber();
        vi.mocked(mockRepository.serialNumberExists).mockResolvedValue(false);
        vi.mocked(mockRepository.createSerialNumber).mockResolvedValue(expectedSerial);

        const result = await service.createSerialNumber(TEST_IDS.TENANT, validInput);

        expect(result).toEqual(expectedSerial);
        expect(mockRepository.createSerialNumber).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: TEST_IDS.TENANT,
            serialNumber: 'SN-2026-001',
            productId: TEST_IDS.PRODUCT,
            status: 'AVAILABLE',
          })
        );
      });

      it('duplikált serial number esetén hiba', async () => {
        vi.mocked(mockRepository.serialNumberExists).mockResolvedValue(true);

        await expect(service.createSerialNumber(TEST_IDS.TENANT, validInput)).rejects.toThrow(
          'A serial number már létezik'
        );
      });

      it('érvénytelen serial number formátum', async () => {
        const invalidInput = {
          ...validInput,
          serialNumber: 'invalid serial#',
        };

        await expect(
          service.createSerialNumber(TEST_IDS.TENANT, invalidInput as CreateSerialNumberInput)
        ).rejects.toThrow();
      });

      it('üres serial number esetén hiba', async () => {
        const invalidInput = {
          ...validInput,
          serialNumber: '',
        };

        await expect(
          service.createSerialNumber(TEST_IDS.TENANT, invalidInput as CreateSerialNumberInput)
        ).rejects.toThrow('A serial number kötelező');
      });

      it('garancia dátummal létrehozás', async () => {
        const inputWithWarranty: CreateSerialNumberInput = {
          ...validInput,
          warrantyExpiryDate: new Date('2027-01-01'),
          purchaseDate: new Date('2026-01-01'),
          purchasePrice: 50000,
        };
        vi.mocked(mockRepository.serialNumberExists).mockResolvedValue(false);
        vi.mocked(mockRepository.createSerialNumber).mockResolvedValue(
          createTestSerialNumber({ warrantyExpiryDate: new Date('2027-01-01') })
        );

        const result = await service.createSerialNumber(TEST_IDS.TENANT, inputWithWarranty);

        expect(result.warrantyExpiryDate).toBeDefined();
        expect(mockRepository.createSerialNumber).toHaveBeenCalledWith(
          expect.objectContaining({
            warrantyExpiryDate: expect.any(Date),
            purchasePrice: 50000,
          })
        );
      });
    });

    describe('findSerialNumber', () => {
      it('serial number keresése ID alapján', async () => {
        const expectedSerial = createTestSerialNumber();
        vi.mocked(mockRepository.findSerialNumberById).mockResolvedValue(expectedSerial);

        const result = await service.findSerialNumberById(TEST_IDS.SERIAL_1, TEST_IDS.TENANT);

        expect(result).toEqual(expectedSerial);
      });

      it('serial number keresése érték alapján', async () => {
        const expectedSerial = createTestSerialNumber();
        vi.mocked(mockRepository.findSerialNumberByValue).mockResolvedValue(expectedSerial);

        const result = await service.findSerialNumberByValue('SN-2026-001', TEST_IDS.TENANT);

        expect(result).toEqual(expectedSerial);
      });

      it('nem létező serial number', async () => {
        vi.mocked(mockRepository.findSerialNumberByValue).mockResolvedValue(null);

        const result = await service.findSerialNumberByValue('NON-EXISTENT', TEST_IDS.TENANT);

        expect(result).toBeNull();
      });
    });

    describe('updateSerialNumber', () => {
      it('serial number státusz frissítése', async () => {
        const existingSerial = createTestSerialNumber();
        const updatedSerial = createTestSerialNumber({ status: 'RENTED' });
        vi.mocked(mockRepository.findSerialNumberById).mockResolvedValue(existingSerial);
        vi.mocked(mockRepository.updateSerialNumber).mockResolvedValue(updatedSerial);

        const result = await service.updateSerialNumber(TEST_IDS.SERIAL_1, TEST_IDS.TENANT, {
          status: 'RENTED',
        });

        expect(result.status).toBe('RENTED');
      });

      it('helykód frissítése', async () => {
        const existingSerial = createTestSerialNumber();
        const updatedSerial = createTestSerialNumber({ locationCode: 'B-02-03' });
        vi.mocked(mockRepository.findSerialNumberById).mockResolvedValue(existingSerial);
        vi.mocked(mockRepository.updateSerialNumber).mockResolvedValue(updatedSerial);

        const result = await service.updateSerialNumber(TEST_IDS.SERIAL_1, TEST_IDS.TENANT, {
          locationCode: 'B-02-03',
        });

        expect(result.locationCode).toBe('B-02-03');
      });

      it('nem létező serial number frissítése hiba', async () => {
        vi.mocked(mockRepository.findSerialNumberById).mockResolvedValue(null);

        await expect(
          service.updateSerialNumber(TEST_IDS.SERIAL_1, TEST_IDS.TENANT, { status: 'RENTED' })
        ).rejects.toThrow('Serial number nem található');
      });
    });

    describe('querySerialNumbers', () => {
      it('serial number keresés szűrőkkel', async () => {
        const serials = [
          createTestSerialNumber(),
          createTestSerialNumber({ id: TEST_IDS.SERIAL_2, serialNumber: 'SN-2026-002' }),
        ];
        vi.mocked(mockRepository.querySerialNumbers).mockResolvedValue({
          items: serials,
          total: 2,
          offset: 0,
          limit: 20,
        });

        const result = await service.querySerialNumbers({
          tenantId: TEST_IDS.TENANT,
          status: 'AVAILABLE',
        });

        expect(result.items).toHaveLength(2);
      });

      it('státusz szerinti szűrés', async () => {
        vi.mocked(mockRepository.querySerialNumbers).mockResolvedValue({
          items: [createTestSerialNumber({ status: 'RENTED' })],
          total: 1,
          offset: 0,
          limit: 20,
        });

        await service.querySerialNumbers({
          tenantId: TEST_IDS.TENANT,
          status: 'RENTED',
        });

        expect(mockRepository.querySerialNumbers).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'RENTED' })
        );
      });
    });

    describe('getExpiringWarranties', () => {
      it('hamarosan lejáró garanciák lekérdezése', async () => {
        const expiringItems = [
          createTestSerialNumber({ warrantyExpiryDate: new Date('2026-02-01') }),
          createTestSerialNumber({
            id: TEST_IDS.SERIAL_2,
            serialNumber: 'SN-2026-002',
            warrantyExpiryDate: new Date('2026-02-15'),
          }),
        ];
        vi.mocked(mockRepository.getExpiringWarranties).mockResolvedValue(expiringItems);

        const result = await service.getExpiringWarranties(TEST_IDS.TENANT, new Date('2026-03-01'));

        expect(result).toHaveLength(2);
      });
    });

    describe('isValidSerialNumberTransition', () => {
      it('AVAILABLE -> RESERVED érvényes', () => {
        expect(service.isValidSerialNumberTransition('AVAILABLE', 'RESERVED')).toBe(true);
      });

      it('AVAILABLE -> RENTED érvényes', () => {
        expect(service.isValidSerialNumberTransition('AVAILABLE', 'RENTED')).toBe(true);
      });

      it('RESERVED -> AVAILABLE érvényes (feloldás)', () => {
        expect(service.isValidSerialNumberTransition('RESERVED', 'AVAILABLE')).toBe(true);
      });

      it('RENTED -> AVAILABLE érvényes (visszavétel)', () => {
        expect(service.isValidSerialNumberTransition('RENTED', 'AVAILABLE')).toBe(true);
      });

      it('SOLD -> AVAILABLE érvénytelen', () => {
        expect(service.isValidSerialNumberTransition('SOLD', 'AVAILABLE')).toBe(false);
      });

      it('SCRAPPED -> bármi érvénytelen', () => {
        expect(service.isValidSerialNumberTransition('SCRAPPED', 'AVAILABLE')).toBe(false);
        expect(service.isValidSerialNumberTransition('SCRAPPED', 'RENTED')).toBe(false);
      });
    });
  });

  // ============================================
  // BATCH TESTS
  // ============================================

  describe('Batch Management', () => {
    describe('createBatch', () => {
      const validInput: CreateBatchInput = {
        batchNumber: 'BATCH-2026-001',
        productId: TEST_IDS.PRODUCT,
        warehouseId: TEST_IDS.WAREHOUSE,
        status: 'ACTIVE',
        originalQuantity: 100,
        unit: 'db',
      };

      it('batch létrehozása sikeres', async () => {
        const expectedBatch = createTestBatch();
        vi.mocked(mockRepository.batchExists).mockResolvedValue(false);
        vi.mocked(mockRepository.createBatch).mockResolvedValue(expectedBatch);

        const result = await service.createBatch(TEST_IDS.TENANT, validInput);

        expect(result).toEqual(expectedBatch);
        expect(mockRepository.createBatch).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: TEST_IDS.TENANT,
            batchNumber: 'BATCH-2026-001',
            originalQuantity: 100,
            currentQuantity: 100, // Alapértelmezetten = originalQuantity
          })
        );
      });

      it('duplikált batch number esetén hiba', async () => {
        vi.mocked(mockRepository.batchExists).mockResolvedValue(true);

        await expect(service.createBatch(TEST_IDS.TENANT, validInput)).rejects.toThrow(
          'A batch number már létezik'
        );
      });

      it('lejárati dátummal létrehozás', async () => {
        const inputWithExpiry: CreateBatchInput = {
          ...validInput,
          expiryDate: new Date('2027-12-01'),
          manufacturingDate: new Date('2025-12-01'),
        };
        vi.mocked(mockRepository.batchExists).mockResolvedValue(false);
        vi.mocked(mockRepository.createBatch).mockResolvedValue(
          createTestBatch({ expiryDate: new Date('2027-12-01') })
        );

        const result = await service.createBatch(TEST_IDS.TENANT, inputWithExpiry);

        expect(result.expiryDate).toBeDefined();
      });

      it('érvénytelen batch number formátum', async () => {
        const invalidInput = {
          ...validInput,
          batchNumber: 'invalid batch#!',
        };

        await expect(
          service.createBatch(TEST_IDS.TENANT, invalidInput as CreateBatchInput)
        ).rejects.toThrow();
      });

      it('negatív mennyiség esetén hiba', async () => {
        const invalidInput = {
          ...validInput,
          originalQuantity: -10,
        };

        await expect(
          service.createBatch(TEST_IDS.TENANT, invalidInput as CreateBatchInput)
        ).rejects.toThrow();
      });
    });

    describe('findBatch', () => {
      it('batch keresése ID alapján', async () => {
        const expectedBatch = createTestBatch();
        vi.mocked(mockRepository.findBatchById).mockResolvedValue(expectedBatch);

        const result = await service.findBatchById(TEST_IDS.BATCH_1, TEST_IDS.TENANT);

        expect(result).toEqual(expectedBatch);
      });

      it('batch keresése number alapján', async () => {
        const expectedBatch = createTestBatch();
        vi.mocked(mockRepository.findBatchByNumber).mockResolvedValue(expectedBatch);

        const result = await service.findBatchByNumber('BATCH-2026-001', TEST_IDS.TENANT);

        expect(result).toEqual(expectedBatch);
      });

      it('nem létező batch', async () => {
        vi.mocked(mockRepository.findBatchByNumber).mockResolvedValue(null);

        const result = await service.findBatchByNumber('NON-EXISTENT', TEST_IDS.TENANT);

        expect(result).toBeNull();
      });
    });

    describe('adjustBatchQuantity', () => {
      it('batch mennyiség csökkentése', async () => {
        const existingBatch = createTestBatch({ currentQuantity: 80 });
        const adjustedBatch = createTestBatch({ currentQuantity: 70 });
        vi.mocked(mockRepository.findBatchById).mockResolvedValue(existingBatch);
        vi.mocked(mockRepository.adjustBatchQuantity).mockResolvedValue(adjustedBatch);

        const result = await service.adjustBatchQuantity(TEST_IDS.BATCH_1, TEST_IDS.TENANT, -10);

        expect(result.currentQuantity).toBe(70);
      });

      it('batch mennyiség növelése', async () => {
        const existingBatch = createTestBatch({ currentQuantity: 80 });
        const adjustedBatch = createTestBatch({ currentQuantity: 100 });
        vi.mocked(mockRepository.findBatchById).mockResolvedValue(existingBatch);
        vi.mocked(mockRepository.adjustBatchQuantity).mockResolvedValue(adjustedBatch);

        const result = await service.adjustBatchQuantity(TEST_IDS.BATCH_1, TEST_IDS.TENANT, 20);

        expect(result.currentQuantity).toBe(100);
      });

      it('negatívba menő csökkentés hiba', async () => {
        const existingBatch = createTestBatch({ currentQuantity: 5 });
        vi.mocked(mockRepository.findBatchById).mockResolvedValue(existingBatch);

        await expect(
          service.adjustBatchQuantity(TEST_IDS.BATCH_1, TEST_IDS.TENANT, -10)
        ).rejects.toThrow('A csökkentés túl nagy');
      });

      it('nem létező batch mennyiség módosítása hiba', async () => {
        vi.mocked(mockRepository.findBatchById).mockResolvedValue(null);

        await expect(
          service.adjustBatchQuantity(TEST_IDS.BATCH_1, TEST_IDS.TENANT, -10)
        ).rejects.toThrow('Batch nem található');
      });

      it('batch kimerülés státusz változás', async () => {
        const existingBatch = createTestBatch({ currentQuantity: 10 });
        const depletedBatch = createTestBatch({ currentQuantity: 0, status: 'DEPLETED' });
        vi.mocked(mockRepository.findBatchById).mockResolvedValue(existingBatch);
        vi.mocked(mockRepository.adjustBatchQuantity).mockResolvedValue(depletedBatch);

        const result = await service.adjustBatchQuantity(TEST_IDS.BATCH_1, TEST_IDS.TENANT, -10);

        expect(result.currentQuantity).toBe(0);
        expect(result.status).toBe('DEPLETED');
      });
    });

    describe('queryBatches', () => {
      it('batch keresés szűrőkkel', async () => {
        const batches = [
          createTestBatch(),
          createTestBatch({ id: TEST_IDS.BATCH_2, batchNumber: 'BATCH-2026-002' }),
        ];
        vi.mocked(mockRepository.queryBatches).mockResolvedValue({
          items: batches,
          total: 2,
          offset: 0,
          limit: 20,
        });

        const result = await service.queryBatches({
          tenantId: TEST_IDS.TENANT,
          status: 'ACTIVE',
        });

        expect(result.items).toHaveLength(2);
      });

      it('lejárat szerinti szűrés', async () => {
        const expiringDate = new Date('2027-01-01');
        vi.mocked(mockRepository.queryBatches).mockResolvedValue({
          items: [createTestBatch({ expiryDate: expiringDate })],
          total: 1,
          offset: 0,
          limit: 20,
        });

        await service.queryBatches({
          tenantId: TEST_IDS.TENANT,
          expiringBefore: expiringDate,
        });

        expect(mockRepository.queryBatches).toHaveBeenCalledWith(
          expect.objectContaining({ expiringBefore: expiringDate })
        );
      });
    });

    describe('getExpiringBatches', () => {
      it('hamarosan lejáró batch-ek lekérdezése', async () => {
        const expiringBatches = [
          createTestBatch({ expiryDate: new Date('2026-02-01') }),
          createTestBatch({
            id: TEST_IDS.BATCH_2,
            batchNumber: 'BATCH-2026-002',
            expiryDate: new Date('2026-02-15'),
          }),
        ];
        vi.mocked(mockRepository.getExpiringBatches).mockResolvedValue(expiringBatches);

        const result = await service.getExpiringBatches(TEST_IDS.TENANT, new Date('2026-03-01'));

        expect(result).toHaveLength(2);
      });
    });

    describe('getLowStockBatches', () => {
      it('alacsony készletű batch-ek lekérdezése', async () => {
        const lowStockBatches = [
          createTestBatch({ currentQuantity: 5 }),
          createTestBatch({
            id: TEST_IDS.BATCH_2,
            batchNumber: 'BATCH-2026-002',
            currentQuantity: 8,
          }),
        ];
        vi.mocked(mockRepository.getLowStockBatches).mockResolvedValue(lowStockBatches);

        const result = await service.getLowStockBatches(TEST_IDS.TENANT, 10);

        expect(result).toHaveLength(2);
        expect(mockRepository.getLowStockBatches).toHaveBeenCalledWith(
          TEST_IDS.TENANT,
          10,
          undefined
        );
      });
    });

    describe('isBatchExpired', () => {
      it('lejárt batch felismerése', () => {
        const expiredBatch = createTestBatch({ expiryDate: new Date('2025-01-01') });
        expect(service.isBatchExpired(expiredBatch)).toBe(true);
      });

      it('nem lejárt batch', () => {
        const validBatch = createTestBatch({ expiryDate: new Date('2030-01-01') });
        expect(service.isBatchExpired(validBatch)).toBe(false);
      });

      it('lejárat nélküli batch', () => {
        const neverExpiresBatch = createTestBatch({ expiryDate: undefined });
        expect(service.isBatchExpired(neverExpiresBatch)).toBe(false);
      });
    });

    describe('getBatchRemainingDays', () => {
      it('maradék napok számítása', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const batch = createTestBatch({ expiryDate: futureDate });

        const days = service.getBatchRemainingDays(batch);

        expect(days).toBeGreaterThanOrEqual(29);
        expect(days).toBeLessThanOrEqual(31);
      });

      it('lejárt batch negatív napok', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);
        const batch = createTestBatch({ expiryDate: pastDate });

        const days = service.getBatchRemainingDays(batch);

        expect(days).toBeLessThan(0);
      });

      it('lejárat nélküli batch', () => {
        const batch = createTestBatch({ expiryDate: undefined });

        const days = service.getBatchRemainingDays(batch);

        expect(days).toBeNull();
      });
    });
  });

  // ============================================
  // VALIDATION HELPER TESTS
  // ============================================

  describe('Validation Helpers', () => {
    describe('isValidSerialNumberFormat', () => {
      it('érvényes formátumok', () => {
        expect(service.isValidSerialNumberFormat('SN-2026-001')).toBe(true);
        expect(service.isValidSerialNumberFormat('ABC123')).toBe(true);
        expect(service.isValidSerialNumberFormat('MAKITA_12345')).toBe(true);
        expect(service.isValidSerialNumberFormat('A.B.C-1/2')).toBe(true);
      });

      it('érvénytelen formátumok', () => {
        expect(service.isValidSerialNumberFormat('SN#123')).toBe(false);
        expect(service.isValidSerialNumberFormat('serial number')).toBe(false);
        expect(service.isValidSerialNumberFormat('')).toBe(false);
      });
    });

    describe('isValidBatchNumberFormat', () => {
      it('érvényes formátumok', () => {
        expect(service.isValidBatchNumberFormat('BATCH-2026-001')).toBe(true);
        expect(service.isValidBatchNumberFormat('LOT123')).toBe(true);
        expect(service.isValidBatchNumberFormat('B_001/2026')).toBe(true);
      });

      it('érvénytelen formátumok', () => {
        expect(service.isValidBatchNumberFormat('batch#001')).toBe(false);
        expect(service.isValidBatchNumberFormat('lot number')).toBe(false);
        expect(service.isValidBatchNumberFormat('')).toBe(false);
      });
    });
  });
});
