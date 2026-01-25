/**
 * WarehouseController Unit Tests
 * Story 9-3: Multi-warehouse támogatás
 *
 * Note: Using direct instantiation instead of NestJS TestingModule
 * because the service has repository dependencies that complicate DI mocking.
 */

import type { WarehouseService } from '@kgc/inventory';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { WarehouseController } from './warehouse.controller';

type MockedWarehouseService = {
  [K in keyof WarehouseService]: Mock;
};

describe('WarehouseController', () => {
  let controller: WarehouseController;
  let mockWarehouseService: MockedWarehouseService;

  const mockRequest = {
    user: {
      id: 'user-123',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    },
  };

  const mockWarehouse = {
    id: 'wh-1',
    tenantId: 'tenant-123',
    code: 'WH01',
    name: 'Main Warehouse',
    type: 'MAIN' as const,
    status: 'ACTIVE' as const,
    isDefault: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransfer = {
    id: 'transfer-1',
    tenantId: 'tenant-123',
    transferCode: 'TRF-2026-ABC123',
    sourceWarehouseId: 'wh-1',
    targetWarehouseId: 'wh-2',
    status: 'PENDING' as const,
    initiatedBy: 'user-123',
    initiatedAt: new Date(),
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockWarehouseService = {
      queryWarehouses: vi.fn(),
      findDefaultWarehouse: vi.fn(),
      findWarehouseById: vi.fn(),
      findWarehouseByCode: vi.fn(),
      createWarehouse: vi.fn(),
      updateWarehouse: vi.fn(),
      deleteWarehouse: vi.fn(),
      setDefaultWarehouse: vi.fn(),
      getCrossWarehouseStock: vi.fn(),
      queryTransfers: vi.fn(),
      findTransferById: vi.fn(),
      createTransfer: vi.fn(),
      startTransfer: vi.fn(),
      completeTransfer: vi.fn(),
      cancelTransfer: vi.fn(),
    } as unknown as MockedWarehouseService;

    // Direct instantiation with mock service
    controller = new WarehouseController(mockWarehouseService as unknown as WarehouseService);
  });

  describe('list', () => {
    it('should return list of warehouses', async () => {
      const queryResult = {
        warehouses: [mockWarehouse],
        total: 1,
        offset: 0,
        limit: 20,
      };
      mockWarehouseService.queryWarehouses.mockResolvedValue(queryResult);

      const result = await controller.list(mockRequest);

      expect(result).toEqual({ data: queryResult });
      expect(mockWarehouseService.queryWarehouses).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
      });
    });

    it('should pass filter parameters', async () => {
      const queryResult = { warehouses: [], total: 0, offset: 0, limit: 20 };
      mockWarehouseService.queryWarehouses.mockResolvedValue(queryResult);

      await controller.list(
        mockRequest,
        'BRANCH',
        'ACTIVE',
        'Budapest',
        'raktár',
        'name',
        'asc',
        '10',
        '50'
      );

      expect(mockWarehouseService.queryWarehouses).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        type: 'BRANCH',
        status: 'ACTIVE',
        city: 'Budapest',
        search: 'raktár',
        sortBy: 'name',
        sortOrder: 'asc',
        offset: 10,
        limit: 50,
      });
    });
  });

  describe('getDefault', () => {
    it('should return default warehouse', async () => {
      mockWarehouseService.findDefaultWarehouse.mockResolvedValue(mockWarehouse);

      const result = await controller.getDefault(mockRequest);

      expect(result).toEqual({ data: mockWarehouse });
    });

    it('should return error if no default warehouse', async () => {
      mockWarehouseService.findDefaultWarehouse.mockResolvedValue(null);

      const result = await controller.getDefault(mockRequest);

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Nincs alapértelmezett raktár' },
      });
    });
  });

  describe('findById', () => {
    it('should return warehouse by ID', async () => {
      mockWarehouseService.findWarehouseById.mockResolvedValue(mockWarehouse);

      const result = await controller.findById(mockRequest, 'wh-1');

      expect(result).toEqual({ data: mockWarehouse });
    });

    it('should return error if not found', async () => {
      mockWarehouseService.findWarehouseById.mockResolvedValue(null);

      const result = await controller.findById(mockRequest, 'invalid-id');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Raktár nem található' },
      });
    });
  });

  describe('create', () => {
    it('should create warehouse', async () => {
      mockWarehouseService.createWarehouse.mockResolvedValue(mockWarehouse);

      const input = {
        code: 'WH01',
        name: 'Main Warehouse',
        type: 'MAIN' as const,
        status: 'ACTIVE' as const,
      };
      const result = await controller.create(mockRequest, input);

      expect(result).toEqual({ data: mockWarehouse });
      expect(mockWarehouseService.createWarehouse).toHaveBeenCalledWith('tenant-123', input);
    });

    it('should return error on validation failure', async () => {
      mockWarehouseService.createWarehouse.mockRejectedValue(new Error('A raktár kód már létezik'));

      const input = {
        code: 'WH01',
        name: 'Main Warehouse',
        type: 'MAIN' as const,
        status: 'ACTIVE' as const,
      };
      const result = await controller.create(mockRequest, input);

      expect(result).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'A raktár kód már létezik' },
      });
    });
  });

  describe('update', () => {
    it('should update warehouse', async () => {
      const updated = { ...mockWarehouse, name: 'Updated Name' };
      mockWarehouseService.updateWarehouse.mockResolvedValue(updated);

      const result = await controller.update(mockRequest, 'wh-1', {
        name: 'Updated Name',
      });

      expect(result).toEqual({ data: updated });
    });

    it('should return NOT_FOUND error', async () => {
      mockWarehouseService.updateWarehouse.mockRejectedValue(new Error('Raktár nem található'));

      const result = await controller.update(mockRequest, 'invalid', {
        name: 'Test',
      });

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Raktár nem található' },
      });
    });
  });

  describe('delete', () => {
    it('should delete warehouse', async () => {
      mockWarehouseService.deleteWarehouse.mockResolvedValue(undefined);

      const result = await controller.delete(mockRequest, 'wh-1');

      expect(result).toBeUndefined();
    });

    it('should return error if cannot delete', async () => {
      mockWarehouseService.deleteWarehouse.mockRejectedValue(
        new Error('Alapértelmezett raktár nem törölhető')
      );

      const result = await controller.delete(mockRequest, 'wh-1');

      expect(result).toEqual({
        error: { code: 'INVALID_OPERATION', message: 'Alapértelmezett raktár nem törölhető' },
      });
    });
  });

  describe('setDefault', () => {
    it('should set warehouse as default', async () => {
      mockWarehouseService.setDefaultWarehouse.mockResolvedValue(mockWarehouse);

      const result = await controller.setDefault(mockRequest, 'wh-1');

      expect(result).toEqual({ data: mockWarehouse });
    });
  });

  describe('getCrossWarehouseStock', () => {
    it('should return cross warehouse stock summary', async () => {
      const summary = [
        {
          productId: 'prod-1',
          productName: 'Product 1',
          unit: 'db',
          totalQuantity: 100,
          warehouseBreakdown: [],
        },
      ];
      mockWarehouseService.getCrossWarehouseStock.mockResolvedValue(summary);

      const result = await controller.getCrossWarehouseStock(mockRequest);

      expect(result).toEqual({ data: summary });
    });

    it('should parse product IDs from comma-separated string', async () => {
      mockWarehouseService.getCrossWarehouseStock.mockResolvedValue([]);

      await controller.getCrossWarehouseStock(mockRequest, 'id1, id2, id3');

      expect(mockWarehouseService.getCrossWarehouseStock).toHaveBeenCalledWith('tenant-123', [
        'id1',
        'id2',
        'id3',
      ]);
    });
  });

  describe('listTransfers', () => {
    it('should return list of transfers', async () => {
      const queryResult = {
        transfers: [mockTransfer],
        total: 1,
        offset: 0,
        limit: 20,
      };
      mockWarehouseService.queryTransfers.mockResolvedValue(queryResult);

      const result = await controller.listTransfers(mockRequest);

      expect(result).toEqual({ data: queryResult });
    });
  });

  describe('createTransfer', () => {
    it('should create transfer', async () => {
      mockWarehouseService.createTransfer.mockResolvedValue(mockTransfer);

      const input = {
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        items: [{ inventoryItemId: 'item-1', quantity: 10, unit: 'db' }],
      };
      const result = await controller.createTransfer(mockRequest, input);

      expect(result).toEqual({ data: mockTransfer });
      expect(mockWarehouseService.createTransfer).toHaveBeenCalledWith(
        'tenant-123',
        input,
        'user-123'
      );
    });
  });

  describe('startTransfer', () => {
    it('should start transfer', async () => {
      const started = { ...mockTransfer, status: 'IN_TRANSIT' as const };
      mockWarehouseService.startTransfer.mockResolvedValue(started);

      const result = await controller.startTransfer(mockRequest, 'transfer-1');

      expect(result).toEqual({ data: started });
    });
  });

  describe('completeTransfer', () => {
    it('should complete transfer', async () => {
      const completed = { ...mockTransfer, status: 'COMPLETED' as const };
      mockWarehouseService.completeTransfer.mockResolvedValue(completed);

      const result = await controller.completeTransfer(mockRequest, 'transfer-1');

      expect(result).toEqual({ data: completed });
      expect(mockWarehouseService.completeTransfer).toHaveBeenCalledWith(
        'transfer-1',
        'tenant-123',
        'user-123',
        undefined
      );
    });
  });

  describe('cancelTransfer', () => {
    it('should cancel transfer', async () => {
      const cancelled = { ...mockTransfer, status: 'CANCELLED' as const };
      mockWarehouseService.cancelTransfer.mockResolvedValue(cancelled);

      const result = await controller.cancelTransfer(mockRequest, 'transfer-1', {
        reason: 'Tévedés',
      });

      expect(result).toEqual({ data: cancelled });
    });
  });
});
