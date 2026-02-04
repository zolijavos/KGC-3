import { http, HttpResponse } from 'msw';

/**
 * MSW Handlers for Dashboard KPI Endpoints
 *
 * These handlers mock the backend API responses for E2E tests.
 * Response format matches the backend KpiResponseDto (NO "data" wrapper).
 */

const API_BASE = 'http://localhost:3010/api/v1';

export const kpiHandlers = [
  // Revenue KPI
  http.get(`${API_BASE}/dashboard/kpi/revenue`, () => {
    return HttpResponse.json({
      kpiType: 'revenue',
      period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
      current: { value: 1500000, currency: 'HUF', count: 150 },
      previous: { value: 1200000, currency: 'HUF', count: 120 },
      delta: { absolute: 300000, percentage: 25.0, trend: 'up' as const },
    });
  }),

  // Net Revenue KPI
  http.get(`${API_BASE}/dashboard/kpi/net-revenue`, () => {
    return HttpResponse.json({
      kpiType: 'net-revenue',
      period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
      current: { value: 1200000, currency: 'HUF', count: 150 },
      previous: { value: 1100000, currency: 'HUF', count: 140 },
      delta: { absolute: 100000, percentage: 9.09, trend: 'up' as const },
    });
  }),

  // Receivables KPI
  http.get(`${API_BASE}/dashboard/kpi/receivables`, () => {
    return HttpResponse.json({
      kpiType: 'receivables',
      period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
      current: { value: 750000, currency: 'HUF', count: 45 },
      previous: { value: 680000, currency: 'HUF', count: 42 },
      delta: { absolute: 70000, percentage: 10.29, trend: 'up' as const },
    });
  }),

  // Payments KPI
  http.get(`${API_BASE}/dashboard/kpi/payments`, () => {
    return HttpResponse.json({
      kpiType: 'payments',
      period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
      current: { value: 450000, currency: 'HUF', count: 38 },
      previous: { value: 420000, currency: 'HUF', count: 35 },
      delta: { absolute: 30000, percentage: 7.14, trend: 'up' as const },
    });
  }),
];

/**
 * MSW Handlers for Dashboard Service Endpoints (Story 35-5)
 *
 * Response format: data wrapper as returned by ServiceController
 */
export const serviceHandlers = [
  // Service Summary
  http.get(`${API_BASE}/dashboard/service/summary`, () => {
    return HttpResponse.json({
      data: {
        totalActive: 12,
        byStatus: [
          { status: 'OPEN', count: 5, color: 'blue' },
          { status: 'IN_PROGRESS', count: 4, color: 'yellow' },
          { status: 'WAITING_PARTS', count: 2, color: 'orange' },
          { status: 'COMPLETED', count: 1, color: 'green' },
        ],
        periodStart: '2026-02-01T00:00:00.000Z',
        periodEnd: '2026-02-04T23:59:59.999Z',
      },
    });
  }),

  // Service Workload
  http.get(`${API_BASE}/dashboard/service/workload`, () => {
    return HttpResponse.json({
      data: {
        technicians: [
          {
            id: 'tech-1',
            name: 'Kovács János',
            activeWorksheets: 3,
            maxCapacity: 5,
            utilizationPercent: 60,
            worksheets: [
              { id: 'ws-1', title: 'Makita fúró javítás', priority: 'HIGH' },
              { id: 'ws-2', title: 'Bosch flex szerviz', priority: 'NORMAL' },
              { id: 'ws-3', title: 'DeWalt csavarbehajtó', priority: 'URGENT' },
            ],
          },
          {
            id: 'tech-2',
            name: 'Nagy Péter',
            activeWorksheets: 2,
            maxCapacity: 5,
            utilizationPercent: 40,
            worksheets: [
              { id: 'ws-4', title: 'Hilti kalapács', priority: 'NORMAL' },
              { id: 'ws-5', title: 'Milwaukee akkumulátor', priority: 'LOW' },
            ],
          },
        ],
      },
    });
  }),

  // Service Revenue (with period param)
  http.get(`${API_BASE}/dashboard/service/revenue`, () => {
    return HttpResponse.json({
      data: {
        current: { total: 450000, laborFee: 280000, partsRevenue: 170000 },
        previous: { total: 380000, laborFee: 230000, partsRevenue: 150000 },
        delta: { totalPercent: 18.4, laborPercent: 21.7, partsPercent: 13.3, trend: 'up' },
        period: 'week',
        periodStart: '2026-01-28T00:00:00.000Z',
        periodEnd: '2026-02-04T23:59:59.999Z',
      },
    });
  }),
];

/**
 * MSW Handlers for Dashboard Partner Endpoints (Story 35-6)
 *
 * Response format: data wrapper as returned by PartnerController
 */
