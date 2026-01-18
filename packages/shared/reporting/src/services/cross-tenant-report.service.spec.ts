import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CrossTenantReportService,
  ITenantRepository,
  ICrossReportDataProvider,
  IAuthorizationService,
  IAuditService,
} from './cross-tenant-report.service';
import { ReportType } from '../interfaces/reporting.interface';

const mockTenantRepository: ITenantRepository = {
  findById: vi.fn(),
  findByIds: vi.fn(),
};

const mockDataProvider: ICrossReportDataProvider = {
  executeQueryForTenants: vi.fn(),
  aggregateData: vi.fn(),
};

const mockAuthService: IAuthorizationService = {
  canAccessTenant: vi.fn(),
  getAccessibleTenants: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('CrossTenantReportService', () => {
  let service: CrossTenantReportService;

  const mockUserId = 'user-1';
  const mockUserTenantId = 'tenant-1';
  const mockTenantId1 = '00000000-0000-0000-0000-000000000001';
  const mockTenantId2 = '00000000-0000-0000-0000-000000000002';
  const mockTenantId3 = '00000000-0000-0000-0000-000000000003';

  const mockTenants = [
    { id: mockTenantId1, name: 'Budapest' },
    { id: mockTenantId2, name: 'Debrecen' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CrossTenantReportService(
      mockTenantRepository,
      mockDataProvider,
      mockAuthService,
      mockAuditService,
    );
  });

  describe('generateCrossReport', () => {
    it('should generate cross-tenant report successfully', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
        mockTenantId2,
      ]);
      (mockTenantRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue(mockTenants);
      (mockDataProvider.executeQueryForTenants as ReturnType<typeof vi.fn>).mockResolvedValue({
        [mockTenantId1]: [{ rentalCount: 10, totalRevenue: 100000 }],
        [mockTenantId2]: [{ rentalCount: 8, totalRevenue: 80000 }],
      });
      (mockDataProvider.aggregateData as ReturnType<typeof vi.fn>).mockReturnValue([
        { tenantName: 'Total', rentalCount: 18, totalRevenue: 180000 },
      ]);

      const result = await service.generateCrossReport(
        {
          reportType: 'RENTAL_SUMMARY',
          tenantIds: [mockTenantId1, mockTenantId2],
          dateRange: 'THIS_MONTH',
        },
        mockUserId,
        mockUserTenantId,
      );

      expect(result).toBeDefined();
      expect(result.tenants).toHaveLength(2);
      expect(result.dataByTenant[mockTenantId1]).toBeDefined();
      expect(result.dataByTenant[mockTenantId2]).toBeDefined();
      expect(result.aggregatedData).toHaveLength(1);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'cross_tenant_report_generated' }),
      );
    });

    it('should throw error when user has no access to tenant', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
      ]);

      await expect(
        service.generateCrossReport(
          {
            reportType: 'RENTAL_SUMMARY',
            tenantIds: [mockTenantId1, mockTenantId2],
            dateRange: 'THIS_MONTH',
          },
          mockUserId,
          mockUserTenantId,
        ),
      ).rejects.toThrow('Access denied to tenants');
    });

    it('should throw error when tenant not found', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
        mockTenantId3,
      ]);
      (mockTenantRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: mockTenantId1, name: 'Budapest' },
      ]);

      await expect(
        service.generateCrossReport(
          {
            reportType: 'SERVICE_SUMMARY',
            tenantIds: [mockTenantId1, mockTenantId3],
            dateRange: 'THIS_MONTH',
          },
          mockUserId,
          mockUserTenantId,
        ),
      ).rejects.toThrow('Tenants not found');
    });

    it('should use different aggregation methods', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
        mockTenantId2,
      ]);
      (mockTenantRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue(mockTenants);
      (mockDataProvider.executeQueryForTenants as ReturnType<typeof vi.fn>).mockResolvedValue({
        [mockTenantId1]: [],
        [mockTenantId2]: [],
      });
      (mockDataProvider.aggregateData as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await service.generateCrossReport(
        {
          reportType: 'SALES_SUMMARY',
          tenantIds: [mockTenantId1, mockTenantId2],
          dateRange: 'THIS_MONTH',
          aggregateBy: 'avg',
        },
        mockUserId,
        mockUserTenantId,
      );

      expect(mockDataProvider.aggregateData).toHaveBeenCalledWith(
        expect.any(Object),
        'avg',
        expect.any(Array),
      );
    });
  });

  describe('getAccessibleTenantsList', () => {
    it('should return list of accessible tenants', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
        mockTenantId2,
      ]);
      (mockTenantRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue(mockTenants);

      const result = await service.getAccessibleTenantsList(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('Budapest');
    });
  });

  describe('compareTenants', () => {
    it('should compare multiple tenants', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
        mockTenantId2,
      ]);
      (mockTenantRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue(mockTenants);
      (mockDataProvider.executeQueryForTenants as ReturnType<typeof vi.fn>).mockResolvedValue({
        [mockTenantId1]: [{ rentalCount: 10, totalRevenue: 100000, avgDuration: 3 }],
        [mockTenantId2]: [{ rentalCount: 8, totalRevenue: 80000, avgDuration: 2 }],
      });

      const result = await service.compareTenants(
        [mockTenantId1, mockTenantId2],
        ReportType.RENTAL_SUMMARY,
        'THIS_MONTH',
        mockUserId,
        mockUserTenantId,
      );

      expect(result.tenants).toHaveLength(2);
      expect(result.comparison[mockTenantId1]).toBeDefined();
      expect(result.comparison[mockTenantId2]).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant_comparison_generated' }),
      );
    });

    it('should throw error when user lacks access', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
      ]);

      await expect(
        service.compareTenants(
          [mockTenantId1, mockTenantId2],
          ReportType.RENTAL_SUMMARY,
          'THIS_MONTH',
          mockUserId,
          mockUserTenantId,
        ),
      ).rejects.toThrow('Access denied to tenants');
    });

    it('should handle custom date range', async () => {
      (mockAuthService.getAccessibleTenants as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockTenantId1,
      ]);
      (mockTenantRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: mockTenantId1, name: 'Budapest' },
      ]);
      (mockDataProvider.executeQueryForTenants as ReturnType<typeof vi.fn>).mockResolvedValue({
        [mockTenantId1]: [],
      });

      const result = await service.compareTenants(
        [mockTenantId1],
        ReportType.SERVICE_SUMMARY,
        'CUSTOM',
        mockUserId,
        mockUserTenantId,
        new Date('2026-01-01'),
        new Date('2026-01-15'),
      );

      expect(result).toBeDefined();
    });
  });
});
