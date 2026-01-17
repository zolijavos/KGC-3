/**
 * @kgc/service-worksheet - WorksheetStateService Unit Tests
 * Story 17-2: Munkalap statusz workflow
 *
 * TDD RED PHASE - State machine tesztek
 *
 * Atmenetek:
 * FELVEVE -> FOLYAMATBAN -> KESZ -> SZAMLAZANDO -> LEZART
 *         -> VARHATO -> FOLYAMATBAN (ciklus)
 *         -> TOROLVE (csak FELVEVE-bol)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorksheetStateService } from './worksheet-state.service';
import {
  WorksheetStatus,
  WorksheetType,
  WorksheetPriority,
  IWorksheet,
} from '../interfaces/worksheet.interface';

// Mock repository
const mockWorksheetRepository = {
  findById: vi.fn(),
  update: vi.fn(),
};

// Mock audit service
const mockAuditService = {
  log: vi.fn(),
};

describe('WorksheetStateService', () => {
  let service: WorksheetStateService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  const createMockWorksheet = (status: WorksheetStatus): IWorksheet => ({
    id: '880e8400-e29b-41d4-a716-446655440003',
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    type: WorksheetType.FIZETOS,
    status,
    priority: WorksheetPriority.NORMAL,
    partnerId: 'partner-1',
    deviceName: 'Makita HR2470',
    faultDescription: 'Motor nem indul',
    receivedAt: new Date(),
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorksheetStateService(mockWorksheetRepository as any, mockAuditService as any);
  });

  describe('Valid Transitions', () => {
    const validTransitions: [WorksheetStatus, WorksheetStatus][] = [
      [WorksheetStatus.FELVEVE, WorksheetStatus.FOLYAMATBAN],
      [WorksheetStatus.FELVEVE, WorksheetStatus.VARHATO],
      [WorksheetStatus.FELVEVE, WorksheetStatus.TOROLVE],
      [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.KESZ],
      [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.VARHATO],
      [WorksheetStatus.VARHATO, WorksheetStatus.FOLYAMATBAN],
      [WorksheetStatus.KESZ, WorksheetStatus.SZAMLAZANDO],
      [WorksheetStatus.SZAMLAZANDO, WorksheetStatus.LEZART],
    ];

    it.each(validTransitions)(
      'should allow transition from %s to %s',
      async (fromStatus, toStatus) => {
        // Arrange
        const worksheet = createMockWorksheet(fromStatus);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: toStatus,
        });

        // Act
        const result = await service.transition(worksheet.id, toStatus, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(toStatus);
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'worksheet_status_changed',
            metadata: expect.objectContaining({
              fromStatus,
              toStatus,
            }),
          }),
        );
      },
    );
  });

  describe('Invalid Transitions', () => {
    const invalidTransitions: [WorksheetStatus, WorksheetStatus][] = [
      [WorksheetStatus.FELVEVE, WorksheetStatus.KESZ],
      [WorksheetStatus.FELVEVE, WorksheetStatus.SZAMLAZANDO],
      [WorksheetStatus.FELVEVE, WorksheetStatus.LEZART],
      [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.FELVEVE],
      [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.SZAMLAZANDO],
      [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.LEZART],
      [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.TOROLVE],
      [WorksheetStatus.VARHATO, WorksheetStatus.KESZ],
      [WorksheetStatus.VARHATO, WorksheetStatus.FELVEVE],
      [WorksheetStatus.VARHATO, WorksheetStatus.TOROLVE],
      [WorksheetStatus.KESZ, WorksheetStatus.FOLYAMATBAN],
      [WorksheetStatus.KESZ, WorksheetStatus.FELVEVE],
      [WorksheetStatus.KESZ, WorksheetStatus.TOROLVE],
      [WorksheetStatus.SZAMLAZANDO, WorksheetStatus.KESZ],
      [WorksheetStatus.SZAMLAZANDO, WorksheetStatus.FELVEVE],
      [WorksheetStatus.SZAMLAZANDO, WorksheetStatus.TOROLVE],
      [WorksheetStatus.LEZART, WorksheetStatus.SZAMLAZANDO],
      [WorksheetStatus.LEZART, WorksheetStatus.FELVEVE],
      [WorksheetStatus.TOROLVE, WorksheetStatus.FELVEVE],
    ];

    it.each(invalidTransitions)(
      'should reject transition from %s to %s',
      async (fromStatus, toStatus) => {
        // Arrange
        const worksheet = createMockWorksheet(fromStatus);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);

        // Act & Assert
        await expect(
          service.transition(worksheet.id, toStatus, mockTenantId, mockUserId),
        ).rejects.toThrow('Ervenytelen statuszatmenet');
      },
    );
  });

  describe('isValidTransition()', () => {
    it('should return true for valid transitions', () => {
      expect(
        service.isValidTransition(WorksheetStatus.FELVEVE, WorksheetStatus.FOLYAMATBAN),
      ).toBe(true);
      expect(
        service.isValidTransition(WorksheetStatus.FOLYAMATBAN, WorksheetStatus.KESZ),
      ).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(
        service.isValidTransition(WorksheetStatus.FELVEVE, WorksheetStatus.LEZART),
      ).toBe(false);
      expect(
        service.isValidTransition(WorksheetStatus.LEZART, WorksheetStatus.FELVEVE),
      ).toBe(false);
    });
  });

  describe('getNextStatuses()', () => {
    it('should return valid next statuses for FELVEVE', () => {
      const nextStatuses = service.getNextStatuses(WorksheetStatus.FELVEVE);
      expect(nextStatuses).toContain(WorksheetStatus.FOLYAMATBAN);
      expect(nextStatuses).toContain(WorksheetStatus.VARHATO);
      expect(nextStatuses).toContain(WorksheetStatus.TOROLVE);
      expect(nextStatuses).not.toContain(WorksheetStatus.KESZ);
    });

    it('should return valid next statuses for FOLYAMATBAN', () => {
      const nextStatuses = service.getNextStatuses(WorksheetStatus.FOLYAMATBAN);
      expect(nextStatuses).toContain(WorksheetStatus.KESZ);
      expect(nextStatuses).toContain(WorksheetStatus.VARHATO);
      expect(nextStatuses).not.toContain(WorksheetStatus.FELVEVE);
    });

    it('should return valid next statuses for VARHATO', () => {
      const nextStatuses = service.getNextStatuses(WorksheetStatus.VARHATO);
      expect(nextStatuses).toContain(WorksheetStatus.FOLYAMATBAN);
      expect(nextStatuses).not.toContain(WorksheetStatus.KESZ);
    });

    it('should return empty array for LEZART (terminal state)', () => {
      const nextStatuses = service.getNextStatuses(WorksheetStatus.LEZART);
      expect(nextStatuses).toHaveLength(0);
    });

    it('should return empty array for TOROLVE (terminal state)', () => {
      const nextStatuses = service.getNextStatuses(WorksheetStatus.TOROLVE);
      expect(nextStatuses).toHaveLength(0);
    });
  });

  describe('Convenience methods', () => {
    describe('startWork()', () => {
      it('should transition from FELVEVE to FOLYAMATBAN', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.FELVEVE);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: WorksheetStatus.FOLYAMATBAN,
        });

        // Act
        const result = await service.startWork(worksheet.id, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(WorksheetStatus.FOLYAMATBAN);
      });

      it('should transition from VARHATO to FOLYAMATBAN', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.VARHATO);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: WorksheetStatus.FOLYAMATBAN,
        });

        // Act
        const result = await service.startWork(worksheet.id, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(WorksheetStatus.FOLYAMATBAN);
      });
    });

    describe('markWaiting()', () => {
      it('should transition to VARHATO with reason', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.FOLYAMATBAN);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: WorksheetStatus.VARHATO,
        });

        // Act
        const result = await service.markWaiting(
          worksheet.id,
          'Alkatreszre var',
          mockTenantId,
          mockUserId,
        );

        // Assert
        expect(result.status).toBe(WorksheetStatus.VARHATO);
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              waitingReason: 'Alkatreszre var',
            }),
          }),
        );
      });
    });

    describe('completeWork()', () => {
      it('should transition from FOLYAMATBAN to KESZ', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.FOLYAMATBAN);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: WorksheetStatus.KESZ,
          completedAt: expect.any(Date),
        });

        // Act
        const result = await service.completeWork(worksheet.id, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(WorksheetStatus.KESZ);
      });

      it('should set completedAt timestamp', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.FOLYAMATBAN);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockImplementation(async (id, data) => ({
          ...worksheet,
          ...data,
        }));

        // Act
        await service.completeWork(worksheet.id, mockTenantId, mockUserId);

        // Assert
        expect(mockWorksheetRepository.update).toHaveBeenCalledWith(
          worksheet.id,
          expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        );
      });
    });

    describe('markForInvoicing()', () => {
      it('should transition from KESZ to SZAMLAZANDO', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.KESZ);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: WorksheetStatus.SZAMLAZANDO,
        });

        // Act
        const result = await service.markForInvoicing(worksheet.id, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(WorksheetStatus.SZAMLAZANDO);
      });
    });

    describe('close()', () => {
      it('should transition from SZAMLAZANDO to LEZART', async () => {
        // Arrange
        const worksheet = createMockWorksheet(WorksheetStatus.SZAMLAZANDO);
        mockWorksheetRepository.findById.mockResolvedValue(worksheet);
        mockWorksheetRepository.update.mockResolvedValue({
          ...worksheet,
          status: WorksheetStatus.LEZART,
        });

        // Act
        const result = await service.close(worksheet.id, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(WorksheetStatus.LEZART);
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should throw error if worksheet belongs to different tenant', async () => {
      // Arrange
      const worksheet = createMockWorksheet(WorksheetStatus.FELVEVE);
      worksheet.tenantId = 'different-tenant';
      mockWorksheetRepository.findById.mockResolvedValue(worksheet);

      // Act & Assert
      await expect(
        service.transition(worksheet.id, WorksheetStatus.FOLYAMATBAN, mockTenantId, mockUserId),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });
  });

  describe('Worksheet Not Found', () => {
    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.transition('non-existent', WorksheetStatus.FOLYAMATBAN, mockTenantId, mockUserId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });
  });
});
