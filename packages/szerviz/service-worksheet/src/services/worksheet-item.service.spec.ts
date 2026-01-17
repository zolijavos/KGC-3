/**
 * @kgc/service-worksheet - WorksheetItemService Unit Tests
 * Story 17-4, 17-5, 17-8
 *
 * TDD approach for financial calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorksheetItemService } from './worksheet-item.service';
import { WorksheetStatus, WorksheetType, WorksheetPriority } from '../interfaces/worksheet.interface';

// Mocks
const mockItemRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByWorksheetId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  sumByWorksheetId: vi.fn(),
};

const mockWorksheetRepository = {
  findById: vi.fn(),
};

const mockInventoryService = {
  reserve: vi.fn(),
  release: vi.fn(),
  consume: vi.fn(),
  getProductPrice: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('WorksheetItemService', () => {
  let service: WorksheetItemService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockWorksheetId = '770e8400-e29b-41d4-a716-446655440002';

  const mockWorksheet = {
    id: mockWorksheetId,
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    type: WorksheetType.FIZETOS,
    status: WorksheetStatus.FOLYAMATBAN,
    priority: WorksheetPriority.NORMAL,
    partnerId: 'partner-1',
    deviceName: 'Makita HR2470',
    faultDescription: 'Motor nem indul',
    receivedAt: new Date(),
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorksheetItemService(
      mockItemRepository as any,
      mockWorksheetRepository as any,
      mockInventoryService as any,
      mockAuditService as any,
    );
  });

  describe('Story 17-4: Alkatresz felhasznalas', () => {
    it('should add part item to worksheet', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockInventoryService.reserve.mockResolvedValue(true);
      mockItemRepository.create.mockImplementation(async (data) => ({
        id: 'item-1',
        ...data,
      }));

      const mockProductId = '990e8400-e29b-41d4-a716-446655440010';

      // Act
      const result = await service.addItem(
        mockWorksheetId,
        {
          productId: mockProductId,
          description: 'Szenkefe',
          quantity: 2,
          unitPrice: 1500,
          vatRate: 27,
          itemType: 'ALKATRESZ',
        },
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.itemType).toBe('ALKATRESZ');
      expect(result.netAmount).toBe(3000); // 2 * 1500
      expect(result.grossAmount).toBe(3810); // 3000 + 27%
      expect(mockInventoryService.reserve).toHaveBeenCalledWith(mockProductId, 2, mockTenantId);
    });

    it('should throw error if part not available in inventory', async () => {
      // Arrange
      const mockProductId = '990e8400-e29b-41d4-a716-446655440010';
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockInventoryService.reserve.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.addItem(
          mockWorksheetId,
          {
            productId: mockProductId,
            description: 'Szenkefe',
            quantity: 2,
            unitPrice: 1500,
            vatRate: 27,
            itemType: 'ALKATRESZ',
          },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Alkatresz nem elerheto a keszletben');
    });

    it('should release inventory when removing part item', async () => {
      // Arrange
      const mockItem = {
        id: 'item-1',
        worksheetId: mockWorksheetId,
        tenantId: mockTenantId,
        productId: 'product-1',
        quantity: 2,
        itemType: 'ALKATRESZ' as const,
        netAmount: 3000,
      };
      mockItemRepository.findById.mockResolvedValue(mockItem);

      // Act
      await service.removeItem('item-1', mockTenantId, mockUserId);

      // Assert
      expect(mockInventoryService.release).toHaveBeenCalledWith('product-1', 2, mockTenantId);
      expect(mockItemRepository.delete).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Story 17-5: Munkadij kalkulacio', () => {
    it('should calculate labor cost correctly', () => {
      expect(service.calculateLaborCost(1, 8000)).toBe(8000);
      expect(service.calculateLaborCost(1.5, 8000)).toBe(12000);
      expect(service.calculateLaborCost(0.5, 8000)).toBe(4000);
    });

    it('should round labor cost to nearest 100 Ft', () => {
      // 1.25 hours * 8000 = 10000 - already rounded
      expect(service.calculateLaborCost(1.25, 8000)).toBe(10000);
      // 1.33 hours * 8000 = 10640 -> rounds to 10600
      expect(service.calculateLaborCost(1.33, 8000)).toBe(10600);
    });

    it('should throw error for negative hours', () => {
      expect(() => service.calculateLaborCost(-1)).toThrow('Ora nem lehet negativ');
    });

    it('should add labor item with default rate', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockItemRepository.create.mockImplementation(async (data) => ({
        id: 'item-1',
        ...data,
      }));

      // Act
      const result = await service.addLabor(
        mockWorksheetId,
        2, // 2 hours
        'Szenkefe csere',
        8000,
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.itemType).toBe('MUNKADIJ');
      expect(result.netAmount).toBe(16000); // 2 * 8000
      expect(result.grossAmount).toBe(20320); // 16000 + 27%
    });

    it('should throw error for non-positive hours', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);

      // Act & Assert
      await expect(
        service.addLabor(mockWorksheetId, 0, 'Test', 8000, mockTenantId, mockUserId),
      ).rejects.toThrow('Munkaora pozitiv kell legyen');
    });
  });

  describe('Story 17-8: Tarolasi dij kezeles', () => {
    it('should return 0 for first 30 days (free period)', () => {
      expect(service.calculateStorageFee(0)).toBe(0);
      expect(service.calculateStorageFee(15)).toBe(0);
      expect(service.calculateStorageFee(30)).toBe(0);
    });

    it('should charge 500 Ft/day after 30 days', () => {
      expect(service.calculateStorageFee(31)).toBe(500); // 1 day * 500
      expect(service.calculateStorageFee(35)).toBe(2500); // 5 days * 500
      expect(service.calculateStorageFee(60)).toBe(15000); // 30 days * 500
    });

    it('should throw error for negative days', () => {
      expect(() => service.calculateStorageFee(-1)).toThrow('Napok szama nem lehet negativ');
    });

    it('should add storage fee item', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockItemRepository.create.mockImplementation(async (data) => ({
        id: 'item-1',
        ...data,
      }));

      // Act
      const result = await service.addStorageFee(mockWorksheetId, 45, mockTenantId, mockUserId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.itemType).toBe('EGYEB');
      expect(result?.unitPrice).toBe(7500); // 15 days * 500
    });

    it('should return null if no storage fee needed', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);

      // Act
      const result = await service.addStorageFee(mockWorksheetId, 25, mockTenantId, mockUserId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('calculateSummary()', () => {
    it('should calculate worksheet totals correctly', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockItemRepository.findByWorksheetId.mockResolvedValue([
        { itemType: 'ALKATRESZ', netAmount: 5000, grossAmount: 6350 },
        { itemType: 'ALKATRESZ', netAmount: 3000, grossAmount: 3810 },
        { itemType: 'MUNKADIJ', netAmount: 16000, grossAmount: 20320 },
        { itemType: 'EGYEB', netAmount: 2500, grossAmount: 3175 },
      ]);

      // Act
      const summary = await service.calculateSummary(mockWorksheetId, mockTenantId);

      // Assert
      expect(summary.partsNetAmount).toBe(8000);
      expect(summary.laborNetAmount).toBe(16000);
      expect(summary.otherNetAmount).toBe(2500);
      expect(summary.totalNetAmount).toBe(26500);
      expect(summary.vatAmount).toBe(7155); // 26500 * 0.27
      expect(summary.totalGrossAmount).toBe(33655);
    });
  });

  describe('Tenant isolation', () => {
    it('should throw error if worksheet belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        tenantId: 'different-tenant',
      });

      // Act & Assert
      await expect(
        service.addItem(
          mockWorksheetId,
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 27,
            itemType: 'EGYEB',
          },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });
  });
});
