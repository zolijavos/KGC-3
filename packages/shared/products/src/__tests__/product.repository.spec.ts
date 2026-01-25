/**
 * @kgc/products - Product Repository Unit Tests
 * Epic 8: Story 8-1: Cikk CRUD
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateProductInput } from '../dto/product.dto';
import { InMemoryProductRepository } from '../repositories/product.repository';

describe('InMemoryProductRepository', () => {
  let repository: InMemoryProductRepository;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const input: CreateProductInput = {
        sku: 'TEST-001',
        name: 'Test Product',
        unit: 'db',
        vatPercent: 27,
      };

      const product = await repository.create(tenantId, input, userId);

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.sku).toBe('TEST-001');
      expect(product.name).toBe('Test Product');
      expect(product.tenantId).toBe(tenantId);
      expect(product.createdBy).toBe(userId);
      expect(product.isDeleted).toBe(false);
    });

    it('should throw error when SKU already exists', async () => {
      const input: CreateProductInput = {
        sku: 'DUPLICATE-001',
        name: 'First Product',
        unit: 'db',
      };

      await repository.create(tenantId, input, userId);

      await expect(repository.create(tenantId, input, userId)).rejects.toThrow(
        'A cikkszám már létezik: DUPLICATE-001'
      );
    });

    it('should throw error when barcode already exists', async () => {
      const input1: CreateProductInput = {
        sku: 'SKU-001',
        name: 'First Product',
        barcode: '1234567890123',
        unit: 'db',
      };

      const input2: CreateProductInput = {
        sku: 'SKU-002',
        name: 'Second Product',
        barcode: '1234567890123',
        unit: 'db',
      };

      await repository.create(tenantId, input1, userId);

      await expect(repository.create(tenantId, input2, userId)).rejects.toThrow(
        'A vonalkód már létezik: 1234567890123'
      );
    });
  });

  describe('findById', () => {
    it('should find product by ID', async () => {
      const created = await repository.create(
        tenantId,
        { sku: 'FIND-001', name: 'Find Test', unit: 'db' },
        userId
      );

      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.sku).toBe('FIND-001');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });

    it('should not find product from different tenant', async () => {
      const created = await repository.create(
        tenantId,
        { sku: 'TENANT-001', name: 'Tenant Test', unit: 'db' },
        userId
      );

      const found = await repository.findById(created.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });

  describe('findBySku', () => {
    it('should find product by SKU', async () => {
      await repository.create(tenantId, { sku: 'SKU-TEST', name: 'SKU Test', unit: 'db' }, userId);

      const found = await repository.findBySku('SKU-TEST', tenantId);

      expect(found).toBeDefined();
      expect(found?.sku).toBe('SKU-TEST');
    });

    it('should not find deleted product by SKU', async () => {
      const created = await repository.create(
        tenantId,
        { sku: 'DELETED-SKU', name: 'Deleted Test', unit: 'db' },
        userId
      );

      await repository.softDelete(created.id, tenantId);

      const found = await repository.findBySku('DELETED-SKU', tenantId);
      expect(found).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await repository.create(
        tenantId,
        { sku: 'P-001', name: 'Product 1', type: 'PRODUCT', status: 'ACTIVE', unit: 'db' },
        userId
      );
      await repository.create(
        tenantId,
        { sku: 'P-002', name: 'Product 2', type: 'PRODUCT', status: 'INACTIVE', unit: 'db' },
        userId
      );
      await repository.create(
        tenantId,
        {
          sku: 'R-001',
          name: 'Rental Equipment',
          type: 'RENTAL_EQUIPMENT',
          status: 'ACTIVE',
          unit: 'db',
        },
        userId
      );
    });

    it('should return all products for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.products).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const result = await repository.query({ tenantId, type: 'RENTAL_EQUIPMENT' });

      expect(result.total).toBe(1);
      expect(result.products[0]?.name).toBe('Rental Equipment');
    });

    it('should filter by status', async () => {
      const result = await repository.query({ tenantId, status: 'ACTIVE' });

      expect(result.total).toBe(2);
    });

    it('should search by name', async () => {
      const result = await repository.query({ tenantId, search: 'Rental' });

      expect(result.total).toBe(1);
      expect(result.products[0]?.name).toBe('Rental Equipment');
    });

    it('should paginate results', async () => {
      const result = await repository.query({ tenantId, offset: 1, limit: 1 });

      expect(result.products).toHaveLength(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const created = await repository.create(
        tenantId,
        { sku: 'UPDATE-001', name: 'Original Name', unit: 'db' },
        userId
      );

      const updated = await repository.update(
        created.id,
        tenantId,
        { name: 'Updated Name' },
        userId
      );

      expect(updated.name).toBe('Updated Name');
      expect(updated.sku).toBe('UPDATE-001'); // SKU unchanged
      expect(updated.updatedBy).toBe(userId);
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        repository.update('non-existent', tenantId, { name: 'Test' }, userId)
      ).rejects.toThrow('Termék nem található');
    });
  });

  describe('softDelete and restore', () => {
    it('should soft delete product', async () => {
      const created = await repository.create(
        tenantId,
        { sku: 'DELETE-001', name: 'Delete Test', unit: 'db' },
        userId
      );

      await repository.softDelete(created.id, tenantId);

      const found = await repository.findById(created.id, tenantId);
      expect(found?.isDeleted).toBe(true);
      expect(found?.deletedAt).toBeDefined();
    });

    it('should restore soft deleted product', async () => {
      const created = await repository.create(
        tenantId,
        { sku: 'RESTORE-001', name: 'Restore Test', unit: 'db' },
        userId
      );

      await repository.softDelete(created.id, tenantId);
      const restored = await repository.restore(created.id, tenantId);

      expect(restored.isDeleted).toBe(false);
      expect(restored.deletedAt).toBeNull();
    });
  });

  describe('countByStatus', () => {
    it('should count products by status', async () => {
      await repository.create(
        tenantId,
        { sku: 'A-001', name: 'Active 1', status: 'ACTIVE', unit: 'db' },
        userId
      );
      await repository.create(
        tenantId,
        { sku: 'A-002', name: 'Active 2', status: 'ACTIVE', unit: 'db' },
        userId
      );
      await repository.create(
        tenantId,
        { sku: 'I-001', name: 'Inactive', status: 'INACTIVE', unit: 'db' },
        userId
      );

      const counts = await repository.countByStatus(tenantId);

      expect(counts.ACTIVE).toBe(2);
      expect(counts.INACTIVE).toBe(1);
      expect(counts.DISCONTINUED).toBe(0);
      expect(counts.DRAFT).toBe(0);
    });
  });

  describe('generateNextSku', () => {
    it('should generate sequential SKUs', async () => {
      const sku1 = await repository.generateNextSku(tenantId);
      const sku2 = await repository.generateNextSku(tenantId);
      const sku3 = await repository.generateNextSku(tenantId, 'PROD');

      expect(sku1).toBe('SKU000001');
      expect(sku2).toBe('SKU000002');
      expect(sku3).toBe('PROD000003');
    });
  });
});
