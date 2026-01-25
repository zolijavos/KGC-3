/**
 * @kgc/reporting - DashboardWidgetService
 * Epic 27: Story 27-1 - Dashboard Widgetek
 */

import { Injectable } from '@nestjs/common';
import {
  IWidgetConfig,
  IWidgetData,
  IChartSeries,
  ITableRow,
  WidgetType,
  DateRange,
} from '../interfaces/reporting.interface';
import {
  CreateWidgetDto,
  CreateWidgetSchema,
  UpdateWidgetDto,
  UpdateWidgetSchema,
  GetWidgetDataDto,
  GetWidgetDataSchema,
} from '../dto/reporting.dto';

export interface IWidgetRepository {
  create(data: Partial<IWidgetConfig>): Promise<IWidgetConfig>;
  findById(id: string): Promise<IWidgetConfig | null>;
  findByTenantId(tenantId: string): Promise<IWidgetConfig[]>;
  update(id: string, data: Partial<IWidgetConfig>): Promise<IWidgetConfig>;
  delete(id: string): Promise<void>;
}

export interface IDataSourceProvider {
  getCounterData(
    tenantId: string,
    dataSource: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ value: number; previousValue: number }>;
  getChartData(
    tenantId: string,
    dataSource: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IChartSeries[]>;
  getTableData(
    tenantId: string,
    dataSource: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ITableRow[]>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class DashboardWidgetService {
  constructor(
    private readonly widgetRepository: IWidgetRepository,
    private readonly dataSourceProvider: IDataSourceProvider,
    private readonly auditService: IAuditService,
  ) {}

  async createWidget(
    input: CreateWidgetDto,
    tenantId: string,
    userId: string,
  ): Promise<IWidgetConfig> {
    const validationResult = CreateWidgetSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Validate position doesn't overlap with existing widgets
    const existingWidgets = await this.widgetRepository.findByTenantId(tenantId);
    const hasOverlap = this.checkPositionOverlap(validInput.position, existingWidgets);
    if (hasOverlap) {
      throw new Error('Widget position overlaps with existing widget');
    }

    const widget = await this.widgetRepository.create({
      tenantId,
      type: validInput.type as WidgetType,
      title: validInput.title,
      dataSource: validInput.dataSource,
      ...(validInput.refreshInterval !== undefined && { refreshInterval: validInput.refreshInterval }),
      position: validInput.position,
      ...(validInput.config !== undefined && { config: validInput.config }),
    });

    await this.auditService.log({
      action: 'widget_created',
      entityType: 'widget',
      entityId: widget.id,
      userId,
      tenantId,
      metadata: {
        type: validInput.type,
        title: validInput.title,
        dataSource: validInput.dataSource,
      },
    });

    return widget;
  }

  async updateWidget(
    widgetId: string,
    input: UpdateWidgetDto,
    tenantId: string,
    userId: string,
  ): Promise<IWidgetConfig> {
    const validationResult = UpdateWidgetSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const widget = await this.widgetRepository.findById(widgetId);
    if (!widget) {
      throw new Error('Widget not found');
    }
    if (widget.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const validInput = validationResult.data;

    // If position is being updated, check for overlaps
    if (validInput.position) {
      const existingWidgets = await this.widgetRepository.findByTenantId(tenantId);
      const otherWidgets = existingWidgets.filter((w) => w.id !== widgetId);
      const hasOverlap = this.checkPositionOverlap(validInput.position, otherWidgets);
      if (hasOverlap) {
        throw new Error('Widget position overlaps with existing widget');
      }
    }

    const updatedWidget = await this.widgetRepository.update(widgetId, {
      ...(validInput.type && { type: validInput.type as WidgetType }),
      ...(validInput.title && { title: validInput.title }),
      ...(validInput.dataSource && { dataSource: validInput.dataSource }),
      ...(validInput.refreshInterval !== undefined && { refreshInterval: validInput.refreshInterval }),
      ...(validInput.position && { position: validInput.position }),
      ...(validInput.config && { config: validInput.config }),
    });

    await this.auditService.log({
      action: 'widget_updated',
      entityType: 'widget',
      entityId: widgetId,
      userId,
      tenantId,
      metadata: { changes: Object.keys(validInput) },
    });

    return updatedWidget;
  }

  async deleteWidget(
    widgetId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const widget = await this.widgetRepository.findById(widgetId);
    if (!widget) {
      throw new Error('Widget not found');
    }
    if (widget.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    await this.widgetRepository.delete(widgetId);

    await this.auditService.log({
      action: 'widget_deleted',
      entityType: 'widget',
      entityId: widgetId,
      userId,
      tenantId,
      metadata: { title: widget.title },
    });
  }

  async getWidgetData(
    input: GetWidgetDataDto,
    tenantId: string,
  ): Promise<IWidgetData> {
    const validationResult = GetWidgetDataSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    const widget = await this.widgetRepository.findById(validInput.widgetId);
    if (!widget) {
      throw new Error('Widget not found');
    }
    if (widget.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const { startDate, endDate } = this.calculateDateRange(
      validInput.dateRange,
      validInput.startDate,
      validInput.endDate,
    );

    const widgetData: IWidgetData = {
      widgetId: widget.id,
      generatedAt: new Date(),
    };

    switch (widget.type) {
      case WidgetType.COUNTER:
      case WidgetType.TREND: {
        const counterData = await this.dataSourceProvider.getCounterData(
          tenantId,
          widget.dataSource,
          startDate,
          endDate,
        );
        widgetData.value = counterData.value;
        widgetData.previousValue = counterData.previousValue;
        if (counterData.previousValue > 0) {
          widgetData.changePercent =
            ((counterData.value - counterData.previousValue) / counterData.previousValue) * 100;
          widgetData.trend = counterData.value > counterData.previousValue ? 'up' :
                             counterData.value < counterData.previousValue ? 'down' : 'stable';
        } else {
          widgetData.changePercent = 0;
          widgetData.trend = 'stable';
        }
        break;
      }

      case WidgetType.CHART_BAR:
      case WidgetType.CHART_LINE:
      case WidgetType.CHART_PIE: {
        widgetData.series = await this.dataSourceProvider.getChartData(
          tenantId,
          widget.dataSource,
          startDate,
          endDate,
        );
        break;
      }

      case WidgetType.TABLE: {
        widgetData.tableData = await this.dataSourceProvider.getTableData(
          tenantId,
          widget.dataSource,
          startDate,
          endDate,
        );
        break;
      }
    }

    return widgetData;
  }

  async getDashboard(tenantId: string): Promise<IWidgetConfig[]> {
    return this.widgetRepository.findByTenantId(tenantId);
  }

  private checkPositionOverlap(
    position: { row: number; col: number; width: number; height: number },
    existingWidgets: IWidgetConfig[],
  ): boolean {
    for (const widget of existingWidgets) {
      const pos = widget.position;
      const overlapsHorizontally =
        position.col < pos.col + pos.width && position.col + position.width > pos.col;
      const overlapsVertically =
        position.row < pos.row + pos.height && position.row + position.height > pos.row;

      if (overlapsHorizontally && overlapsVertically) {
        return true;
      }
    }
    return false;
  }

  private calculateDateRange(
    range: string,
    customStart?: Date,
    customEnd?: Date,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case DateRange.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case DateRange.YESTERDAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case DateRange.THIS_WEEK:
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        break;
      case DateRange.LAST_WEEK:
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case DateRange.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case DateRange.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case DateRange.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case DateRange.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case DateRange.CUSTOM:
        if (!customStart || !customEnd) {
          throw new Error('Custom date range requires startDate and endDate');
        }
        startDate = customStart;
        endDate = customEnd;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate };
  }
}
