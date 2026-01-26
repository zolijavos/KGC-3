/**
 * Twenty CRM Controller Tests
 * Epic 28: Twenty CRM Integration
 *
 * Tests for partner sync and dashboard embed API endpoints
 */

import {
  EntityType,
  IDashboardConfig,
  IEmbedToken,
  IPartnerMapping,
  ISyncResult,
  SyncDirection,
  SyncStatus,
} from '@kgc/twenty-crm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TwentyCrmController } from '../controllers/twenty-crm.controller';

// ============================================
// Mock Services
// ============================================

const mockPartnerSyncService = {
  syncPartners: vi.fn(),
  createMapping: vi.fn(),
  getMappings: vi.fn(),
  deleteMapping: vi.fn(),
  autoLinkByEmail: vi.fn(),
};

const mockDashboardEmbedService = {
  createDashboardConfig: vi.fn(),
  getDashboardConfigs: vi.fn(),
  getActiveDashboards: vi.fn(),
  getDashboardById: vi.fn(),
  updateDashboardConfig: vi.fn(),
  deleteDashboardConfig: vi.fn(),
  generateEmbedToken: vi.fn(),
  getEmbedUrl: vi.fn(),
};

// ============================================
// Test Data
// ============================================

const testTenantId = 'tenant-001';
const testUserId = 'user-001';
const testKgcPartnerId = '00000000-0000-0000-0000-000000000001';
const testCrmPartnerId = 'crm-partner-1';
const testMappingId = '00000000-0000-0000-0000-000000000002';
const testDashboardId = '00000000-0000-0000-0000-000000000003';

