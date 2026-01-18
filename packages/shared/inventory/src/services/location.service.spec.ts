/**
 * @kgc/inventory - LocationService TDD Tests
 * Story 9-2: K-P-D helykód rendszer
 * FR8, FR10, FR32 lefedés
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLocationStructureInput, GenerateLocationsInput } from '../dto/location.dto';
import {
  ILocationRepository,
  LocationCode,
  LocationStructure,
} from '../interfaces/location.interface';
import { LocationService } from './location.service';

// ============================================
// TEST DATA - Valid UUIDs
// ============================================

const TEST_IDS = {
  STRUCTURE: '11111111-1111-1111-1111-111111111111',
  LOCATION_1: '22222222-2222-2222-2222-222222222222',
  LOCATION_2: '33333333-3333-3333-3333-333333333333',
  TENANT: '44444444-4444-4444-4444-444444444444',
  WAREHOUSE: '55555555-5555-5555-5555-555555555555',
};

// ============================================
// MOCK REPOSITORY
// ============================================

const createMockRepository = (): ILocationRepository => ({
  createStructure: vi.fn(),
  getStructure: vi.fn(),
  updateStructure: vi.fn(),
  createLocation: vi.fn(),
  createLocations: vi.fn(),
  findByCode: vi.fn(),
  findById: vi.fn(),
  query: vi.fn(),
  updateLocation: vi.fn(),
  updateOccupancy: vi.fn(),
  deleteLocation: vi.fn(),
  deleteAllByWarehouse: vi.fn(),
});

// ============================================
// TEST DATA FACTORY
// ============================================

const createTestStructure = (overrides: Partial<LocationStructure> = {}): LocationStructure => ({
  id: TEST_IDS.STRUCTURE,
  tenantId: TEST_IDS.TENANT,
  warehouseId: TEST_IDS.WAREHOUSE,
  kommandoPrefix: 'K',
  polcPrefix: 'P',
  dobozPrefix: 'D',
  separator: '-',
  maxKommando: 10,
  maxPolcPerKommando: 5,
  maxDobozPerPolc: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createTestLocation = (overrides: Partial<LocationCode> = {}): LocationCode => ({
  id: TEST_IDS.LOCATION_1,
  tenantId: TEST_IDS.TENANT,
  warehouseId: TEST_IDS.WAREHOUSE,
  code: 'K1-P2-D3',
  kommando: 1,
  polc: 2,
  doboz: 3,
  status: 'ACTIVE',
  description: undefined,
  capacity: 100,
  currentOccupancy: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  ...overrides,
});

// ============================================
// TEST SUITE
// ============================================

describe('LocationService', () => {
  let service: LocationService;
  let mockRepository: ILocationRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new LocationService(mockRepository);
  });

  // ============================================
  // STRUCTURE TESTS (FR8)
  // ============================================

  describe('createStructure (FR8: Raktári helyhierarchia)', () => {
    const validInput: CreateLocationStructureInput = {
      warehouseId: TEST_IDS.WAREHOUSE,
      kommandoPrefix: 'K',
      polcPrefix: 'P',
      dobozPrefix: 'D',
      separator: '-',
      maxKommando: 10,
      maxPolcPerKommando: 5,
      maxDobozPerPolc: 10,
    };

    it('struktúra létrehozása sikeres', async () => {
      const expectedStructure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(null);
      vi.mocked(mockRepository.createStructure).mockResolvedValue(expectedStructure);

      const result = await service.createStructure(TEST_IDS.TENANT, validInput);

      expect(result).toEqual(expectedStructure);
      expect(mockRepository.createStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_IDS.TENANT,
          warehouseId: TEST_IDS.WAREHOUSE,
          kommandoPrefix: 'K',
          polcPrefix: 'P',
          dobozPrefix: 'D',
          separator: '-',
        })
      );
    });

    it('ha már létezik struktúra, hiba', async () => {
      const existingStructure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(existingStructure);

      await expect(service.createStructure(TEST_IDS.TENANT, validInput)).rejects.toThrow(
        'A raktárhoz már létezik helykód struktúra'
      );
    });

    it('érvénytelen warehouseId esetén validációs hiba', async () => {
      const invalidInput = {
        ...validInput,
        warehouseId: 'invalid-uuid',
      };

      await expect(
        service.createStructure(TEST_IDS.TENANT, invalidInput as CreateLocationStructureInput)
      ).rejects.toThrow();
    });

    it('túl nagy maxKommando esetén validációs hiba', async () => {
      const invalidInput = {
        ...validInput,
        maxKommando: 1000, // max 999
      };

      await expect(
        service.createStructure(TEST_IDS.TENANT, invalidInput as CreateLocationStructureInput)
      ).rejects.toThrow();
    });
  });

  describe('getStructure', () => {
    it('meglévő struktúra visszaadása', async () => {
      const expectedStructure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(expectedStructure);

      const result = await service.getStructure(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE);

      expect(result).toEqual(expectedStructure);
    });

    it('nem létező struktúra esetén null', async () => {
      vi.mocked(mockRepository.getStructure).mockResolvedValue(null);

      const result = await service.getStructure(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // CODE VALIDATION TESTS (FR10)
  // ============================================

  describe('validateCode (FR10: Helykód validáció)', () => {
    it('érvényes helykód elfogadása', async () => {
      const structure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(structure);
      vi.mocked(mockRepository.findByCode).mockResolvedValue(createTestLocation());

      const result = await service.validateCode(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE, 'K1-P2-D3');

      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({
        kommando: 1,
        polc: 2,
        doboz: 3,
        original: 'K1-P2-D3',
      });
    });

    it('érvénytelen formátum esetén hiba', async () => {
      const structure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(structure);

      const result = await service.validateCode(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE, 'INVALID');

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('tartományon kívüli érték esetén hiba', async () => {
      const structure = createTestStructure({ maxKommando: 5 });
      vi.mocked(mockRepository.getStructure).mockResolvedValue(structure);

      const result = await service.validateCode(
        TEST_IDS.TENANT,
        TEST_IDS.WAREHOUSE,
        'K10-P2-D3' // K10 > maxKommando(5)
      );

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('OUT_OF_RANGE');
    });

    it('nem létező helykód esetén hiba', async () => {
      const structure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(structure);
      vi.mocked(mockRepository.findByCode).mockResolvedValue(null);

      const result = await service.validateCode(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE, 'K1-P2-D3');

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('NOT_EXISTS');
    });

    it('inaktív helykód esetén figyelmeztetés', async () => {
      const structure = createTestStructure();
      const inactiveLocation = createTestLocation({ status: 'INACTIVE' });
      vi.mocked(mockRepository.getStructure).mockResolvedValue(structure);
      vi.mocked(mockRepository.findByCode).mockResolvedValue(inactiveLocation);

      const result = await service.validateCode(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE, 'K1-P2-D3');

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INACTIVE');
    });
  });

  // ============================================
  // PARSE CODE TESTS
  // ============================================

  describe('parseCode', () => {
    it('helyes parsing K1-P2-D3 formátumra', () => {
      const result = service.parseCode('K1-P2-D3', 'K', 'P', 'D', '-');

      expect(result).toEqual({
        kommando: 1,
        polc: 2,
        doboz: 3,
        original: 'K1-P2-D3',
      });
    });

    it('helyes parsing egyedi prefixekkel', () => {
      const result = service.parseCode('KOM5-POL10-DOB25', 'KOM', 'POL', 'DOB', '-');

      expect(result).toEqual({
        kommando: 5,
        polc: 10,
        doboz: 25,
        original: 'KOM5-POL10-DOB25',
      });
    });

    it('érvénytelen formátum esetén null', () => {
      const result = service.parseCode('INVALID', 'K', 'P', 'D', '-');

      expect(result).toBeNull();
    });

    it('hiányzó komponens esetén null', () => {
      const result = service.parseCode('K1-P2', 'K', 'P', 'D', '-');

      expect(result).toBeNull();
    });

    it('nem numerikus érték esetén null', () => {
      const result = service.parseCode('KA-P2-D3', 'K', 'P', 'D', '-');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // GENERATE CODE TESTS
  // ============================================

  describe('generateCode', () => {
    it('helyes kód generálása', () => {
      const result = service.generateCode(1, 2, 3, 'K', 'P', 'D', '-');

      expect(result).toBe('K1-P2-D3');
    });

    it('egyedi prefixekkel', () => {
      const result = service.generateCode(5, 10, 25, 'KOM', 'POL', 'DOB', '-');

      expect(result).toBe('KOM5-POL10-DOB25');
    });

    it('más elválasztóval', () => {
      const result = service.generateCode(1, 2, 3, 'K', 'P', 'D', '/');

      expect(result).toBe('K1/P2/D3');
    });
  });

  // ============================================
  // GENERATE LOCATIONS TESTS (FR32)
  // ============================================

  describe('generateLocations (FR32: Partner onboarding)', () => {
    const validInput: GenerateLocationsInput = {
      warehouseId: TEST_IDS.WAREHOUSE,
      kommandoCount: 2,
      polcCount: 3,
      dobozCount: 4,
      capacityPerDoboz: 50,
    };

    it('helykódok generálása sikeres', async () => {
      const structure = createTestStructure();
      vi.mocked(mockRepository.getStructure).mockResolvedValue(structure);
      vi.mocked(mockRepository.createLocations).mockResolvedValue(24); // 2*3*4 = 24

      const result = await service.generateLocations(TEST_IDS.TENANT, validInput);

      expect(result.totalCreated).toBe(24);
      expect(result.structureId).toBe(TEST_IDS.STRUCTURE);
      expect(result.sampleCodes).toContain('K1-P1-D1');
    });

    it('struktúra nélkül automatikus létrehozás', async () => {
      vi.mocked(mockRepository.getStructure).mockResolvedValue(null);
      vi.mocked(mockRepository.createStructure).mockResolvedValue(createTestStructure());
      vi.mocked(mockRepository.createLocations).mockResolvedValue(24);

      const result = await service.generateLocations(TEST_IDS.TENANT, validInput);

      expect(mockRepository.createStructure).toHaveBeenCalled();
      expect(result.totalCreated).toBe(24);
    });

    it('túl nagy generálás esetén hiba', async () => {
      const largeInput: GenerateLocationsInput = {
        warehouseId: TEST_IDS.WAREHOUSE,
        kommandoCount: 100,
        polcCount: 50,
        dobozCount: 50, // 100*50*50 = 250,000 - túl sok
      };

      await expect(service.generateLocations(TEST_IDS.TENANT, largeInput)).rejects.toThrow(
        'Maximum 50,000 helykód generálható egyszerre'
      );
    });

    it('érvénytelen input esetén validációs hiba', async () => {
      const invalidInput = {
        ...validInput,
        kommandoCount: 0, // minimum 1
      };

      await expect(
        service.generateLocations(TEST_IDS.TENANT, invalidInput as GenerateLocationsInput)
      ).rejects.toThrow();
    });
  });

  // ============================================
  // FIND AVAILABLE LOCATION TESTS
  // ============================================

  describe('findAvailableLocation', () => {
    it('elérhető helykód visszaadása', async () => {
      const availableLocation = createTestLocation({ currentOccupancy: 0, capacity: 100 });
      vi.mocked(mockRepository.query).mockResolvedValue({
        locations: [availableLocation],
        total: 1,
        offset: 0,
        limit: 1,
      });

      const result = await service.findAvailableLocation(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE);

      expect(result).toEqual(availableLocation);
    });

    it('nincs elérhető helykód esetén null', async () => {
      vi.mocked(mockRepository.query).mockResolvedValue({
        locations: [],
        total: 0,
        offset: 0,
        limit: 1,
      });

      const result = await service.findAvailableLocation(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE);

      expect(result).toBeNull();
    });

    it('preferált kommandó keresés', async () => {
      const location = createTestLocation({ kommando: 5 });
      vi.mocked(mockRepository.query).mockResolvedValue({
        locations: [location],
        total: 1,
        offset: 0,
        limit: 1,
      });

      await service.findAvailableLocation(TEST_IDS.TENANT, TEST_IDS.WAREHOUSE, 5);

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          kommando: 5,
          availableOnly: true,
        })
      );
    });
  });

  // ============================================
  // UPDATE OCCUPANCY TESTS
  // ============================================

  describe('updateOccupancy', () => {
    it('foglaltság növelése sikeres', async () => {
      const location = createTestLocation({ currentOccupancy: 5, capacity: 100 });
      const updatedLocation = createTestLocation({ currentOccupancy: 10 });
      vi.mocked(mockRepository.findById).mockResolvedValue(location);
      vi.mocked(mockRepository.updateOccupancy).mockResolvedValue(updatedLocation);

      const result = await service.updateOccupancy(TEST_IDS.LOCATION_1, TEST_IDS.TENANT, 5);

      expect(result.currentOccupancy).toBe(10);
    });

    it('foglaltság csökkentése sikeres', async () => {
      const location = createTestLocation({ currentOccupancy: 10, capacity: 100 });
      const updatedLocation = createTestLocation({ currentOccupancy: 5 });
      vi.mocked(mockRepository.findById).mockResolvedValue(location);
      vi.mocked(mockRepository.updateOccupancy).mockResolvedValue(updatedLocation);

      const result = await service.updateOccupancy(TEST_IDS.LOCATION_1, TEST_IDS.TENANT, -5);

      expect(result.currentOccupancy).toBe(5);
    });

    it('negatív foglaltság esetén hiba', async () => {
      const location = createTestLocation({ currentOccupancy: 5, capacity: 100 });
      vi.mocked(mockRepository.findById).mockResolvedValue(location);

      await expect(
        service.updateOccupancy(TEST_IDS.LOCATION_1, TEST_IDS.TENANT, -10)
      ).rejects.toThrow('A foglaltság nem lehet negatív');
    });

    it('kapacitás túllépés esetén FULL státuszra vált', async () => {
      const location = createTestLocation({ currentOccupancy: 95, capacity: 100 });
      const fullLocation = createTestLocation({
        currentOccupancy: 100,
        status: 'FULL',
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(location);
      vi.mocked(mockRepository.updateOccupancy).mockResolvedValue(fullLocation);

      const result = await service.updateOccupancy(TEST_IDS.LOCATION_1, TEST_IDS.TENANT, 5);

      expect(result.status).toBe('FULL');
    });
  });

  // ============================================
  // QUERY TESTS
  // ============================================

  describe('query', () => {
    it('helykódok listázása', async () => {
      const locations = [createTestLocation(), createTestLocation({ id: TEST_IDS.LOCATION_2 })];
      vi.mocked(mockRepository.query).mockResolvedValue({
        locations,
        total: 2,
        offset: 0,
        limit: 20,
      });

      const result = await service.query({
        tenantId: TEST_IDS.TENANT,
        warehouseId: TEST_IDS.WAREHOUSE,
      });

      expect(result.locations).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('kommandó szűrés', async () => {
      vi.mocked(mockRepository.query).mockResolvedValue({
        locations: [createTestLocation({ kommando: 1 })],
        total: 1,
        offset: 0,
        limit: 20,
      });

      await service.query({
        tenantId: TEST_IDS.TENANT,
        kommando: 1,
      });

      expect(mockRepository.query).toHaveBeenCalledWith(expect.objectContaining({ kommando: 1 }));
    });
  });
});
