import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IEmployeeMapping,
  IHorillaConfig,
  IHorillaEmployee,
  IKgcUser,
  SyncDirection,
  SyncStatus,
} from '../interfaces/horilla-hr.interface';
import {
  EmployeeSyncService,
  IAuditService,
  IConfigRepository,
  IEmployeeMappingRepository,
  IHorillaApiClient,
  IUserRepository,
} from './employee-sync.service';

const mockHorillaClient: IHorillaApiClient = {
  getEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
};

const mockUserRepository: IUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByHorillaId: vi.fn(),
  findByIds: vi.fn(),
  findAllMapped: vi.fn(),
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
      mockAuditService
    );
  });

  describe('syncEmployees', () => {
    it('should sync employees from Horilla', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConfig
      );
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockHorillaEmployee,
      ]);
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
        expect.objectContaining({ action: 'employee_sync_completed' })
      );
    });

    it('should update existing mapped user', async () => {
      const oldSyncDate = new Date(Date.now() - 86400000); // 1 day ago
      const existingMapping = { ...mockMapping, lastSyncAt: oldSyncDate };

      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConfig
      );
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockHorillaEmployee,
      ]);
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingMapping
      );
      (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
      (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.syncEmployees({ fullSync: true }, mockTenantId, mockUserId);

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should link existing user by email', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConfig
      );
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockHorillaEmployee,
      ]);
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

      await expect(service.syncEmployees({}, mockTenantId, mockUserId)).rejects.toThrow(
        'Horilla configuration not found for tenant'
      );
    });

    it('should skip employee when sync direction is KGC_TO_HORILLA', async () => {
      const reverseMapping = { ...mockMapping, syncDirection: SyncDirection.KGC_TO_HORILLA };

      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConfig
      );
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockHorillaEmployee,
      ]);
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
        reverseMapping
      );

      const result = await service.syncEmployees({}, mockTenantId, mockUserId);

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should filter by department', async () => {
      (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConfig
      );
      (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.syncEmployees({ departmentFilter: 'Szerviz' }, mockTenantId, mockUserId);

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
        mockUserId
      );

      expect(result.horillaEmployeeId).toBe('EMP001');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'employee_mapping_created' })
      );
    });

    it('should not create duplicate Horilla mapping', async () => {
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMapping
      );

      await expect(
        service.createMapping(
          { horillaEmployeeId: 'EMP001', kgcUserId: mockKgcUserId },
          mockTenantId,
          mockUserId
        )
      ).rejects.toThrow('Horilla employee already mapped');
    });

    it('should not create duplicate KGC user mapping', async () => {
      (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMapping
      );

      await expect(
        service.createMapping(
          { horillaEmployeeId: 'EMP002', kgcUserId: mockKgcUserId },
          mockTenantId,
          mockUserId
        )
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
          mockUserId
        )
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
          mockUserId
        )
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
        expect.objectContaining({ action: 'employee_mapping_deleted' })
      );
    });

    it('should throw error when mapping not found', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.deleteMapping('non-existent', mockTenantId, mockUserId)).rejects.toThrow(
        'Mapping not found'
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await expect(
        service.deleteMapping(mockMapping.id, 'other-tenant', mockUserId)
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

  describe('syncEmployeesExtended - Bidirectional', () => {
    describe('KGC_TO_HORILLA direction', () => {
      it('should sync KGC user to Horilla - create new employee', async () => {
        const newEmployee: IHorillaEmployee = {
          ...mockHorillaEmployee,
          employeeId: `KGC-${mockKgcUserId.substring(0, 8)}`,
        };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockKgcUser,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockHorillaClient.createEmployee as ReturnType<typeof vi.fn>).mockResolvedValue(
          newEmployee
        );
        (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
        (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);

        const result = await service.syncEmployeesExtended(
          { direction: 'KGC_TO_HORILLA' },
          mockTenantId,
          mockUserId
        );

        expect(result.direction).toBe(SyncDirection.KGC_TO_HORILLA);
        expect(result.createdCount).toBe(1);
        expect(mockHorillaClient.createEmployee).toHaveBeenCalled();
      });

      it('should sync KGC user to Horilla - update existing employee', async () => {
        const oldSyncDate = new Date(Date.now() - 86400000);
        const existingMapping = {
          ...mockMapping,
          syncDirection: SyncDirection.BIDIRECTIONAL,
          lastSyncAt: oldSyncDate,
        };
        const updatedUser = { ...mockKgcUser, updatedAt: new Date() };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([
          updatedUser,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );
        (mockHorillaClient.getEmployeeById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockHorillaEmployee
        );
        (mockHorillaClient.updateEmployee as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockHorillaEmployee
        );
        (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );

        const result = await service.syncEmployeesExtended(
          { direction: 'KGC_TO_HORILLA', fullSync: true },
          mockTenantId,
          mockUserId
        );

        expect(result.updatedCount).toBe(1);
        expect(mockHorillaClient.updateEmployee).toHaveBeenCalled();
      });

      it('should filter by userIds when provided', async () => {
        const specificUserId = '00000000-0000-0000-0000-000000000099';
        const specificUser = { ...mockKgcUser, id: specificUserId };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockUserRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
          specificUser,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockMappingRepository.findByKgcUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockHorillaClient.createEmployee as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockHorillaEmployee
        );
        (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
        (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(specificUser);

        await service.syncEmployeesExtended(
          { direction: 'KGC_TO_HORILLA', userIds: [specificUserId] },
          mockTenantId,
          mockUserId
        );

        expect(mockUserRepository.findByIds).toHaveBeenCalledWith([specificUserId], mockTenantId);
        expect(mockUserRepository.findAllMapped).not.toHaveBeenCalled();
      });

      it('should skip users when direction is HORILLA_TO_KGC', async () => {
        const horillaOnlyMapping = { ...mockMapping, syncDirection: SyncDirection.HORILLA_TO_KGC };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockKgcUser,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
          horillaOnlyMapping
        );

        const result = await service.syncEmployeesExtended(
          { direction: 'KGC_TO_HORILLA' },
          mockTenantId,
          mockUserId
        );

        expect(result.skippedCount).toBe(1);
        expect(mockHorillaClient.updateEmployee).not.toHaveBeenCalled();
      });
    });

    describe('BIDIRECTIONAL direction', () => {
      it('should sync both directions in one call', async () => {
        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        // Horilla to KGC
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockHorillaEmployee,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockUserRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockUserRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
        (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
        // KGC to Horilla
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const result = await service.syncEmployeesExtended(
          { direction: 'BIDIRECTIONAL' },
          mockTenantId,
          mockUserId
        );

        expect(result.direction).toBe(SyncDirection.BIDIRECTIONAL);
        expect(result.createdCount).toBeGreaterThanOrEqual(1);
        expect(mockHorillaClient.getEmployees).toHaveBeenCalled();
      });
    });

    describe('Conflict Resolution', () => {
      const conflictDate = new Date(Date.now() - 3600000); // 1 hour ago
      const olderDate = new Date(Date.now() - 7200000); // 2 hours ago
      const newerDate = new Date(); // now

      it('should resolve using LAST_WRITE_WINS - KGC wins when newer', async () => {
        const recentUser = { ...mockKgcUser, updatedAt: newerDate };
        const olderEmployee = { ...mockHorillaEmployee, lastModified: olderDate };
        const existingMapping = {
          ...mockMapping,
          syncDirection: SyncDirection.BIDIRECTIONAL,
          lastSyncAt: conflictDate,
        };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
          olderEmployee,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );
        (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(recentUser);
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([
          recentUser,
        ]);
        (mockHorillaClient.getEmployeeById as ReturnType<typeof vi.fn>).mockResolvedValue(
          olderEmployee
        );
        (mockHorillaClient.updateEmployee as ReturnType<typeof vi.fn>).mockResolvedValue(
          olderEmployee
        );
        (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );

        await service.syncEmployeesExtended(
          { direction: 'BIDIRECTIONAL', conflictResolution: 'LAST_WRITE_WINS' },
          mockTenantId,
          mockUserId
        );

        // KGC is newer, so Horilla should be updated
        expect(mockHorillaClient.updateEmployee).toHaveBeenCalled();
      });

      it('should resolve using HORILLA_WINS strategy', async () => {
        const recentUser = { ...mockKgcUser, updatedAt: newerDate };
        const olderEmployee = { ...mockHorillaEmployee, lastModified: newerDate };
        const existingMapping = {
          ...mockMapping,
          syncDirection: SyncDirection.BIDIRECTIONAL,
          lastSyncAt: conflictDate,
        };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
          olderEmployee,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );
        (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(recentUser);
        (mockUserRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(recentUser);
        (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        await service.syncEmployeesExtended(
          { direction: 'BIDIRECTIONAL', conflictResolution: 'HORILLA_WINS' },
          mockTenantId,
          mockUserId
        );

        // Horilla wins, so KGC user should be updated
        expect(mockUserRepository.update).toHaveBeenCalled();
      });

      it('should resolve using KGC_WINS strategy', async () => {
        const recentUser = { ...mockKgcUser, updatedAt: newerDate };
        const olderEmployee = { ...mockHorillaEmployee, lastModified: newerDate };
        const existingMapping = {
          ...mockMapping,
          syncDirection: SyncDirection.BIDIRECTIONAL,
          lastSyncAt: conflictDate,
        };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
          olderEmployee,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );
        (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(recentUser);
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([
          recentUser,
        ]);
        (mockHorillaClient.getEmployeeById as ReturnType<typeof vi.fn>).mockResolvedValue(
          olderEmployee
        );
        (mockHorillaClient.updateEmployee as ReturnType<typeof vi.fn>).mockResolvedValue(
          olderEmployee
        );
        (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );

        const result = await service.syncEmployeesExtended(
          { direction: 'BIDIRECTIONAL', conflictResolution: 'KGC_WINS' },
          mockTenantId,
          mockUserId
        );

        // KGC wins, so skip updating KGC user from Horilla (during from-Horilla pass)
        expect(result.skippedCount).toBeGreaterThanOrEqual(1);
      });

      it('should log conflict for MANUAL resolution', async () => {
        const recentUser = { ...mockKgcUser, updatedAt: newerDate };
        const recentEmployee = { ...mockHorillaEmployee, lastModified: newerDate };
        const existingMapping = {
          ...mockMapping,
          syncDirection: SyncDirection.BIDIRECTIONAL,
          lastSyncAt: conflictDate,
        };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
          recentEmployee,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>).mockResolvedValue(
          existingMapping
        );
        (mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(recentUser);
        (mockUserRepository.findAllMapped as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const result = await service.syncEmployeesExtended(
          { direction: 'BIDIRECTIONAL', conflictResolution: 'MANUAL' },
          mockTenantId,
          mockUserId
        );

        expect(
          result.errors.some(e => e.error.includes('Manual conflict resolution required'))
        ).toBe(true);
        expect(result.skippedCount).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Error Handling', () => {
      it('should handle Horilla API errors gracefully', async () => {
        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('API Error')
        );

        await expect(
          service.syncEmployeesExtended({ direction: 'HORILLA_TO_KGC' }, mockTenantId, mockUserId)
        ).rejects.toThrow('API Error');
      });

      it('should continue processing after individual employee failure', async () => {
        const employee1 = { ...mockHorillaEmployee, employeeId: 'EMP001' };
        const employee2 = {
          ...mockHorillaEmployee,
          employeeId: 'EMP002',
          email: 'other@example.com',
        };

        (mockConfigRepository.getHorillaConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockConfig
        );
        (mockHorillaClient.getEmployees as ReturnType<typeof vi.fn>).mockResolvedValue([
          employee1,
          employee2,
        ]);
        (mockMappingRepository.findByHorillaId as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        (mockUserRepository.findByEmail as ReturnType<typeof vi.fn>)
          .mockRejectedValueOnce(new Error('DB Error'))
          .mockResolvedValueOnce(null);
        (mockUserRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcUser);
        (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

        const result = await service.syncEmployeesExtended(
          { direction: 'HORILLA_TO_KGC' },
          mockTenantId,
          mockUserId
        );

        expect(result.failedCount).toBe(1);
        expect(result.createdCount).toBe(1);
        expect(result.errors).toHaveLength(1);
      });
    });
  });
});
