import { defineConfig, devices } from '@playwright/test';

// require('dotenv').config();

export default defineConfig({
    globalSetup: require.resolve('./global-setup-tc.ts'),
    globalTeardown: require.resolve('./global-teardown-tc.ts'),
    testDir: './tests',
    testMatch: [
        '**/tests/**/*.spec.ts',
        '**/tests/generated/**/*.spec.ts'
    ],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['list', {}],
        ['html', { outputFolder: 'test-reports/playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-reports/results.json' }],
        ['junit', { outputFile: 'test-reports/junit.xml' }],
    ],
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 30000,
        navigationTimeout: 30000,
        ignoreHTTPSErrors: true,
    },
    projects: [
        {
            name: 'chromium-web',
            testDir: './tests/generated/web',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 }
            },
        },
        {
            name: 'firefox-web',
            testDir: './tests/generated/web',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1920, height: 1080 }
            },
        },
        {
            name: 'webkit-web',
            testDir: './tests/generated/web',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1920, height: 1080 }
            },
        },
        {
            name: 'mobile-chrome',
            testDir: './tests/generated/mobile',
            use: {
                ...devices['iPad (10th generation)'],
            },
        },
        {
            name: 'mobile-safari',
            testDir: './tests/generated/mobile',
            use: {
                ...devices['iPad (10th generation)'],
            },
        },
        {
            name: 'tablet-chrome',
            testDir: './tests/generated/mobile',
            use: {
                ...devices['iPad (10th generation)'],
            },
        },
        {
            name: 'manual-web-tests',
            testDir: './tests/manual',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 }
            },
        },
        {
            name: 'api-tests',
            testDir: './tests/api',
            use: {
                extraHTTPHeaders: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            },
        },
        {
            name: 'visual-tests',
            testDir: './tests/visual',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 }
            },
        },
        {
            name: 'performance-tests',
            testDir: './tests/performance',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 }
            },
        }
    ],
    timeout: 60000,
    expect: {
        timeout: 10000,
        toHaveScreenshot: {
            threshold: 0.3
        },
        toMatchSnapshot: {
            threshold: 0.3
        }
    },

    outputDir: 'test-case-results/',
    globalTimeout: 30 * 60 * 1000,
    ...(process.env.START_SERVER
        ? {
            webServer: {
                command: 'npm run dev',
                port: 3000,
                reuseExistingServer: !process.env.CI,
                timeout: 120000,
            }
        }
        : {}),
    metadata: {
        'test-environment': process.env.NODE_ENV || 'test',
        'base-url': process.env.BASE_URL || 'http://localhost:3000',
        'playwright-version': require('@playwright/test/package.json').version,
        'node-version': process.version,
        'generated-tests': true
    }
});
