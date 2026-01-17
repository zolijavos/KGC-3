/**
 * @kgc/service-worksheet - WorksheetQueueService Unit Tests
 * Story 17-7: Prioritás és várakozási lista
 *
 * TDD approach - RED PHASE: Tests first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorksheetQueueService, IQueuedWorksheet } from './worksheet-queue.service';
import { WorksheetStatus, WorksheetType, WorksheetPriority } from '../interfaces/worksheet.interface';

// Mocks
const mockWorksheetRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  findByRentalId: vi.fn(),
  findByStatus: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
  countByTenant: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('WorksheetQueueService', () => {
  let service: WorksheetQueueService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  const createMockWorksheet = (overrides = {}) => ({
    id: `ws-${Math.random().toString(36).slice(2)}`,
    tenantId: mockTenantId,
    worksheetNumber: `ML-2026-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
    type: WorksheetType.FIZETOS,
    status: WorksheetStatus.FELVEVE,
    priority: WorksheetPriority.NORMAL,
    partnerId: 'partner-1',
    deviceName: 'Makita HR2470',
    faultDescription: 'Motor nem indul',
    receivedAt: new Date(),
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorksheetQueueService(
      mockWorksheetRepository as any,
      mockAuditService as any,
    );
  });

  describe('Priority ranking', () => {
    it('should rank SURGOS highest (1)', () => {
      expect(service.getPriorityRank(WorksheetPriority.SURGOS)).toBe(1);
    });

    it('should rank FELARAS second (2)', () => {
      expect(service.getPriorityRank(WorksheetPriority.FELARAS)).toBe(2);
    });

    it('should rank GARANCIALIS third (3)', () => {
      expect(service.getPriorityRank(WorksheetPriority.GARANCIALIS)).toBe(3);
    });

    it('should rank FRANCHISE fourth (4)', () => {
      expect(service.getPriorityRank(WorksheetPriority.FRANCHISE)).toBe(4);
    });

    it('should rank NORMAL lowest (5)', () => {
      expect(service.getPriorityRank(WorksheetPriority.NORMAL)).toBe(5);
    });
  });

  describe('getQueuePosition()', () => {
    it('should calculate queue position based on priority and time', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.NORMAL, receivedAt: new Date('2026-01-15') }),
        createMockWorksheet({ id: 'ws-2', priority: WorksheetPriority.SURGOS, receivedAt: new Date('2026-01-16') }),
        createMockWorksheet({ id: 'ws-3', priority: WorksheetPriority.NORMAL, receivedAt: new Date('2026-01-14') }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);
      mockWorksheetRepository.findById.mockResolvedValue(worksheets[0]);

      // Act
      const position = await service.getQueuePosition('ws-1', mockTenantId);

      // Assert - ws-2 (SURGOS) first, then ws-3 (older NORMAL), then ws-1 (newer NORMAL)
      expect(position).toBe(3);
    });

    it('should return 1 for highest priority earliest worksheet', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.SURGOS, receivedAt: new Date('2026-01-14') }),
        createMockWorksheet({ id: 'ws-2', priority: WorksheetPriority.NORMAL, receivedAt: new Date('2026-01-15') }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);
      mockWorksheetRepository.findById.mockResolvedValue(worksheets[0]);

      // Act
      const position = await service.getQueuePosition('ws-1', mockTenantId);

      // Assert
      expect(position).toBe(1);
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getQueuePosition('non-existent', mockTenantId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });
  });

  describe('getQueue()', () => {
    it('should return worksheets sorted by priority then receivedAt', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.NORMAL, receivedAt: new Date('2026-01-15') }),
        createMockWorksheet({ id: 'ws-2', priority: WorksheetPriority.SURGOS, receivedAt: new Date('2026-01-16') }),
        createMockWorksheet({ id: 'ws-3', priority: WorksheetPriority.NORMAL, receivedAt: new Date('2026-01-14') }),
        createMockWorksheet({ id: 'ws-4', priority: WorksheetPriority.FRANCHISE, receivedAt: new Date('2026-01-13') }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const queue = await service.getQueue(mockTenantId);

      // Assert - Order: SURGOS, FRANCHISE, NORMAL (older), NORMAL (newer)
      expect(queue).toHaveLength(4);
      expect(queue[0]?.id).toBe('ws-2'); // SURGOS
      expect(queue[1]?.id).toBe('ws-4'); // FRANCHISE
      expect(queue[2]?.id).toBe('ws-3'); // NORMAL, older
      expect(queue[3]?.id).toBe('ws-1'); // NORMAL, newer
    });

    it('should include position in queue result', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.SURGOS }),
        createMockWorksheet({ id: 'ws-2', priority: WorksheetPriority.NORMAL }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const queue = await service.getQueue(mockTenantId);

      // Assert
      expect(queue[0]?.position).toBe(1);
      expect(queue[1]?.position).toBe(2);
    });

    it('should filter by status (default FELVEVE + VARHATO)', async () => {
      // Arrange
      mockWorksheetRepository.findByStatus.mockResolvedValue([]);

      // Act
      await service.getQueue(mockTenantId);

      // Assert
      expect(mockWorksheetRepository.findByStatus).toHaveBeenCalledWith(
        [WorksheetStatus.FELVEVE, WorksheetStatus.VARHATO],
        mockTenantId,
      );
    });

    it('should allow custom status filter', async () => {
      // Arrange
      mockWorksheetRepository.findByStatus.mockResolvedValue([]);

      // Act
      await service.getQueue(mockTenantId, { statuses: [WorksheetStatus.FOLYAMATBAN] });

      // Assert
      expect(mockWorksheetRepository.findByStatus).toHaveBeenCalledWith(
        [WorksheetStatus.FOLYAMATBAN],
        mockTenantId,
      );
    });
  });

  describe('getNextWorksheet()', () => {
    it('should return first worksheet in queue', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.SURGOS }),
        createMockWorksheet({ id: 'ws-2', priority: WorksheetPriority.NORMAL }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const next = await service.getNextWorksheet(mockTenantId);

      // Assert
      expect(next?.id).toBe('ws-1');
    });

    it('should return null if queue is empty', async () => {
      // Arrange
      mockWorksheetRepository.findByStatus.mockResolvedValue([]);

      // Act
      const next = await service.getNextWorksheet(mockTenantId);

      // Assert
      expect(next).toBeNull();
    });

    it('should filter by assignee if provided', async () => {
      // Arrange
      const assigneeId = 'mechanic-1';
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.SURGOS, assignedToId: assigneeId }),
        createMockWorksheet({ id: 'ws-2', priority: WorksheetPriority.SURGOS, assignedToId: 'other' }),
        createMockWorksheet({ id: 'ws-3', priority: WorksheetPriority.NORMAL, assignedToId: assigneeId }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const next = await service.getNextWorksheet(mockTenantId, { assignedToId: assigneeId });

      // Assert
      expect(next?.id).toBe('ws-1');
    });
  });

  describe('getWorksheetsByPriority()', () => {
    it('should return worksheets filtered by priority', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.SURGOS }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const result = await service.getWorksheetsByPriority(WorksheetPriority.SURGOS, mockTenantId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.priority).toBe(WorksheetPriority.SURGOS);
    });

    it('should return empty array if no worksheets match', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ id: 'ws-1', priority: WorksheetPriority.NORMAL }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const result = await service.getWorksheetsByPriority(WorksheetPriority.SURGOS, mockTenantId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getQueueStats()', () => {
    it('should return queue statistics', async () => {
      // Arrange
      const worksheets = [
        createMockWorksheet({ priority: WorksheetPriority.SURGOS }),
        createMockWorksheet({ priority: WorksheetPriority.SURGOS }),
        createMockWorksheet({ priority: WorksheetPriority.FRANCHISE }),
        createMockWorksheet({ priority: WorksheetPriority.NORMAL }),
        createMockWorksheet({ priority: WorksheetPriority.NORMAL }),
        createMockWorksheet({ priority: WorksheetPriority.NORMAL }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const stats = await service.getQueueStats(mockTenantId);

      // Assert
      expect(stats.total).toBe(6);
      expect(stats.byPriority[WorksheetPriority.SURGOS]).toBe(2);
      expect(stats.byPriority[WorksheetPriority.FRANCHISE]).toBe(1);
      expect(stats.byPriority[WorksheetPriority.NORMAL]).toBe(3);
      expect(stats.byPriority[WorksheetPriority.FELARAS]).toBe(0);
      expect(stats.byPriority[WorksheetPriority.GARANCIALIS]).toBe(0);
    });

    it('should include oldest worksheet date', async () => {
      // Arrange
      const oldestDate = new Date('2026-01-01');
      const worksheets = [
        createMockWorksheet({ receivedAt: new Date('2026-01-15') }),
        createMockWorksheet({ receivedAt: oldestDate }),
        createMockWorksheet({ receivedAt: new Date('2026-01-10') }),
      ];
      mockWorksheetRepository.findByStatus.mockResolvedValue(worksheets);

      // Act
      const stats = await service.getQueueStats(mockTenantId);

      // Assert
      expect(stats.oldestReceivedAt).toEqual(oldestDate);
    });

    it('should handle empty queue', async () => {
      // Arrange
      mockWorksheetRepository.findByStatus.mockResolvedValue([]);

      // Act
      const stats = await service.getQueueStats(mockTenantId);

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.oldestReceivedAt).toBeNull();
    });
  });

  describe('calculateEstimatedWaitTime()', () => {
    it('should estimate wait time based on position and average', () => {
      // Assume average 60 minutes per worksheet
      expect(service.calculateEstimatedWaitTime(1, 60)).toBe(0); // First in queue
      expect(service.calculateEstimatedWaitTime(2, 60)).toBe(60); // 1 ahead
      expect(service.calculateEstimatedWaitTime(5, 60)).toBe(240); // 4 ahead
    });

    it('should throw error for invalid position', () => {
      expect(() => service.calculateEstimatedWaitTime(0, 60)).toThrow('Pozicio pozitiv kell legyen');
      expect(() => service.calculateEstimatedWaitTime(-1, 60)).toThrow('Pozicio pozitiv kell legyen');
    });
  });

  describe('Tenant isolation', () => {
    it('should throw error if worksheet belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(
        createMockWorksheet({ tenantId: 'different-tenant' }),
      );

      // Act & Assert
      await expect(
        service.getQueuePosition('ws-1', mockTenantId),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });
  });
});