const mockMapping: IPartnerMapping = {
  id: testMappingId,
  tenantId: testTenantId,
  kgcPartnerId: testKgcPartnerId,
  crmPartnerId: testCrmPartnerId,
  syncStatus: SyncStatus.COMPLETED,
  lastSyncedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSyncResult: ISyncResult = {
  direction: SyncDirection.KGC_TO_CRM,
  entityType: EntityType.PARTNER,
  totalCount: 5,
  successCount: 4,
  failedCount: 1,
  skippedCount: 0,
  errors: [{ entityId: 'p-fail', entityType: EntityType.PARTNER, error: 'CRM API error' }],
  startedAt: new Date(),
  completedAt: new Date(),
  durationMs: 1234,
};

const mockDashboardConfig: IDashboardConfig = {
  id: testDashboardId,
  tenantId: testTenantId,
  name: 'Sales Dashboard',
  crmDashboardId: 'crm-dashboard-1',
  embedUrl: 'https://crm.example.com/embed/dashboard-1',
  width: '100%',
  height: '600px',
  refreshInterval: 300,
  permissions: ['crm:view', 'crm:dashboard'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEmbedToken: IEmbedToken = {
  token: 'eyJhbGciOiJIUzI1NiJ9.mock-token-content.signature',
  expiresAt: new Date(Date.now() + 3600000),
  dashboardId: testDashboardId,
  permissions: ['crm:view'],
};

// ============================================
// Test Suite
// ============================================

describe('TwentyCrmController', () => {
  let controller: TwentyCrmController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new TwentyCrmController(
      mockPartnerSyncService as any,
      mockDashboardEmbedService as any
    );
  });

  // ============================================
  // Story 28-1: Partner Sync Endpoints
  // ============================================

  describe('POST /twenty-crm/sync/partners', () => {
    const syncInput = { direction: 'KGC_TO_CRM' as const, includeContacts: true };

    it('should sync partners successfully', async () => {
      mockPartnerSyncService.syncPartners.mockResolvedValue(mockSyncResult);

      const result = await controller.syncPartners(syncInput, testTenantId, testUserId);

      expect(mockPartnerSyncService.syncPartners).toHaveBeenCalledWith(
        syncInput,
        testTenantId,
        testUserId
      );
      expect(result.successCount).toBe(4);
      expect(result.failedCount).toBe(1);
      expect(result.totalCount).toBe(5);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.syncPartners(syncInput, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.syncPartners(syncInput, testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException on validation error', async () => {
      mockPartnerSyncService.syncPartners.mockRejectedValue(
        new Error('Validation failed: invalid direction')
      );

      await expect(
        controller.syncPartners({ direction: 'INVALID' as any }, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle bidirectional sync', async () => {
      const biSyncResult = { ...mockSyncResult, direction: SyncDirection.BIDIRECTIONAL };
      mockPartnerSyncService.syncPartners.mockResolvedValue(biSyncResult);

      const result = await controller.syncPartners(
        { direction: 'BIDIRECTIONAL' },
        testTenantId,
        testUserId
      );

      expect(result.direction).toBe(SyncDirection.BIDIRECTIONAL);
    });
  });

  describe('POST /twenty-crm/mappings', () => {
    const createMappingInput = {
      kgcPartnerId: testKgcPartnerId,
      crmPartnerId: testCrmPartnerId,
    };

    it('should create mapping successfully', async () => {
      mockPartnerSyncService.createMapping.mockResolvedValue(mockMapping);

      const result = await controller.createMapping(createMappingInput, testTenantId, testUserId);

      expect(mockPartnerSyncService.createMapping).toHaveBeenCalledWith(
        createMappingInput,
        testTenantId,
        testUserId
      );
      expect(result.kgcPartnerId).toBe(testKgcPartnerId);
      expect(result.crmPartnerId).toBe(testCrmPartnerId);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.createMapping(createMappingInput, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if mapping already exists', async () => {
      mockPartnerSyncService.createMapping.mockRejectedValue(
        new Error('Partner mapping already exists')
      );

      await expect(
        controller.createMapping(createMappingInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if KGC partner not found', async () => {
      mockPartnerSyncService.createMapping.mockRejectedValue(new Error('KGC partner not found'));

      await expect(
        controller.createMapping(createMappingInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if CRM partner not found', async () => {
      mockPartnerSyncService.createMapping.mockRejectedValue(new Error('CRM partner not found'));

      await expect(
        controller.createMapping(createMappingInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /twenty-crm/mappings', () => {
    it('should return all mappings for tenant', async () => {
      mockPartnerSyncService.getMappings.mockResolvedValue([mockMapping]);

      const result = await controller.getMappings(testTenantId);

      expect(mockPartnerSyncService.getMappings).toHaveBeenCalledWith(testTenantId);
      expect(result).toHaveLength(1);
      expect(result[0]?.syncStatus).toBe(SyncStatus.COMPLETED);
    });

    it('should return empty array when no mappings', async () => {
      mockPartnerSyncService.getMappings.mockResolvedValue([]);

      const result = await controller.getMappings(testTenantId);

      expect(result).toEqual([]);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getMappings('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /twenty-crm/mappings/:id', () => {
    it('should delete mapping successfully', async () => {
      mockPartnerSyncService.deleteMapping.mockResolvedValue(undefined);

      await controller.deleteMapping(testMappingId, testTenantId, testUserId);

      expect(mockPartnerSyncService.deleteMapping).toHaveBeenCalledWith(
        testMappingId,
        testTenantId,
        testUserId
      );
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.deleteMapping(testMappingId, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException if mapping not found', async () => {
      mockPartnerSyncService.deleteMapping.mockRejectedValue(new Error('Mapping not found'));

      await expect(
        controller.deleteMapping(testMappingId, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockPartnerSyncService.deleteMapping.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.deleteMapping(testMappingId, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /twenty-crm/auto-link', () => {
    it('should auto-link partners by email', async () => {
      mockPartnerSyncService.autoLinkByEmail.mockResolvedValue({
        linked: 10,
        skipped: 5,
        errors: [],
      });

      const result = await controller.autoLinkByEmail(testTenantId, testUserId);

      expect(mockPartnerSyncService.autoLinkByEmail).toHaveBeenCalledWith(testTenantId, testUserId);
      expect(result.linked).toBe(10);
      expect(result.skipped).toBe(5);
    });

    it('should handle errors during auto-link', async () => {
      mockPartnerSyncService.autoLinkByEmail.mockResolvedValue({
        linked: 5,
        skipped: 3,
        errors: ['Failed to link Partner A: duplicate email'],
      });

      const result = await controller.autoLinkByEmail(testTenantId, testUserId);

      expect(result.errors).toHaveLength(1);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.autoLinkByEmail('', testUserId)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // Story 28-2: Dashboard Embed Endpoints
  // ============================================

  describe('POST /twenty-crm/dashboards', () => {
    const createDashboardInput = {
      name: 'Sales Dashboard',
      crmDashboardId: 'crm-dashboard-1',
      embedUrl: 'https://crm.example.com/embed/dashboard-1',
      permissions: ['crm:view'],
    };

    it('should create dashboard config successfully', async () => {
      mockDashboardEmbedService.createDashboardConfig.mockResolvedValue(mockDashboardConfig);

      const result = await controller.createDashboardConfig(
        createDashboardInput,
        testTenantId,
        testUserId
      );

      expect(mockDashboardEmbedService.createDashboardConfig).toHaveBeenCalledWith(
        createDashboardInput,
        testTenantId,
        testUserId
      );
      expect(result.name).toBe('Sales Dashboard');
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(
        controller.createDashboardConfig(createDashboardInput, '', testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if CRM dashboard not accessible', async () => {
      mockDashboardEmbedService.createDashboardConfig.mockRejectedValue(
        new Error('CRM dashboard not found or not accessible')
      );

      await expect(
        controller.createDashboardConfig(createDashboardInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on validation error', async () => {
      mockDashboardEmbedService.createDashboardConfig.mockRejectedValue(
        new Error('Validation failed: name is required')
      );

      await expect(
        controller.createDashboardConfig(
          { ...createDashboardInput, name: '' },
          testTenantId,
          testUserId
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /twenty-crm/dashboards', () => {
    it('should return all dashboard configs', async () => {
      mockDashboardEmbedService.getDashboardConfigs.mockResolvedValue([mockDashboardConfig]);

      const result = await controller.getDashboardConfigs(testTenantId);

      expect(mockDashboardEmbedService.getDashboardConfigs).toHaveBeenCalledWith(testTenantId);
      expect(result).toHaveLength(1);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getDashboardConfigs('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /twenty-crm/dashboards/active', () => {
    it('should return active dashboards for user', async () => {
      mockDashboardEmbedService.getActiveDashboards.mockResolvedValue([mockDashboardConfig]);

      const result = await controller.getActiveDashboards(testTenantId, testUserId);

      expect(mockDashboardEmbedService.getActiveDashboards).toHaveBeenCalledWith(
        testTenantId,
        testUserId
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.isActive).toBe(true);
    });

    it('should return empty array when user has no access', async () => {
      mockDashboardEmbedService.getActiveDashboards.mockResolvedValue([]);

      const result = await controller.getActiveDashboards(testTenantId, testUserId);

      expect(result).toEqual([]);
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.getActiveDashboards(testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('GET /twenty-crm/dashboards/:id', () => {
    it('should return dashboard by ID', async () => {
      mockDashboardEmbedService.getDashboardById.mockResolvedValue(mockDashboardConfig);

      const result = await controller.getDashboardById(testDashboardId, testTenantId);

      expect(mockDashboardEmbedService.getDashboardById).toHaveBeenCalledWith(
        testDashboardId,
        testTenantId
      );
      expect(result.id).toBe(testDashboardId);
    });

    it('should throw NotFoundException if not found', async () => {
      mockDashboardEmbedService.getDashboardById.mockResolvedValue(null);

      await expect(controller.getDashboardById(testDashboardId, testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDashboardEmbedService.getDashboardById.mockRejectedValue(new Error('Access denied'));

      await expect(controller.getDashboardById(testDashboardId, testTenantId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('PATCH /twenty-crm/dashboards/:id', () => {
    const updateInput = { name: 'Updated Dashboard', isActive: false };

    it('should update dashboard config successfully', async () => {
      const updated = { ...mockDashboardConfig, name: 'Updated Dashboard', isActive: false };
      mockDashboardEmbedService.updateDashboardConfig.mockResolvedValue(updated);

      const result = await controller.updateDashboardConfig(
        testDashboardId,
        updateInput,
        testTenantId,
        testUserId
      );

      expect(result.name).toBe('Updated Dashboard');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if not found', async () => {
      mockDashboardEmbedService.updateDashboardConfig.mockRejectedValue(
        new Error('Dashboard config not found')
      );

      await expect(
        controller.updateDashboardConfig(testDashboardId, updateInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDashboardEmbedService.updateDashboardConfig.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.updateDashboardConfig(testDashboardId, updateInput, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException on new CRM dashboard not accessible', async () => {
      mockDashboardEmbedService.updateDashboardConfig.mockRejectedValue(
        new Error('CRM dashboard not found or not accessible')
      );

      await expect(
        controller.updateDashboardConfig(
          testDashboardId,
          { crmDashboardId: 'new-invalid' },
          testTenantId,
          testUserId
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /twenty-crm/dashboards/:id', () => {
    it('should delete dashboard config successfully', async () => {
      mockDashboardEmbedService.deleteDashboardConfig.mockResolvedValue(undefined);

      await controller.deleteDashboardConfig(testDashboardId, testTenantId, testUserId);

      expect(mockDashboardEmbedService.deleteDashboardConfig).toHaveBeenCalledWith(
        testDashboardId,
        testTenantId,
        testUserId
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockDashboardEmbedService.deleteDashboardConfig.mockRejectedValue(
        new Error('Dashboard config not found')
      );

      await expect(
        controller.deleteDashboardConfig(testDashboardId, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDashboardEmbedService.deleteDashboardConfig.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.deleteDashboardConfig(testDashboardId, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /twenty-crm/dashboards/:id/token', () => {
    it('should generate embed token successfully', async () => {
      mockDashboardEmbedService.generateEmbedToken.mockResolvedValue(mockEmbedToken);

      const result = await controller.generateEmbedToken(
        testDashboardId,
        { expiresInMinutes: 120 },
        testTenantId,
        testUserId
      );

      expect(mockDashboardEmbedService.generateEmbedToken).toHaveBeenCalledWith(
        { dashboardId: testDashboardId, expiresInMinutes: 120 },
        testTenantId,
        testUserId
      );
      expect(result.token).toBeDefined();
      expect(result.dashboardId).toBe(testDashboardId);
    });

    it('should use default expiration when not provided', async () => {
      mockDashboardEmbedService.generateEmbedToken.mockResolvedValue(mockEmbedToken);

      await controller.generateEmbedToken(testDashboardId, {}, testTenantId, testUserId);

      expect(mockDashboardEmbedService.generateEmbedToken).toHaveBeenCalledWith(
        { dashboardId: testDashboardId, expiresInMinutes: 60 },
        testTenantId,
        testUserId
      );
    });

    it('should throw BadRequestException if dashboard not active', async () => {
      mockDashboardEmbedService.generateEmbedToken.mockRejectedValue(
        new Error('Dashboard is not active')
      );

      await expect(
        controller.generateEmbedToken(testDashboardId, {}, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException on insufficient permissions', async () => {
      mockDashboardEmbedService.generateEmbedToken.mockRejectedValue(
        new Error('Insufficient permissions to access dashboard')
      );

      await expect(
        controller.generateEmbedToken(testDashboardId, {}, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      mockDashboardEmbedService.generateEmbedToken.mockRejectedValue(
        new Error('Dashboard config not found')
      );

      await expect(
        controller.generateEmbedToken(testDashboardId, {}, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /twenty-crm/dashboards/:id/embed', () => {
    it('should return embed URL with token', async () => {
      mockDashboardEmbedService.getEmbedUrl.mockResolvedValue({
        url: 'https://crm.example.com/embed/dashboard-1?token=mock-token',
        token: 'mock-token',
        config: mockDashboardConfig,
      });

      const result = await controller.getEmbedUrl(testDashboardId, testTenantId, testUserId);

      expect(mockDashboardEmbedService.getEmbedUrl).toHaveBeenCalledWith(
        testDashboardId,
        testTenantId,
        testUserId
      );
      expect(result.url).toContain('token=');
      expect(result.token).toBe('mock-token');
      expect(result.config).toBeDefined();
    });

    it('should throw NotFoundException if not found', async () => {
      mockDashboardEmbedService.getEmbedUrl.mockRejectedValue(
        new Error('Dashboard config not found')
      );

      await expect(
        controller.getEmbedUrl(testDashboardId, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dashboard not active', async () => {
      mockDashboardEmbedService.getEmbedUrl.mockRejectedValue(new Error('Dashboard is not active'));

      await expect(
        controller.getEmbedUrl(testDashboardId, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockDashboardEmbedService.getEmbedUrl.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.getEmbedUrl(testDashboardId, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
