/**
 * In-Memory Widget Repository
 * Epic 27: Story 27-1 - Dashboard Widgetek
 */

import { IWidgetConfig, IWidgetRepository, WidgetType } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryWidgetRepository implements IWidgetRepository {
  private widgets: Map<string, IWidgetConfig> = new Map();

  async create(data: Partial<IWidgetConfig>): Promise<IWidgetConfig> {
    const id = randomUUID();
    const now = new Date();

    const widget: IWidgetConfig = {
      id,
      tenantId: data.tenantId ?? '',
      type: data.type ?? WidgetType.COUNTER,
      title: data.title ?? '',
      dataSource: data.dataSource ?? '',
      position: data.position ?? { row: 0, col: 0, width: 3, height: 2 },
      createdAt: now,
      updatedAt: now,
      ...(data.refreshInterval !== undefined && { refreshInterval: data.refreshInterval }),
      ...(data.config !== undefined && { config: data.config }),
    };

    this.widgets.set(id, widget);
    return widget;
  }

  async findById(id: string): Promise<IWidgetConfig | null> {
    return this.widgets.get(id) ?? null;
  }

  async findByTenantId(tenantId: string): Promise<IWidgetConfig[]> {
    return Array.from(this.widgets.values()).filter(w => w.tenantId === tenantId);
  }

  async update(id: string, data: Partial<IWidgetConfig>): Promise<IWidgetConfig> {
    const existing = this.widgets.get(id);
    if (!existing) {
      throw new Error('Widget not found');
    }

    const updated: IWidgetConfig = {
      ...existing,
      ...data,
      id: existing.id,
      tenantId: existing.tenantId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.widgets.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.widgets.delete(id);
  }

  // Test helper
  clear(): void {
    this.widgets.clear();
  }
}
