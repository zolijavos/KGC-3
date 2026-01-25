/**
 * Unit Tests: ServiceNormaController
 * Epic 20: Szerviz Norma Kezelés (ADR-020)
 *
 * TEA (Test-Each-Action) approach with mock repositories
 * Prioritás: P0-P1 (Critical - RBAC biztonsági tesztek)
 *
 * Test Coverage:
 * - CRUD operations
 * - Tenant isolation
 * - Input validation
 * - Statistics endpoints
 * - Bulk import
 * - Labor cost calculation
 */

import { AuthenticatedRequest } from '@kgc/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DifficultyLevel,
  ILaborCalculationResult,
  IServiceNorm,
  IServiceNormImportResult,
  IServiceNormRepository,
  SERVICE_NORM_REPOSITORY,
} from '../../service/repositories';
import { ServiceNormaController } from '../service-norma.controller';

// Valid UUIDs for testing
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const NORM_ID = '550e8400-e29b-41d4-a716-446655440003';

// Mock repository
const mockNormRepository: Partial<IServiceNormRepository> = {
  create: vi.fn(),
  findById: vi.fn(),
  findByNormCode: vi.fn(),
  findAll: vi.fn(),
  findByManufacturer: vi.fn(),
  findActiveNorms: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  bulkImport: vi.fn(),
  calculateLaborCost: vi.fn(),
  countByTenant: vi.fn(),
  getManufacturers: vi.fn(),
  getCategories: vi.fn(),
};

// Mock authenticated request factory
const createMockRequest = (
  overrides: Partial<AuthenticatedRequest['user']> = {}
): AuthenticatedRequest =>
  ({
    user: {
      id: USER_ID,
      tenantId: TENANT_ID,
      role: 'BOLTVEZETO',
      ...overrides,
    },
  }) as AuthenticatedRequest;

