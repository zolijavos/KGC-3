import type { Page } from '@playwright/test';

/**
 * Set up MSW (Mock Service Worker) for Playwright E2E tests
 *
 * This function injects MSW into the browser context and starts it
 * before the application loads, allowing it to intercept API calls.
 *
 * Usage:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await setupMSW(page);
 *   await page.goto('/dashboard');
 * });
 * ```
 */
export async function setupMSW(page: Page) {
  await page.addInitScript(() => {
    // MSW handlers - defined inline for browser context
    const API_BASE = 'http://localhost:3010/api/v1';

    // Mock responses - KPI, Service, Partner, Inventory, Notifications
    const mockResponses: Record<string, any> = {
      // KPI Endpoints (Story 35-2)
      [`${API_BASE}/dashboard/kpi/revenue`]: {
        kpiType: 'revenue',
        period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
        current: { value: 1500000, currency: 'HUF', count: 150 },
        previous: { value: 1200000, currency: 'HUF', count: 120 },
        delta: { absolute: 300000, percentage: 25.0, trend: 'up' },
      },
      [`${API_BASE}/dashboard/kpi/net-revenue`]: {
        kpiType: 'net-revenue',
        period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
        current: { value: 1200000, currency: 'HUF', count: 150 },
        previous: { value: 1100000, currency: 'HUF', count: 140 },
        delta: { absolute: 100000, percentage: 9.09, trend: 'up' },
      },
      [`${API_BASE}/dashboard/kpi/receivables`]: {
        kpiType: 'receivables',
        period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
        current: { value: 750000, currency: 'HUF', count: 45 },
        previous: { value: 680000, currency: 'HUF', count: 42 },
        delta: { absolute: 70000, percentage: 10.29, trend: 'up' },
      },
      [`${API_BASE}/dashboard/kpi/payments`]: {
        kpiType: 'payments',
        period: { from: '2026-02-01T00:00:00.000Z', to: '2026-02-03T23:59:59.999Z' },
        current: { value: 450000, currency: 'HUF', count: 38 },
        previous: { value: 420000, currency: 'HUF', count: 35 },
        delta: { absolute: 30000, percentage: 7.14, trend: 'up' },
      },

      // Service Endpoints (Story 35-5)
      [`${API_BASE}/dashboard/service/summary`]: {
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
      },
      [`${API_BASE}/dashboard/service/workload`]: {
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
              ],
            },
            {
              id: 'tech-2',
              name: 'Nagy Péter',
              activeWorksheets: 2,
              maxCapacity: 5,
              utilizationPercent: 40,
              worksheets: [{ id: 'ws-4', title: 'Hilti kalapács', priority: 'NORMAL' }],
            },
          ],
        },
      },
      [`${API_BASE}/dashboard/service/revenue`]: {
        data: {
          current: { total: 450000, laborFee: 280000, partsRevenue: 170000 },
          previous: { total: 380000, laborFee: 230000, partsRevenue: 150000 },
          delta: { totalPercent: 18.4, laborPercent: 21.7, partsPercent: 13.3, trend: 'up' },
          period: 'week',
          periodStart: '2026-01-28T00:00:00.000Z',
          periodEnd: '2026-02-04T23:59:59.999Z',
        },
      },

      // Partner Endpoints (Story 35-6)
      [`${API_BASE}/dashboard/partner/overview`]: {
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
      },
      [`${API_BASE}/dashboard/partner/top`]: {
        data: {
          partners: [
            {
              id: 'partner-1',
              name: 'Építő Kft.',
              totalRevenue: 2450000,
              trendPercent: 15.3,
            },
            {
              id: 'partner-2',
              name: 'Megabau Zrt.',
              totalRevenue: 2000000,
              trendPercent: 8.7,
            },
          ],
          period: 'month',
          periodStart: '2026-02-01T00:00:00.000Z',
          periodEnd: '2026-02-04T23:59:59.999Z',
        },
      },
      [`${API_BASE}/dashboard/partner/activity`]: {
        data: {
          activities: [
            { date: '2026-02-04', rentals: 12, sales: 8, services: 5, total: 25 },
            { date: '2026-02-03', rentals: 15, sales: 10, services: 7, total: 32 },
          ],
          totalTransactions: 106,
          previousTotalTransactions: 98,
          deltaPercent: 8.2,
          periodDays: 14,
        },
      },

      // Inventory Endpoints (Story 35-3)
      [`${API_BASE}/dashboard/inventory/summary`]: {
        data: {
          totalItems: 450,
          availableItems: 380,
          rentedItems: 55,
          inServiceItems: 15,
          valueTotal: 45000000,
        },
      },
      [`${API_BASE}/dashboard/inventory/alerts`]: {
        data: {
          alerts: [
            { id: 'alert-1', type: 'CRITICAL', product: 'Makita fúró', quantity: 2, threshold: 5 },
            { id: 'alert-2', type: 'WARNING', product: 'Bosch flex', quantity: 8, threshold: 10 },
          ],
          totalCritical: 1,
          totalWarning: 1,
          totalInfo: 0,
        },
      },
      [`${API_BASE}/dashboard/inventory/movement`]: {
        data: {
          movements: [
            { date: '2026-02-04', in: 12, out: 8, net: 4 },
            { date: '2026-02-03', in: 15, out: 18, net: -3 },
          ],
          periodDays: 30,
        },
      },
      [`${API_BASE}/dashboard/inventory/heatmap`]: {
        data: {
          locations: [
            { id: 'loc-1', name: 'Raktár A', utilization: 85, items: 120 },
            { id: 'loc-2', name: 'Raktár B', utilization: 62, items: 95 },
          ],
        },
      },
      [`${API_BASE}/dashboard/inventory/utilization`]: {
        data: {
          overall: 78,
          byCategory: [
            { name: 'Fúrók', utilization: 85 },
            { name: 'Vágók', utilization: 72 },
          ],
        },
      },

      // Notification Endpoints (Story 35-4)
      [`${API_BASE}/dashboard/notifications`]: {
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
          ],
          unreadCount: 2,
          totalCount: 2,
        },
      },
    };

    // Override fetch to intercept dashboard API calls
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const urlWithoutQuery = url.split('?')[0]; // Strip query params for matching

      // Check if this is an endpoint we should mock (exact match first)
      if (mockResponses[url]) {
        console.log(`[MSW] Intercepting (exact): ${url}`);
        return Promise.resolve(
          new Response(JSON.stringify(mockResponses[url]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      // Check without query params (for endpoints with dynamic params)
      if (mockResponses[urlWithoutQuery]) {
        console.log(`[MSW] Intercepting (base): ${url}`);
        return Promise.resolve(
          new Response(JSON.stringify(mockResponses[urlWithoutQuery]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      // Pass through other requests
      return originalFetch(input, init);
    };

    console.log('[MSW] Mock handlers installed for dashboard endpoints');
  });
}
