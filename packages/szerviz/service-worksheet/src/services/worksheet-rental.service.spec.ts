/**
 * @kgc/service-worksheet - WorksheetRentalService Unit Tests
 * Story 17-6: Munkalap-bérlés kapcsolat
 *
 * Traditional testing - Tests after implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorksheetRentalService, IRentalInfo } from './worksheet-rental.service';
import { WorksheetStatus, WorksheetType, WorksheetPriority } from '../interfaces/worksheet.interface';

// Mocks
const mockWorksheetRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  findByRentalId: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
  countByTenant: vi.fn(),
};

const mockRentalService = {
  findById: vi.fn(),
  findByWorksheetId: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('WorksheetRentalService', () => {
  let service: WorksheetRentalService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockWorksheetId = '770e8400-e29b-41d4-a716-446655440002';
  const mockRentalId = '880e8400-e29b-41d4-a716-446655440003';

  const mockWorksheet = {
    id: mockWorksheetId,
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
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
  };

  const mockRental: IRentalInfo = {
    id: mockRentalId,
    tenantId: mockTenantId,
    partnerId: 'partner-1',
    rentalNumber: 'BR-2026-0001',
    deviceName: 'Makita HR2470',
    deviceSerialNumber: 'SN123456',
    status: 'ACTIVE',
    startDate: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorksheetRentalService(
      mockWorksheetRepository as any,
      mockRentalService as any,
      mockAuditService as any,
    );
  });

  describe('linkToRental()', () => {
    it('should link worksheet to rental', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockRentalService.findById.mockResolvedValue(mockRental);
      mockWorksheetRepository.update.mockImplementation(async (id, data) => ({
        ...mockWorksheet,
        ...data,
      }));

      // Act
      const result = await service.linkToRental(mockWorksheetId, mockRentalId, mockTenantId, mockUserId);

      // Assert
      expect(result.rentalId).toBe(mockRentalId);
      expect(result.type).toBe(WorksheetType.BERLESI);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'worksheet_linked_to_rental',
        }),
      );
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.linkToRental(mockWorksheetId, mockRentalId, mockTenantId, mockUserId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });

    it('should throw error if rental not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockRentalService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.linkToRental(mockWorksheetId, mockRentalId, mockTenantId, mockUserId),
      ).rejects.toThrow('Berles nem talalhato');
    });

    it('should throw error if worksheet belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue({
        ...mockWorksheet,
        tenantId: 'different-tenant',
      });

      // Act & Assert
      await expect(
        service.linkToRental(mockWorksheetId, mockRentalId, mockTenantId, mockUserId),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });

    it('should throw error if rental belongs to different tenant', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet);
      mockRentalService.findById.mockResolvedValue({
        ...mockRental,
        tenantId: 'different-tenant',
      });

      // Act & Assert
      await expect(
        service.linkToRental(mockWorksheetId, mockRentalId, mockTenantId, mockUserId),
      ).rejects.toThrow('Hozzaferes megtagadva');
    });
  });

  describe('unlinkFromRental()', () => {
    it('should unlink worksheet from rental', async () => {
      // Arrange
      const linkedWorksheet = { ...mockWorksheet, rentalId: mockRentalId, type: WorksheetType.BERLESI };
      mockWorksheetRepository.findById.mockResolvedValue(linkedWorksheet);
      mockWorksheetRepository.update.mockImplementation(async (id, data) => ({
        ...linkedWorksheet,
        ...data,
        rentalId: undefined,
      }));

      // Act
      const result = await service.unlinkFromRental(mockWorksheetId, mockTenantId, mockUserId);

      // Assert
      expect(result.rentalId).toBeUndefined();
      expect(result.type).toBe(WorksheetType.FIZETOS);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'worksheet_unlinked_from_rental',
        }),
      );
    });

    it('should throw error if worksheet not linked to rental', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet); // No rentalId

      // Act & Assert
      await expect(
        service.unlinkFromRental(mockWorksheetId, mockTenantId, mockUserId),
      ).rejects.toThrow('Munkalap nincs berleshez kapcsolva');
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.unlinkFromRental(mockWorksheetId, mockTenantId, mockUserId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });
  });

  describe('getWorksheetsByRental()', () => {
    it('should return worksheets linked to rental', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(mockRental);
      mockWorksheetRepository.findByRentalId.mockResolvedValue([
        { ...mockWorksheet, rentalId: mockRentalId },
      ]);

      // Act
      const result = await service.getWorksheetsByRental(mockRentalId, mockTenantId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.rentalId).toBe(mockRentalId);
    });

    it('should throw error if rental not found', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getWorksheetsByRental(mockRentalId, mockTenantId),
      ).rejects.toThrow('Berles nem talalhato');
    });
  });

  describe('getWorksheetWithRental()', () => {
    it('should return worksheet with rental info', async () => {
      // Arrange
      const linkedWorksheet = { ...mockWorksheet, rentalId: mockRentalId };
      mockWorksheetRepository.findById.mockResolvedValue(linkedWorksheet);
      mockRentalService.findById.mockResolvedValue(mockRental);

      // Act
      const result = await service.getWorksheetWithRental(mockWorksheetId, mockTenantId);

      // Assert
      expect(result.worksheet).toEqual(linkedWorksheet);
      expect(result.rental).toEqual(mockRental);
    });

    it('should return null rental if worksheet not linked', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(mockWorksheet); // No rentalId

      // Act
      const result = await service.getWorksheetWithRental(mockWorksheetId, mockTenantId);

      // Assert
      expect(result.worksheet).toEqual(mockWorksheet);
      expect(result.rental).toBeNull();
    });

    it('should throw error if worksheet not found', async () => {
      // Arrange
      mockWorksheetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getWorksheetWithRental(mockWorksheetId, mockTenantId),
      ).rejects.toThrow('Munkalap nem talalhato');
    });
  });

  describe('createFromRentalDamage()', () => {
    it('should create worksheet from rental damage', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(mockRental);
      mockWorksheetRepository.create.mockImplementation(async (data) => ({
        id: 'new-worksheet-id',
        ...data,
      }));

      // Act
      const result = await service.createFromRentalDamage(
        mockRentalId,
        'Motor serules visszavetelnel',
        mockTenantId,
        mockUserId,
      );

      // Assert
      expect(result.type).toBe(WorksheetType.BERLESI);
      expect(result.rentalId).toBe(mockRentalId);
      expect(result.deviceName).toBe(mockRental.deviceName);
      expect(result.partnerId).toBe(mockRental.partnerId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'worksheet_created_from_rental',
        }),
      );
    });

    it('should throw error if rental not found', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createFromRentalDamage(mockRentalId, 'Damage', mockTenantId, mockUserId),
      ).rejects.toThrow('Berles nem talalhato');
    });

    it('should throw error if damage description too short', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(mockRental);

      // Act & Assert
      await expect(
        service.createFromRentalDamage(mockRentalId, 'abc', mockTenantId, mockUserId),
      ).rejects.toThrow('Karmeghatározás minimum 5 karakter');
    });
  });

  describe('hasOpenWorksheets()', () => {
    it('should return true if rental has open worksheets', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(mockRental);
      mockWorksheetRepository.findByRentalId.mockResolvedValue([
        { ...mockWorksheet, status: WorksheetStatus.FOLYAMATBAN },
      ]);

      // Act
      const result = await service.hasOpenWorksheets(mockRentalId, mockTenantId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if all worksheets are closed', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(mockRental);
      mockWorksheetRepository.findByRentalId.mockResolvedValue([
        { ...mockWorksheet, status: WorksheetStatus.LEZART },
        { ...mockWorksheet, status: WorksheetStatus.TOROLVE },
      ]);

      // Act
      const result = await service.hasOpenWorksheets(mockRentalId, mockTenantId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if no worksheets exist', async () => {
      // Arrange
      mockRentalService.findById.mockResolvedValue(mockRental);
      mockWorksheetRepository.findByRentalId.mockResolvedValue([]);

      // Act
      const result = await service.hasOpenWorksheets(mockRentalId, mockTenantId);

      // Assert
      expect(result).toBe(false);
    });
  });
});
