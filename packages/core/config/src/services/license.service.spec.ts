import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LicenseService } from './license.service';
import {
  ILicenseRepository,
  License,
  LicenseType,
  DEFAULT_LICENSE_LIMITS,
} from '../interfaces/license.interface';

describe('LicenseService', () => {
  let service: LicenseService;
  let mockRepository: ILicenseRepository;

  const tenantId = 'tenant-123';

  const createMockLicense = (overrides: Partial<License> = {}): License => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: 'license-1',
      tenantId,
      type: 'PRO',
      status: 'ACTIVE',
      maxUsers: 50,
      maxLocations: 5,
      startDate: now,
      expirationDate: thirtyDaysLater,
      gracePeriodDays: 7,
      enabledModules: DEFAULT_LICENSE_LIMITS.PRO.enabledModules,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  beforeEach(() => {
    mockRepository = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new LicenseService(mockRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getLicense()', () => {
    it('should return license for tenant', async () => {
      const license = createMockLicense();
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.getLicense(tenantId);

      expect(result).toEqual(license);
      expect(mockRepository.get).toHaveBeenCalledWith(tenantId);
    });

    it('should return null when no license exists', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.getLicense(tenantId);

      expect(result).toBeNull();
    });
  });

  describe('validateLicense()', () => {
    it('should return valid for active license', async () => {
      const license = createMockLicense({ status: 'ACTIVE' });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.validateLicense(tenantId);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when no license exists', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.validateLicense(tenantId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No license found for tenant');
    });

    it('should return invalid when license is expired', async () => {
      const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const license = createMockLicense({
        expirationDate: expiredDate,
        gracePeriodDays: 7,
      });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.validateLicense(tenantId);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('EXPIRED');
    });

    it('should return valid with grace period status when in grace period', async () => {
      const expiredDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const license = createMockLicense({
        expirationDate: expiredDate,
        gracePeriodDays: 7,
      });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.validateLicense(tenantId);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('GRACE_PERIOD');
      expect(result.warnings.some((w) => w.toLowerCase().includes('grace period'))).toBe(true);
    });

    it('should return warning when license expires soon', async () => {
      const expiresIn5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const license = createMockLicense({ expirationDate: expiresIn5Days });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.validateLicense(tenantId);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('expires in'))).toBe(true);
    });

    it('should return invalid when license is suspended', async () => {
      const license = createMockLicense({ status: 'SUSPENDED' });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.validateLicense(tenantId);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('SUSPENDED');
      expect(result.errors).toContain('License is suspended');
    });
  });

  describe('isModuleEnabled()', () => {
    it('should return true when module is in enabled list', async () => {
      const license = createMockLicense({
        enabledModules: ['auth', 'rental-core', 'inventory'],
      });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.isModuleEnabled(tenantId, 'rental-core');

      expect(result).toBe(true);
    });

    it('should return false when module is not in enabled list', async () => {
      const license = createMockLicense({
        enabledModules: ['auth', 'config'],
      });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.isModuleEnabled(tenantId, 'rental-core');

      expect(result).toBe(false);
    });

    it('should return true for enterprise license with wildcard', async () => {
      const license = createMockLicense({
        type: 'ENTERPRISE',
        enabledModules: ['*'],
      });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.isModuleEnabled(tenantId, 'any-module');

      expect(result).toBe(true);
    });

    it('should return false when no license exists', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.isModuleEnabled(tenantId, 'auth');

      expect(result).toBe(false);
    });
  });

  describe('checkUserLimit()', () => {
    it('should return true when under user limit', async () => {
      const license = createMockLicense({ maxUsers: 50 });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.checkUserLimit(tenantId, 30);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20);
    });

    it('should return false when at user limit', async () => {
      const license = createMockLicense({ maxUsers: 50 });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.checkUserLimit(tenantId, 50);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return false when over user limit', async () => {
      const license = createMockLicense({ maxUsers: 50 });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.checkUserLimit(tenantId, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(-10);
    });

    it('should return true for unlimited users (enterprise)', async () => {
      const license = createMockLicense({ maxUsers: -1 });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.checkUserLimit(tenantId, 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1); // Indicates unlimited
    });
  });

  describe('checkLocationLimit()', () => {
    it('should return true when under location limit', async () => {
      const license = createMockLicense({ maxLocations: 5 });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.checkLocationLimit(tenantId, 3);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should return false when at location limit', async () => {
      const license = createMockLicense({ maxLocations: 5 });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.checkLocationLimit(tenantId, 5);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('createLicense()', () => {
    it('should create a new license with default limits', async () => {
      const expectedLicense = createMockLicense({ type: 'BASIC' });
      vi.mocked(mockRepository.set).mockResolvedValue(expectedLicense);

      const result = await service.createLicense(tenantId, 'BASIC', 30);

      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          type: 'BASIC',
          maxUsers: DEFAULT_LICENSE_LIMITS.BASIC.maxUsers,
          maxLocations: DEFAULT_LICENSE_LIMITS.BASIC.maxLocations,
        })
      );
    });

    it('should allow custom limits override', async () => {
      const expectedLicense = createMockLicense({ type: 'PRO', maxUsers: 100 });
      vi.mocked(mockRepository.set).mockResolvedValue(expectedLicense);

      await service.createLicense(tenantId, 'PRO', 30, { maxUsers: 100 });

      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ maxUsers: 100 })
      );
    });

    it('should throw error for zero or negative duration', async () => {
      await expect(service.createLicense(tenantId, 'BASIC', 0)).rejects.toThrow(
        'License duration must be a positive number of days'
      );

      await expect(service.createLicense(tenantId, 'BASIC', -5)).rejects.toThrow(
        'License duration must be a positive number of days'
      );
    });
  });

  describe('upgradeLicense()', () => {
    it('should upgrade license type', async () => {
      const existingLicense = createMockLicense({ type: 'BASIC' });
      const upgradedLicense = createMockLicense({ type: 'PRO' });

      vi.mocked(mockRepository.get).mockResolvedValue(existingLicense);
      vi.mocked(mockRepository.update).mockResolvedValue(upgradedLicense);

      const result = await service.upgradeLicense(tenantId, 'PRO');

      expect(result?.type).toBe('PRO');
      expect(mockRepository.update).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          type: 'PRO',
          maxUsers: DEFAULT_LICENSE_LIMITS.PRO.maxUsers,
          maxLocations: DEFAULT_LICENSE_LIMITS.PRO.maxLocations,
        })
      );
    });

    it('should return null when no existing license', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.upgradeLicense(tenantId, 'PRO');

      expect(result).toBeNull();
    });
  });

  describe('extendLicense()', () => {
    it('should extend license expiration date', async () => {
      const now = new Date();
      const existingExpiration = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const existingLicense = createMockLicense({ expirationDate: existingExpiration });

      vi.mocked(mockRepository.get).mockResolvedValue(existingLicense);
      vi.mocked(mockRepository.update).mockImplementation(async (_, updates) => ({
        ...existingLicense,
        ...updates,
      }));

      const result = await service.extendLicense(tenantId, 30);

      expect(mockRepository.update).toHaveBeenCalled();
      // Check that the new expiration is roughly 30 days after the existing one
      const updateCall = vi.mocked(mockRepository.update).mock.calls[0];
      const newExpiration = updateCall?.[1]?.expirationDate as Date;
      const daysDiff = Math.round(
        (newExpiration.getTime() - existingExpiration.getTime()) / (24 * 60 * 60 * 1000)
      );
      expect(daysDiff).toBe(30);
    });

    it('should throw error for zero or negative additional days', async () => {
      await expect(service.extendLicense(tenantId, 0)).rejects.toThrow(
        'Additional days must be a positive number'
      );

      await expect(service.extendLicense(tenantId, -10)).rejects.toThrow(
        'Additional days must be a positive number'
      );
    });
  });

  describe('getLicenseType()', () => {
    it('should return license type for tenant', async () => {
      const license = createMockLicense({ type: 'PRO' });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.getLicenseType(tenantId);

      expect(result).toBe('PRO');
    });

    it('should return null when no license', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.getLicenseType(tenantId);

      expect(result).toBeNull();
    });
  });

  describe('getDaysUntilExpiration()', () => {
    it('should return positive days for future expiration', async () => {
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const license = createMockLicense({ expirationDate: thirtyDaysLater });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.getDaysUntilExpiration(tenantId);

      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });

    it('should return negative days for past expiration', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const license = createMockLicense({ expirationDate: tenDaysAgo });
      vi.mocked(mockRepository.get).mockResolvedValue(license);

      const result = await service.getDaysUntilExpiration(tenantId);

      expect(result).toBeLessThan(0);
    });
  });
});
