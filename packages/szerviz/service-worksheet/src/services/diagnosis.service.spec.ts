/**
 * @kgc/service-worksheet - DiagnosisService Unit Tests
 * Story 17-3: Diagnosztika es hibaok
 *
 * Traditional testing - Tests after implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiagnosisService } from './diagnosis.service';
import { FaultCategory, IDiagnosis } from '../interfaces/diagnosis.interface';
import { WorksheetStatus, WorksheetType, WorksheetPriority } from '../interfaces/worksheet.interface';
import { CreateDiagnosisDto } from '../dto/diagnosis.dto';

// Mock repositories
const mockDiagnosisRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByWorksheetId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockWorksheetRepository = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('DiagnosisService', () => {
  let service: DiagnosisService;

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
    diagnosis: null,
    receivedAt: new Date(),
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validCreateDto: CreateDiagnosisDto = {
    faultCategory: FaultCategory.MOTOR,
    faultCode: 'MOT-001',
    description: 'Szenkefe elhasznalodott, csere szukseges',
    customerMessage: 'Szenkefe csere',
    estimatedRepairTime: 30,
  };

  const mockDiagnosis: IDiagnosis = {
    id: '880e8400-e29b-41d4-a716-446655440003',
    worksheetId: mockWorksheetId,
    tenantId: mockTenantId,
    faultCategory: FaultCategory.MOTOR,
    faultCode: 'MOT-001',
    description: 'Szenkefe elhasznalodott, csere szukseges',
    customerMessage: 'Szenkefe csere',
    estimatedRepairTime: 30,
    createdBy: mockUserId,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiagnosisService(
      mockDiagnosisRepository as any,
      mockWorksheetRepository as any,
      mockAuditService as any,
    );
  });

  describe('addDiagnosis()', () => {
    it('should create diagnosis for worksheet', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockDiagnosisRepository.create.mockResolvedValue(mockDiagnosis);

      // Act
      const result = await service.addDiagnosis(
        mockWorksheetId,
        validCreateDto,
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.diagnosis).toEqual(mockDiagnosis);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'diagnosis_added',
        }),
      );
    });

    it('should update worksheet diagnosis if empty', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({ ...mockWorksheet, diagnosis: null });
      mockDiagnosisRepository.create.mockResolvedValue(mockDiagnosis);

      // Act
      const result = await service.addDiagnosis(
        mockWorksheetId,
        validCreateDto,
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.worksheetUpdated).toBe(true);
      expect(mockWorksheetRepository.update).toHaveBeenCalled();
    });

    it('should not update worksheet if diagnosis already exists', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        diagnosis: 'Existing diagnosis',
      });
      mockDiagnosisRepository.create.mockResolvedValue(mockDiagnosis);

      // Act
      const result = await service.addDiagnosis(
        mockWorksheetId,
        validCreateDto,
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.worksheetUpdated).toBe(false);
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addDiagnosis(mockWorksheetId, validCreateDto, mockTenantId, mockUserId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });

    it('should throw error if worksheet belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        tenantId: 'different-tenant',
      });

      // Act & Assert
      await expect(
        service.addDiagnosis(mockWorksheetId, validCreateDto, mockTenantId, mockUserId),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });

    it('should validate description length', async () => {
      // Arrange
      const invalidDto = { ...validCreateDto, description: 'abc' };

      // Act & Assert
      await expect(
        service.addDiagnosis(mockWorksheetId, invalidDto, mockTenantId, mockUserId),
      ).rejects.toThrow('Leiras minimum 5 karakter');
    });
  });

  describe('getDiagnosesByWorksheet()', () => {
    it('should return diagnoses for worksheet', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockDiagnosisRepository.findByWorksheetId.mockResolvedValue([mockDiagnosis]);

      // Act
      const result = await service.getDiagnosesByWorksheet(mockWorksheetId, mockTenantId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockDiagnosis);
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getDiagnosesByWorksheet(mockWorksheetId, mockTenantId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });
  });

  describe('updateDiagnosis()', () => {
    it('should update diagnosis', async () => {
      // Arrange
      mockDiagnosisRepository.findById.mockResolvedValue(mockDiagnosis);
      mockDiagnosisRepository.update.mockResolvedValue({
        ...mockDiagnosis,
        description: 'Updated description',
      });

      // Act
      const result = await service.updateDiagnosis(
        mockDiagnosis.id,
        { description: 'Updated description' },
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.description).toBe('Updated description');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'diagnosis_updated',
        }),
      );
    });

    it('should throw error if diagnosis not found', async () => {
      // Arrange
      mockDiagnosisRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateDiagnosis('non-existent', {}, mockTenantId, mockUserId),
      ).rejects.toThrow('Diagnosztika nem talalhato');
    });
  });

  describe('deleteDiagnosis()', () => {
    it('should delete diagnosis', async () => {
      // Arrange
      mockDiagnosisRepository.findById.mockResolvedValue(mockDiagnosis);
      mockDiagnosisRepository.delete.mockResolvedValue(undefined);

      // Act
      await service.deleteDiagnosis(mockDiagnosis.id, mockTenantId, mockUserId);

      // Assert
      expect(mockDiagnosisRepository.delete).toHaveBeenCalledWith(mockDiagnosis.id);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'diagnosis_deleted',
        }),
      );
    });

    it('should throw error if diagnosis belongs to different tenant', async () => {
      // Arrange
      mockDiagnosisRepository.findById.mockResolvedValue({
        ...mockDiagnosis,
        tenantId: 'different-tenant',
      });

      // Act & Assert
      await expect(
        service.deleteDiagnosis(mockDiagnosis.id, mockTenantId, mockUserId),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });
  });
});
