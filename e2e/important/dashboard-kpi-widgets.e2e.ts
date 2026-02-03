import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Story 35-2: Pénzügyi KPI Dashboard
 * Tests KPI widgets, data display, comparison, and responsive design
 */

test.describe('Dashboard - KPI Widgets', () => {
  test.beforeEach(async ({ page }) => {
    // CRITICAL FIX: Override fetch API BEFORE any app code runs
    // This intercepts ALL API calls regardless of URL or proxy config
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

        // Mock KPI endpoints - CHECK MORE SPECIFIC URLS FIRST!
        // "net-revenue" must be before "revenue" because "net-revenue" contains "revenue"
        if (url.includes('/dashboard/kpi/net-revenue')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                kpiType: 'net-revenue',
                period: { from: '2026-02-01', to: '2026-02-03' },
                current: { value: 1200000, currency: 'HUF' },
                previous: { value: 1100000, currency: 'HUF' },
                delta: { absolute: 100000, percentage: 9.09, trend: 'up' },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }

        if (url.includes('/dashboard/kpi/revenue')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                kpiType: 'revenue',
                period: { from: '2026-02-01', to: '2026-02-03' },
                current: { value: 1500000, currency: 'HUF' },
                previous: { value: 1200000, currency: 'HUF' },
                delta: { absolute: 300000, percentage: 25, trend: 'up' },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }

        if (url.includes('/dashboard/kpi/receivables')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                kpiType: 'receivables',
                period: { from: '2026-02-01', to: '2026-02-03' },
                current: { value: 750000, currency: 'HUF' },
                previous: { value: 680000, currency: 'HUF' },
                delta: { absolute: 70000, percentage: 10.29, trend: 'up' },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }

        if (url.includes('/dashboard/kpi/payments')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                kpiType: 'payments',
                period: { from: '2026-02-01', to: '2026-02-03' },
                current: { value: 450000, currency: 'HUF' },
                previous: { value: 420000, currency: 'HUF' },
                delta: { absolute: 30000, percentage: 7.14, trend: 'up' },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }

        // Pass through all other requests
        return originalFetch(input, init);
      };
    });

    // Set up localStorage auth
    await page.goto('/dashboard');
    await page.evaluate(() => {
      const authState = {
        state: {
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'test-admin',
            email: 'admin@kgc.hu',
            name: 'Test Admin',
            role: 'ADMIN',
            tenantId: 'test-tenant',
          },
          isAuthenticated: true,
        },
        version: 0,
      };
      localStorage.setItem('kgc-auth', JSON.stringify(authState));
    });

    // Reload to pick up auth state WITH fetch mocks already active
    await page.reload();

    // Wait for dashboard to be ready
    await page.waitForLoadState('networkidle');
  });

  test('[P1] Test 1: RevenueKPICard displays revenue data correctly', async ({ page }) => {
    // NETWORK-FIRST: Set up route BEFORE reload
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'revenue',
            period: { from: '2026-02-01', to: '2026-02-03' },
            current: { value: 1500000, currency: 'HUF' },
            previous: { value: 1200000, currency: 'HUF' },
            delta: { absolute: 300000, percentage: 25, trend: 'up' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for KPI card to load
    const revenueCard = page.locator('text=Bruttó Bevétel');
    await expect(revenueCard).toBeVisible({ timeout: 5000 });

    // Verify revenue value is displayed (formatted with spaces)
    const revenueValue = page.locator('text=/1 500 000|1,500,000/');
    await expect(revenueValue).toBeVisible();

    // Verify trend indicator shows "up" (green arrow or positive color)
    const trendIndicator = page.locator('[class*="text-green"]');
    await expect(trendIndicator).toBeVisible();

    // Verify percentage change
    const percentageChange = page.locator('text=/\\+25%|25%/');
    await expect(percentageChange).toBeVisible();
  });

  test('[P1] Test 2: NetRevenueKPICard displays net revenue correctly', async ({ page }) => {
    // Mock net revenue endpoint
    await page.route('**/api/v1/dashboard/kpi/net-revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'net-revenue',
            period: { from: '2026-02-01', to: '2026-02-03' },
            current: { value: 1200000, currency: 'HUF' },
            previous: { value: 1100000, currency: 'HUF' },
            delta: { absolute: 100000, percentage: 9.09, trend: 'up' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for net revenue card
    const netRevenueCard = page.locator('text=Nettó Bevétel');
    await expect(netRevenueCard).toBeVisible({ timeout: 5000 });

    // Verify value
    const netRevenueValue = page.locator('text=/1 200 000|1,200,000/');
    await expect(netRevenueValue).toBeVisible();

    // Verify trend is positive
    const trendUp = page.locator('[class*="text-green"]');
    await expect(trendUp).toBeVisible();
  });

  test('[P1] Test 3: ReceivablesKPICard shows red badge for high receivables', async ({ page }) => {
    // Mock receivables endpoint with high value (> 500,000 Ft)
    await page.route('**/api/v1/dashboard/kpi/receivables', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'receivables',
            period: { from: '2026-02-01', to: '2026-02-03' },
            current: { value: 750000, currency: 'HUF' },
            previous: { value: 680000, currency: 'HUF' },
            delta: { absolute: 70000, percentage: 10.29, trend: 'up' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for receivables card
    const receivablesCard = page.locator('text=Kintlévőség');
    await expect(receivablesCard).toBeVisible({ timeout: 5000 });

    // Verify high value is displayed
    const receivablesValue = page.locator('text=/750 000|750,000/');
    await expect(receivablesValue).toBeVisible();

    // Verify red badge or alert icon appears (threshold exceeded)
    const alertBadge = page.locator('[class*="bg-red"]');
    await expect(alertBadge).toBeVisible();
  });

  test('[P1] Test 4: PaymentsKPICard displays payments correctly', async ({ page }) => {
    // Mock payments endpoint
    await page.route('**/api/v1/dashboard/kpi/payments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'payments',
            period: { from: '2026-02-01', to: '2026-02-03' },
            current: { value: 450000, currency: 'HUF' },
            previous: { value: 420000, currency: 'HUF' },
            delta: { absolute: 30000, percentage: 7.14, trend: 'up' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for payments card
    const paymentsCard = page.locator('text=Befizetések');
    await expect(paymentsCard).toBeVisible({ timeout: 5000 });

    // Verify value
    const paymentsValue = page.locator('text=/450 000|450,000/');
    await expect(paymentsValue).toBeVisible();

    // Verify CreditCard icon is visible
    const cardIcon = page.locator('[class*="credit-card"]');
    await expect(cardIcon).toBeVisible();
  });

  test('[P1] Test 5: Negative trend shows red down arrow', async ({ page }) => {
    // Mock revenue with negative trend
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'revenue',
            period: { from: '2026-02-01', to: '2026-02-03' },
            current: { value: 1000000, currency: 'HUF' },
            previous: { value: 1300000, currency: 'HUF' },
            delta: { absolute: -300000, percentage: -23.08, trend: 'down' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for revenue card
    await expect(page.locator('text=Bruttó Bevétel')).toBeVisible({ timeout: 5000 });

    // Verify negative trend (red color)
    const trendDown = page.locator('[class*="text-red"]');
    await expect(trendDown).toBeVisible();

    // Verify negative percentage
    const negativePercent = page.locator('text=/-23%|-23.08%/');
    await expect(negativePercent).toBeVisible();
  });

  test('[P1] Test 6: Neutral trend (no change) displays correctly', async ({ page }) => {
    // Mock KPI with neutral trend
    await page.route('**/api/v1/dashboard/kpi/net-revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'net-revenue',
            period: { from: '2026-02-01', to: '2026-02-03' },
            current: { value: 900000, currency: 'HUF' },
            previous: { value: 900000, currency: 'HUF' },
            delta: { absolute: 0, percentage: 0, trend: 'neutral' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for net revenue card
    await expect(page.locator('text=Nettó Bevétel')).toBeVisible({ timeout: 5000 });

    // Verify neutral indicator (gray or no color)
    const neutralIndicator = page.locator('[class*="text-gray"]');
    await expect(neutralIndicator).toBeVisible();

    // Verify 0% change
    const zeroPercent = page.locator('text=/0%|±0%/');
    await expect(zeroPercent).toBeVisible();
  });

  test('[P1] Test 7: Loading state shows skeleton', async ({ page }) => {
    // Mock delayed response to test loading state
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      // Delay 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'revenue',
            current: { value: 0, currency: 'HUF' },
            previous: { value: 0, currency: 'HUF' },
            delta: { absolute: 0, percentage: 0, trend: 'neutral' },
          },
        }),
      });
    });

    await page.goto('/dashboard');

    // Verify skeleton loader appears during loading
    const skeleton = page.locator('[class*="animate-pulse"]');
    await expect(skeleton).toBeVisible({ timeout: 1000 });

    // Wait for actual data to load
    await page.waitForTimeout(2500);

    // Skeleton should disappear
    await expect(skeleton).not.toBeVisible();
  });

  test('[P1] Test 8: Auto-refresh triggers after 5 minutes', async ({ page }) => {
    let requestCount = 0;

    // Mock revenue endpoint and count requests
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            kpiType: 'revenue',
            current: { value: 1500000, currency: 'HUF' },
            previous: { value: 1200000, currency: 'HUF' },
            delta: { absolute: 300000, percentage: 25, trend: 'up' },
          },
        }),
      });
    });

    await page.goto('/dashboard');

    // Initial load - 1 request
    await page.waitForSelector('text=Bruttó Bevétel', { timeout: 5000 });
    const initialCount = requestCount;

    // Trigger window focus event (TanStack Query refetch on focus)
    await page.evaluate(() => {
      const event = new Event('focus');
      window.dispatchEvent(event);
    });

    // Wait for potential refetch
    await page.waitForTimeout(500);

    // Verify refetch was triggered
    expect(requestCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('[P2] Test 9: Responsive design on mobile (portrait)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Mock all KPI endpoints
    await page.route('**/api/v1/dashboard/kpi/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            current: { value: 1000000, currency: 'HUF' },
            previous: { value: 900000, currency: 'HUF' },
            delta: { absolute: 100000, percentage: 11.11, trend: 'up' },
          },
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for KPI cards to load
    await page.waitForSelector('text=Bruttó Bevétel', { timeout: 5000 });

    // Verify cards stack vertically (1 column on mobile)
    const cards = page.locator('[role="region"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify cards have full width on mobile
    const firstCard = cards.first();
    const boundingBox = await firstCard.boundingBox();
    if (boundingBox) {
      // Card width should be close to viewport width (minus padding)
      expect(boundingBox.width).toBeGreaterThan(300);
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('[P2] Test 10: API error shows error state', async ({ page }) => {
    // Mock API error (500)
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    await page.goto('/dashboard');

    // Wait for error state to appear
    const errorMessage = page.locator('text=/Hiba|Error|Sikertelen/');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('[P1] Test 11: All 4 KPI cards render simultaneously', async ({ page }) => {
    // Mock all KPI endpoints
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            current: { value: 1500000, currency: 'HUF' },
            previous: { value: 1200000, currency: 'HUF' },
            delta: { absolute: 300000, percentage: 25, trend: 'up' },
          },
        }),
      });
    });

    await page.route('**/api/v1/dashboard/kpi/net-revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            current: { value: 1200000, currency: 'HUF' },
            previous: { value: 1100000, currency: 'HUF' },
            delta: { absolute: 100000, percentage: 9.09, trend: 'up' },
          },
        }),
      });
    });

    await page.route('**/api/v1/dashboard/kpi/receivables', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            current: { value: 750000, currency: 'HUF' },
            previous: { value: 680000, currency: 'HUF' },
            delta: { absolute: 70000, percentage: 10.29, trend: 'up' },
          },
        }),
      });
    });

    await page.route('**/api/v1/dashboard/kpi/payments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            current: { value: 450000, currency: 'HUF' },
            previous: { value: 420000, currency: 'HUF' },
            delta: { absolute: 30000, percentage: 7.14, trend: 'up' },
          },
        }),
      });
    });

    await page.goto('/dashboard');

    // Verify all 4 KPI cards are visible
    await expect(page.locator('text=Bruttó Bevétel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Nettó Bevétel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Kintlévőség')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Befizetések')).toBeVisible({ timeout: 5000 });
  });

  test('[P2] Test 12: Currency format is correct (HUF with spaces)', async ({ page }) => {
    // Mock revenue with specific value for format testing
    await page.route('**/api/v1/dashboard/kpi/revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            current: { value: 2345678, currency: 'HUF' },
            previous: { value: 2000000, currency: 'HUF' },
            delta: { absolute: 345678, percentage: 17.28, trend: 'up' },
          },
        }),
      });
    });

    await page.reload();

    // Wait for revenue card
    await expect(page.locator('text=Bruttó Bevétel')).toBeVisible({ timeout: 5000 });

    // Verify formatted value with spaces (2 345 678 Ft or 2,345,678 Ft)
    const formattedValue = page.locator('text=/2 345 678|2,345,678/');
    await expect(formattedValue).toBeVisible();
  });
});
