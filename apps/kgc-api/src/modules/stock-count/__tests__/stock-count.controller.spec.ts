/**
 * StockCount Controller TEA Tests
 * Epic 24: Leltár (Stock Count)
 *
 * Test-Each-Action: Minden endpoint tesztelése
 * Coverage: 40+ teszt
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COUNT_RECORDING_SERVICE,
  STOCK_COUNT_SERVICE,
  StockCountController,
  VARIANCE_SERVICE,
} from '../stock-count.controller';

// ============================================
// Mock Enums (to avoid external package dependency in tests)
// ============================================

enum StockCountStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

enum StockCountType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  CYCLE = 'CYCLE',
  SPOT = 'SPOT',
}

enum CountingMode {
  BARCODE = 'BARCODE',
  MANUAL = 'MANUAL',
  RFID = 'RFID',
}

enum VarianceReasonCategory {
  DAMAGED = 'DAMAGED',
  THEFT = 'THEFT',
  MISCOUNT = 'MISCOUNT',
  DATA_ERROR = 'DATA_ERROR',
  OTHER = 'OTHER',
}

enum AdjustmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
}

// Mock AuthenticatedRequest interface
interface AuthenticatedRequest {
  user: {
    id: string;
    tenantId: string;
    email: string;
    permissions: string[];
  };
}

// ============================================
// Mock Services
// ============================================

const mockStockCountService = {
  createStockCount: vi.fn(),
  listStockCounts: vi.fn(),
  getStockCount: vi.fn(),
  startStockCount: vi.fn(),
  suspendStockCount: vi.fn(),
  resumeStockCount: vi.fn(),
  cancelStockCount: vi.fn(),
  toggleStockFreeze: vi.fn(),
};

const mockCountRecordingService = {
  startCounterSession: vi.fn(),
  endCounterSession: vi.fn(),
  getActiveSessions: vi.fn(),
  recordCount: vi.fn(),
  recordBatchCount: vi.fn(),
  getCountItems: vi.fn(),
  findItemByBarcode: vi.fn(),
  undoCount: vi.fn(),
  markForRecount: vi.fn(),
  getCountingProgress: vi.fn(),
};

const mockVarianceService = {
  getVariances: vi.fn(),
  documentVarianceReason: vi.fn(),
  getVarianceSummary: vi.fn(),
  createAdjustment: vi.fn(),
  getAdjustment: vi.fn(),
  approveAdjustment: vi.fn(),
  rejectAdjustment: vi.fn(),
  applyAdjustment: vi.fn(),
  completeStockCount: vi.fn(),
  exportVariances: vi.fn(),
};

// ============================================
// Test Fixtures
// ============================================

const createMockRequest = (tenantId: string, userId: string = 'user-1'): AuthenticatedRequest => ({
  user: {
    id: userId,
    tenantId,
    email: 'test@example.com',
    permissions: ['inventory:view', 'inventory:update', 'inventory:adjust'],
  },
});

const mockStockCount = {
  id: 'sc-1',
  tenantId: 'tenant-1',
  locationId: 'loc-1',
  warehouseId: 'wh-1',
  type: StockCountType.FULL,
  name: 'Éves leltár 2024',
  status: StockCountStatus.DRAFT,
  scheduledStartDate: new Date('2024-12-01'),
  scheduledEndDate: new Date('2024-12-05'),
  freezeStock: true,
  responsibleUserId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCountItem = {
  id: 'item-1',
  stockCountId: 'sc-1',
  productId: 'prod-1',
  productName: 'Stihl MS 180',
  barcode: 'STIHL-MS180-001',
  expectedQuantity: 10,
  countedQuantity: 9,
  variance: -1,
  status: 'COUNTED',
};

const mockCounterSession = {
  id: 'session-1',
  stockCountId: 'sc-1',
  userId: 'user-1',
  startTime: new Date(),
  endTime: null,
  assignedZone: 'A1',
  itemsCounted: 0,
};

const mockAdjustment = {
  id: 'adj-1',
  stockCountId: 'sc-1',
  status: AdjustmentStatus.PENDING,
  createdBy: 'user-1',
  createdAt: new Date(),
  items: [],
};

// ============================================
// Test Suite
// ============================================

describe('StockCountController', () => {
  let controller: StockCountController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new StockCountController(
      mockStockCountService as any,
      mockCountRecordingService as any,
      mockVarianceService as any
    );
  });

  // ============================================
  // 1. TENANT ISOLATION (P0)
  // ============================================

  describe('Tenant Isolation (P0)', () => {
    it('createStockCount - uses tenantId from JWT', async () => {
      const req = createMockRequest('tenant-A');
      mockStockCountService.createStockCount.mockResolvedValue({
        ...mockStockCount,
        tenantId: 'tenant-A',
      });

      await controller.createStockCount(req, {
        locationId: 'loc-1',
        warehouseId: 'wh-1',
        type: StockCountType.FULL,
        name: 'Test Leltár',
        scheduledStartDate: '2024-12-01',
        scheduledEndDate: '2024-12-05',
        responsibleUserId: 'user-1',
      });

      expect(mockStockCountService.createStockCount).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-A' })
      );
    });

    it('listStockCounts - filters by tenant from JWT', async () => {
      const req = createMockRequest('tenant-B');
      mockStockCountService.listStockCounts.mockResolvedValue([]);

      await controller.listStockCounts(req);

      expect(mockStockCountService.listStockCounts).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-B' })
      );
    });

    it('recordCount - uses userId from JWT', async () => {
      const req = createMockRequest('tenant-A', 'counter-user-1');
      mockCountRecordingService.recordCount.mockResolvedValue(mockCountItem);

      await controller.recordCount('item-1', req, {
        countedQuantity: 10,
        mode: CountingMode.BARCODE,
      });

      expect(mockCountRecordingService.recordCount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'counter-user-1' })
      );
    });
  });

  // ============================================
  // 2. STOCK COUNT CRUD (24-1)
  // ============================================

  describe('Stock Count CRUD (24-1)', () => {
    describe('createStockCount', () => {
      it('creates stock count with valid data', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.createStockCount.mockResolvedValue(mockStockCount);

        const result = await controller.createStockCount(req, {
          locationId: 'loc-1',
          warehouseId: 'wh-1',
          type: StockCountType.FULL,
          name: 'Éves leltár',
          scheduledStartDate: '2024-12-01',
          scheduledEndDate: '2024-12-05',
          responsibleUserId: 'user-1',
          freezeStock: true,
          notes: 'Teszt megjegyzés',
        });

        expect(result).toEqual({ data: mockStockCount });
        expect(mockStockCountService.createStockCount).toHaveBeenCalled();
      });

      it('throws BadRequestException for missing locationId', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.createStockCount(req, {
            locationId: '',
            warehouseId: 'wh-1',
            type: StockCountType.FULL,
            name: 'Test',
            scheduledStartDate: '2024-12-01',
            scheduledEndDate: '2024-12-05',
            responsibleUserId: 'user-1',
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException for missing warehouseId', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.createStockCount(req, {
            locationId: 'loc-1',
            warehouseId: '  ',
            type: StockCountType.FULL,
            name: 'Test',
            scheduledStartDate: '2024-12-01',
            scheduledEndDate: '2024-12-05',
            responsibleUserId: 'user-1',
          })
        ).rejects.toThrow('Raktár megadása kötelező');
      });

      it('throws BadRequestException for missing name', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.createStockCount(req, {
            locationId: 'loc-1',
            warehouseId: 'wh-1',
            type: StockCountType.FULL,
            name: '',
            scheduledStartDate: '2024-12-01',
            scheduledEndDate: '2024-12-05',
            responsibleUserId: 'user-1',
          })
        ).rejects.toThrow('Név megadása kötelező');
      });

      it('throws BadRequestException for invalid date format', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.createStockCount(req, {
            locationId: 'loc-1',
            warehouseId: 'wh-1',
            type: StockCountType.FULL,
            name: 'Test',
            scheduledStartDate: 'invalid-date',
            scheduledEndDate: '2024-12-05',
            responsibleUserId: 'user-1',
          })
        ).rejects.toThrow('Érvénytelen dátum formátum');
      });

      it('throws BadRequestException when end date is before start date', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.createStockCount(req, {
            locationId: 'loc-1',
            warehouseId: 'wh-1',
            type: StockCountType.FULL,
            name: 'Test',
            scheduledStartDate: '2024-12-05',
            scheduledEndDate: '2024-12-01',
            responsibleUserId: 'user-1',
          })
        ).rejects.toThrow('Befejezés dátum nem lehet korábbi mint a kezdés');
      });

      it('throws BadRequestException for invalid stock count type', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.createStockCount(req, {
            locationId: 'loc-1',
            warehouseId: 'wh-1',
            type: 'INVALID_TYPE' as any,
            name: 'Test',
            scheduledStartDate: '2024-12-01',
            scheduledEndDate: '2024-12-05',
            responsibleUserId: 'user-1',
          })
        ).rejects.toThrow('Érvénytelen leltár típus');
      });

      it('trims whitespace from input fields', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.createStockCount.mockResolvedValue(mockStockCount);

        await controller.createStockCount(req, {
          locationId: '  loc-1  ',
          warehouseId: '  wh-1  ',
          type: StockCountType.FULL,
          name: '  Test Leltár  ',
          scheduledStartDate: '2024-12-01',
          scheduledEndDate: '2024-12-05',
          responsibleUserId: '  user-1  ',
          notes: '  notes  ',
        });

        expect(mockStockCountService.createStockCount).toHaveBeenCalledWith(
          expect.objectContaining({
            locationId: 'loc-1',
            warehouseId: 'wh-1',
            name: 'Test Leltár',
            responsibleUserId: 'user-1',
            notes: 'notes',
          })
        );
      });
    });

    describe('listStockCounts', () => {
      it('returns list with default pagination', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.listStockCounts.mockResolvedValue([mockStockCount]);

        const result = await controller.listStockCounts(req);

        expect(result).toEqual({ data: [mockStockCount] });
        expect(mockStockCountService.listStockCounts).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 50, offset: 0 })
        );
      });

      it('caps limit at MAX_PAGE_LIMIT (100)', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.listStockCounts.mockResolvedValue([]);

        await controller.listStockCounts(
          req,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          '500'
        );

        expect(mockStockCountService.listStockCounts).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 100 })
        );
      });

      it('filters by status', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.listStockCounts.mockResolvedValue([]);

        await controller.listStockCounts(req, StockCountStatus.IN_PROGRESS);

        expect(mockStockCountService.listStockCounts).toHaveBeenCalledWith(
          expect.objectContaining({ status: StockCountStatus.IN_PROGRESS })
        );
      });

      it('filters by warehouseId and locationId', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.listStockCounts.mockResolvedValue([]);

        await controller.listStockCounts(req, undefined, 'wh-1', 'loc-1');

        expect(mockStockCountService.listStockCounts).toHaveBeenCalledWith(
          expect.objectContaining({ warehouseId: 'wh-1', locationId: 'loc-1' })
        );
      });

      it('parses date range filters', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.listStockCounts.mockResolvedValue([]);

        await controller.listStockCounts(
          req,
          undefined,
          undefined,
          undefined,
          '2024-01-01',
          '2024-12-31'
        );

        expect(mockStockCountService.listStockCounts).toHaveBeenCalledWith(
          expect.objectContaining({
            dateFrom: expect.any(Date),
            dateTo: expect.any(Date),
          })
        );
      });
    });

    describe('getStockCount', () => {
      it('returns stock count by ID', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.getStockCount.mockResolvedValue(mockStockCount);

        const result = await controller.getStockCount('sc-1', req);

        expect(result).toEqual({ data: mockStockCount });
      });

      it('throws NotFoundException when not found', async () => {
        const req = createMockRequest('tenant-1');
        mockStockCountService.getStockCount.mockResolvedValue(null);

        await expect(controller.getStockCount('sc-not-exists', req)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('startStockCount', () => {
      it('starts stock count', async () => {
        mockStockCountService.startStockCount.mockResolvedValue({
          ...mockStockCount,
          status: StockCountStatus.IN_PROGRESS,
        });

        const result = await controller.startStockCount('sc-1');

        expect(result.data.status).toBe(StockCountStatus.IN_PROGRESS);
      });

      it('throws BadRequestException for empty id', async () => {
        await expect(controller.startStockCount('   ')).rejects.toThrow(
          'Leltár azonosító kötelező'
        );
      });

      it('trims whitespace from id', async () => {
        mockStockCountService.startStockCount.mockResolvedValue({
          ...mockStockCount,
          status: StockCountStatus.IN_PROGRESS,
        });

        await controller.startStockCount('  sc-1  ');

        expect(mockStockCountService.startStockCount).toHaveBeenCalledWith('sc-1');
      });
    });

    describe('suspendStockCount', () => {
      it('suspends stock count with reason', async () => {
        mockStockCountService.suspendStockCount.mockResolvedValue({
          ...mockStockCount,
          status: StockCountStatus.SUSPENDED,
        });

        const result = await controller.suspendStockCount('sc-1', { reason: 'Műszak vége' });

        expect(result.data.status).toBe(StockCountStatus.SUSPENDED);
        expect(mockStockCountService.suspendStockCount).toHaveBeenCalledWith('sc-1', 'Műszak vége');
      });

      it('throws BadRequestException for empty reason', async () => {
        await expect(controller.suspendStockCount('sc-1', { reason: '  ' })).rejects.toThrow(
          'Felfüggesztés oka kötelező'
        );
      });
    });

    describe('resumeStockCount', () => {
      it('resumes suspended stock count', async () => {
        mockStockCountService.resumeStockCount.mockResolvedValue({
          ...mockStockCount,
          status: StockCountStatus.IN_PROGRESS,
        });

        const result = await controller.resumeStockCount('sc-1');

        expect(result.data.status).toBe(StockCountStatus.IN_PROGRESS);
      });

      it('throws BadRequestException for empty id', async () => {
        await expect(controller.resumeStockCount('   ')).rejects.toThrow(
          'Leltár azonosító kötelező'
        );
      });

      it('trims whitespace from id', async () => {
        mockStockCountService.resumeStockCount.mockResolvedValue({
          ...mockStockCount,
          status: StockCountStatus.IN_PROGRESS,
        });

        await controller.resumeStockCount('  sc-1  ');

        expect(mockStockCountService.resumeStockCount).toHaveBeenCalledWith('sc-1');
      });
    });

    describe('cancelStockCount', () => {
      it('cancels stock count with reason', async () => {
        mockStockCountService.cancelStockCount.mockResolvedValue({
          ...mockStockCount,
          status: StockCountStatus.CANCELLED,
        });

        const result = await controller.cancelStockCount('sc-1', { reason: 'Duplikált leltár' });

        expect(result.data.status).toBe(StockCountStatus.CANCELLED);
      });

      it('throws BadRequestException for empty reason', async () => {
        await expect(controller.cancelStockCount('sc-1', { reason: '' })).rejects.toThrow(
          'Visszavonás oka kötelező'
        );
      });
    });

    describe('toggleStockFreeze', () => {
      it('enables stock freeze', async () => {
        mockStockCountService.toggleStockFreeze.mockResolvedValue({
          ...mockStockCount,
          freezeStock: true,
        });

        const result = await controller.toggleStockFreeze('sc-1', { freeze: true });

        expect(result.data.freezeStock).toBe(true);
      });

      it('disables stock freeze', async () => {
        mockStockCountService.toggleStockFreeze.mockResolvedValue({
          ...mockStockCount,
          freezeStock: false,
        });

        const result = await controller.toggleStockFreeze('sc-1', { freeze: false });

        expect(result.data.freezeStock).toBe(false);
      });

      it('throws BadRequestException when freeze parameter missing', async () => {
        await expect(controller.toggleStockFreeze('sc-1', {} as any)).rejects.toThrow(
          'freeze paraméter kötelező'
        );
      });
    });
  });

  // ============================================
  // 3. COUNT RECORDING (24-2)
  // ============================================

  describe('Count Recording (24-2)', () => {
    describe('startCounterSession', () => {
      it('starts session for user', async () => {
        const req = createMockRequest('tenant-1', 'counter-1');
        mockCountRecordingService.startCounterSession.mockResolvedValue(mockCounterSession);

        const result = await controller.startCounterSession('sc-1', req, { assignedZone: 'A1' });

        expect(result).toEqual({ data: mockCounterSession });
        expect(mockCountRecordingService.startCounterSession).toHaveBeenCalledWith(
          'sc-1',
          'counter-1',
          'A1'
        );
      });

      it('starts session without assigned zone', async () => {
        const req = createMockRequest('tenant-1', 'counter-1');
        mockCountRecordingService.startCounterSession.mockResolvedValue(mockCounterSession);

        await controller.startCounterSession('sc-1', req, {});

        expect(mockCountRecordingService.startCounterSession).toHaveBeenCalledWith(
          'sc-1',
          'counter-1',
          undefined
        );
      });
    });

    describe('endCounterSession', () => {
      it('ends session', async () => {
        mockCountRecordingService.endCounterSession.mockResolvedValue({
          ...mockCounterSession,
          endTime: new Date(),
        });

        const result = await controller.endCounterSession('session-1');

        expect(result.data.endTime).toBeDefined();
      });
    });

    describe('getActiveSessions', () => {
      it('returns active sessions', async () => {
        mockCountRecordingService.getActiveSessions.mockResolvedValue([mockCounterSession]);

        const result = await controller.getActiveSessions('sc-1');

        expect(result).toEqual({ data: [mockCounterSession] });
      });
    });

    describe('recordCount', () => {
      it('records count with valid data', async () => {
        const req = createMockRequest('tenant-1', 'user-1');
        mockCountRecordingService.recordCount.mockResolvedValue(mockCountItem);

        const result = await controller.recordCount('item-1', req, {
          countedQuantity: 10,
          mode: CountingMode.BARCODE,
          notes: 'OK',
        });

        expect(result).toEqual({ data: mockCountItem });
        expect(mockCountRecordingService.recordCount).toHaveBeenCalledWith({
          itemId: 'item-1',
          countedQuantity: 10,
          userId: 'user-1',
          mode: CountingMode.BARCODE,
          notes: 'OK',
        });
      });

      it('throws BadRequestException for negative quantity', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.recordCount('item-1', req, {
            countedQuantity: -5,
            mode: CountingMode.MANUAL,
          })
        ).rejects.toThrow('Érvényes mennyiség szükséges');
      });

      it('throws BadRequestException for missing mode', async () => {
        const req = createMockRequest('tenant-1');

        await expect(
          controller.recordCount('item-1', req, {
            countedQuantity: 10,
            mode: undefined as any,
          })
        ).rejects.toThrow('Számlálási mód kötelező');
      });
    });

    describe('recordBatchCount', () => {
      it('records batch counts', async () => {
        const req = createMockRequest('tenant-1', 'user-1');
        mockCountRecordingService.recordBatchCount.mockResolvedValue({ processed: 3, errors: [] });

        const result = await controller.recordBatchCount('sc-1', req, {
          items: [
            { productId: 'p1', countedQuantity: 5 },
            { productId: 'p2', countedQuantity: 10 },
            { barcode: 'BC123', countedQuantity: 3 },
          ],
        });

        expect(result.data).toEqual({ processed: 3, errors: [] });
      });

      it('throws BadRequestException for empty items array', async () => {
        const req = createMockRequest('tenant-1');

        await expect(controller.recordBatchCount('sc-1', req, { items: [] })).rejects.toThrow(
          'Legalább egy tétel szükséges'
        );
      });

      it('throws BadRequestException for missing items', async () => {
        const req = createMockRequest('tenant-1');

        await expect(controller.recordBatchCount('sc-1', req, {} as any)).rejects.toThrow(
          'Legalább egy tétel szükséges'
        );
      });

      it('throws BadRequestException for too many items', async () => {
        const req = createMockRequest('tenant-1');
        const tooManyItems = Array.from({ length: 501 }, (_, i) => ({
          productId: `p-${i}`,
          countedQuantity: 1,
        }));

        await expect(
          controller.recordBatchCount('sc-1', req, { items: tooManyItems })
        ).rejects.toThrow('Maximum 500 tétel rögzíthető egyszerre');
      });
    });

    describe('getCountItems', () => {
      it('returns all items', async () => {
        mockCountRecordingService.getCountItems.mockResolvedValue([mockCountItem]);

        const result = await controller.getCountItems('sc-1');

        expect(result).toEqual({ data: [mockCountItem] });
        expect(mockCountRecordingService.getCountItems).toHaveBeenCalledWith('sc-1', {
          uncountedOnly: false,
          zone: undefined,
          recountOnly: false,
        });
      });

      it('filters uncounted items only', async () => {
        mockCountRecordingService.getCountItems.mockResolvedValue([]);

        await controller.getCountItems('sc-1', 'true');

        expect(mockCountRecordingService.getCountItems).toHaveBeenCalledWith('sc-1', {
          uncountedOnly: true,
          zone: undefined,
          recountOnly: false,
        });
      });

      it('filters by zone', async () => {
        mockCountRecordingService.getCountItems.mockResolvedValue([]);

        await controller.getCountItems('sc-1', undefined, 'A1');

        expect(mockCountRecordingService.getCountItems).toHaveBeenCalledWith('sc-1', {
          uncountedOnly: false,
          zone: 'A1',
          recountOnly: false,
        });
      });

      it('filters recount items only', async () => {
        mockCountRecordingService.getCountItems.mockResolvedValue([]);

        await controller.getCountItems('sc-1', undefined, undefined, 'true');

        expect(mockCountRecordingService.getCountItems).toHaveBeenCalledWith('sc-1', {
          uncountedOnly: false,
          zone: undefined,
          recountOnly: true,
        });
      });
    });

    describe('findItemByBarcode', () => {
      it('finds item by barcode', async () => {
        mockCountRecordingService.findItemByBarcode.mockResolvedValue(mockCountItem);

        const result = await controller.findItemByBarcode('sc-1', 'STIHL-MS180-001');

        expect(result).toEqual({ data: mockCountItem });
      });

      it('throws NotFoundException when not found', async () => {
        mockCountRecordingService.findItemByBarcode.mockResolvedValue(null);

        await expect(controller.findItemByBarcode('sc-1', 'INVALID-BARCODE')).rejects.toThrow(
          NotFoundException
        );
      });

      it('throws BadRequestException for empty barcode', async () => {
        await expect(controller.findItemByBarcode('sc-1', '   ')).rejects.toThrow(
          'Vonalkód megadása kötelező'
        );
      });
    });

    describe('undoCount', () => {
      it('undoes last count', async () => {
        const req = createMockRequest('tenant-1', 'user-1');
        mockCountRecordingService.undoCount.mockResolvedValue({
          ...mockCountItem,
          countedQuantity: null,
          status: 'NOT_COUNTED',
        });

        const result = await controller.undoCount('item-1', req);

        expect(result.data.countedQuantity).toBeNull();
        expect(mockCountRecordingService.undoCount).toHaveBeenCalledWith('item-1', 'user-1');
      });
    });

    describe('markForRecount', () => {
      it('marks item for recount', async () => {
        mockCountRecordingService.markForRecount.mockResolvedValue({
          ...mockCountItem,
          status: 'RECOUNT_REQUESTED',
        });

        const result = await controller.markForRecount('item-1', { reason: 'Sérült vonalkód' });

        expect(result.data.status).toBe('RECOUNT_REQUESTED');
      });

      it('throws BadRequestException for empty reason', async () => {
        await expect(controller.markForRecount('item-1', { reason: '' })).rejects.toThrow(
          'Újraszámlálás oka kötelező'
        );
      });
    });

    describe('getCountingProgress', () => {
      it('returns counting progress', async () => {
        const progress = {
          totalItems: 100,
          countedItems: 75,
          uncountedItems: 25,
          recountItems: 3,
          percentComplete: 75,
        };
        mockCountRecordingService.getCountingProgress.mockResolvedValue(progress);

        const result = await controller.getCountingProgress('sc-1');

        expect(result).toEqual({ data: progress });
      });
    });
  });

  // ============================================
  // 4. VARIANCE & ADJUSTMENTS (24-3)
  // ============================================

  describe('Variance & Adjustments (24-3)', () => {
    describe('getVariances', () => {
      it('returns all variances', async () => {
        const variances = [{ itemId: 'item-1', variance: -1, valueDifference: -5000 }];
        mockVarianceService.getVariances.mockResolvedValue(variances);

        const result = await controller.getVariances('sc-1');

        expect(result).toEqual({ data: variances });
      });
    });

    describe('documentVarianceReason', () => {
      it('documents variance reason', async () => {
        mockVarianceService.documentVarianceReason.mockResolvedValue({
          itemId: 'item-1',
          reasonCategory: VarianceReasonCategory.DAMAGED,
          reasonDescription: 'Sérült termék leírva',
        });

        const result = await controller.documentVarianceReason('item-1', {
          category: VarianceReasonCategory.DAMAGED,
          description: 'Sérült termék leírva',
        });

        expect(result.data.reasonCategory).toBe(VarianceReasonCategory.DAMAGED);
      });

      it('throws BadRequestException for missing category', async () => {
        await expect(
          controller.documentVarianceReason('item-1', {
            category: undefined as any,
            description: 'Test',
          })
        ).rejects.toThrow('Ok kategória kötelező');
      });

      it('throws BadRequestException for short description', async () => {
        await expect(
          controller.documentVarianceReason('item-1', {
            category: VarianceReasonCategory.THEFT,
            description: '123',
          })
        ).rejects.toThrow('Leírás kötelező (min. 5 karakter)');
      });
    });

    describe('getVarianceSummary', () => {
      it('returns variance summary', async () => {
        const summary = {
          totalVariance: -5,
          totalValueDifference: -25000,
          byCategory: {
            DAMAGED: { count: 2, value: -10000 },
            THEFT: { count: 1, value: -15000 },
          },
        };
        mockVarianceService.getVarianceSummary.mockResolvedValue(summary);

        const result = await controller.getVarianceSummary('sc-1');

        expect(result).toEqual({ data: summary });
      });
    });

    describe('createAdjustment', () => {
      it('creates adjustment document', async () => {
        const req = createMockRequest('tenant-1', 'user-1');
        mockVarianceService.createAdjustment.mockResolvedValue(mockAdjustment);

        const result = await controller.createAdjustment('sc-1', req);

        expect(result).toEqual({ data: mockAdjustment });
        expect(mockVarianceService.createAdjustment).toHaveBeenCalledWith('sc-1', 'user-1');
      });
    });

    describe('getAdjustment', () => {
      it('returns adjustment', async () => {
        mockVarianceService.getAdjustment.mockResolvedValue(mockAdjustment);

        const result = await controller.getAdjustment('adj-1');

        expect(result).toEqual({ data: mockAdjustment });
      });

      it('throws NotFoundException when not found', async () => {
        mockVarianceService.getAdjustment.mockResolvedValue(null);

        await expect(controller.getAdjustment('adj-not-exists')).rejects.toThrow(NotFoundException);
      });
    });

    describe('approveAdjustment', () => {
      it('approves adjustment', async () => {
        const req = createMockRequest('tenant-1', 'approver-1');
        mockVarianceService.approveAdjustment.mockResolvedValue({
          ...mockAdjustment,
          status: AdjustmentStatus.APPROVED,
          approvedBy: 'approver-1',
        });

        const result = await controller.approveAdjustment('adj-1', req);

        expect(result.data.status).toBe(AdjustmentStatus.APPROVED);
        expect(mockVarianceService.approveAdjustment).toHaveBeenCalledWith('adj-1', 'approver-1');
      });
    });

    describe('rejectAdjustment', () => {
      it('rejects adjustment with reason', async () => {
        const req = createMockRequest('tenant-1', 'reviewer-1');
        mockVarianceService.rejectAdjustment.mockResolvedValue({
          ...mockAdjustment,
          status: AdjustmentStatus.REJECTED,
          rejectedBy: 'reviewer-1',
        });

        const result = await controller.rejectAdjustment('adj-1', req, {
          reason: 'Hiányzó dokumentáció',
        });

        expect(result.data.status).toBe(AdjustmentStatus.REJECTED);
        expect(mockVarianceService.rejectAdjustment).toHaveBeenCalledWith(
          'adj-1',
          'reviewer-1',
          'Hiányzó dokumentáció'
        );
      });

      it('throws BadRequestException for empty reason', async () => {
        const req = createMockRequest('tenant-1');

        await expect(controller.rejectAdjustment('adj-1', req, { reason: '' })).rejects.toThrow(
          'Elutasítás oka kötelező'
        );
      });
    });

    describe('applyAdjustment', () => {
      it('applies adjustment to inventory', async () => {
        const req = createMockRequest('tenant-1', 'user-1');
        mockVarianceService.applyAdjustment.mockResolvedValue({
          ...mockAdjustment,
          status: AdjustmentStatus.APPLIED,
          appliedAt: new Date(),
        });

        const result = await controller.applyAdjustment('adj-1', req);

        expect(result.data.status).toBe(AdjustmentStatus.APPLIED);
      });
    });

    describe('completeStockCount', () => {
      it('completes stock count', async () => {
        const req = createMockRequest('tenant-1', 'user-1');
        mockVarianceService.completeStockCount.mockResolvedValue(undefined);

        const result = await controller.completeStockCount('sc-1', req);

        expect(result).toEqual({ data: { success: true }, message: 'Leltár sikeresen lezárva' });
      });
    });

    describe('exportVariances', () => {
      it('exports variances as CSV', async () => {
        const csvBuffer = Buffer.from('product,variance\nStihl MS180,-1');
        mockVarianceService.exportVariances.mockResolvedValue(csvBuffer);

        const mockRes = {
          setHeader: vi.fn(),
          send: vi.fn(),
        };

        await controller.exportVariances('sc-1', mockRes as any);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          'attachment; filename="elteresek-sc-1.csv"'
        );
        expect(mockRes.send).toHaveBeenCalledWith(csvBuffer);
      });

      it('exports variances as XLSX', async () => {
        const xlsxBuffer = Buffer.from('mock xlsx content');
        mockVarianceService.exportVariances.mockResolvedValue(xlsxBuffer);

        const mockRes = {
          setHeader: vi.fn(),
          send: vi.fn(),
        };

        await controller.exportVariances('sc-1', mockRes as any, 'XLSX');

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          'attachment; filename="elteresek-sc-1.xlsx"'
        );
      });

      it('sanitizes filename to prevent path traversal', async () => {
        const csvBuffer = Buffer.from('data');
        mockVarianceService.exportVariances.mockResolvedValue(csvBuffer);

        const mockRes = {
          setHeader: vi.fn(),
          send: vi.fn(),
        };

        await controller.exportVariances('../../../etc/passwd', mockRes as any);

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          'attachment; filename="elteresek-etcpasswd.csv"'
        );
      });
    });
  });

  // ============================================
  // 5. INJECTION TOKEN TESTS
  // ============================================

  describe('Injection Tokens', () => {
    it('exports STOCK_COUNT_SERVICE token', () => {
      expect(STOCK_COUNT_SERVICE).toBeDefined();
      expect(typeof STOCK_COUNT_SERVICE).toBe('symbol');
    });

    it('exports COUNT_RECORDING_SERVICE token', () => {
      expect(COUNT_RECORDING_SERVICE).toBeDefined();
      expect(typeof COUNT_RECORDING_SERVICE).toBe('symbol');
    });

    it('exports VARIANCE_SERVICE token', () => {
      expect(VARIANCE_SERVICE).toBeDefined();
      expect(typeof VARIANCE_SERVICE).toBe('symbol');
    });
  });
});
