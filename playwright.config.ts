import { defineConfig, devices } from '@playwright/test';

/**
 * KGC ERP v3.0 - Playwright E2E Configuration
 *
 * Kritikus flow-k tesztelése:
 * - P0: Bérlés checkout, NAV számlázás, Auth
 * - P1: Szerviz munkalap, Kaució kezelés
 * - P2: Ügyfél regisztráció
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file pattern
  testMatch: '**/*.e2e.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (stability)
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Locale - Magyar
    locale: 'hu-HU',

    // Timezone - Budapest
    timezoneId: 'Europe/Budapest',
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
      dependencies: ['setup'],
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
  ],

  // Global timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Run local dev server before starting the tests
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
