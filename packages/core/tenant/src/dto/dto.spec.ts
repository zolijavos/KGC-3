import { describe, it, expect } from 'vitest';
import {
  validateCreateTenantDto,
  safeValidateCreateTenantDto,
} from './create-tenant.dto';
import {
  validateUpdateTenantDto,
  safeValidateUpdateTenantDto,
} from './update-tenant.dto';
import {
  validateTenantFilterDto,
  safeValidateTenantFilterDto,
} from './tenant-filter.dto';
import { TenantStatus } from '../interfaces/tenant.interface';

/**
 * DTO Validation Tests
 * Zod schema validation tesztek magyar hibaüzenetekkel
 */

describe('CreateTenantDto', () => {
  describe('validateCreateTenantDto()', () => {
    it('should validate valid tenant data', () => {
      const dto = { name: 'KGC Szeged', slug: 'kgc-szeged' };
      const result = validateCreateTenantDto(dto);

      expect(result.name).toBe('KGC Szeged');
      expect(result.slug).toBe('kgc-szeged');
      expect(result.status).toBe(TenantStatus.PENDING);
    });

    it('should throw error for missing name', () => {
      const dto = { slug: 'test-slug' };

      expect(() => validateCreateTenantDto(dto)).toThrow();
    });

    it('should throw error for invalid slug format', () => {
      const dto = { name: 'Test', slug: 'Invalid Slug!' };

      expect(() => validateCreateTenantDto(dto)).toThrow();
    });

    it('should accept valid status', () => {
      const dto = {
        name: 'KGC Test',
        slug: 'kgc-test',
        status: TenantStatus.ACTIVE,
      };
      const result = validateCreateTenantDto(dto);

      expect(result.status).toBe(TenantStatus.ACTIVE);
    });
  });

  describe('safeValidateCreateTenantDto()', () => {
    it('should return success for valid data', () => {
      const dto = { name: 'Test', slug: 'test' };
      const result = safeValidateCreateTenantDto(dto);

      expect(result.success).toBe(true);
    });

    it('should return error for invalid data', () => {
      const dto = { name: '' };
      const result = safeValidateCreateTenantDto(dto);

      expect(result.success).toBe(false);
    });
  });
});

describe('UpdateTenantDto', () => {
  describe('validateUpdateTenantDto()', () => {
    it('should validate partial update', () => {
      const dto = { name: 'Updated Name' };
      const result = validateUpdateTenantDto(dto);

      expect(result.name).toBe('Updated Name');
    });

    it('should validate status change', () => {
      const dto = { status: TenantStatus.SUSPENDED };
      const result = validateUpdateTenantDto(dto);

      expect(result.status).toBe(TenantStatus.SUSPENDED);
    });

    it('should throw error for invalid slug format', () => {
      const dto = { slug: 'INVALID SLUG' };

      expect(() => validateUpdateTenantDto(dto)).toThrow();
    });
  });

  describe('safeValidateUpdateTenantDto()', () => {
    it('should return success for valid data', () => {
      const dto = { name: 'Test' };
      const result = safeValidateUpdateTenantDto(dto);

      expect(result.success).toBe(true);
    });

    it('should return error for invalid data', () => {
      const dto = { status: 'INVALID_STATUS' };
      const result = safeValidateUpdateTenantDto(dto);

      expect(result.success).toBe(false);
    });
  });
});

describe('TenantFilterDto', () => {
  describe('validateTenantFilterDto()', () => {
    it('should validate filter with defaults', () => {
      const dto = {};
      const result = validateTenantFilterDto(dto);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.includeInactive).toBe(false);
    });

    it('should validate search filter', () => {
      const dto = { search: 'szeged' };
      const result = validateTenantFilterDto(dto);

      expect(result.search).toBe('szeged');
    });

    it('should validate status filter', () => {
      const dto = { status: TenantStatus.ACTIVE };
      const result = validateTenantFilterDto(dto);

      expect(result.status).toBe(TenantStatus.ACTIVE);
    });

    it('should coerce page and limit to numbers', () => {
      const dto = { page: '2', limit: '50' };
      const result = validateTenantFilterDto(dto);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });
  });

  describe('safeValidateTenantFilterDto()', () => {
    it('should return success for valid data', () => {
      const dto = { page: 1, limit: 20 };
      const result = safeValidateTenantFilterDto(dto);

      expect(result.success).toBe(true);
    });

    it('should return error for invalid limit', () => {
      const dto = { limit: 500 }; // Max is 100
      const result = safeValidateTenantFilterDto(dto);

      expect(result.success).toBe(false);
    });
  });
});
