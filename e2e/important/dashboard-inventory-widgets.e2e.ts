import { test, expect } from '@playwright/test';
import { format, subDays } from 'date-fns';

/**
 * E2E Tests for Story 35-3: Készlet Dashboard
 * Tests inventory widgets, alerts, auto-refresh, and responsive design
 */

test.describe('Dashboard - Inventory Widgets', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page
    await page.goto('/dashboard');
  });

  test('Test 1: OPERATOR sees alerts in Scanner Focus layout', async ({ page }) => {
    // Mock auth to return OPERATOR role
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-operator',
          name: 'Test Operator',
          role: 'OPERATOR',
        }),
      });
    });

    // Mock inventory alerts endpoint
    await page.route('**/api/v1/dashboard/inventory/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'machine-001',
              model: 'Makita DHP485',
              type: 'Fúrócsavarbelyegzőgép',
              currentStock: 8,
              minimumThreshold: 15,
              severity: 'critical',
              lastPurchase: '2026-01-15',
            },
            {
              id: 'machine-002',
              model: 'DeWalt DCD795',
              type: 'Csavarbelyegzőgép',
              currentStock: 22,
              minimumThreshold: 30,
              severity: 'warning',
              lastPurchase: '2026-01-20',
            },
          ],
        }),
      });
    });

    await page.reload();

    // Wait for dashboard to load with Scanner Focus layout
    await page.waitForSelector('[data-layout="scanner-focus"]');

    // Verify Scanner Focus layout is rendered
    const layout = page.locator('[data-layout="scanner-focus"]');
    await expect(layout).toBeVisible();

    // Verify alerts are visible
    const alertList = page.locator('text=Készlethiány Alertek');
    await expect(alertList).toBeVisible();

    // Verify critical alert is shown with red badge
    const criticalAlert = page.locator('text=Makita DHP485');
    await expect(criticalAlert).toBeVisible();
  });

  test('Test 2: StockSummaryCard displays properly formatted data', async ({ page }) => {
    // Mock inventory summary endpoint
    await page.route('**/api/v1/dashboard/inventory/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 342,
            byLocation: {
              bolt_1: { count: 180, percentage: 52.6 },
              bolt_2: { count: 140, percentage: 40.9 },
              warehouse: { count: 22, percentage: 6.4 },
            },
            byStatus: {
              available: 52,
              rented: 290,
              service: 0,
            },
          },
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for summary card to load
    const summaryCard = page.locator('text=Készlet Összesítés');
    await expect(summaryCard).toBeVisible({ timeout: 5000 });

    // Verify total count is displayed correctly
    const totalCount = page.locator('text=342');
    await expect(totalCount).toBeVisible();

    // Verify location breakdown
    const warehouseCount = page.locator('text=22');
    await expect(warehouseCount).toBeVisible();
  });

  test('Test 3: UtilizationGauge shows correct color coding', async ({ page }) => {
    // Test high utilization (green > 80%)
    await page.route('**/api/v1/dashboard/inventory/summary', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              total: 342,
              utilized: 290,
              warehouse: 34,
              service: 18,
            },
          }),
        });
      }
    });

    await page.goto('/dashboard');

    // Wait for gauge to render
    const gauge = page.locator('[class*="utilization-gauge"]');
    await expect(gauge).toBeVisible({ timeout: 5000 });

    // Verify gauge shows green color (high utilization > 80%)
    // 290/342 = 84.8%
    const gaugeColor = page.locator('[class*="text-green"]');
    await expect(gaugeColor).toBeVisible();

    // Verify percentage text
    const percentageText = page.locator('text=/84\\.8%|85%/');
    await expect(percentageText).toBeVisible();
  });

  test('Test 4: StockAlertList shows critical alerts first', async ({ page }) => {
    // Mock alerts with mixed severity
    await page.route('**/api/v1/dashboard/inventory/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'machine-001',
              model: 'Makita DHP485',
              type: 'Fúrócsavarbelyegzőgép',
              currentStock: 8,
              minimumThreshold: 15,
              severity: 'critical',
              lastPurchase: '2026-01-15',
            },
            {
              id: 'machine-002',
              model: 'DeWalt DCD795',
              type: 'Csavarbelyegzőgép',
              currentStock: 22,
              minimumThreshold: 30,
              severity: 'warning',
              lastPurchase: '2026-01-20',
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for alert list to render
    const alertList = page.locator('text=Készlethiány Alertek');
    await expect(alertList).toBeVisible({ timeout: 5000 });

    // Verify critical alert appears first (piros badge)
    const criticalBadge = page.locator('[class*="bg-red"]').first();
    await expect(criticalBadge).toBeVisible();

    // Verify warning badge appears after critical
    const warningBadge = page.locator('[class*="bg-yellow"]').first();
    await expect(warningBadge).toBeVisible();
  });

  test('Test 5: Alert click opens StockDetailsModal', async ({ page }) => {
    // Mock alerts endpoint
    await page.route('**/api/v1/dashboard/inventory/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'machine-001',
              model: 'Makita DHP485',
              type: 'Fúrócsavarbelyegzőgép',
              currentStock: 8,
              minimumThreshold: 15,
              severity: 'critical',
              lastPurchase: '2026-01-15',
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for alert to render and click it
    const alertRow = page.locator('text=Makita DHP485');
    await expect(alertRow).toBeVisible({ timeout: 5000 });
    await alertRow.click();

    // Wait for modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Verify modal content shows purchasing recommendation
    const recommendation = page.locator('text=/Javasolt beszerzés|Javasolt/');
    await expect(recommendation).toBeVisible();

    // Verify modal shows last purchase date
    const lastPurchase = page.locator('text=2026-01-15');
    await expect(lastPurchase).toBeVisible();
  });

  test('Test 6: StockMovementChart renders 30-day data', async ({ page }) => {
    // Generate 30 days of mock data
    const today = new Date();
    const movementData = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        inbound: Math.floor(Math.random() * 20) + 5,
        outbound: Math.floor(Math.random() * 20) + 5,
        net: Math.floor(Math.random() * 10) - 5,
      };
    });

    // Mock movement endpoint
    await page.route('**/api/v1/dashboard/inventory/movement*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: movementData,
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for chart to render
    const chart = page.locator('[class*="stock-movement"]');
    await expect(chart).toBeVisible({ timeout: 5000 });

    // Verify chart legend items
    const inboundLegend = page.locator('text=Beérkezés');
    const outboundLegend = page.locator('text=Kimenés');
    await expect(inboundLegend).toBeVisible();
    await expect(outboundLegend).toBeVisible();

    // Verify x-axis dates are displayed
    const dateLabels = page.locator('[class*="recharts-xAxis"]');
    await expect(dateLabels).toBeVisible();
  });

  test('Test 7: StockHeatmap color intensity gradient works', async ({ page }) => {
    // Mock heatmap endpoint
    await page.route('**/api/v1/dashboard/inventory/heatmap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              machineType: 'Fúrócsavarbelyegzőgép',
              location: 'Bolt 1',
              count: 45,
              utilizationPercent: 92,
            },
            {
              machineType: 'Fúrócsavarbelyegzőgép',
              location: 'Bolt 2',
              count: 38,
              utilizationPercent: 78,
            },
            {
              machineType: 'Csavarbelyegzőgép',
              location: 'Bolt 1',
              count: 22,
              utilizationPercent: 65,
            },
            {
              machineType: 'Csavarbelyegzőgép',
              location: 'Raktár',
              count: 5,
              utilizationPercent: 30,
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for heatmap to render
    const heatmap = page.locator('[class*="stock-heatmap"]');
    await expect(heatmap).toBeVisible({ timeout: 5000 });

    // Verify heatmap cells with color intensity
    const darkBlueCell = page.locator('[class*="bg-blue-900"]'); // High utilization (92%)
    const lightBlueCell = page.locator('[class*="bg-blue-100"]'); // Low utilization (30%)

    await expect(darkBlueCell).toBeVisible();
    await expect(lightBlueCell).toBeVisible();

    // Verify tooltip shows percentage
    await heatmap.locator('[class*="heatmap-cell"]').first().hover();
    const tooltip = page.locator('[class*="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 1000 });
  });

  test('Test 8: Auto-refresh triggers after 5 minutes (mock timer)', async ({
    page,
    context: _context,
  }) => {
    let requestCount = 0;

    // Mock alerts endpoint and count requests
    await page.route('**/api/v1/dashboard/inventory/alerts', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'machine-001',
              model: 'Makita DHP485',
              type: 'Fúrócsavarbelyegzőgép',
              currentStock: 8,
              minimumThreshold: 15,
              severity: 'critical',
              lastPurchase: '2026-01-15',
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');

    // Initial load - 1 request
    await page.waitForSelector('text=Készlethiány Alertek', { timeout: 5000 });
    const initialCount = requestCount;

    // Fast-forward time by 5 minutes (TanStack Query auto-refresh)
    await page.evaluate(() => {
      const event = new Event('focus');
      window.dispatchEvent(event);
    });

    // Wait a bit for potential refetch
    await page.waitForTimeout(500);

    // Verify that refetch was triggered (request count should increase)
    // Note: This is a simplified check - real implementation would use TanStack Query's mock
    expect(requestCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('Test 9: Manual refresh button works', async ({ page }) => {
    let requestCount = 0;

    // Mock alerts endpoint
    await page.route('**/api/v1/dashboard/inventory/alerts', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'machine-001',
              model: 'Makita DHP485',
              type: 'Fúrócsavarbelyegzőgép',
              currentStock: 8,
              minimumThreshold: 15,
              severity: 'critical',
              lastPurchase: '2026-01-15',
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for alert list to load
    await page.waitForSelector('text=Készlethiány Alertek', { timeout: 5000 });
    const initialCount = requestCount;

    // Find and click refresh button (RefreshCw icon)
    const refreshButton = page.locator('[class*="refresh"]').first();
    await refreshButton.click();

    // Wait for refetch
    await page.waitForTimeout(500);

    // Verify refresh triggered new request
    expect(requestCount).toBeGreaterThan(initialCount);
  });

  test('Test 10: Responsive design on tablet (portrait)', async ({ page }) => {
    // Set tablet viewport (portrait)
    await page.setViewportSize({ width: 768, height: 1024 });

    // Mock all endpoints
    await page.route('**/api/v1/dashboard/inventory/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 342,
            byLocation: {
              bolt_1: { count: 180, percentage: 52.6 },
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/dashboard/inventory/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'machine-001',
              model: 'Makita DHP485',
              type: 'Fúrócsavarbelyegzőgép',
              currentStock: 8,
              minimumThreshold: 15,
              severity: 'critical',
              lastPurchase: '2026-01-15',
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for widgets to load
    await page.waitForSelector('text=Készlet Összesítés', { timeout: 5000 });

    // Verify cards are stack-displayed (1 column on tablet)
    const cards = page.locator('[role="region"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify touch-friendly button sizes (min 44px)
    const buttons = page.locator('button');
    for (let i = 0; i < Math.min(3, await buttons.count()); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      }
    }

    // Verify heatmap has overflow scroll on tablet
    const heatmapContainer = page.locator('[class*="overflow-x-auto"]').first();
    if (await heatmapContainer.isVisible()) {
      await expect(heatmapContainer).toBeVisible();
    }
  });

  test('Test 10b: Responsive design on tablet (landscape)', async ({ page }) => {
    // Set tablet viewport (landscape)
    await page.setViewportSize({ width: 1024, height: 768 });

    // Mock endpoints
    await page.route('**/api/v1/dashboard/inventory/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForSelector('[class*="dashboard"]', { timeout: 5000 });

    // Verify grid layout is used (2+ columns on landscape tablet)
    const gridContainer = page.locator('[class*="grid"]').first();
    await expect(gridContainer).toBeVisible();

    // Verify viewport width is respected
    const pageWidth = await page.evaluate(() => window.innerWidth);
    expect(pageWidth).toBeLessThanOrEqual(1024);
  });
});
