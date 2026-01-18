import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NormaVersionService } from './norma-version.service';
import { INormaVersionRepository, IAuditService } from './norma-import.service';
import { INormaVersion, NormaVersionStatus } from '../interfaces/norma.interface';

const mockVersionRepository: INormaVersionRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findActiveBySupplier: vi.fn(),
  update: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('NormaVersionService', () => {
  let service: NormaVersionService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  const mockVersion: INormaVersion = {
    id: 'version-1',
    tenantId: mockTenantId,
    versionNumber: '2026-01',
    supplier: 'Makita',
    status: NormaVersionStatus.DRAFT,
    effectiveFrom: new Date(),
    itemCount: 10,
    importedBy: 'admin',
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActiveVersion: INormaVersion = {
    ...mockVersion,
    id: 'version-active',
    status: NormaVersionStatus.ACTIVE,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NormaVersionService(mockVersionRepository, mockAuditService);
  });

  it('should get active version by supplier', async () => {
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockActiveVersion,
    );

    const result = await service.getActiveVersion(mockTenantId, 'Makita');

    expect(result).toEqual(mockActiveVersion);
    expect(mockVersionRepository.findActiveBySupplier).toHaveBeenCalledWith(mockTenantId, 'Makita');
  });

  it('should get version by id with tenant check', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);

    const result = await service.getVersionById('version-1', mockTenantId);

    expect(result).toEqual(mockVersion);
  });

  it('should throw error when version not found', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.getVersionById('version-1', mockTenantId)).rejects.toThrow(
      'Version not found',
    );
  });

  it('should throw error on tenant mismatch', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);

    await expect(service.getVersionById('version-1', 'other-tenant')).rejects.toThrow(
      'Access denied',
    );
  });

  it('should activate a draft version', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockVersionRepository.findActiveBySupplier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockActiveVersion,
    );
    (mockVersionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockVersion, ...data, id }),
    );

    const result = await service.activateVersion('version-1', mockTenantId, mockUserId);

    expect(result.status).toBe(NormaVersionStatus.ACTIVE);
    expect(mockVersionRepository.update).toHaveBeenCalledWith('version-active', {
      status: NormaVersionStatus.ARCHIVED,
      effectiveTo: expect.any(Date),
    });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'norma_version_activated',
      }),
    );
  });

  it('should throw error when activating already active version', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockActiveVersion);

    await expect(
      service.activateVersion('version-active', mockTenantId, mockUserId),
    ).rejects.toThrow('Version is already active');
  });

  it('should archive a version', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockActiveVersion);
    (mockVersionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockActiveVersion, ...data }),
    );

    const result = await service.archiveVersion('version-active', mockTenantId, mockUserId);

    expect(result.status).toBe(NormaVersionStatus.ARCHIVED);
    expect(result.effectiveTo).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'norma_version_archived',
      }),
    );
  });

  it('should throw error when archiving already archived version', async () => {
    const archivedVersion: INormaVersion = {
      ...mockVersion,
      status: NormaVersionStatus.ARCHIVED,
    };
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(archivedVersion);

    await expect(
      service.archiveVersion('version-1', mockTenantId, mockUserId),
    ).rejects.toThrow('Version is already archived');
  });

  it('should update version properties', async () => {
    (mockVersionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
    (mockVersionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockVersion, ...data }),
    );

    const newEffectiveTo = new Date('2026-12-31');
    const result = await service.updateVersion(
      'version-1',
      { effectiveTo: newEffectiveTo },
      mockTenantId,
      mockUserId,
    );

    expect(result.effectiveTo).toEqual(newEffectiveTo);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'norma_version_updated',
      }),
    );
  });
});
