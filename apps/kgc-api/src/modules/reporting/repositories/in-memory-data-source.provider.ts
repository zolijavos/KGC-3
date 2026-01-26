/**
 * In-Memory Data Source Provider
 * Epic 27: Story 27-1 - Dashboard Widgetek
 *
 * Provides mock data for dashboard widgets.
 * Will be replaced with real queries to Prisma.
 */

import { IChartSeries, IDataSourceProvider, ITableRow } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryDataSourceProvider implements IDataSourceProvider {
  async getCounterData(
    _tenantId: string,
    dataSource: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ value: number; previousValue: number }> {
    // Generate mock data based on dataSource
    const dataSources: Record<string, () => { value: number; previousValue: number }> = {
      'rentals.daily.count': () => ({
        value: Math.floor(Math.random() * 50) + 10,
        previousValue: Math.floor(Math.random() * 50) + 10,
      }),
      'rentals.active.count': () => ({
        value: Math.floor(Math.random() * 100) + 50,
        previousValue: Math.floor(Math.random() * 100) + 50,
      }),
      'revenue.daily': () => ({
        value: Math.floor(Math.random() * 500000) + 100000,
        previousValue: Math.floor(Math.random() * 500000) + 100000,
      }),
      'worksheets.open.count': () => ({
        value: Math.floor(Math.random() * 30) + 5,
        previousValue: Math.floor(Math.random() * 30) + 5,
      }),
      'inventory.alerts.count': () => ({
        value: Math.floor(Math.random() * 20) + 2,
        previousValue: Math.floor(Math.random() * 20) + 2,
      }),
    };

    const generator = dataSources[dataSource];
    if (generator) {
      return generator();
    }

    // Default mock data
    return {
      value: Math.floor(Math.random() * 100) + 10,
      previousValue: Math.floor(Math.random() * 100) + 10,
    };
  }

  async getChartData(
    _tenantId: string,
    dataSource: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<IChartSeries[]> {
    const dayLabels = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

    // Generate mock chart data based on dataSource
    const dataSources: Record<string, () => IChartSeries[]> = {
      'revenue.weekly': () => [
        {
          name: 'Bevétel',
          data: dayLabels.map(label => ({
            label,
            value: Math.floor(Math.random() * 200000) + 50000,
          })),
          color: '#3b82f6',
        },
      ],
      'rentals.vs.sales': () => [
        {
          name: 'Bérlés',
          data: [{ label: 'Bérlés', value: Math.floor(Math.random() * 60) + 30 }],
          color: '#10b981',
        },
        {
          name: 'Eladás',
          data: [{ label: 'Eladás', value: Math.floor(Math.random() * 40) + 20 }],
          color: '#f59e0b',
        },
      ],
      'products.top5': () => {
        const products = [
          'Makita DDF481',
          'Bosch GWS 22-230',
          'DeWalt DCD996',
          'Husqvarna 450',
          'Stihl MS 261',
        ];
        return [
          {
            name: 'Top termékek',
            data: products.map(label => ({
              label,
              value: Math.floor(Math.random() * 50) + 10,
            })),
            color: '#8b5cf6',
          },
        ];
      },
    };

    const generator = dataSources[dataSource];
    if (generator) {
      return generator();
    }

    // Default mock chart data
    return [
      {
        name: 'Adatok',
        data: dayLabels.map(label => ({
          label,
          value: Math.floor(Math.random() * 100) + 10,
        })),
        color: '#6366f1',
      },
    ];
  }

  async getTableData(
    _tenantId: string,
    dataSource: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<ITableRow[]> {
    // Generate mock table data based on dataSource
    const dataSources: Record<string, () => ITableRow[]> = {
      'partners.top': () =>
        Array.from({ length: 10 }, (_, i) => ({
          rank: i + 1,
          name: `Partner ${String.fromCharCode(65 + i)}`,
          rentalCount: Math.floor(Math.random() * 50) + 10,
          revenue: Math.floor(Math.random() * 1000000) + 100000,
          lastActivity: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })),
      'equipment.overdue': () =>
        Array.from({ length: 5 }, (_, i) => ({
          id: `EQ-${1000 + i}`,
          name: `Bérgép ${i + 1}`,
          dueDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
          daysOverdue: i + 1,
          partnerName: `Partner ${String.fromCharCode(65 + i)}`,
        })),
      'worksheets.pending': () =>
        Array.from({ length: 8 }, (_, i) => {
          const statuses = ['Várakozik', 'Diagnosztika', 'Alkatrészre vár'];
          return {
            id: `WS-${2000 + i}`,
            type: i % 2 === 0 ? 'Garancia' : 'Fizetős',
            status: statuses[i % 3] ?? 'Várakozik',
            partnerName: `Partner ${String.fromCharCode(65 + i)}`,
            createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
          };
        }),
    };

    const generator = dataSources[dataSource];
    if (generator) {
      return generator();
    }

    // Default mock table data
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 100),
    }));
  }
}
