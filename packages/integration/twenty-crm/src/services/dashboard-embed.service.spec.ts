import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DashboardEmbedService,
  IDashboardConfigRepository,
  ITwentyCrmAuthClient,
  IConfigService,
  IUserService,
  IAuditService,
} from './dashboard-embed.service';
import { IDashboardConfig } from '../interfaces/twenty-crm.interface';

const mockConfigRepository: IDashboardConfigRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByTenantId: vi.fn(),
  findActiveByTenantId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockCrmAuthClient: ITwentyCrmAuthClient = {
  validateDashboardAccess: vi.fn(),
  generateEmbedSignature: vi.fn(),
};

const mockConfigService: IConfigService = {
  get: vi.fn(),
};

const mockUserService: IUserService = {
  hasPermission: vi.fn(),
  getUserPermissions: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('DashboardEmbedService', () => {
  let service: DashboardEmbedService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockConfigId = '00000000-0000-0000-0000-000000000001';
  const mockCrmDashboardId = 'crm-dashboard-1';

  const mockDashboardConfig: IDashboardConfig = {
    id: mockConfigId,
    tenantId: mockTenantId,
    name: 'Sales Dashboard',
    crmDashboardId: mockCrmDashboardId,
    embedUrl: 'https://crm.example.com/embed/dashboard-1',
    width: '100%',
    height: '600px',
    refreshInterval: 300,
    permissions: ['crm:view', 'crm:dashboard'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardEmbedService(
      mockConfigRepository,
      mockCrmAuthClient,
      mockConfigService,
      mockUserService,
      mockAuditService,
    );
  });

  describe('createDashboardConfig', () => {
    it('should create dashboard config successfully', async () => {
      (mockCrmAuthClient.validateDashboardAccess as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockConfigRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);

      const result = await service.createDashboardConfig(
        {
          name: 'Sales Dashboard',
          crmDashboardId: mockCrmDashboardId,
          embedUrl: 'https://crm.example.com/embed/dashboard-1',
          permissions: ['crm:view'],
        },
        mockTenantId,
        mockUserId,
      );

      expect(result.name).toBe('Sales Dashboard');
      expect(mockCrmAuthClient.validateDashboardAccess).toHaveBeenCalledWith(mockCrmDashboardId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dashboard_config_created' }),
      );
    });

    it('should throw error when CRM dashboard not accessible', async () => {
      (mockCrmAuthClient.validateDashboardAccess as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.createDashboardConfig(
          {
            name: 'Test',
            crmDashboardId: 'invalid-id',
            embedUrl: 'https://test.com',
          },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('CRM dashboard not found or not accessible');
    });
  });

  describe('updateDashboardConfig', () => {
    it('should update dashboard config successfully', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);
      (mockConfigRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockDashboardConfig,
        name: 'Updated Dashboard',
      });

      const result = await service.updateDashboardConfig(
        mockConfigId,
        { name: 'Updated Dashboard' },
        mockTenantId,
        mockUserId,
      );

      expect(result.name).toBe('Updated Dashboard');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dashboard_config_updated' }),
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);

      await expect(
        service.updateDashboardConfig(mockConfigId, { name: 'Test' }, 'other-tenant', mockUserId),
      ).rejects.toThrow('Access denied');
    });

    it('should validate new CRM dashboard when changed', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);
      (mockCrmAuthClient.validateDashboardAccess as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.updateDashboardConfig(
          mockConfigId,
          { crmDashboardId: 'new-dashboard-id' },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('CRM dashboard not found or not accessible');
    });
  });

  describe('deleteDashboardConfig', () => {
    it('should delete config successfully', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);

      await service.deleteDashboardConfig(mockConfigId, mockTenantId, mockUserId);

      expect(mockConfigRepository.delete).toHaveBeenCalledWith(mockConfigId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dashboard_config_deleted' }),
      );
    });
  });

  describe('generateEmbedToken', () => {
    it('should generate embed token successfully', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);
      (mockUserService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([
        'crm:view',
        'crm:dashboard',
        'admin',
      ]);
      (mockCrmAuthClient.generateEmbedSignature as ReturnType<typeof vi.fn>).mockResolvedValue('signature123');

      const result = await service.generateEmbedToken(
        { dashboardId: mockConfigId, expiresInMinutes: 60 },
        mockTenantId,
        mockUserId,
      );

      expect(result.token).toBeDefined();
      expect(result.dashboardId).toBe(mockConfigId);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'embed_token_generated' }),
      );
    });

    it('should throw error when dashboard not active', async () => {
      const inactiveConfig = { ...mockDashboardConfig, isActive: false };
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(inactiveConfig);

      await expect(
        service.generateEmbedToken(
          { dashboardId: mockConfigId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Dashboard is not active');
    });

    it('should throw error when user lacks permissions', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);
      (mockUserService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue(['other:permission']);

      await expect(
        service.generateEmbedToken(
          { dashboardId: mockConfigId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should allow access when config has no permission requirements', async () => {
      const noPermConfig = { ...mockDashboardConfig, permissions: [] };
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(noPermConfig);
      (mockUserService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockCrmAuthClient.generateEmbedSignature as ReturnType<typeof vi.fn>).mockResolvedValue('sig');

      const result = await service.generateEmbedToken(
        { dashboardId: mockConfigId },
        mockTenantId,
        mockUserId,
      );

      expect(result.token).toBeDefined();
    });
  });

  describe('getActiveDashboards', () => {
    it('should return dashboards user has access to', async () => {
      (mockConfigRepository.findActiveByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockDashboardConfig,
        { ...mockDashboardConfig, id: 'config-2', permissions: ['admin:only'] },
      ]);
      (mockUserService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue(['crm:view']);

      const result = await service.getActiveDashboards(mockTenantId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockConfigId);
    });

    it('should return all dashboards when user has all permissions', async () => {
      (mockConfigRepository.findActiveByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockDashboardConfig,
        { ...mockDashboardConfig, id: 'config-2', permissions: ['admin:only'] },
      ]);
      (mockUserService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([
        'crm:view',
        'admin:only',
      ]);

      const result = await service.getActiveDashboards(mockTenantId, mockUserId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getEmbedUrl', () => {
    it('should return embed URL with token', async () => {
      (mockConfigRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboardConfig);
      (mockUserService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue(['crm:view']);
      (mockCrmAuthClient.generateEmbedSignature as ReturnType<typeof vi.fn>).mockResolvedValue('sig');

      const result = await service.getEmbedUrl(mockConfigId, mockTenantId, mockUserId);

      expect(result.url).toContain(mockDashboardConfig.embedUrl);
      expect(result.url).toContain('token=');
      expect(result.config).toBeDefined();
    });
  });
});
