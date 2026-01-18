import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EquipmentDispatchService,
  IEquipmentRepository,
  IWorksheetRepository,
  IServiceDispatchRepository,
  IAuditService,
} from './equipment-dispatch.service';
import {
  IEquipment,
  IWorksheet,
  IServiceDispatch,
  EquipmentStatus,
  WorksheetStatus,
  ServiceDispatchReason,
} from '../interfaces/bergep-szerviz.interface';

const mockEquipmentRepository: IEquipmentRepository = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockWorksheetRepository: IWorksheetRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  getNextNumber: vi.fn(),
};

const mockDispatchRepository: IServiceDispatchRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByEquipmentId: vi.fn(),
  findActiveByEquipmentId: vi.fn(),
  update: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('EquipmentDispatchService', () => {
  let service: EquipmentDispatchService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockEquipmentId = '00000000-0000-0000-0000-000000000001';

  const mockEquipment: IEquipment = {
    id: mockEquipmentId,
    tenantId: mockTenantId,
    equipmentCode: 'BG-001',
    name: 'Makita Fúrógép',
    serialNumber: 'MAK123456',
    status: EquipmentStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorksheet: IWorksheet = {
    id: '00000000-0000-0000-0000-000000000002',
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    equipmentId: mockEquipmentId,
    status: WorksheetStatus.WAITING,
    isWarranty: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDispatch: IServiceDispatch = {
    id: '00000000-0000-0000-0000-000000000003',
    tenantId: mockTenantId,
    equipmentId: mockEquipmentId,
    worksheetId: mockWorksheet.id,
    reason: ServiceDispatchReason.REPAIR,
    previousStatus: EquipmentStatus.AVAILABLE,
    dispatchedAt: new Date(),
    dispatchedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EquipmentDispatchService(
      mockEquipmentRepository,
      mockWorksheetRepository,
      mockDispatchRepository,
      mockAuditService,
    );
  });

  it('should dispatch equipment to service', async () => {
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockDispatchRepository.findActiveByEquipmentId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockWorksheetRepository.getNextNumber as ReturnType<typeof vi.fn>).mockResolvedValue('ML-2026-0001');
    (mockWorksheetRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockDispatchRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEquipment,
      status: EquipmentStatus.IN_SERVICE,
    });

    const result = await service.dispatchToService(
      {
        equipmentId: mockEquipmentId,
        reason: 'REPAIR',
        notes: 'Motor nem működik',
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.dispatch).toBeDefined();
    expect(result.worksheet).toBeDefined();
    expect(mockEquipmentRepository.update).toHaveBeenCalledWith(
      mockEquipmentId,
      expect.objectContaining({ status: EquipmentStatus.IN_SERVICE }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'equipment_dispatched_to_service' }),
    );
  });

  it('should not dispatch rented equipment', async () => {
    const rentedEquipment = { ...mockEquipment, status: EquipmentStatus.RENTED };
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(rentedEquipment);

    await expect(
      service.dispatchToService(
        { equipmentId: mockEquipmentId, reason: 'REPAIR' },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Cannot dispatch rented equipment to service');
  });

  it('should not dispatch equipment already in service', async () => {
    const inServiceEquipment = { ...mockEquipment, status: EquipmentStatus.IN_SERVICE };
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(inServiceEquipment);

    await expect(
      service.dispatchToService(
        { equipmentId: mockEquipmentId, reason: 'MAINTENANCE' },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Equipment is already in service');
  });

  it('should not dispatch retired equipment', async () => {
    const retiredEquipment = { ...mockEquipment, status: EquipmentStatus.RETIRED };
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(retiredEquipment);

    await expect(
      service.dispatchToService(
        { equipmentId: mockEquipmentId, reason: 'INSPECTION' },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Cannot dispatch retired equipment');
  });

  it('should not dispatch equipment with active dispatch', async () => {
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockDispatchRepository.findActiveByEquipmentId as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);

    await expect(
      service.dispatchToService(
        { equipmentId: mockEquipmentId, reason: 'REPAIR' },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Equipment has an active service dispatch');
  });

  it('should throw error on tenant mismatch', async () => {
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);

    await expect(
      service.dispatchToService(
        { equipmentId: mockEquipmentId, reason: 'REPAIR' },
        'other-tenant',
        mockUserId,
      ),
    ).rejects.toThrow('Access denied');
  });

  it('should throw error when equipment not found', async () => {
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.dispatchToService(
        { equipmentId: mockEquipmentId, reason: 'REPAIR' },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Equipment not found');
  });

  it('should get dispatch history', async () => {
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockDispatchRepository.findByEquipmentId as ReturnType<typeof vi.fn>).mockResolvedValue([mockDispatch]);

    const result = await service.getDispatchHistory(mockEquipmentId, mockTenantId);

    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe(ServiceDispatchReason.REPAIR);
  });

  it('should create warranty worksheet when isWarranty is true', async () => {
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockDispatchRepository.findActiveByEquipmentId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockWorksheetRepository.getNextNumber as ReturnType<typeof vi.fn>).mockResolvedValue('ML-2026-0002');
    (mockWorksheetRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockWorksheet,
      isWarranty: true,
    });
    (mockDispatchRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);

    const result = await service.dispatchToService(
      {
        equipmentId: mockEquipmentId,
        reason: 'WARRANTY',
        isWarranty: true,
      },
      mockTenantId,
      mockUserId,
    );

    expect(mockWorksheetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isWarranty: true }),
    );
  });
});
