/**
 * Reports Controller Tests
 * Epic 27: Story 27-2 - Részletes Riportok
 * Epic 27: Story 27-3 - Cross-Tenant Riportok
 *
 * Test-Each-Action: Minden endpoint tesztelése
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsController } from '../controllers/reports.controller';

// ============================================
// Mock Types
// ============================================

enum ReportType {
  RENTAL_SUMMARY = 'RENTAL_SUMMARY',
  SERVICE_SUMMARY = 'SERVICE_SUMMARY',
  SALES_SUMMARY = 'SALES_SUMMARY',
  INVENTORY_STATUS = 'INVENTORY_STATUS',
  FINANCIAL_OVERVIEW = 'FINANCIAL_OVERVIEW',
  CUSTOMER_ACTIVITY = 'CUSTOMER_ACTIVITY',
  EQUIPMENT_UTILIZATION = 'EQUIPMENT_UTILIZATION',
}

enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
  EXCEL = 'EXCEL',
}

interface IReportDefinition {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  category: string;
  columns: { field: string; header: string; type: string }[];
  defaultFilters: Record<string, unknown>;
  supportedFormats: ReportFormat[];
}

interface IReportResult {
  reportType: ReportType;
  reportName: string;
  columns: { field: string; header: string; type: string }[];
  data: Record<string, unknown>[];
  summary: Record<string, number>;
  metadata: {
    generatedAt: Date;
    totalCount: number;
    executionTime: number;
  };
  generatedAt: Date;
}

interface ICrossReportResult {
  reportType: ReportType;
  reportName: string;
  tenants: { id: string; name: string }[];
  aggregatedData: Record<string, unknown>[];
  tenantDetails: Record<string, Record<string, unknown>[]>;
  summary: Record<string, number>;
  generatedAt: Date;
}

// ============================================
// Mock Services
// ============================================

const mockReportService = {
  getAvailableReports: vi.fn(),
  getReportDefinition: vi.fn(),
  generateReport: vi.fn(),
};

const mockCrossTenantService = {
  generateCrossReport: vi.fn(),
  getAccessibleTenantsList: vi.fn(),
  compareTenants: vi.fn(),
};

// Mock Response
const mockResponse = () => {
  const res: any = {};
  res.set = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

// ============================================
// Test Suite
// ============================================

describe('ReportsController', () => {
  let controller: ReportsController;

  const testTenantId = 'tenant-001';
  const testUserId = 'user-001';

  const mockReportDefinition: IReportDefinition = {
    id: 'rental-summary',
    type: ReportType.RENTAL_SUMMARY,
    name: 'Bérlés összesítő',
    description: 'Bérlési statisztikák és bevételek',
    category: 'rental',
    columns: [
      { field: 'date', header: 'Dátum', type: 'date' },
      { field: 'rentalCount', header: 'Bérlések', type: 'number' },
      { field: 'totalRevenue', header: 'Bevétel', type: 'currency' },
    ],
    defaultFilters: {},
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV, ReportFormat.PDF, ReportFormat.EXCEL],
  };

  const mockReportResult: IReportResult = {
    reportType: ReportType.RENTAL_SUMMARY,
    reportName: 'Bérlés összesítő',
    columns: mockReportDefinition.columns,
    data: [
      { date: '2024-01-01', rentalCount: 15, totalRevenue: 450000 },
      { date: '2024-01-02', rentalCount: 22, totalRevenue: 680000 },
    ],
    summary: { totalRentals: 37, totalRevenue: 1130000 },
    metadata: {
      generatedAt: new Date(),
      totalCount: 2,
      executionTime: 45,
    },
    generatedAt: new Date(),
  };

  const mockCrossReportResult: ICrossReportResult = {
    reportType: ReportType.RENTAL_SUMMARY,
    reportName: 'Cross-tenant bérlés összesítő',
    tenants: [
      { id: 'tenant-001', name: 'Budapest' },
      { id: 'tenant-002', name: 'Debrecen' },
    ],
    aggregatedData: [{ totalRevenue: 2500000, totalRentals: 120 }],
    tenantDetails: {
      'tenant-001': [{ revenue: 1500000, rentals: 70 }],
      'tenant-002': [{ revenue: 1000000, rentals: 50 }],
    },
    summary: { totalRevenue: 2500000, totalRentals: 120 },
    generatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new ReportsController(mockReportService as any, mockCrossTenantService as any);
  });

  // ============================================
  // GET /reports - List available reports
  // ============================================

  describe('GET /reports', () => {
    it('should return available reports for tenant', async () => {
      mockReportService.getAvailableReports.mockResolvedValue([mockReportDefinition]);

      const result = await controller.listReports(testTenantId);

      expect(mockReportService.getAvailableReports).toHaveBeenCalledWith(testTenantId);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReportType.RENTAL_SUMMARY);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.listReports('')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array for tenant with no reports', async () => {
      mockReportService.getAvailableReports.mockResolvedValue([]);

      const result = await controller.listReports(testTenantId);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // GET /reports/:type - Get report definition
  // ============================================

  describe('GET /reports/:type', () => {
    it('should return report definition by type', async () => {
      mockReportService.getReportDefinition.mockResolvedValue(mockReportDefinition);

      const result = await controller.getReportDefinition('RENTAL_SUMMARY');

      expect(mockReportService.getReportDefinition).toHaveBeenCalledWith('RENTAL_SUMMARY');
      expect(result.name).toBe('Bérlés összesítő');
    });

    it('should throw NotFoundException for unknown report type', async () => {
      mockReportService.getReportDefinition.mockResolvedValue(null);

      await expect(controller.getReportDefinition('INVALID_TYPE')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ============================================
  // POST /reports/generate - Generate report
  // ============================================

  describe('POST /reports/generate', () => {
    const generateInput = {
      reportType: 'RENTAL_SUMMARY' as const,
      dateRange: 'THIS_MONTH' as const,
    };

    it('should generate report and return JSON result', async () => {
      mockReportService.generateReport.mockResolvedValue(mockReportResult);
      const res = mockResponse();

      const result = await controller.generateReport(generateInput, testTenantId, testUserId, res);

      expect(mockReportService.generateReport).toHaveBeenCalledWith(
        generateInput,
        testTenantId,
        testUserId
      );
      expect(result).toEqual(mockReportResult);
    });

    it('should return buffer for export formats', async () => {
      const exportInput = { ...generateInput, format: 'CSV' as const };
      const csvBuffer = Buffer.from('header1,header2\nval1,val2');
      mockReportService.generateReport.mockResolvedValue(csvBuffer);
      const res = mockResponse();

      await controller.generateReport(exportInput, testTenantId, testUserId, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'text/csv',
        })
      );
      expect(res.send).toHaveBeenCalledWith(csvBuffer);
    });

    it('should throw BadRequestException without tenantId', async () => {
      const res = mockResponse();
      await expect(controller.generateReport(generateInput, '', testUserId, res)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      const res = mockResponse();
      await expect(controller.generateReport(generateInput, testTenantId, '', res)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException for unknown report type', async () => {
      mockReportService.generateReport.mockRejectedValue(new Error('Unknown report type: INVALID'));
      const res = mockResponse();

      await expect(
        controller.generateReport(
          { ...generateInput, reportType: 'INVALID' as any },
          testTenantId,
          testUserId,
          res
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for validation errors', async () => {
      mockReportService.generateReport.mockRejectedValue(new Error('Validation failed'));
      const res = mockResponse();

      await expect(
        controller.generateReport(generateInput, testTenantId, testUserId, res)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET /reports/:type/export/:format - Export report
  // ============================================

  describe('GET /reports/:type/export/:format', () => {
    it('should export report to CSV', async () => {
      const csvBuffer = Buffer.from('date,count\n2024-01-01,15');
      mockReportService.generateReport.mockResolvedValue(csvBuffer);
      const res = mockResponse();

      await controller.exportReport(
        'RENTAL_SUMMARY',
        'csv',
        testTenantId,
        testUserId,
        undefined,
        undefined,
        undefined,
        res
      );

      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="report-RENTAL_SUMMARY.csv"',
      });
      expect(res.send).toHaveBeenCalledWith(csvBuffer);
    });

    it('should export report to PDF', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4');
      mockReportService.generateReport.mockResolvedValue(pdfBuffer);
      const res = mockResponse();

      await controller.exportReport(
        'RENTAL_SUMMARY',
        'pdf',
        testTenantId,
        testUserId,
        undefined,
        undefined,
        undefined,
        res
      );

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
        })
      );
    });

    it('should export report to Excel', async () => {
      const excelBuffer = Buffer.from('<?xml');
      mockReportService.generateReport.mockResolvedValue(excelBuffer);
      const res = mockResponse();

      await controller.exportReport(
        'RENTAL_SUMMARY',
        'excel',
        testTenantId,
        testUserId,
        undefined,
        undefined,
        undefined,
        res
      );

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
    });

    it('should throw BadRequestException for invalid format', async () => {
      await expect(
        controller.exportReport(
          'RENTAL_SUMMARY',
          'invalid',
          testTenantId,
          testUserId,
          undefined,
          undefined,
          undefined,
          mockResponse()
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(
        controller.exportReport(
          'RENTAL_SUMMARY',
          'csv',
          '',
          testUserId,
          undefined,
          undefined,
          undefined,
          mockResponse()
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // POST /reports/cross-tenant - Generate cross-tenant report
  // ============================================

  describe('POST /reports/cross-tenant', () => {
    const crossTenantInput = {
      tenantIds: ['tenant-001', 'tenant-002'],
      reportType: 'RENTAL_SUMMARY' as const,
      dateRange: 'THIS_MONTH' as const,
      aggregateBy: 'sum' as const,
    };

    it('should generate cross-tenant report', async () => {
      mockCrossTenantService.generateCrossReport.mockResolvedValue(mockCrossReportResult);

      const result = await controller.generateCrossTenantReport(
        crossTenantInput,
        testTenantId,
        testUserId
      );

      expect(mockCrossTenantService.generateCrossReport).toHaveBeenCalledWith(
        crossTenantInput,
        testUserId,
        testTenantId
      );
      expect(result.tenants).toHaveLength(2);
      expect(result.summary.totalRevenue).toBe(2500000);
    });

    it('should throw ForbiddenException for unauthorized tenants', async () => {
      mockCrossTenantService.generateCrossReport.mockRejectedValue(
        new Error('Access denied to tenant tenant-003')
      );

      await expect(
        controller.generateCrossTenantReport(
          { ...crossTenantInput, tenantIds: ['tenant-001', 'tenant-003'] },
          testTenantId,
          testUserId
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(
        controller.generateCrossTenantReport(crossTenantInput, '', testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for validation errors', async () => {
      mockCrossTenantService.generateCrossReport.mockRejectedValue(
        new Error('Validation failed: at least 2 tenants required')
      );

      await expect(
        controller.generateCrossTenantReport(crossTenantInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET /reports/cross-tenant/tenants - List accessible tenants
  // ============================================

  describe('GET /reports/cross-tenant/tenants', () => {
    it('should return accessible tenants', async () => {
      const tenants = [
        { id: 'tenant-001', name: 'Budapest' },
        { id: 'tenant-002', name: 'Debrecen' },
      ];
      mockCrossTenantService.getAccessibleTenantsList.mockResolvedValue(tenants);

      const result = await controller.listAccessibleTenants(testUserId);

      expect(mockCrossTenantService.getAccessibleTenantsList).toHaveBeenCalledWith(testUserId);
      expect(result).toHaveLength(2);
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.listAccessibleTenants('')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array for user with no access', async () => {
      mockCrossTenantService.getAccessibleTenantsList.mockResolvedValue([]);

      const result = await controller.listAccessibleTenants(testUserId);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // POST /reports/cross-tenant/compare - Compare tenants
  // ============================================

  describe('POST /reports/cross-tenant/compare', () => {
    const compareInput = {
      tenantIds: ['tenant-001', 'tenant-002'],
      reportType: 'RENTAL_SUMMARY',
      dateRange: 'THIS_MONTH',
    };

    it('should compare tenant metrics', async () => {
      const comparison = {
        tenants: [
          { id: 'tenant-001', name: 'Budapest' },
          { id: 'tenant-002', name: 'Debrecen' },
        ],
        comparison: {
          'tenant-001': { revenue: 1500000, rentals: 70 },
          'tenant-002': { revenue: 1000000, rentals: 50 },
        },
      };
      mockCrossTenantService.compareTenants.mockResolvedValue(comparison);

      const result = await controller.compareTenants(compareInput, testTenantId, testUserId);

      expect(mockCrossTenantService.compareTenants).toHaveBeenCalledWith(
        compareInput.tenantIds,
        'RENTAL_SUMMARY',
        'THIS_MONTH',
        testUserId,
        testTenantId,
        undefined,
        undefined
      );
      expect(result.tenants).toHaveLength(2);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      mockCrossTenantService.compareTenants.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.compareTenants(compareInput, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.compareTenants(compareInput, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should use custom date range when provided', async () => {
      const inputWithDates = {
        ...compareInput,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      mockCrossTenantService.compareTenants.mockResolvedValue({
        tenants: [],
        comparison: {},
      });

      await controller.compareTenants(inputWithDates, testTenantId, testUserId);

      expect(mockCrossTenantService.compareTenants).toHaveBeenCalledWith(
        compareInput.tenantIds,
        'RENTAL_SUMMARY',
        'THIS_MONTH',
        testUserId,
        testTenantId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });
  });
});
