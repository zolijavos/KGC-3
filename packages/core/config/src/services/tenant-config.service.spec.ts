import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantConfigService } from './tenant-config.service';
import { ConfigService } from './config.service';
import { FeatureFlagService } from './feature-flag.service';
import { ConfigEntry, FeatureFlag, TypedConfigValue } from '../interfaces/config.interface';

describe('TenantConfigService', () => {
  let service: TenantConfigService;
  let mockConfigService: Partial<ConfigService>;
  let mockFeatureFlagService: Partial<FeatureFlagService>;

  const tenantId = 'tenant-123';

  beforeEach(() => {
    mockConfigService = {
      getString: vi.fn(),
      getNumber: vi.fn(),
      getBoolean: vi.fn(),
      getJson: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      has: vi.fn(),
      get: vi.fn(),
    };

    mockFeatureFlagService = {
      isEnabled: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      toggle: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
    };

    service = new TenantConfigService(
      mockConfigService as ConfigService,
      mockFeatureFlagService as FeatureFlagService,
      tenantId
    );
  });

  describe('getString()', () => {
    it('should return tenant-specific value when exists', async () => {
      const tenantValue: TypedConfigValue<string> = { value: 'tenant-value', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(tenantValue);

      const result = await service.getString('test-key');

      expect(result.value).toBe('tenant-value');
      expect(mockConfigService.getString).toHaveBeenCalledWith('test-key', undefined);
    });

    it('should fall back to global value when tenant value not found', async () => {
      // First call for tenant config via get() - returns null (not found)
      // Then getString for global - returns value
      const globalValue: TypedConfigValue<string> = { value: 'global-value', source: 'database' };

      vi.mocked(mockConfigService.get).mockResolvedValueOnce(null);
      vi.mocked(mockConfigService.getString).mockResolvedValueOnce(globalValue);

      const result = await service.getStringWithFallback('test-key');

      expect(result.value).toBe('global-value');
      expect(result.source).toBe('database');
    });

    it('should prefer tenant value over global', async () => {
      const tenantEntry: ConfigEntry = {
        key: 'test-key',
        value: 'tenant-value',
        type: 'string',
        isSystem: false,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockConfigService.get).mockResolvedValue(tenantEntry);

      const result = await service.get('test-key');

      expect(result?.value).toBe('tenant-value');
    });
  });

  describe('getNumber()', () => {
    it('should return tenant-specific number', async () => {
      const tenantValue: TypedConfigValue<number> = { value: 42, source: 'database' };
      vi.mocked(mockConfigService.getNumber).mockResolvedValue(tenantValue);

      const result = await service.getNumber('max-items');

      expect(result.value).toBe(42);
    });
  });

  describe('getBoolean()', () => {
    it('should return tenant-specific boolean', async () => {
      const tenantValue: TypedConfigValue<boolean> = { value: true, source: 'database' };
      vi.mocked(mockConfigService.getBoolean).mockResolvedValue(tenantValue);

      const result = await service.getBoolean('feature-enabled');

      expect(result.value).toBe(true);
    });
  });

  describe('set()', () => {
    it('should set tenant-specific config', async () => {
      const entry: ConfigEntry = {
        key: 'test-key',
        value: 'test-value',
        type: 'string',
        isSystem: false,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockConfigService.set).mockResolvedValue(entry);

      await service.set('test-key', 'test-value', 'string');

      expect(mockConfigService.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        'string',
        expect.objectContaining({ tenantId })
      );
    });
  });

  describe('isFeatureEnabled()', () => {
    it('should check tenant-specific feature flag first', async () => {
      vi.mocked(mockFeatureFlagService.isEnabled).mockResolvedValue(true);

      const result = await service.isFeatureEnabled('new-dashboard');

      expect(result).toBe(true);
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('new-dashboard', tenantId, undefined);
    });

    it('should fall back to global feature flag', async () => {
      // Tenant flag not found, falls back to global
      vi.mocked(mockFeatureFlagService.get).mockResolvedValueOnce(null);
      vi.mocked(mockFeatureFlagService.isEnabled).mockResolvedValueOnce(true);

      const result = await service.isFeatureEnabledWithFallback('new-dashboard');

      expect(result).toBe(true);
    });

    it('should use default when neither tenant nor global exists', async () => {
      vi.mocked(mockFeatureFlagService.isEnabled).mockResolvedValue(false);

      const result = await service.isFeatureEnabled('non-existent', true);

      expect(result).toBe(false); // Repository returned false (not found, default kicks in)
    });
  });

  describe('enableFeature() / disableFeature()', () => {
    it('should enable feature for tenant', async () => {
      const flag: FeatureFlag = {
        key: 'beta-feature',
        enabled: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockFeatureFlagService.enable).mockResolvedValue(flag);

      const result = await service.enableFeature('beta-feature');

      expect(result.enabled).toBe(true);
      expect(mockFeatureFlagService.enable).toHaveBeenCalledWith('beta-feature', tenantId, undefined);
    });

    it('should disable feature for tenant', async () => {
      const flag: FeatureFlag = {
        key: 'beta-feature',
        enabled: false,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockFeatureFlagService.disable).mockResolvedValue(flag);

      const result = await service.disableFeature('beta-feature');

      expect(result.enabled).toBe(false);
    });
  });

  describe('listConfigs()', () => {
    it('should list tenant-specific configs', async () => {
      const configs: ConfigEntry[] = [
        {
          key: 'config-1',
          value: 'value-1',
          type: 'string',
          isSystem: false,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockConfigService.list).mockResolvedValue(configs);

      const result = await service.listConfigs();

      expect(result).toHaveLength(1);
      expect(mockConfigService.list).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('listFeatureFlags()', () => {
    it('should list tenant-specific feature flags', async () => {
      const flags: FeatureFlag[] = [
        {
          key: 'feature-1',
          enabled: true,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockFeatureFlagService.list).mockResolvedValue(flags);

      const result = await service.listFeatureFlags();

      expect(result).toHaveLength(1);
      expect(mockFeatureFlagService.list).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('getTenantId()', () => {
    it('should return the current tenant ID', () => {
      expect(service.getTenantId()).toBe(tenantId);
    });
  });

  describe('exportConfig()', () => {
    it('should export all tenant configs and feature flags', async () => {
      const configs: ConfigEntry[] = [
        {
          key: 'config-1',
          value: 'value-1',
          type: 'string',
          isSystem: false,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const flags: FeatureFlag[] = [
        {
          key: 'feature-1',
          enabled: true,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockConfigService.list).mockResolvedValue(configs);
      vi.mocked(mockFeatureFlagService.list).mockResolvedValue(flags);

      const result = await service.exportConfig();

      expect(result.tenantId).toBe(tenantId);
      expect(result.configs).toHaveLength(1);
      expect(result.featureFlags).toHaveLength(1);
    });
  });

  describe('importConfig()', () => {
    it('should import configs and feature flags for tenant', async () => {
      const configEntry: ConfigEntry = {
        key: 'imported-config',
        value: 'imported-value',
        type: 'string',
        isSystem: false,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const flagEntry: FeatureFlag = {
        key: 'imported-flag',
        enabled: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockConfigService.set).mockResolvedValue(configEntry);
      vi.mocked(mockFeatureFlagService.enable).mockResolvedValue(flagEntry);
      vi.mocked(mockFeatureFlagService.disable).mockResolvedValue({ ...flagEntry, enabled: false });

      const importData = {
        tenantId,
        configs: [{ key: 'imported-config', value: 'imported-value', type: 'string' as const }],
        featureFlags: [{ key: 'imported-flag', enabled: true }],
      };

      const result = await service.importConfig(importData);

      expect(result.configsImported).toBe(1);
      expect(result.featureFlagsImported).toBe(1);
    });
  });
});
