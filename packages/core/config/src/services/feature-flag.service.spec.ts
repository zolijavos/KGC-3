import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService } from './feature-flag.service';
import { IFeatureFlagRepository, FeatureFlag } from '../interfaces/config.interface';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let mockRepository: IFeatureFlagRepository;

  const createMockFlag = (overrides: Partial<FeatureFlag> = {}): FeatureFlag => ({
    key: 'test-feature',
    enabled: true,
    description: 'Test feature',
    tenantId: undefined,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };
    service = new FeatureFlagService(mockRepository);
  });

  describe('isEnabled()', () => {
    describe('happy path', () => {
      it('should return true when feature flag is enabled', async () => {
        const flag = createMockFlag({ enabled: true });
        vi.mocked(mockRepository.get).mockResolvedValue(flag);

        const result = await service.isEnabled('test-feature');

        expect(result).toBe(true);
        expect(mockRepository.get).toHaveBeenCalledWith('test-feature', undefined);
      });

      it('should return false when feature flag is disabled', async () => {
        const flag = createMockFlag({ enabled: false });
        vi.mocked(mockRepository.get).mockResolvedValue(flag);

        const result = await service.isEnabled('test-feature');

        expect(result).toBe(false);
      });

      it('should check tenant-specific flag when tenantId provided', async () => {
        const flag = createMockFlag({ enabled: true, tenantId: 'tenant-1' });
        vi.mocked(mockRepository.get).mockResolvedValue(flag);

        const result = await service.isEnabled('test-feature', 'tenant-1');

        expect(result).toBe(true);
        expect(mockRepository.get).toHaveBeenCalledWith('test-feature', 'tenant-1');
      });
    });

    describe('edge cases', () => {
      it('should return false when feature flag does not exist', async () => {
        vi.mocked(mockRepository.get).mockResolvedValue(null);

        const result = await service.isEnabled('non-existent-feature');

        expect(result).toBe(false);
      });

      it('should return default value when flag not found and default provided', async () => {
        vi.mocked(mockRepository.get).mockResolvedValue(null);

        const result = await service.isEnabled('non-existent-feature', undefined, true);

        expect(result).toBe(true);
      });

      it('should handle empty key gracefully', async () => {
        const result = await service.isEnabled('');

        expect(result).toBe(false);
        expect(mockRepository.get).not.toHaveBeenCalled();
      });

      it('should trim whitespace from key', async () => {
        const flag = createMockFlag({ key: 'test-feature', enabled: true });
        vi.mocked(mockRepository.get).mockResolvedValue(flag);

        const result = await service.isEnabled('  test-feature  ');

        expect(mockRepository.get).toHaveBeenCalledWith('test-feature', undefined);
        expect(result).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return defaultValue and log error when repository throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockRepository.get).mockRejectedValue(new Error('DB error'));

        // Without default value, should return false (the default of defaultValue)
        const result1 = await service.isEnabled('test-feature');
        expect(result1).toBe(false);

        // With default value true, should return true
        const result2 = await service.isEnabled('test-feature', undefined, true);
        expect(result2).toBe(true);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('enable()', () => {
    it('should enable a feature flag', async () => {
      const flag = createMockFlag({ enabled: true });
      vi.mocked(mockRepository.set).mockResolvedValue(flag);

      const result = await service.enable('test-feature');

      expect(result.enabled).toBe(true);
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'test-feature', enabled: true })
      );
    });

    it('should enable tenant-specific feature flag', async () => {
      const flag = createMockFlag({ enabled: true, tenantId: 'tenant-1' });
      vi.mocked(mockRepository.set).mockResolvedValue(flag);

      const result = await service.enable('test-feature', 'tenant-1');

      expect(result.enabled).toBe(true);
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-feature',
          enabled: true,
          tenantId: 'tenant-1',
        })
      );
    });

    it('should throw error for empty key', async () => {
      await expect(service.enable('')).rejects.toThrow('Feature flag key is required');
    });
  });

  describe('disable()', () => {
    it('should disable a feature flag', async () => {
      const flag = createMockFlag({ enabled: false });
      vi.mocked(mockRepository.set).mockResolvedValue(flag);

      const result = await service.disable('test-feature');

      expect(result.enabled).toBe(false);
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'test-feature', enabled: false })
      );
    });

    it('should disable tenant-specific feature flag', async () => {
      const flag = createMockFlag({ enabled: false, tenantId: 'tenant-1' });
      vi.mocked(mockRepository.set).mockResolvedValue(flag);

      const result = await service.disable('test-feature', 'tenant-1');

      expect(result.enabled).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('should toggle enabled flag to disabled', async () => {
      const existingFlag = createMockFlag({ enabled: true });
      const toggledFlag = createMockFlag({ enabled: false });
      vi.mocked(mockRepository.get).mockResolvedValue(existingFlag);
      vi.mocked(mockRepository.set).mockResolvedValue(toggledFlag);

      const result = await service.toggle('test-feature');

      expect(result.enabled).toBe(false);
    });

    it('should toggle disabled flag to enabled', async () => {
      const existingFlag = createMockFlag({ enabled: false });
      const toggledFlag = createMockFlag({ enabled: true });
      vi.mocked(mockRepository.get).mockResolvedValue(existingFlag);
      vi.mocked(mockRepository.set).mockResolvedValue(toggledFlag);

      const result = await service.toggle('test-feature');

      expect(result.enabled).toBe(true);
    });

    it('should create enabled flag when not exists', async () => {
      const newFlag = createMockFlag({ enabled: true });
      vi.mocked(mockRepository.get).mockResolvedValue(null);
      vi.mocked(mockRepository.set).mockResolvedValue(newFlag);

      const result = await service.toggle('new-feature');

      expect(result.enabled).toBe(true);
    });
  });

  describe('list()', () => {
    it('should return all feature flags', async () => {
      const flags = [
        createMockFlag({ key: 'feature-1', enabled: true }),
        createMockFlag({ key: 'feature-2', enabled: false }),
      ];
      vi.mocked(mockRepository.list).mockResolvedValue(flags);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(result[0]?.key).toBe('feature-1');
    });

    it('should return tenant-specific flags', async () => {
      const flags = [createMockFlag({ key: 'tenant-feature', tenantId: 'tenant-1' })];
      vi.mocked(mockRepository.list).mockResolvedValue(flags);

      const result = await service.list('tenant-1');

      expect(mockRepository.list).toHaveBeenCalledWith('tenant-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('delete()', () => {
    it('should delete a feature flag', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(true);

      const result = await service.delete('test-feature');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('test-feature', undefined);
    });

    it('should return false when flag not found', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(false);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
    });
  });
});
