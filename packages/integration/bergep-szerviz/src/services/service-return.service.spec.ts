import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceReturnService, INotificationService } from './service-return.service';
import {
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

const mockNotificationService: INotificationService = {
  notify: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('ServiceReturnService', () => {
  let service: ServiceReturnService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockEquipmentId = '00000000-0000-0000-0000-000000000001';
  const mockWorksheetId = '00000000-0000-0000-0000-000000000002';
  const mockDispatchId = '00000000-0000-0000-0000-000000000003';

  const mockEquipment: IEquipment = {
    id: mockEquipmentId,
    tenantId: mockTenantId,
    equipmentCode: 'BG-001',
    name: 'Makita Fúrógép',
    serialNumber: 'MAK123456',
    status: EquipmentStatus.IN_SERVICE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorksheet: IWorksheet = {
    id: mockWorksheetId,
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    equipmentId: mockEquipmentId,
    status: WorksheetStatus.COMPLETED,
    isWarranty: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
  };

  const mockDispatch: IServiceDispatch = {
    id: mockDispatchId,
    tenantId: mockTenantId,
    equipmentId: mockEquipmentId,
    worksheetId: mockWorksheetId,
    reason: ServiceDispatchReason.REPAIR,
    previousStatus: EquipmentStatus.AVAILABLE,
    dispatchedAt: new Date(),
    dispatchedBy: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ServiceReturnService(
      mockEquipmentRepository,
      mockWorksheetRepository,
      mockDispatchRepository,
      mockNotificationService,
      mockAuditService,
    );
  });

  it('should return equipment from service', async () => {
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockDispatchRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockDispatch,
      returnedAt: new Date(),
      returnedBy: mockUserId,
    });
    (mockEquipmentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEquipment,
      status: EquipmentStatus.AVAILABLE,
    });

    const result = await service.returnFromService(
      {
        dispatchId: mockDispatchId,
        restoreToStatus: 'AVAILABLE',
        serviceNotes: 'Javítás elkészült',
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.newStatus).toBe(EquipmentStatus.AVAILABLE);
    expect(result.equipmentId).toBe(mockEquipmentId);
    expect(mockEquipmentRepository.update).toHaveBeenCalledWith(
      mockEquipmentId,
      expect.objectContaining({ status: EquipmentStatus.AVAILABLE }),
    );
    expect(mockNotificationService.notify).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'equipment_returned_from_service' }),
    );
  });

  it('should not return already returned equipment', async () => {
    const returnedDispatch = { ...mockDispatch, returnedAt: new Date(), returnedBy: 'user-2' };
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(returnedDispatch);

    await expect(
      service.returnFromService(
        { dispatchId: mockDispatchId },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Equipment already returned from service');
  });

  it('should not return if worksheet not completed', async () => {
    const inProgressWorksheet = { ...mockWorksheet, status: WorksheetStatus.IN_PROGRESS };
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(inProgressWorksheet);

    await expect(
      service.returnFromService(
        { dispatchId: mockDispatchId },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Worksheet must be completed before returning equipment');
  });

  it('should not return if equipment not in service status', async () => {
    const availableEquipment = { ...mockEquipment, status: EquipmentStatus.AVAILABLE };
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(availableEquipment);

    await expect(
      service.returnFromService(
        { dispatchId: mockDispatchId },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Equipment is not in service status');
  });

  it('should throw error on tenant mismatch', async () => {
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);

    await expect(
      service.returnFromService(
        { dispatchId: mockDispatchId },
        'other-tenant',
        mockUserId,
      ),
    ).rejects.toThrow('Access denied');
  });

  it('should throw error when dispatch not found', async () => {
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.returnFromService(
        { dispatchId: mockDispatchId },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Service dispatch not found');
  });

  it('should auto complete on worksheet done', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockDispatchRepository.findActiveByEquipmentId as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockDispatchRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);

    const result = await service.autoCompleteOnWorksheetDone(
      mockWorksheetId,
      mockTenantId,
      mockUserId,
    );

    expect(result).not.toBeNull();
    expect(result?.newStatus).toBe(EquipmentStatus.AVAILABLE);
  });

  it('should return null on auto complete if no equipment linked', async () => {
    const worksheetWithoutEquipment = { ...mockWorksheet, equipmentId: undefined };
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(worksheetWithoutEquipment);

    const result = await service.autoCompleteOnWorksheetDone(
      mockWorksheetId,
      mockTenantId,
      mockUserId,
    );

    expect(result).toBeNull();
  });

  it('should allow return with RETIRED status', async () => {
    (mockDispatchRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment);
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockDispatchRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockDispatch);
    (mockEquipmentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEquipment,
      status: EquipmentStatus.RETIRED,
    });

    const result = await service.returnFromService(
      {
        dispatchId: mockDispatchId,
        restoreToStatus: 'RETIRED',
        serviceNotes: 'Javíthatatlan, leselejtezve',
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.newStatus).toBe(EquipmentStatus.RETIRED);
    expect(mockEquipmentRepository.update).toHaveBeenCalledWith(
      mockEquipmentId,
      expect.objectContaining({ status: EquipmentStatus.RETIRED }),
    );
  });
});
