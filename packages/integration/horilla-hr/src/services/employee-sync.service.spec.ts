import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EmployeeSyncService,
  IHorillaApiClient,
  IUserRepository,
  IEmployeeMappingRepository,
  IConfigRepository,
  IAuditService,
} from './employee-sync.service';
import {
  IHorillaEmployee,
  IKgcUser,
  IEmployeeMapping,
  IHorillaConfig,
  SyncDirection,
  SyncStatus,
} from '../interfaces/horilla-hr.interface';

const mockHorillaClient: IHorillaApiClient = {
  getEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  updateEmployee: vi.fn(),
};

const mockUserRepository: IUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByHorillaId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockMappingRepository: IEmployeeMappingRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByHorillaId: vi.fn(),
  findByKgcUserId: vi.fn(),
  findAll: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockConfigRepository: IConfigRepository = {
  getHorillaConfig: vi.fn(),
  saveHorillaConfig: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('EmployeeSyncService', () => {
  let service: EmployeeSyncService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockKgcUserId = '00000000-0000-0000-0000-000000000001';

  const mockConfig: IHorillaConfig = {
    apiUrl: 'https://horilla.example.com/api',
    apiKey: 'secret-key',
    tenantId: mockTenantId,
    syncInterval: 60,
    defaultRole: 'EMPLOYEE',
  };

  const mockHorillaEmployee: IHorillaEmployee = {
    id: 'horilla-1',
    employeeId: 'EMP001',
    firstName: 'János',
    lastName: 'Kovács',
    email: 'janos.kovacs@example.com',
    phone: '+36301234567',
    department: 'Szerviz',
    position: 'Szerelő',
    hireDate: new Date('2024-01-15'),
    status: 'ACTIVE',
    lastModified: new Date(),
  };

  const mockKgcUser: IKgcUser = {
    id: mockKgcUserId,
    tenantId: mockTenantId,
    email: 'janos.kovacs@example.com',
    firstName: 'János',
    lastName: 'Kovács',
    phone: '+36301234567',
    role: 'EMPLOYEE',
    isActive: true,
    horillaEmployeeId: 'EMP001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMapping: IEmployeeMapping = {
    id: '00000000-0000-0000-0000-000000000002',
    tenantId: mockTenantId,
    horillaEmployeeId: 'EMP001',
    kgcUserId: mockKgcUserId,
    syncDirection: SyncDirection.HORILLA_TO_KGC,
    lastSyncAt: new Date(),
    lastSyncStatus: SyncStatus.COMPLETED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmployeeSyncService(
      mockHorillaClient,
      mockUserRepository,
      mockMappingRepository,
      mockConfigRepository,
      mockAuditService,
    );
  });

  describe('syncEmployees', () => {
    it('should sync employees from Horilla', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([mockHorillaEmployee]);
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUserRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUserRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.syncEmployees({}, mockTenantId, mockUserId);

      expect(result.totalRecords).toBe(1);
      expect(result.created).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockMappingRepository.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'employee_sync_completed' }),
      );
    });

    it('should update existing mapped user', async () => {
      const oldSyncDate = new Date(Date.now() - 86400000); // 1 day ago
      const existingMapping = { ...mockMapping, lastSyncAt: oldSyncDate };

      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([mockHorillaEmployee]);
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(existingMapping);
      (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.syncEmployees({ fullSync: true }, mockTenantId, mockUserId);

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should link existing user by email', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([mockHorillaEmployee]);
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUserRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
      (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);

      const result = await service.syncEmployees({}, mockTenantId, mockUserId);

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('should throw error when config not found', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.syncEmployees({}, mockTenantId, mockUserId),
      ).rejects.toThrow('Horilla configuration not found for tenant');
    });

    it('should skip employee when sync direction is KGC_TO_HORILLA', async () => {
      const reverseMapping = { ...mockMapping, syncDirection: SyncDirection.KGC_TO_HORILLA };

      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([mockHorillaEmployee]);
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(reverseMapping);

      const result = await service.syncEmployees({}, mockTenantId, mockUserId);

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should filter by department', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.syncEmployees(
        { departmentFilter: 'Szerviz' },
        mockTenantId,
        mockUserId,
      );

      expect(mockHorillaClient.getEmployees).toHaveBeenCalledWith({ department: 'Szerviz' });
    });
  });

  describe('createMapping', () => {
    it('should create employee mapping', async () => {
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
      (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);

      const result = await service.createMapping(
        {
          horillaEmployeeId: 'EMP001',
          kgcUserId: mockKgcUserId,
          syncDirection: 'HORILLA_TO_KGC',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result.horillaEmployeeId).toBe('EMP001');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'employee_mapping_created' }),
      );
    });

    it('should not create duplicate Horilla mapping', async () => {
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await expect(
        service.createMapping(
          { horillaEmployeeId: 'EMP001', kgcUserId: mockKgcUserId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Horilla employee already mapped');
    });

    it('should not create duplicate KGC user mapping', async () => {
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await expect(
        service.createMapping(
          { horillaEmployeeId: 'EMP002', kgcUserId: mockKgcUserId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('KGC user already mapped to another employee');
    });

    it('should throw error when KGC user not found', async () => {
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createMapping(
          { horillaEmployeeId: 'EMP001', kgcUserId: mockKgcUserId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('KGC user not found');
    });

    it('should throw error on tenant mismatch', async () => {
      const otherTenantUser = { ...mockKgcUser, tenantId: 'other-tenant' };
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherTenantUser);

      await expect(
        service.createMapping(
          { horillaEmployeeId: 'EMP001', kgcUserId: mockKgcUserId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteMapping', () => {
    it('should delete mapping', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
      (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);

      await service.deleteMapping(mockMapping.id, mockTenantId, mockUserId);

      expect(mockMappingRepository.delete).toHaveBeenCalledWith(mockMapping.id);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'employee_mapping_deleted' }),
      );
    });

    it('should throw error when mapping not found', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.deleteMapping('non-existent', mockTenantId, mockUserId),
      ).rejects.toThrow('Mapping not found');
    });

    it('should throw error on tenant mismatch', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await expect(
        service.deleteMapping(mockMapping.id, 'other-tenant', mockUserId),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getMappings', () => {
    it('should get all mappings for tenant', async () => {
      (mockMappingRepository.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([mockMapping]);

      const result = await service.getMappings(mockTenantId);

      expect(result).toHaveLength(1);
      expect(mockMappingRepository.findAll).toHaveBeenCalledWith(mockTenantId);
    });
  });
});
