import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Story 35-4: Alert Notification Panel
 * Tests notification panel, badge counter, mark as read, and clear all functionality
 */

test.describe('Dashboard - Notification Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth endpoint to return authenticated user
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'MANAGER',
        }),
      });
    });

    // Navigate to dashboard page
    await page.goto('/dashboard');
  });

  test('[P1] Test 1: Notification badge shows unread count', async ({ page }) => {
    // Mock notifications endpoint with 3 unread notifications
    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 3 }),
      });
    });

    await page.reload();

    // Wait for notification badge to appear
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });

    // Verify badge shows count "3"
    await expect(badge).toHaveText('3');
  });

  test('[P1] Test 2: Clicking notification bell opens panel', async ({ page }) => {
    // Mock unread count
    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 2 }),
      });
    });

    // Mock notifications list
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              type: 'CRITICAL',
              title: 'Készlethiány!',
              message: 'Makita DHP485 - Készlet: 8 (kritikus szint)',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/inventory',
            },
            {
              id: 'notif-2',
              type: 'WARNING',
              title: 'Sürgős munkalap!',
              message: 'Munkalap #1234 sürgős javítás',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/worksheets/1234',
            },
          ],
        }),
      });
    });

    await page.reload();

    // Click notification bell icon
    const bellIcon = page.locator('[data-testid="notification-bell"]');
    await bellIcon.click();

    // Wait for panel to open
    const panel = page.locator('[data-testid="notification-panel"]');
    await expect(panel).toBeVisible({ timeout: 2000 });

    // Verify panel shows notifications
    await expect(page.locator('text=Készlethiány!')).toBeVisible();
    await expect(page.locator('text=Sürgős munkalap!')).toBeVisible();
  });

  test('[P1] Test 3: CRITICAL notification shows red badge', async ({ page }) => {
    // Mock critical notification
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-critical',
              type: 'CRITICAL',
              title: 'Fizetési hiba!',
              message: 'Tranzakció elutasítva: 50,000 Ft',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/transactions/tx-123',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.reload();

    // Open notification panel
    await page.locator('[data-testid="notification-bell"]').click();

    // Wait for panel to open
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Verify critical notification has red badge
    const criticalBadge = page.locator('[class*="bg-red"]').first();
    await expect(criticalBadge).toBeVisible();

    // Verify critical title is shown
    await expect(page.locator('text=Fizetési hiba!')).toBeVisible();
  });

  test('[P1] Test 4: WARNING notification shows yellow badge', async ({ page }) => {
    // Mock warning notification
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-warning',
              type: 'WARNING',
              title: 'Készlet figyelmeztető',
              message: 'DeWalt DCD795 - Készlet közeledik minimum szinthez',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/inventory',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.reload();

    // Open notification panel
    await page.locator('[data-testid="notification-bell"]').click();

    // Wait for panel
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Verify warning notification has yellow badge
    const warningBadge = page.locator('[class*="bg-yellow"]').first();
    await expect(warningBadge).toBeVisible();
  });

  test('[P1] Test 5: INFO notification shows blue badge', async ({ page }) => {
    // Mock info notification
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-info',
              type: 'INFO',
              title: 'Új termék elérhető',
              message: 'Bosch GBH 2-28 fúrókalapács rendelhető',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/products',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.reload();

    // Open notification panel
    await page.locator('[data-testid="notification-bell"]').click();

    // Wait for panel
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Verify info notification has blue badge
    const infoBadge = page.locator('[class*="bg-blue"]').first();
    await expect(infoBadge).toBeVisible();
  });

  test('[P1] Test 6: Clicking notification marks it as read', async ({ page }) => {
    let markAsReadCalled = false;

    // Mock notifications
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              type: 'WARNING',
              title: 'Test Notification',
              message: 'Click me to mark as read',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/test',
            },
          ],
        }),
      });
    });

    // Mock mark as read endpoint
    await page.route('**/api/v1/dashboard/notifications/notif-1/read', async (route) => {
      markAsReadCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock unread count (initially 1, then 0)
    let unreadCount = 1;
    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: unreadCount }),
      });
      if (markAsReadCalled) unreadCount = 0;
    });

    await page.reload();

    // Open panel
    await page.locator('[data-testid="notification-bell"]').click();
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Click notification
    const notification = page.locator('text=Test Notification');
    await notification.click();

    // Verify mark as read was called
    await page.waitForTimeout(500);
    expect(markAsReadCalled).toBe(true);
  });

  test('[P1] Test 7: Clear All button marks all notifications as read', async ({ page }) => {
    let clearAllCalled = false;

    // Mock notifications
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              type: 'CRITICAL',
              title: 'Notification 1',
              message: 'Message 1',
              timestamp: new Date().toISOString(),
              isRead: false,
            },
            {
              id: 'notif-2',
              type: 'WARNING',
              title: 'Notification 2',
              message: 'Message 2',
              timestamp: new Date().toISOString(),
              isRead: false,
            },
          ],
        }),
      });
    });

    // Mock clear all endpoint
    await page.route('**/api/v1/dashboard/notifications/clear', async (route) => {
      clearAllCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 2 }),
      });
    });

    // Mock unread count
    let unreadCount = 2;
    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: unreadCount }),
      });
      if (clearAllCalled) unreadCount = 0;
    });

    await page.reload();

    // Open panel
    await page.locator('[data-testid="notification-bell"]').click();
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Click "Clear All" button
    const clearButton = page.locator('[data-testid="clear-all-button"]');
    await clearButton.click();

    // Verify clear all was called
    await page.waitForTimeout(500);
    expect(clearAllCalled).toBe(true);

    // Verify badge count is now 0
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible({ timeout: 2000 });
  });

  test('[P1] Test 8: Empty state shows when no notifications', async ({ page }) => {
    // Mock empty notifications
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.reload();

    // Badge should not be visible when count is 0
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible();

    // Open panel
    await page.locator('[data-testid="notification-bell"]').click();
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Verify empty state message
    const emptyState = page.locator('text=/Nincs értesítés|No notifications/');
    await expect(emptyState).toBeVisible();
  });

  test('[P1] Test 9: Notification timestamp shows relative time', async ({ page }) => {
    // Mock notification with timestamp 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              type: 'INFO',
              title: 'Test Notification',
              message: 'Timestamp test',
              timestamp: fiveMinutesAgo,
              isRead: false,
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.reload();

    // Open panel
    await page.locator('[data-testid="notification-bell"]').click();
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Verify relative timestamp (e.g., "5 perc", "5 minutes ago")
    const relativeTime = page.locator('text=/5 perc|5 minutes/');
    await expect(relativeTime).toBeVisible();
  });

  test('[P2] Test 10: Notification panel closes when clicking outside', async ({ page }) => {
    // Mock notifications
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              type: 'INFO',
              title: 'Test',
              message: 'Test message',
              timestamp: new Date().toISOString(),
              isRead: false,
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.reload();

    // Open panel
    await page.locator('[data-testid="notification-bell"]').click();
    const panel = page.locator('[data-testid="notification-panel"]');
    await expect(panel).toBeVisible({ timeout: 2000 });

    // Click outside panel (on dashboard background)
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Panel should close
    await expect(panel).not.toBeVisible({ timeout: 1000 });
  });

  test('[P2] Test 11: Notification with actionUrl navigates when clicked', async ({ page }) => {
    // Mock notification with action URL
    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-action',
              type: 'CRITICAL',
              title: 'Készlethiány!',
              message: 'Kattints ide a készlethez',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionUrl: '/inventory',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications/notif-action/read', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.reload();

    // Open panel
    await page.locator('[data-testid="notification-bell"]').click();
    await page.waitForSelector('[data-testid="notification-panel"]', { timeout: 2000 });

    // Click notification
    const notification = page.locator('text=Készlethiány!');
    await notification.click();

    // Verify navigation to /inventory (or URL change)
    await page.waitForURL('**/inventory', { timeout: 3000 });
    expect(page.url()).toContain('/inventory');
  });

  test('[P1] Test 12: Real-time update - new notification appears', async ({ page }) => {
    // Initial empty state
    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.route('**/api/v1/dashboard/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.reload();

    // Verify no badge initially
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible();

    // Simulate new notification arriving (mock SSE or polling)
    await page.route('**/api/v1/dashboard/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 1 }),
      });
    });

    // Trigger refetch (focus event)
    await page.evaluate(() => {
      const event = new Event('focus');
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(1000);

    // Verify badge now shows count
    await expect(badge).toBeVisible({ timeout: 2000 });
    await expect(badge).toHaveText('1');
  });
});
