import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReportService,
  IReportRepository,
  IReportDataProvider,
  IReportExporter,
  IAuditService,
} from './report.service';
import { ReportType, ReportFormat } from '../interfaces/reporting.interface';

const mockReportRepository: IReportRepository = {
  findById: vi.fn(),
  findByType: vi.fn(),
  findByTenantId: vi.fn(),
  findSystemReports: vi.fn(),
};

const mockDataProvider: IReportDataProvider = {
  executeQuery: vi.fn(),
  calculateSummary: vi.fn(),
};

const mockExporter: IReportExporter = {
  exportToCsv: vi.fn(),
  exportToPdf: vi.fn(),
  exportToExcel: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('ReportService', () => {
  let service: ReportService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportService(
      mockReportRepository,
      mockDataProvider,
      mockExporter,
      mockAuditService,
    );
  });

  describe('generateReport', () => {
    it('should generate a rental summary report', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { date: '2026-01-15', rentalCount: 5, totalRevenue: 50000 },
          { date: '2026-01-16', rentalCount: 8, totalRevenue: 75000 },
        ],
        totalCount: 2,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
        totalRentals: 13,
        totalRevenue: 125000,
      });

      const result = await service.generateReport(
        {
          reportType: 'RENTAL_SUMMARY',
          dateRange: 'THIS_MONTH',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect('data' in result && result.data).toHaveLength(2);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'report_generated' }),
      );
    });

    it('should generate a service summary report', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ date: '2026-01-15', worksheetCount: 10, completedCount: 8 }],
        totalCount: 1,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
        totalWorksheets: 10,
        completionRate: 80,
      });

      const result = await service.generateReport(
        {
          reportType: 'SERVICE_SUMMARY',
          dateRange: 'THIS_WEEK',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect('reportName' in result && result.reportName).toBe('Szerviz összesítő');
    });

    it('should export to CSV when requested', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ date: '2026-01-15', invoiceCount: 5 }],
        totalCount: 1,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({});
      const csvBuffer = Buffer.from('date,invoiceCount\n2026-01-15,5');
      (mockExporter.exportToCsv as ReturnType<typeof vi.fn>).mockResolvedValue(csvBuffer);

      const result = await service.generateReport(
        {
          reportType: 'SALES_SUMMARY',
          dateRange: 'THIS_MONTH',
          format: 'CSV',
        },
        mockTenantId,
        mockUserId,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(mockExporter.exportToCsv).toHaveBeenCalled();
    });

    it('should export to PDF when requested', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        totalCount: 0,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({});
      const pdfBuffer = Buffer.from('PDF content');
      (mockExporter.exportToPdf as ReturnType<typeof vi.fn>).mockResolvedValue(pdfBuffer);

      const result = await service.generateReport(
        {
          reportType: 'INVENTORY_STATUS',
          dateRange: 'TODAY',
          format: 'PDF',
        },
        mockTenantId,
        mockUserId,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(mockExporter.exportToPdf).toHaveBeenCalled();
    });

    it('should export to Excel when requested', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        totalCount: 0,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({});
      const excelBuffer = Buffer.from('Excel content');
      (mockExporter.exportToExcel as ReturnType<typeof vi.fn>).mockResolvedValue(excelBuffer);

      const result = await service.generateReport(
        {
          reportType: 'FINANCIAL_OVERVIEW',
          dateRange: 'THIS_YEAR',
          format: 'EXCEL',
        },
        mockTenantId,
        mockUserId,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(mockExporter.exportToExcel).toHaveBeenCalled();
    });

    it('should handle custom date range', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        totalCount: 0,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.generateReport(
        {
          reportType: 'CUSTOMER_ACTIVITY',
          dateRange: 'CUSTOM',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-15'),
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect('parameters' in result && result.parameters.dateRange).toBe('CUSTOM');
    });

    it('should throw error for invalid custom date range', async () => {
      await expect(
        service.generateReport(
          {
            reportType: 'RENTAL_SUMMARY',
            dateRange: 'CUSTOM',
          },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Custom date range requires startDate and endDate');
    });

    it('should respect pagination parameters', async () => {
      (mockDataProvider.executeQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ date: '2026-01-15' }],
        totalCount: 100,
      });
      (mockDataProvider.calculateSummary as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.generateReport(
        {
          reportType: 'EQUIPMENT_UTILIZATION',
          dateRange: 'THIS_MONTH',
          limit: 50,
          offset: 10,
        },
        mockTenantId,
        mockUserId,
      );

      expect(mockDataProvider.executeQuery).toHaveBeenCalledWith(
        mockTenantId,
        ReportType.EQUIPMENT_UTILIZATION,
        {},
        expect.any(Date),
        expect.any(Date),
        50,
        10,
      );
    });
  });

  describe('getAvailableReports', () => {
    it('should return system and tenant reports', async () => {
      (mockReportRepository.findSystemReports as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'system-1', name: 'System Report', isSystem: true },
      ]);
      (mockReportRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'tenant-1', name: 'Custom Report', isSystem: false },
      ]);

      const result = await service.getAvailableReports(mockTenantId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getReportDefinition', () => {
    it('should return built-in definition for known report type', async () => {
      (mockReportRepository.findByType as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getReportDefinition(ReportType.RENTAL_SUMMARY);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Bérlés összesítő');
      expect(result?.columns.length).toBeGreaterThan(0);
    });

    it('should return custom definition if exists', async () => {
      const customReport = {
        id: 'custom-1',
        tenantId: mockTenantId,
        name: 'Custom Rental Report',
        type: ReportType.RENTAL_SUMMARY,
        parameters: [],
        columns: [],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockReportRepository.findByType as ReturnType<typeof vi.fn>).mockResolvedValue(customReport);

      const result = await service.getReportDefinition(ReportType.RENTAL_SUMMARY);

      expect(result?.name).toBe('Custom Rental Report');
    });
  });
});
