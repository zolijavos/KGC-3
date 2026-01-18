import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NormaLaborService, IWorksheetRepository, IWorksheet } from './norma-labor.service';
import { INormaVersionRepository, INormaItemRepository, IAuditService } from './norma-import.service';
import { INormaVersion, INormaItem, NormaVersionStatus } from '../interfaces/norma.interface';

const mockVersionRepository: INormaVersionRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findActiveBySupplier: vi.fn(),
  update: vi.fn(),
};

const mockItemRepository: INormaItemRepository = {
  createMany: vi.fn(),
  findByVersionId: vi.fn(),
  findByCode: vi.fn(),
};

const mockWorksheetRepository: IWorksheetRepository = {
  findById: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('NormaLaborService', () => {
  let service: NormaLaborService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  const mockVersion: INormaVersion = {
    id: 'version-1',
    tenantId: mockTenantId,
    versionNumber: '2026-01',
    supplier: 'Makita',
    status: NormaVersionStatus.ACTIVE,
    effectiveFrom: new Date(),
    itemCount: 10,
    importedBy: 'admin',
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNormaItem: INormaItem = {
    id: 'item-1',
    tenantId: mockTenantId,
    versionId: 'version-1',
    normaCode: 'M001',
    description: 'Szenkefe csere',
    normaHours: 0.5,
    hourlyRate: 5000,
    laborCost: 2500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorksheetId = '00000000-0000-0000-0000-000000000001';

  const mockWorksheet: IWorksheet = {
    id: mockWorksheetId,
    tenantId: mockTenantId,
    worksheetNumber: 'ML-2026-0001',
    isWarranty: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NormaLaborService(
      mockVersionRepository,
      mockItemRepository,
      mockWorksheetRepository,
      mockAuditService,
    );
  });

  it('should calculate labor cost without deviation', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(mockNormaItem);

    const result = await service.calculateLaborCost(
      { normaCode: 'M001', worksheetId: mockWorksheetId },
      mockTenantId,
      mockUserId,
    );

    expect(result.normaCode).toBe('M001');
    expect(result.calculatedCost).toBe(2500);
    expect(result.finalCost).toBe(2500);
    expect(result.deviationPercent).toBeUndefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'norma_labor_calculated',
      }),
    );
  });

  it('should calculate labor cost with positive deviation', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(mockNormaItem);

    const result = await service.calculateLaborCost(
      {
        normaCode: 'M001',
        worksheetId: mockWorksheetId,
        deviationPercent: 20,
        deviationReason: 'Rozsdás csavarok miatt nehezebb szerelés',
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.calculatedCost).toBe(2500);
    expect(result.finalCost).toBe(3000); // 2500 * 1.2
    expect(result.deviationPercent).toBe(20);
    expect(result.deviationReason).toBe('Rozsdás csavarok miatt nehezebb szerelés');
  });

  it('should calculate labor cost with negative deviation', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(mockNormaItem);

    const result = await service.calculateLaborCost(
      {
        normaCode: 'M001',
        worksheetId: mockWorksheetId,
        deviationPercent: -10,
        deviationReason: 'Egyszerűbb eset',
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.calculatedCost).toBe(2500);
    expect(result.finalCost).toBe(2250); // 2500 * 0.9
  });

  it('should throw error when deviation has no reason', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(mockNormaItem);

    await expect(
      service.calculateLaborCost(
        { normaCode: 'M001', worksheetId: mockWorksheetId, deviationPercent: 20 },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Deviation reason is required');
  });

  it('should throw error when worksheet not found', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.calculateLaborCost({ normaCode: 'M001', worksheetId: mockWorksheetId }, mockTenantId, mockUserId),
    ).rejects.toThrow('Worksheet not found');
  });

  it('should throw error on tenant mismatch', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockWorksheet,
      tenantId: 'other-tenant',
    });

    await expect(
      service.calculateLaborCost({ normaCode: 'M001', worksheetId: mockWorksheetId }, mockTenantId, mockUserId),
    ).rejects.toThrow('Access denied');
  });

  it('should throw error when no active norma version', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.calculateLaborCost({ normaCode: 'M001', worksheetId: mockWorksheetId }, mockTenantId, mockUserId),
    ).rejects.toThrow('No active norma version found');
  });

  it('should throw error when norma code not found', async () => {
    (mockWorksheetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorksheet);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.calculateLaborCost({ normaCode: 'INVALID', worksheetId: mockWorksheetId }, mockTenantId, mockUserId),
    ).rejects.toThrow('Norma code not found: INVALID');
  });

  it('should find norma by code', async () => {
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(mockNormaItem);

    const result = await service.findNormaByCode('M001', mockTenantId);

    expect(result).toEqual(mockNormaItem);
  });

  it('should search norma codes', async () => {
    const items: INormaItem[] = [
      mockNormaItem,
      { ...mockNormaItem, id: 'item-2', normaCode: 'M002', description: 'Motor javítás' },
    ];
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockVersion,
    );
    (mockItemRepository.findByVersionId as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    const result = await service.searchNormaCodes('motor', mockTenantId);

    expect(result).toHaveLength(1);
    expect(result[0]?.normaCode).toBe('M002');
  });
});
