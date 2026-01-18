import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigEntry, ConfigValueType, IConfigRepository } from '../interfaces/config.interface';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let mockRepository: IConfigRepository;

  const createMockEntry = (overrides: Partial<ConfigEntry> = {}): ConfigEntry => ({
    key: 'test-key',
    value: 'test-value',
    type: 'string' as ConfigValueType,
    description: 'Test config',
    isSystem: false,
    tenantId: undefined,
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
    service = new ConfigService(mockRepository);
  });

  describe('getString()', () => {
    it('should return string value', async () => {
      const entry = createMockEntry({ value: 'hello', type: 'string' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      const result = await service.getString('test-key');

      expect(result.value).toBe('hello');
      expect(result.source).toBe('database');
    });

    it('should return default value when not found', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.getString('missing-key', 'default');

      expect(result.value).toBe('default');
      expect(result.source).toBe('default');
    });

    it('should throw when no default and not found', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      await expect(service.getString('missing-key')).rejects.toThrow(
        'Config key "missing-key" not found'
      );
    });
  });

  describe('getNumber()', () => {
    it('should return number value', async () => {
      const entry = createMockEntry({ value: '42', type: 'number' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      const result = await service.getNumber('test-key');

      expect(result.value).toBe(42);
    });

    it('should parse string as number', async () => {
      const entry = createMockEntry({ value: '3.14', type: 'number' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      const result = await service.getNumber('test-key');

      expect(result.value).toBe(3.14);
    });

    it('should throw for invalid number', async () => {
      const entry = createMockEntry({ value: 'not-a-number', type: 'number' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      await expect(service.getNumber('test-key')).rejects.toThrow(
        'Config key "test-key" is not a valid number'
      );
    });

    it('should return default value when not found', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.getNumber('missing-key', 100);

      expect(result.value).toBe(100);
      expect(result.source).toBe('default');
    });
  });

  describe('getBoolean()', () => {
    it('should return true for "true" string', async () => {
      const entry = createMockEntry({ value: 'true', type: 'boolean' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      const result = await service.getBoolean('test-key');

      expect(result.value).toBe(true);
    });

    it('should return false for "false" string', async () => {
      const entry = createMockEntry({ value: 'false', type: 'boolean' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      const result = await service.getBoolean('test-key');

      expect(result.value).toBe(false);
    });

    it('should handle "1" and "0" as boolean', async () => {
      const entryOne = createMockEntry({ value: '1', type: 'boolean' });
      vi.mocked(mockRepository.get).mockResolvedValue(entryOne);

      expect((await service.getBoolean('test-key')).value).toBe(true);

      const entryZero = createMockEntry({ value: '0', type: 'boolean' });
      vi.mocked(mockRepository.get).mockResolvedValue(entryZero);

      expect((await service.getBoolean('test-key')).value).toBe(false);
    });

    it('should handle case-insensitive true/false', async () => {
      const entry = createMockEntry({ value: 'TRUE', type: 'boolean' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      expect((await service.getBoolean('test-key')).value).toBe(true);
    });

    it('should return default value when not found', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.getBoolean('missing-key', false);

      expect(result.value).toBe(false);
      expect(result.source).toBe('default');
    });
  });

  describe('getJson()', () => {
    it('should parse and return JSON value', async () => {
      const jsonValue = { name: 'test', count: 42 };
      const entry = createMockEntry({ value: JSON.stringify(jsonValue), type: 'json' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      const result = await service.getJson<{ name: string; count: number }>('test-key');

      expect(result.value).toEqual(jsonValue);
    });

    it('should throw for invalid JSON', async () => {
      const entry = createMockEntry({ value: 'not-json', type: 'json' });
      vi.mocked(mockRepository.get).mockResolvedValue(entry);

      await expect(service.getJson('test-key')).rejects.toThrow(
        'Config key "test-key" is not valid JSON'
      );
    });

    it('should return default value when not found', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);
      const defaultValue = { default: true };

      const result = await service.getJson('missing-key', defaultValue);

      expect(result.value).toEqual(defaultValue);
      expect(result.source).toBe('default');
    });
  });

  describe('set()', () => {
    it('should set string value', async () => {
      const entry = createMockEntry({ value: 'new-value', type: 'string' });
      vi.mocked(mockRepository.set).mockResolvedValue(entry);

      const result = await service.set('test-key', 'new-value', 'string');

      expect(result.value).toBe('new-value');
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          value: 'new-value',
          type: 'string',
        })
      );
    });

    it('should set number value as string', async () => {
      const entry = createMockEntry({ value: '42', type: 'number' });
      vi.mocked(mockRepository.set).mockResolvedValue(entry);

      await service.set('test-key', 42, 'number');

      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ value: '42', type: 'number' })
      );
    });

    it('should set boolean value as string', async () => {
      const entry = createMockEntry({ value: 'true', type: 'boolean' });
      vi.mocked(mockRepository.set).mockResolvedValue(entry);

      await service.set('test-key', true, 'boolean');

      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'true', type: 'boolean' })
      );
    });

    it('should set JSON value as string', async () => {
      const jsonValue = { test: true };
      const entry = createMockEntry({ value: JSON.stringify(jsonValue), type: 'json' });
      vi.mocked(mockRepository.set).mockResolvedValue(entry);

      await service.set('test-key', jsonValue, 'json');

      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ value: JSON.stringify(jsonValue), type: 'json' })
      );
    });

    it('should set tenant-specific value', async () => {
      const entry = createMockEntry({ tenantId: 'tenant-1' });
      vi.mocked(mockRepository.set).mockResolvedValue(entry);

      await service.set('test-key', 'value', 'string', { tenantId: 'tenant-1' });

      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' })
      );
    });

    it('should throw for empty key', async () => {
      await expect(service.set('', 'value', 'string')).rejects.toThrow('Config key is required');
    });
  });

  describe('delete()', () => {
    it('should delete config entry', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(true);

      const result = await service.delete('test-key');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('test-key', undefined);
    });

    it('should delete tenant-specific entry', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(true);

      await service.delete('test-key', 'tenant-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('test-key', 'tenant-1');
    });
  });

  describe('list()', () => {
    it('should return all config entries', async () => {
      const entries = [createMockEntry({ key: 'key-1' }), createMockEntry({ key: 'key-2' })];
      vi.mocked(mockRepository.list).mockResolvedValue(entries);

      const result = await service.list();

      expect(result).toHaveLength(2);
    });

    it('should return tenant-specific entries', async () => {
      const entries = [createMockEntry({ tenantId: 'tenant-1' })];
      vi.mocked(mockRepository.list).mockResolvedValue(entries);

      await service.list('tenant-1');

      expect(mockRepository.list).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('has()', () => {
    it('should return true when key exists', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(createMockEntry());

      const result = await service.has('test-key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      vi.mocked(mockRepository.get).mockResolvedValue(null);

      const result = await service.has('missing-key');

      expect(result).toBe(false);
    });
  });
});
