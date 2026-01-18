import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DashboardWidgetService,
  IWidgetRepository,
  IDataSourceProvider,
  IAuditService,
} from './dashboard-widget.service';
import { IWidgetConfig, WidgetType } from '../interfaces/reporting.interface';

const mockWidgetRepository: IWidgetRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByTenantId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockDataSourceProvider: IDataSourceProvider = {
  getCounterData: vi.fn(),
  getChartData: vi.fn(),
  getTableData: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('DashboardWidgetService', () => {
  let service: DashboardWidgetService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockWidgetId = '00000000-0000-0000-0000-000000000001';

  const mockWidget: IWidgetConfig = {
    id: mockWidgetId,
    tenantId: mockTenantId,
    type: WidgetType.COUNTER,
    title: 'Napi bérlések',
    dataSource: 'rentals.daily.count',
    refreshInterval: 60,
    position: { row: 0, col: 0, width: 3, height: 2 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardWidgetService(
      mockWidgetRepository,
      mockDataSourceProvider,
      mockAuditService,
    );
  });

  describe('createWidget', () => {
    it('should create a widget successfully', async () => {
      (mockWidgetRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockWidgetRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidget);

      const result = await service.createWidget(
        {
          type: 'COUNTER',
          title: 'Napi bérlések',
          dataSource: 'rentals.daily.count',
          refreshInterval: 60,
          position: { row: 0, col: 0, width: 3, height: 2 },
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.type).toBe(WidgetType.COUNTER);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'widget_created' }),
      );
    });

    it('should throw error when position overlaps', async () => {
      (mockWidgetRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockWidget]);

      await expect(
        service.createWidget(
          {
            type: 'COUNTER',
            title: 'New Widget',
            dataSource: 'test',
            position: { row: 0, col: 0, width: 3, height: 2 },
          },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Widget position overlaps');
    });

    it('should allow non-overlapping positions', async () => {
      (mockWidgetRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockWidget]);
      (mockWidgetRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockWidget,
        id: 'new-widget',
        position: { row: 0, col: 4, width: 3, height: 2 },
      });

      const result = await service.createWidget(
        {
          type: 'CHART_BAR',
          title: 'New Widget',
          dataSource: 'test',
          position: { row: 0, col: 4, width: 3, height: 2 },
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('updateWidget', () => {
    it('should update a widget successfully', async () => {
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidget);
      (mockWidgetRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockWidget]);
      (mockWidgetRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockWidget,
        title: 'Updated Title',
      });

      const result = await service.updateWidget(
        mockWidgetId,
        { title: 'Updated Title' },
        mockTenantId,
        mockUserId,
      );

      expect(result.title).toBe('Updated Title');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'widget_updated' }),
      );
    });

    it('should throw error when widget not found', async () => {
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.updateWidget(mockWidgetId, { title: 'Test' }, mockTenantId, mockUserId),
      ).rejects.toThrow('Widget not found');
    });

    it('should throw error on tenant mismatch', async () => {
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidget);

      await expect(
        service.updateWidget(mockWidgetId, { title: 'Test' }, 'other-tenant', mockUserId),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteWidget', () => {
    it('should delete a widget successfully', async () => {
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidget);

      await service.deleteWidget(mockWidgetId, mockTenantId, mockUserId);

      expect(mockWidgetRepository.delete).toHaveBeenCalledWith(mockWidgetId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'widget_deleted' }),
      );
    });
  });

  describe('getWidgetData', () => {
    it('should return counter data with trend', async () => {
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidget);
      (mockDataSourceProvider.getCounterData as ReturnType<typeof vi.fn>).mockResolvedValue({
        value: 150,
        previousValue: 120,
      });

      const result = await service.getWidgetData(
        { widgetId: mockWidgetId, dateRange: 'THIS_MONTH' },
        mockTenantId,
      );

      expect(result.value).toBe(150);
      expect(result.previousValue).toBe(120);
      expect(result.trend).toBe('up');
      expect(result.changePercent).toBeCloseTo(25, 1);
    });

    it('should return chart data for chart widgets', async () => {
      const chartWidget = { ...mockWidget, type: WidgetType.CHART_BAR };
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(chartWidget);
      (mockDataSourceProvider.getChartData as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: 'Bérlés', data: [{ label: 'Hétfő', value: 10 }], color: '#3b82f6' },
      ]);

      const result = await service.getWidgetData(
        { widgetId: mockWidgetId, dateRange: 'THIS_WEEK' },
        mockTenantId,
      );

      expect(result.series).toHaveLength(1);
      expect(result.series?.[0]?.name).toBe('Bérlés');
    });

    it('should return table data for table widgets', async () => {
      const tableWidget = { ...mockWidget, type: WidgetType.TABLE };
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(tableWidget);
      (mockDataSourceProvider.getTableData as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: 'Partner A', value: 100 },
        { name: 'Partner B', value: 80 },
      ]);

      const result = await service.getWidgetData(
        { widgetId: mockWidgetId, dateRange: 'THIS_MONTH' },
        mockTenantId,
      );

      expect(result.tableData).toHaveLength(2);
    });

    it('should handle stable trend', async () => {
      (mockWidgetRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidget);
      (mockDataSourceProvider.getCounterData as ReturnType<typeof vi.fn>).mockResolvedValue({
        value: 100,
        previousValue: 100,
      });

      const result = await service.getWidgetData(
        { widgetId: mockWidgetId, dateRange: 'THIS_MONTH' },
        mockTenantId,
      );

      expect(result.trend).toBe('stable');
    });
  });

  describe('getDashboard', () => {
    it('should return all widgets for tenant', async () => {
      const widgets = [mockWidget, { ...mockWidget, id: 'widget-2' }];
      (mockWidgetRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue(widgets);

      const result = await service.getDashboard(mockTenantId);

      expect(result).toHaveLength(2);
    });
  });
});