export const partnerHandlers = [
  // Partner Overview
  http.get(`${API_BASE}/dashboard/partner/overview`, () => {
    return HttpResponse.json({
      data: {
        totalActive: 156,
        newPartners: 8,
        byCategory: [
          { category: 'RETAIL', count: 98, color: 'blue' },
          { category: 'B2B', count: 45, color: 'green' },
          { category: 'VIP', count: 13, color: 'purple' },
        ],
        periodStart: '2026-02-01T00:00:00.000Z',
        periodEnd: '2026-02-04T23:59:59.999Z',
      },
    });
  }),

  // Top Partners (with period param)
  http.get(`${API_BASE}/dashboard/partner/top`, () => {
    return HttpResponse.json({
      data: {
        partners: [
          {
            id: 'partner-1',
            name: 'Építő Kft.',
            totalRevenue: 2450000,
            rentalRevenue: 1800000,
            salesRevenue: 450000,
            serviceRevenue: 200000,
            trendPercent: 15.3,
          },
          {
            id: 'partner-2',
            name: 'Megabau Zrt.',
            totalRevenue: 2000000,
            rentalRevenue: 1500000,
            salesRevenue: 320000,
            serviceRevenue: 180000,
            trendPercent: 8.7,
          },
          {
            id: 'partner-3',
            name: 'Profi Szerelő Bt.',
            totalRevenue: 1910000,
            rentalRevenue: 980000,
            salesRevenue: 580000,
            serviceRevenue: 350000,
            trendPercent: -2.4,
          },
        ],
        period: 'month',
        periodStart: '2026-02-01T00:00:00.000Z',
        periodEnd: '2026-02-04T23:59:59.999Z',
      },
    });
  }),

  // Partner Activity (with days param)
  http.get(`${API_BASE}/dashboard/partner/activity`, () => {
    return HttpResponse.json({
      data: {
        activities: [
          { date: '2026-02-04', rentals: 12, sales: 8, services: 5, total: 25 },
          { date: '2026-02-03', rentals: 15, sales: 10, services: 7, total: 32 },
          { date: '2026-02-02', rentals: 10, sales: 6, services: 4, total: 20 },
          { date: '2026-02-01', rentals: 14, sales: 9, services: 6, total: 29 },
        ],
        totalTransactions: 106,
        previousTotalTransactions: 98,
        deltaPercent: 8.2,
        periodDays: 14,
      },
    });
  }),
];

/**
 * MSW Handlers for Dashboard Inventory Endpoints (Story 35-3)
 *
 * Response format: data wrapper as returned by InventoryController
 */
export const inventoryHandlers = [
  // Inventory Summary
  http.get(`${API_BASE}/dashboard/inventory/summary`, () => {
    return HttpResponse.json({
      data: {
        totalItems: 450,
        availableItems: 380,
        rentedItems: 55,
        inServiceItems: 15,
        valueTotal: 45000000,
        categories: [
          { name: 'Fúrók', count: 120, value: 12000000 },
          { name: 'Vágók', count: 85, value: 9500000 },
          { name: 'Csiszolók', count: 95, value: 8500000 },
        ],
      },
    });
  }),

  // Inventory Alerts
  http.get(`${API_BASE}/dashboard/inventory/alerts`, () => {
    return HttpResponse.json({
      data: {
        alerts: [
          { id: 'alert-1', type: 'CRITICAL', product: 'Makita fúró', quantity: 2, threshold: 5 },
          { id: 'alert-2', type: 'WARNING', product: 'Bosch flex', quantity: 8, threshold: 10 },
          {
            id: 'alert-3',
            type: 'INFO',
            product: 'DeWalt akkumulátor',
            quantity: 15,
            threshold: 12,
          },
        ],
        totalCritical: 1,
        totalWarning: 1,
        totalInfo: 1,
      },
    });
  }),

  // Stock Movement
  http.get(`${API_BASE}/dashboard/inventory/movement`, () => {
    return HttpResponse.json({
      data: {
        movements: [
          { date: '2026-02-04', in: 12, out: 8, net: 4 },
          { date: '2026-02-03', in: 15, out: 18, net: -3 },
          { date: '2026-02-02', in: 10, out: 10, net: 0 },
          { date: '2026-02-01', in: 8, out: 5, net: 3 },
        ],
        periodDays: 30,
      },
    });
  }),

  // Stock Heatmap
  http.get(`${API_BASE}/dashboard/inventory/heatmap`, () => {
    return HttpResponse.json({
      data: {
        locations: [
          { id: 'loc-1', name: 'Raktár A', utilization: 85, items: 120 },
          { id: 'loc-2', name: 'Raktár B', utilization: 62, items: 95 },
          { id: 'loc-3', name: 'Bolt', utilization: 45, items: 60 },
        ],
      },
    });
  }),

  // Stock Utilization
  http.get(`${API_BASE}/dashboard/inventory/utilization`, () => {
    return HttpResponse.json({
      data: {
        overall: 78,
        byCategory: [
          { name: 'Fúrók', utilization: 85 },
          { name: 'Vágók', utilization: 72 },
          { name: 'Csiszolók', utilization: 68 },
        ],
      },
    });
  }),
];

/**
 * MSW Handlers for Dashboard Notifications (Story 35-4)
 */
export const notificationHandlers = [
  http.get(`${API_BASE}/dashboard/notifications`, () => {
    return HttpResponse.json({
      data: {
        notifications: [
          {
            id: 'notif-1',
            type: 'CRITICAL',
            title: 'Kritikus készlethiány',
            message: 'Makita fúró készlet 2 db alatt',
            createdAt: '2026-02-04T10:30:00.000Z',
            read: false,
          },
          {
            id: 'notif-2',
            type: 'WARNING',
            title: 'Lejáró bérlés',
            message: 'Partner XY bérlése holnap lejár',
            createdAt: '2026-02-04T09:15:00.000Z',
            read: false,
          },
          {
            id: 'notif-3',
            type: 'INFO',
            title: 'Új munkalap',
            message: 'Szerviz munkalap #1234 létrehozva',
            createdAt: '2026-02-04T08:00:00.000Z',
            read: true,
          },
        ],
        unreadCount: 2,
        totalCount: 3,
      },
    });
  }),

  http.post(`${API_BASE}/dashboard/notifications/mark-read`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/dashboard/notifications/mark-all-read`, () => {
    return HttpResponse.json({ success: true });
  }),
];

// Export all handlers
export const handlers = [
  ...kpiHandlers,
  ...serviceHandlers,
  ...partnerHandlers,
  ...inventoryHandlers,
  ...notificationHandlers,
];