// Mock norm factory
const createMockNorm = (overrides: Partial<IServiceNorm> = {}): IServiceNorm => ({
  id: NORM_ID,
  tenantId: TENANT_ID,
  manufacturer: 'MAKITA',
  normCode: 'MK-001',
  description: 'Teszt norma',
  laborMinutes: 60,
  laborRate: 8000,
  difficultyLevel: DifficultyLevel.MEDIUM,
  validFrom: new Date('2026-01-01'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  calculatedLaborCost: 8000, // 60/60 * 8000
  ...overrides,
});

// Mock labor calculation result factory
const createMockLaborCalc = (
  overrides: Partial<ILaborCalculationResult> = {}
): ILaborCalculationResult => ({
  normId: NORM_ID,
  normCode: 'MK-001',
  description: 'Teszt norma',
  laborMinutes: 60,
  laborRate: 8000,
  calculatedCost: 8000,
  ...overrides,
});

describe('ServiceNormaController', () => {
  let controller: ServiceNormaController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceNormaController],
      providers: [
        {
          provide: SERVICE_NORM_REPOSITORY,
          useValue: mockNormRepository,
        },
      ],
    }).compile();

    controller = module.get<ServiceNormaController>(ServiceNormaController);
  });

  // ============================================
  // TENANT ISOLATION TESTS (P0)
  // ============================================

  describe('tenant isolation', () => {
    it('[P0] should use tenantId from JWT in findAll', async () => {
      const req = createMockRequest({ tenantId: 'jwt-tenant-id' });
      vi.mocked(mockNormRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockNormRepository.countByTenant).mockResolvedValue(0);

      await controller.findAll(req);

      expect(mockNormRepository.findAll).toHaveBeenCalledWith('jwt-tenant-id', expect.any(Object));
    });

    it('[P0] should use tenantId from JWT in findById', async () => {
      const req = createMockRequest({ tenantId: 'secure-tenant' });
      vi.mocked(mockNormRepository.findById).mockResolvedValue(createMockNorm());

      await controller.findById(NORM_ID, req);

      expect(mockNormRepository.findById).toHaveBeenCalledWith(NORM_ID, 'secure-tenant');
    });

    it('[P0] should use tenantId from JWT in create', async () => {
      const req = createMockRequest({ tenantId: 'creator-tenant' });
      vi.mocked(mockNormRepository.create).mockResolvedValue(createMockNorm());

      const input = {
        manufacturer: 'MAKITA',
        normCode: 'MK-NEW',
        description: 'Új norma',
        laborMinutes: 45,
        laborRate: 8000,
        validFrom: '2026-01-15',
      };

      await controller.create(req, input);

      expect(mockNormRepository.create).toHaveBeenCalledWith('creator-tenant', expect.any(Object));
    });

    it('[P0] should use tenantId from JWT in calculateLaborCost', async () => {
      const req = createMockRequest({ tenantId: 'calc-tenant' });
      vi.mocked(mockNormRepository.calculateLaborCost).mockResolvedValue(createMockLaborCalc());

      await controller.calculateLaborCost(req, { manufacturer: 'MAKITA', normCode: 'MK-001' });

      expect(mockNormRepository.calculateLaborCost).toHaveBeenCalledWith(
        'calc-tenant',
        'MAKITA',
        'MK-001'
      );
    });
  });

  // ============================================
  // CRUD TESTS
  // ============================================

  describe('findAll()', () => {
    it('[P1] should return norms with total count', async () => {
      const req = createMockRequest();
      const mockNorms = [createMockNorm()];
      vi.mocked(mockNormRepository.findAll).mockResolvedValue(mockNorms);
      vi.mocked(mockNormRepository.countByTenant).mockResolvedValue(1);

      const result = await controller.findAll(req);

      expect(result).toEqual({ data: mockNorms, total: 1 });
    });

    it('[P1] should apply manufacturer filter', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockNormRepository.countByTenant).mockResolvedValue(0);

      await controller.findAll(req, 'STIHL');

      expect(mockNormRepository.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ manufacturer: 'STIHL' })
      );
    });

    it('[P1] should apply isActive filter', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockNormRepository.countByTenant).mockResolvedValue(0);

      await controller.findAll(req, undefined, undefined, undefined, undefined, 'true');

      expect(mockNormRepository.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ isActive: true })
      );
    });

    it('[P1] should apply search filter', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockNormRepository.countByTenant).mockResolvedValue(0);

      await controller.findAll(
        req,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'akkumulátor'
      );

      expect(mockNormRepository.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ search: 'akkumulátor' })
      );
    });
  });

  describe('findById()', () => {
    it('[P0] should throw NotFoundException when norm not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(null);

      await expect(controller.findById('non-existent', req)).rejects.toThrow(NotFoundException);
    });

    it('[P1] should return norm when found', async () => {
      const req = createMockRequest();
      const mockNorm = createMockNorm();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(mockNorm);

      const result = await controller.findById(NORM_ID, req);

      expect(result.data).toEqual(mockNorm);
    });
  });

  describe('findByCode()', () => {
    it('[P0] should throw NotFoundException when norm not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findByNormCode).mockResolvedValue(null);

      await expect(controller.findByCode('MAKITA', 'UNKNOWN', req)).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should return norm when found by code', async () => {
      const req = createMockRequest();
      const mockNorm = createMockNorm();
      vi.mocked(mockNormRepository.findByNormCode).mockResolvedValue(mockNorm);

      const result = await controller.findByCode('MAKITA', 'MK-001', req);

      expect(result.data).toEqual(mockNorm);
      expect(mockNormRepository.findByNormCode).toHaveBeenCalledWith(TENANT_ID, 'MAKITA', 'MK-001');
    });
  });

  describe('create()', () => {
    const validInput = {
      manufacturer: 'MAKITA',
      normCode: 'MK-NEW',
      description: 'Új norma tétel',
      laborMinutes: 45,
      laborRate: 8000,
      validFrom: '2026-01-15',
    };

    it('[P1] should throw BadRequestException if manufacturer is empty', async () => {
      const req = createMockRequest();
      const input = { ...validInput, manufacturer: '' };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if normCode is empty', async () => {
      const req = createMockRequest();
      const input = { ...validInput, normCode: '' };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if laborMinutes is zero or negative', async () => {
      const req = createMockRequest();
      const input = { ...validInput, laborMinutes: 0 };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if laborRate is zero or negative', async () => {
      const req = createMockRequest();
      const input = { ...validInput, laborRate: -100 };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if validFrom is invalid date', async () => {
      const req = createMockRequest();
      const input = { ...validInput, validFrom: 'invalid-date' };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if validUntil is before validFrom', async () => {
      const req = createMockRequest();
      const input = { ...validInput, validFrom: '2026-12-31', validUntil: '2026-01-01' };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should create norm successfully', async () => {
      const req = createMockRequest();
      const mockNorm = createMockNorm();
      vi.mocked(mockNormRepository.create).mockResolvedValue(mockNorm);

      const result = await controller.create(req, validInput);

      expect(result.data).toEqual(mockNorm);
      expect(mockNormRepository.create).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          manufacturer: 'MAKITA',
          normCode: 'MK-NEW',
          laborMinutes: 45,
          laborRate: 8000,
        })
      );
    });
  });

  describe('update()', () => {
    it('[P0] should throw NotFoundException when norm not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(null);

      await expect(controller.update(NORM_ID, req, { description: 'Updated' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should throw BadRequestException if laborMinutes is zero or negative', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(createMockNorm());

      await expect(controller.update(NORM_ID, req, { laborMinutes: 0 })).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should throw BadRequestException if laborRate is zero or negative', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(createMockNorm());

      await expect(controller.update(NORM_ID, req, { laborRate: -50 })).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should update norm successfully', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(createMockNorm());
      vi.mocked(mockNormRepository.update).mockResolvedValue(
        createMockNorm({ description: 'Frissített leírás' })
      );

      const result = await controller.update(NORM_ID, req, { description: 'Frissített leírás' });

      expect(result.data.description).toBe('Frissített leírás');
    });
  });

  describe('deactivate()', () => {
    it('[P0] should throw NotFoundException when norm not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(null);

      await expect(controller.deactivate(NORM_ID, req)).rejects.toThrow(NotFoundException);
    });

    it('[P1] should throw BadRequestException if norm is already inactive', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(createMockNorm({ isActive: false }));

      await expect(controller.deactivate(NORM_ID, req)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should deactivate norm successfully', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findById).mockResolvedValue(createMockNorm({ isActive: true }));
      vi.mocked(mockNormRepository.deactivate).mockResolvedValue(undefined);

      await controller.deactivate(NORM_ID, req);

      expect(mockNormRepository.deactivate).toHaveBeenCalledWith(NORM_ID, TENANT_ID);
    });
  });

  // ============================================
  // BULK IMPORT TESTS
  // ============================================

  describe('bulkImport()', () => {
    it('[P1] should throw BadRequestException if importSource is empty', async () => {
      const req = createMockRequest();
      const input = {
        importSource: '',
        items: [
          {
            manufacturer: 'MAKITA',
            normCode: 'MK-001',
            description: 'Test',
            laborMinutes: 60,
            laborRate: 8000,
            validFrom: '2026-01-01',
          },
        ],
      };

      await expect(controller.bulkImport(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if items array is empty', async () => {
      const req = createMockRequest();
      const input = {
        importSource: 'Excel',
        items: [],
      };

      await expect(controller.bulkImport(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if items exceed max limit', async () => {
      const req = createMockRequest();
      const items = Array.from({ length: 10001 }, (_, i) => ({
        manufacturer: 'MAKITA',
        normCode: `MK-${i}`,
        description: `Test ${i}`,
        laborMinutes: 60,
        laborRate: 8000,
        validFrom: '2026-01-01',
      }));

      const input = {
        importSource: 'Excel',
        items,
      };

      await expect(controller.bulkImport(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should import norms successfully', async () => {
      const req = createMockRequest();
      const importResult: IServiceNormImportResult = {
        imported: 2,
        updated: 0,
        skipped: 0,
        errors: [],
      };
      vi.mocked(mockNormRepository.bulkImport).mockResolvedValue(importResult);

      const input = {
        importSource: 'Excel Import 2026',
        items: [
          {
            manufacturer: 'MAKITA',
            normCode: 'MK-001',
            description: 'Teszt 1',
            laborMinutes: 60,
            laborRate: 8000,
            validFrom: '2026-01-01',
          },
          {
            manufacturer: 'MAKITA',
            normCode: 'MK-002',
            description: 'Teszt 2',
            laborMinutes: 90,
            laborRate: 8000,
            validFrom: '2026-01-01',
          },
        ],
      };

      const result = await controller.bulkImport(req, input);

      expect(result.data).toEqual(importResult);
      expect(mockNormRepository.bulkImport).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(Array),
        'Excel Import 2026'
      );
    });
  });

  // ============================================
  // LABOR CALCULATION TESTS
  // ============================================

  describe('calculateLaborCost()', () => {
    it('[P1] should throw BadRequestException if manufacturer is empty', async () => {
      const req = createMockRequest();

      await expect(
        controller.calculateLaborCost(req, { manufacturer: '', normCode: 'MK-001' })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if normCode is empty', async () => {
      const req = createMockRequest();

      await expect(
        controller.calculateLaborCost(req, { manufacturer: 'MAKITA', normCode: '' })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P0] should throw NotFoundException when no valid norm found', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.calculateLaborCost).mockResolvedValue(null);

      await expect(
        controller.calculateLaborCost(req, { manufacturer: 'MAKITA', normCode: 'UNKNOWN' })
      ).rejects.toThrow(NotFoundException);
    });

    it('[P1] should return labor calculation result', async () => {
      const req = createMockRequest();
      const mockCalc = createMockLaborCalc();
      vi.mocked(mockNormRepository.calculateLaborCost).mockResolvedValue(mockCalc);

      const result = await controller.calculateLaborCost(req, {
        manufacturer: 'MAKITA',
        normCode: 'MK-001',
      });

      expect(result.data).toEqual(mockCalc);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('getStatistics()', () => {
    it('[P1] should return correct statistics', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.countByTenant)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85) // active
        .mockResolvedValueOnce(15); // inactive
      vi.mocked(mockNormRepository.getManufacturers).mockResolvedValue([
        'MAKITA',
        'STIHL',
        'BOSCH',
      ]);

      const result = await controller.getStatistics(req);

      expect(result.data).toEqual({
        total: 100,
        active: 85,
        inactive: 15,
        manufacturerCount: 3,
        manufacturers: ['MAKITA', 'STIHL', 'BOSCH'],
      });
    });
  });

  describe('getManufacturers()', () => {
    it('[P1] should return manufacturers list', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.getManufacturers).mockResolvedValue(['MAKITA', 'STIHL']);

      const result = await controller.getManufacturers(req);

      expect(result.data).toEqual(['MAKITA', 'STIHL']);
    });
  });

  describe('getCategories()', () => {
    it('[P1] should return categories for manufacturer', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.getCategories).mockResolvedValue([
        'Akkumulátoros gépek',
        'Vezetékes gépek',
      ]);

      const result = await controller.getCategories('MAKITA', req);

      expect(result.data).toEqual(['Akkumulátoros gépek', 'Vezetékes gépek']);
      expect(mockNormRepository.getCategories).toHaveBeenCalledWith(TENANT_ID, 'MAKITA');
    });
  });

  // ============================================
  // MANUFACTURER-SPECIFIC ENDPOINTS
  // ============================================

  describe('getActiveByManufacturer()', () => {
    it('[P1] should return active norms for manufacturer', async () => {
      const req = createMockRequest();
      const mockNorms = [createMockNorm()];
      vi.mocked(mockNormRepository.findActiveNorms).mockResolvedValue(mockNorms);

      const result = await controller.getActiveByManufacturer('MAKITA', req);

      expect(result.data).toEqual(mockNorms);
      expect(mockNormRepository.findActiveNorms).toHaveBeenCalledWith(
        TENANT_ID,
        'MAKITA',
        undefined
      );
    });

    it('[P1] should apply validAt filter', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findActiveNorms).mockResolvedValue([]);

      await controller.getActiveByManufacturer('MAKITA', req, '2026-06-15');

      expect(mockNormRepository.findActiveNorms).toHaveBeenCalledWith(
        TENANT_ID,
        'MAKITA',
        expect.any(Date)
      );
    });

    it('[P1] should throw BadRequestException for invalid validAt date', async () => {
      const req = createMockRequest();

      await expect(
        controller.getActiveByManufacturer('MAKITA', req, 'invalid-date')
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException for empty manufacturer', async () => {
      const req = createMockRequest();

      await expect(controller.getActiveByManufacturer('  ', req)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getByManufacturer()', () => {
    it('[P1] should return all norms for manufacturer', async () => {
      const req = createMockRequest();
      const mockNorms = [createMockNorm(), createMockNorm({ id: 'norm-2', normCode: 'MK-002' })];
      vi.mocked(mockNormRepository.findByManufacturer).mockResolvedValue(mockNorms);

      const result = await controller.getByManufacturer('MAKITA', req);

      expect(result.data).toEqual(mockNorms);
      expect(mockNormRepository.findByManufacturer).toHaveBeenCalledWith(TENANT_ID, 'MAKITA');
    });

    it('[P1] should throw BadRequestException for empty manufacturer', async () => {
      const req = createMockRequest();

      await expect(controller.getByManufacturer('   ', req)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // PATH PARAMETER SANITIZATION TESTS
  // ============================================

  describe('path parameter sanitization', () => {
    it('[P1] should trim manufacturer in findByCode', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.findByNormCode).mockResolvedValue(createMockNorm());

      await controller.findByCode('  MAKITA  ', 'MK-001', req);

      expect(mockNormRepository.findByNormCode).toHaveBeenCalledWith(TENANT_ID, 'MAKITA', 'MK-001');
    });

    it('[P1] should throw BadRequestException for empty manufacturer in findByCode', async () => {
      const req = createMockRequest();

      await expect(controller.findByCode('  ', 'MK-001', req)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException for empty normCode in findByCode', async () => {
      const req = createMockRequest();

      await expect(controller.findByCode('MAKITA', '  ', req)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should trim manufacturer in getCategories', async () => {
      const req = createMockRequest();
      vi.mocked(mockNormRepository.getCategories).mockResolvedValue(['Category1']);

      await controller.getCategories('  MAKITA  ', req);

      expect(mockNormRepository.getCategories).toHaveBeenCalledWith(TENANT_ID, 'MAKITA');
    });

    it('[P1] should throw BadRequestException for empty manufacturer in getCategories', async () => {
      const req = createMockRequest();

      await expect(controller.getCategories('  ', req)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // BULK IMPORT DATE VALIDATION TESTS
  // ============================================

  describe('bulkImport date validation', () => {
    it('[P1] should throw BadRequestException for invalid validFrom date', async () => {
      const req = createMockRequest();
      const input = {
        importSource: 'Excel',
        items: [
          {
            manufacturer: 'MAKITA',
            normCode: 'MK-001',
            description: 'Test',
            laborMinutes: 60,
            laborRate: 8000,
            validFrom: 'invalid-date',
          },
        ],
      };

      await expect(controller.bulkImport(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException for invalid validUntil date', async () => {
      const req = createMockRequest();
      const input = {
        importSource: 'Excel',
        items: [
          {
            manufacturer: 'MAKITA',
            normCode: 'MK-001',
            description: 'Test',
            laborMinutes: 60,
            laborRate: 8000,
            validFrom: '2026-01-01',
            validUntil: 'invalid-date',
          },
        ],
      };

      await expect(controller.bulkImport(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if validUntil is before validFrom', async () => {
      const req = createMockRequest();
      const input = {
        importSource: 'Excel',
        items: [
          {
            manufacturer: 'MAKITA',
            normCode: 'MK-001',
            description: 'Test',
            laborMinutes: 60,
            laborRate: 8000,
            validFrom: '2026-12-31',
            validUntil: '2026-01-01',
          },
        ],
      };

      await expect(controller.bulkImport(req, input)).rejects.toThrow(BadRequestException);
    });
  });
});
