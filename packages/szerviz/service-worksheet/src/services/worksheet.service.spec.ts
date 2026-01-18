/**
 * @kgc/service-worksheet - WorksheetService Unit Tests
 * Story 17-1: Munkalap CRUD
 *
 * TDD RED PHASE - Tesztek implementáció előtt
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateWorksheetDto } from '../dto/worksheet.dto';
import {
  IWorksheet,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
} from '../interfaces/worksheet.interface';
import { WorksheetService } from './worksheet.service';

// Mock repository
const mockWorksheetRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
  countByTenant: vi.fn(),
};

// Mock partner service
const mockPartnerService = {
  findById: vi.fn(),
  isContractedPartner: vi.fn(),
};

// Mock audit service
const mockAuditService = {
  log: vi.fn(),
};

describe('WorksheetService', () => {
  let service: WorksheetService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockPartnerId = '770e8400-e29b-41d4-a716-446655440002';

  const validCreateDto: CreateWorksheetDto = {
    partnerId: mockPartnerId,
    type: WorksheetType.FIZETOS,
    priority: WorksheetPriority.NORMAL,
    deviceName: 'Makita HR2470',
    deviceSerialNumber: 'SN123456',
    faultDescription: 'Motor nem indul, szikrázik',
  };

  const mockWorksheet: IWorksheet = {
    id: '880e8400-e29b-41d4-a716-446655440003',
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    type: WorksheetType.FIZETOS,
    status: WorksheetStatus.FELVEVE,
    priority: WorksheetPriority.NORMAL,
    partnerId: mockPartnerId,
    deviceName: 'Makita HR2470',
    deviceSerialNumber: 'SN123456',
    faultDescription: 'Motor nem indul, szikrázik',
    receivedAt: new Date(),
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorksheetService(
      mockWorksheetRepository as any,
      mockPartnerService as any,
      mockAuditService as any
    );
  });

  describe('create()', () => {
    it('should create a worksheet with FELVEVE status', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue({
        id: mockPartnerId,
        tenantId: mockTenantId,
        name: 'Teszt Partner',
      });
      mockWorksheetRepository.getNextSequence.mockResolvedValue(1);
      mockWorksheetRepository.create.mockResolvedValue(mockWorksheet);

      // Act
      const result = await service.create(validCreateDto, mockTenantId, mockUserId);

      // Assert
      expect(result.status).toBe(WorksheetStatus.FELVEVE);
      expect(result.worksheetNumber).toMatch(/^ML-\d{4}-\d{4}$/);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'worksheet_created',
          entityType: 'worksheet',
        })
      );
    });

    it('should generate worksheet number in ML-YYYY-NNNN format', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue({
        id: mockPartnerId,
        tenantId: mockTenantId,
      });
      mockWorksheetRepository.getNextSequence.mockResolvedValue(42);
      mockWorksheetRepository.create.mockResolvedValue({
        ...mockWorksheet,
        worksheetNumber: 'ML-2026-0042',
      });

      // Act
      const result = await service.create(validCreateDto, mockTenantId, mockUserId);

      // Assert
      expect(result.worksheetNumber).toBe('ML-2026-0042');
    });

    it('should throw error if partner not found', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(validCreateDto, mockTenantId, mockUserId)).rejects.toThrow(
        'Partner nem található'
      );
    });

    it('should throw error if partner belongs to different tenant', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue({
        id: mockPartnerId,
        tenantId: 'different-tenant-id',
      });

      // Act & Assert
      await expect(service.create(validCreateDto, mockTenantId, mockUserId)).rejects.toThrow(
        'Hozzáférés megtagadva'
      );
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidDto = {
        partnerId: mockPartnerId,
        type: WorksheetType.FIZETOS,
        deviceName: 'A', // too short
        faultDescription: 'Hiba',
      };

      // Act & Assert
      await expect(
        service.create(invalidDto as CreateWorksheetDto, mockTenantId, mockUserId)
      ).rejects.toThrow('Gép megnevezés minimum 2 karakter');
    });

    it('should auto-set priority to GARANCIALIS for contracted partners (FR93)', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue({
        id: mockPartnerId,
        tenantId: mockTenantId,
      });
      mockPartnerService.isContractedPartner.mockResolvedValue(true);
      mockWorksheetRepository.getNextSequence.mockResolvedValue(1);
      mockWorksheetRepository.create.mockImplementation(data => ({
        ...mockWorksheet,
        ...data,
      }));

      const dtoWithNormalPriority = {
        ...validCreateDto,
        priority: WorksheetPriority.NORMAL,
      };

      // Act
      const result = await service.create(dtoWithNormalPriority, mockTenantId, mockUserId);

      // Assert
      expect(result.priority).toBe(WorksheetPriority.FRANCHISE);
    });

    it('should preserve user-specified priority if higher than auto', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue({
        id: mockPartnerId,
        tenantId: mockTenantId,
      });
      mockPartnerService.isContractedPartner.mockResolvedValue(true);
      mockWorksheetRepository.getNextSequence.mockResolvedValue(1);
      mockWorksheetRepository.create.mockImplementation(data => ({
        ...mockWorksheet,
        ...data,
      }));

      const dtoWithSurgosPriority = {
        ...validCreateDto,
        priority: WorksheetPriority.SURGOS,
      };

      // Act
      const result = await service.create(dtoWithSurgosPriority, mockTenantId, mockUserId);

      // Assert
      expect(result.priority).toBe(WorksheetPriority.SURGOS);
    });
  });

  describe('findById()', () => {
    it('should return worksheet by id with tenant isolation', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);

      // Act
      const result = await service.findById(mockWorksheet.id, mockTenantId);

      // Assert
      expect(result).toEqual(mockWorksheet);
      expect(mockWorksheetRepository.findById).toHaveBeenCalledWith(mockWorksheet.id);
    });

    it('should return null if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.findById('non-existent-id', mockTenantId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if worksheet belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        tenantId: 'different-tenant-id',
      });

      // Act
      const result = await service.findById(mockWorksheet.id, mockTenantId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('should return paginated list with filters', async () => {
      // Arrange
      const mockList = [mockWorksheet];
      mockWorksheetRepository.findAll.mockResolvedValue(mockList);
      mockWorksheetRepository.countByTenant.mockResolvedValue(1);

      // Act
      const result = await service.findAll(mockTenantId, {
        status: WorksheetStatus.FELVEVE,
        limit: 20,
        offset: 0,
      });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockWorksheetRepository.findAll).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({ status: WorksheetStatus.FELVEVE })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockWorksheetRepository.findAll.mockResolvedValue([]);
      mockWorksheetRepository.countByTenant.mockResolvedValue(0);

      // Act
      await service.findAll(mockTenantId, { status: WorksheetStatus.FOLYAMATBAN });

      // Assert
      expect(mockWorksheetRepository.findAll).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({ status: WorksheetStatus.FOLYAMATBAN })
      );
    });

    it('should filter by type', async () => {
      // Arrange
      mockWorksheetRepository.findAll.mockResolvedValue([]);
      mockWorksheetRepository.countByTenant.mockResolvedValue(0);

      // Act
      await service.findAll(mockTenantId, { type: WorksheetType.GARANCIALIS });

      // Assert
      expect(mockWorksheetRepository.findAll).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({ type: WorksheetType.GARANCIALIS })
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-01-31');
      mockWorksheetRepository.findAll.mockResolvedValue([]);
      mockWorksheetRepository.countByTenant.mockResolvedValue(0);

      // Act
      await service.findAll(mockTenantId, { dateFrom, dateTo });

      // Assert
      expect(mockWorksheetRepository.findAll).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({ dateFrom, dateTo })
      );
    });

    it('should search by worksheet number', async () => {
      // Arrange
      mockWorksheetRepository.findAll.mockResolvedValue([mockWorksheet]);
      mockWorksheetRepository.countByTenant.mockResolvedValue(1);

      // Act
      await service.findAll(mockTenantId, { search: 'ML-2026-0001' });

      // Assert
      expect(mockWorksheetRepository.findAll).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({ search: 'ML-2026-0001' })
      );
    });
  });

  describe('update()', () => {
    it('should update worksheet fields', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockWorksheetRepository.update.mockResolvedValue({
        ...mockWorksheet,
        diagnosis: 'Szénkefe elhasználódott',
      });

      // Act
      const result = await service.update(
        mockWorksheet.id,
        { diagnosis: 'Szénkefe elhasználódott' },
        mockTenantId,
        mockUserId
      );

      // Assert
      expect(result.diagnosis).toBe('Szénkefe elhasználódott');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'worksheet_updated',
        })
      );
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', { diagnosis: 'test' }, mockTenantId, mockUserId)
      ).rejects.toThrow('Munkalap nem található');
    });

    it('should throw error if worksheet belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        tenantId: 'different-tenant-id',
      });

      // Act & Assert
      await expect(
        service.update(mockWorksheet.id, { diagnosis: 'test' }, mockTenantId, mockUserId)
      ).rejects.toThrow('Hozzáférés megtagadva');
    });

    it('should not allow update of closed worksheet', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        status: WorksheetStatus.LEZART,
      });

      // Act & Assert
      await expect(
        service.update(mockWorksheet.id, { diagnosis: 'test' }, mockTenantId, mockUserId)
      ).rejects.toThrow('Lezárt munkalap nem módosítható');
    });
  });

  describe('delete() / cancel()', () => {
    it('should soft delete by setting status to TOROLVE', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockWorksheetRepository.update.mockResolvedValue({
        ...mockWorksheet,
        status: WorksheetStatus.TOROLVE,
      });

      // Act
      const result = await service.delete(mockWorksheet.id, mockTenantId, mockUserId);

      // Assert
      expect(result.status).toBe(WorksheetStatus.TOROLVE);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'worksheet_deleted',
        })
      );
    });

    it('should only allow delete from FELVEVE status', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        status: WorksheetStatus.FOLYAMATBAN,
      });

      // Act & Assert
      await expect(service.delete(mockWorksheet.id, mockTenantId, mockUserId)).rejects.toThrow(
        'Csak felvett munkalap törölhető'
      );
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete('non-existent', mockTenantId, mockUserId)).rejects.toThrow(
        'Munkalap nem található'
      );
    });
  });

  describe('generateWorksheetNumber()', () => {
    it('should generate number in ML-YYYY-NNNN format', async () => {
      // Arrange
      mockWorksheetRepository.getNextSequence.mockResolvedValue(1);

      // Act
      const result = await service.generateWorksheetNumber(mockTenantId);

      // Assert
      const currentYear = new Date().getFullYear();
      expect(result.worksheetNumber).toBe(`ML-${currentYear}-0001`);
      expect(result.year).toBe(currentYear);
      expect(result.sequence).toBe(1);
    });

    it('should pad sequence number to 4 digits', async () => {
      // Arrange
      mockWorksheetRepository.getNextSequence.mockResolvedValue(42);

      // Act
      const result = await service.generateWorksheetNumber(mockTenantId);

      // Assert
      expect(result.worksheetNumber).toMatch(/-0042$/);
    });

    it('should handle sequence > 9999', async () => {
      // Arrange
      mockWorksheetRepository.getNextSequence.mockResolvedValue(12345);

      // Act
      const result = await service.generateWorksheetNumber(mockTenantId);

      // Assert
      expect(result.worksheetNumber).toMatch(/-12345$/);
    });
  });
});
