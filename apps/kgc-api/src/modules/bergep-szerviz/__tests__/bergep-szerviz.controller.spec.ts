/**
 * Bergep-Szerviz Controller Tests
 * Epic 25: Equipment-Service Integration
 *
 * Tests for equipment dispatch and return API endpoints
 */

import {
  EquipmentStatus,
  IServiceDispatch,
  IServiceReturn,
  IWorksheet,
  ServiceDispatchReason,
  WorksheetStatus,
} from '@kgc/bergep-szerviz';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BergepSzervizController } from '../controllers/bergep-szerviz.controller';

// ============================================
// Mock Services
// ============================================

const mockDispatchService = {
  dispatchToService: vi.fn(),
  getActiveDispatch: vi.fn(),
  getDispatchHistory: vi.fn(),
};

const mockReturnService = {
  returnFromService: vi.fn(),
  autoCompleteOnWorksheetDone: vi.fn(),
};

// ============================================
// Test Data
// ============================================

const testTenantId = 'tenant-001';
const testUserId = 'user-001';
const testEquipmentId = '00000000-0000-0000-0000-000000000001';
const testWorksheetId = '00000000-0000-0000-0000-000000000002';
const testDispatchId = '00000000-0000-0000-0000-000000000003';

const mockWorksheet: IWorksheet = {
  id: testWorksheetId,
  tenantId: testTenantId,
  worksheetNumber: 'ML-2026-0001',
  equipmentId: testEquipmentId,
  status: WorksheetStatus.WAITING,
  isWarranty: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDispatch: IServiceDispatch = {
  id: testDispatchId,
  tenantId: testTenantId,
  equipmentId: testEquipmentId,
  worksheetId: testWorksheetId,
  reason: ServiceDispatchReason.REPAIR,
  previousStatus: EquipmentStatus.AVAILABLE,
  dispatchedAt: new Date(),
  dispatchedBy: testUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockServiceReturn: IServiceReturn = {
  dispatchId: testDispatchId,
  worksheetId: testWorksheetId,
  equipmentId: testEquipmentId,
  newStatus: EquipmentStatus.AVAILABLE,
  returnedAt: new Date(),
  returnedBy: testUserId,
};

// ============================================
// Test Suite
// ============================================

describe('BergepSzervizController', () => {
  let controller: BergepSzervizController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new BergepSzervizController(mockDispatchService as any, mockReturnService as any);
  });

  // ============================================
  // POST /equipment-service/dispatch
  // ============================================

  describe('POST /equipment-service/dispatch', () => {
    const dispatchInput = {
      equipmentId: testEquipmentId,
      reason: 'REPAIR' as const,
      notes: 'Motor nem működik',
    };

    it('should dispatch equipment to service', async () => {
      mockDispatchService.dispatchToService.mockResolvedValue({
        dispatch: mockDispatch,
        worksheet: mockWorksheet,
      });

      const result = await controller.dispatchToService(dispatchInput, testTenantId, testUserId);

      expect(mockDispatchService.dispatchToService).toHaveBeenCalledWith(
        dispatchInput,
        testTenantId,
        testUserId
      );
      expect(result.dispatch.id).toBe(testDispatchId);
      expect(result.worksheet.worksheetNumber).toBe('ML-2026-0001');
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.dispatchToService(dispatchInput, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.dispatchToService(dispatchInput, testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockDispatchService.dispatchToService.mockRejectedValue(new Error('Equipment not found'));

      await expect(
        controller.dispatchToService(dispatchInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDispatchService.dispatchToService.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.dispatchToService(dispatchInput, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when equipment cannot be dispatched', async () => {
      mockDispatchService.dispatchToService.mockRejectedValue(
        new Error('Cannot dispatch rented equipment to service')
      );

      await expect(
        controller.dispatchToService(dispatchInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when equipment already in service', async () => {
      mockDispatchService.dispatchToService.mockRejectedValue(
        new Error('Equipment is already in service')
      );

      await expect(
        controller.dispatchToService(dispatchInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when equipment has active dispatch', async () => {
      mockDispatchService.dispatchToService.mockRejectedValue(
        new Error('Equipment has an active service dispatch')
      );

      await expect(
        controller.dispatchToService(dispatchInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // POST /equipment-service/return
  // ============================================

  describe('POST /equipment-service/return', () => {
    const returnInput = {
      dispatchId: testDispatchId,
      restoreToStatus: 'AVAILABLE' as const,
      serviceNotes: 'Javítás elkészült',
    };

    it('should return equipment from service', async () => {
      mockReturnService.returnFromService.mockResolvedValue(mockServiceReturn);

      const result = await controller.returnFromService(returnInput, testTenantId, testUserId);

      expect(mockReturnService.returnFromService).toHaveBeenCalledWith(
        returnInput,
        testTenantId,
        testUserId
      );
      expect(result.newStatus).toBe(EquipmentStatus.AVAILABLE);
      expect(result.equipmentId).toBe(testEquipmentId);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.returnFromService(returnInput, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.returnFromService(returnInput, testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when dispatch not found', async () => {
      mockReturnService.returnFromService.mockRejectedValue(
        new Error('Service dispatch not found')
      );

      await expect(
        controller.returnFromService(returnInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockReturnService.returnFromService.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.returnFromService(returnInput, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when already returned', async () => {
      mockReturnService.returnFromService.mockRejectedValue(
        new Error('Equipment already returned from service')
      );

      await expect(
        controller.returnFromService(returnInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when worksheet not completed', async () => {
      mockReturnService.returnFromService.mockRejectedValue(
        new Error('Worksheet must be completed before returning equipment')
      );

      await expect(
        controller.returnFromService(returnInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when equipment not in service', async () => {
      mockReturnService.returnFromService.mockRejectedValue(
        new Error('Equipment is not in service status')
      );

      await expect(
        controller.returnFromService(returnInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET /equipment-service/dispatch/:equipmentId/active
  // ============================================

  describe('GET /equipment-service/dispatch/:equipmentId/active', () => {
    it('should return active dispatch', async () => {
      mockDispatchService.getActiveDispatch.mockResolvedValue(mockDispatch);

      const result = await controller.getActiveDispatch(testEquipmentId, testTenantId);

      expect(mockDispatchService.getActiveDispatch).toHaveBeenCalledWith(
        testEquipmentId,
        testTenantId
      );
      expect(result).toEqual(mockDispatch);
    });

    it('should return null when no active dispatch', async () => {
      mockDispatchService.getActiveDispatch.mockResolvedValue(null);

      const result = await controller.getActiveDispatch(testEquipmentId, testTenantId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getActiveDispatch(testEquipmentId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockDispatchService.getActiveDispatch.mockRejectedValue(new Error('Equipment not found'));

      await expect(controller.getActiveDispatch('invalid-id', testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDispatchService.getActiveDispatch.mockRejectedValue(new Error('Access denied'));

      await expect(controller.getActiveDispatch(testEquipmentId, testTenantId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ============================================
  // GET /equipment-service/dispatch/:equipmentId/history
  // ============================================

  describe('GET /equipment-service/dispatch/:equipmentId/history', () => {
    it('should return dispatch history', async () => {
      mockDispatchService.getDispatchHistory.mockResolvedValue([mockDispatch]);

      const result = await controller.getDispatchHistory(testEquipmentId, testTenantId);

      expect(mockDispatchService.getDispatchHistory).toHaveBeenCalledWith(
        testEquipmentId,
        testTenantId
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.reason).toBe(ServiceDispatchReason.REPAIR);
    });

    it('should return empty array for no history', async () => {
      mockDispatchService.getDispatchHistory.mockResolvedValue([]);

      const result = await controller.getDispatchHistory(testEquipmentId, testTenantId);

      expect(result).toEqual([]);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getDispatchHistory(testEquipmentId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockDispatchService.getDispatchHistory.mockRejectedValue(new Error('Equipment not found'));

      await expect(controller.getDispatchHistory('invalid-id', testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDispatchService.getDispatchHistory.mockRejectedValue(new Error('Access denied'));

      await expect(controller.getDispatchHistory(testEquipmentId, testTenantId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ============================================
  // POST /equipment-service/auto-complete/:worksheetId
  // ============================================

  describe('POST /equipment-service/auto-complete/:worksheetId', () => {
    it('should auto-complete equipment return', async () => {
      mockReturnService.autoCompleteOnWorksheetDone.mockResolvedValue(mockServiceReturn);

      const result = await controller.autoComplete(testWorksheetId, testTenantId, testUserId);

      expect(mockReturnService.autoCompleteOnWorksheetDone).toHaveBeenCalledWith(
        testWorksheetId,
        testTenantId,
        testUserId
      );
      expect(result?.newStatus).toBe(EquipmentStatus.AVAILABLE);
    });

    it('should return null when no equipment linked', async () => {
      mockReturnService.autoCompleteOnWorksheetDone.mockResolvedValue(null);

      const result = await controller.autoComplete(testWorksheetId, testTenantId, testUserId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.autoComplete(testWorksheetId, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.autoComplete(testWorksheetId, testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
