import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NormaImportService,
  INormaVersionRepository,
  INormaItemRepository,
  IAuditService,
} from './norma-import.service';
import { INormaVersion, NormaVersionStatus } from '../interfaces/norma.interface';
import { ImportNormaListDto } from '../dto/norma.dto';

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

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('NormaImportService', () => {
  let service: NormaImportService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  const mockVersion: INormaVersion = {
    id: 'version-1',
    tenantId: mockTenantId,
    versionNumber: '2026-01',
    supplier: 'Makita',
    status: NormaVersionStatus.ACTIVE,
    effectiveFrom: new Date(),
    itemCount: 3,
    importedBy: mockUserId,
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validImportDto: ImportNormaListDto = {
    supplier: 'Makita',
    versionNumber: '2026-01',
    effectiveFrom: new Date(),
    defaultHourlyRate: 5000,
    items: [
      { normaCode: 'M001', description: 'Szenkefe csere', normaHours: 0.5 },
      { normaCode: 'M002', description: 'Motor tekercselés', normaHours: 2.0 },
      { normaCode: 'M003', description: 'Kapcsoló csere', normaHours: 0.3 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NormaImportService(mockVersionRepository, mockItemRepository, mockAuditService);
  });

  it('should import norma list successfully', async () => {
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockVersionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.importNormaList(validImportDto, mockTenantId, mockUserId);

    expect(result.versionId).toBe('version-1');
    expect(result.importedCount).toBe(3);
    expect(result.skippedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'norma_list_imported',
        entityType: 'norma_version',
      }),
    );
  });

  it('should archive existing active version before import', async () => {
    const existingVersion: INormaVersion = {
      ...mockVersion,
      id: 'old-version',
    };
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      existingVersion,
    );
    (mockVersionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockVersionRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(existingVersion);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.importNormaList(validImportDto, mockTenantId, mockUserId);

    expect(mockVersionRepository.update).toHaveBeenCalledWith('old-version', {
      status: NormaVersionStatus.ARCHIVED,
      effectiveTo: expect.any(Date),
    });
  });

  it('should skip rows with missing norma code', async () => {
    const inputWithBadRow: ImportNormaListDto = {
      ...validImportDto,
      items: [
        { normaCode: '', description: 'Bad item', normaHours: 1 },
        { normaCode: 'M001', description: 'Good item', normaHours: 0.5 },
      ],
    };

    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockVersionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.importNormaList(inputWithBadRow, mockTenantId, mockUserId);

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.errors[0]?.code).toBe('MISSING_CODE');
  });

  it('should skip rows with negative hours', async () => {
    const inputWithBadRow: ImportNormaListDto = {
      ...validImportDto,
      items: [
        { normaCode: 'M001', description: 'Bad item', normaHours: -1 },
        { normaCode: 'M002', description: 'Good item', normaHours: 0.5 },
      ],
    };

    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockVersionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.importNormaList(inputWithBadRow, mockTenantId, mockUserId);

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.errors[0]?.code).toBe('INVALID_HOURS');
  });

  it('should throw error when no valid items', async () => {
    const inputWithAllBad: ImportNormaListDto = {
      ...validImportDto,
      items: [{ normaCode: '', description: 'Bad item', normaHours: 1 }],
    };

    await expect(
      service.importNormaList(inputWithAllBad, mockTenantId, mockUserId),
    ).rejects.toThrow('No valid items to import');
  });

  it('should calculate labor cost using default hourly rate', async () => {
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockVersionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockImplementation(
      async (items) => items,
    );

    await service.importNormaList(validImportDto, mockTenantId, mockUserId);

    expect(mockItemRepository.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          normaCode: 'M001',
          laborCost: 2500, // 0.5 * 5000
        }),
      ]),
    );
  });

  it('should parse CSV content correctly', async () => {
    const csvContent = `normaCode,description,normaHours,hourlyRate
M001,Szenkefe csere,0.5,5000
M002,Motor tekercselés,2.0,5000`;

    const items = await service.parseCSV(csvContent);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      normaCode: 'M001',
      description: 'Szenkefe csere',
      normaHours: 0.5,
      hourlyRate: 5000,
      category: undefined,
    });
  });

  it('should throw error for invalid CSV', async () => {
    const csvContent = `normaCode`;

    await expect(service.parseCSV(csvContent)).rejects.toThrow(
      'CSV must have header and at least one data row',
    );
  });

  it('should skip duplicate norma codes', async () => {
    const inputWithDuplicate: ImportNormaListDto = {
      ...validImportDto,
      items: [
        { normaCode: 'M001', description: 'First item', normaHours: 0.5 },
        { normaCode: 'M001', description: 'Duplicate item', normaHours: 1.0 },
        { normaCode: 'M002', description: 'Second item', normaHours: 0.3 },
      ],
    };

    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockVersionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.importNormaList(inputWithDuplicate, mockTenantId, mockUserId);

    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBe(1);
    expect(result.errors[0]?.code).toBe('DUPLICATE_CODE');
  });

  it('should parse CSV with quoted fields containing commas', async () => {
    const csvContent = `normaCode,description,normaHours,hourlyRate
M001,"Motor, 3-phase repair",0.5,5000
M002,Simple repair,1.0,5000`;

    const items = await service.parseCSV(csvContent);

    expect(items).toHaveLength(2);
    expect(items[0]?.description).toBe('Motor, 3-phase repair');
  });
});
