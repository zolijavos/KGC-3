import { defineConfig, devices } from '@playwright/test';

/**
 * KGC ERP v7.0 - Playwright E2E Configuration
 *
 * FUTTATÁSI MÓDOK:
 *   pnpm test:e2e              # Standard mód (CI-barát)
 *   pnpm test:e2e:parallel     # Max párhuzamos (4 worker)
 *   pnpm test:e2e:yolo         # YOLO mód (gyors, nem áll meg hibánál)
 *   pnpm test:e2e:critical     # Csak P0 kritikus tesztek
 *
 * YOLO MÓD (TEST_YOLO=true):
 *   - Rövidebb timeout-ok (10s test, 3s action)
 *   - Nincs retry
 *   - 4 párhuzamos worker
 *   - Csak list reporter (gyorsabb)
 *   - Folytatás hibáknál
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// YOLO mode detection
const isYolo = process.env.TEST_YOLO === 'true' || process.env.YOLO === '1';
const isCI = !!process.env.CI;

// Worker count: YOLO=4, CI=2, local=auto
const workerCount = isYolo ? 4 : isCI ? 2 : undefined;

// Timeout-ok: YOLO=rövidebb, normál=standard
const testTimeout = isYolo ? 10000 : 30000;
const actionTimeout = isYolo ? 3000 : 5000;
const navigationTimeout = isYolo ? 5000 : 15000;

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file pattern
  testMatch: '**/*.e2e.ts',

  // Run tests in parallel - ALWAYS true for isolation
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,

  // Retry configuration
  // YOLO: 0, CI: 2, local: 1
  retries: isYolo ? 0 : isCI ? 2 : 1,

  // Worker count for parallelization
  workers: workerCount,

  // Reporter configuration
  reporter: isYolo
    ? [['list']] // YOLO: csak list (gyors)
    : [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
        isCI ? ['github'] : ['list'],
      ],

  // Global test timeout
  timeout: testTimeout,

  // Shared settings for all projects
  use: {
    // Base URL - Vite dev server runs on 5173
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    // Action timeout
    actionTimeout,

    // Navigation timeout
    navigationTimeout,

    // Trace: YOLO=off, others=on-first-retry
    trace: isYolo ? 'off' : 'on-first-retry',

    // Screenshot: YOLO=off, others=only-on-failure
    screenshot: isYolo ? 'off' : 'only-on-failure',

    // Video: YOLO=off, others=retain-on-failure
    video: isYolo ? 'off' : 'retain-on-failure',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Locale - Magyar
    locale: 'hu-HU',

    // Timezone - Budapest
    timezoneId: 'Europe/Budapest',

    // Extra HTTP headers for tenant isolation in parallel runs
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
    },
  },

  // Expect timeout
  expect: {
    timeout: actionTimeout,
  },

  // Configure projects for different scenarios
  projects: [
    // ============================================
    // Setup - Auth state preparation
    // ============================================
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ============================================
    // P0 - Kritikus tesztek (mindig futnak)
    // ============================================
    {
      name: 'critical',
      testMatch: '**/critical/**/*.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // ============================================
    // P1 - Fontos tesztek
    // ============================================
    {
      name: 'important',
      testMatch: '**/important/**/*.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      // dependencies: ['setup'], // Temporarily disabled for dashboard widget tests
    },

    // ============================================
    // P2 - Standard tesztek (csak full suite-nál)
    // ============================================
    {
      name: 'standard',
      testMatch: '**/standard/**/*.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // ============================================
    // Mobile tesztek (PWA)
    // ============================================
    {
      name: 'mobile',
      testMatch: '**/mobile/**/*.e2e.ts',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
    },

    // ============================================
    // API tesztek (headless, gyors)
    // ============================================
    {
      name: 'api',
      testMatch: '**/api/**/*.e2e.ts',
      use: {
        // No browser needed for pure API tests
      },
      // No setup dependency - API tests handle auth themselves
    },
  ],

  // Run local dev server before starting the tests (skip in YOLO)
  webServer:
    isCI || isYolo
      ? undefined
      : {
          command: 'turbo run dev --concurrency 20',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 120000,
        },

  // Output folder for test artifacts
  outputDir: 'test-results/',

  // Global setup/teardown (optional)
  // globalSetup: './e2e/support/global-setup.ts',
  // globalTeardown: './e2e/support/global-teardown.ts',
});
