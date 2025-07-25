import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    testMatch: [
        'web/**/*.spec.ts',
        'api/**/*.spec.ts',
        'mocks/**/*.spec.ts'
    ],
    // explicitly ignoring mobile tests with testIgnore
    testIgnore: [
        'mobile/**/*.spec.ts'
    ],
    timeout: 30000,
    retries: 1,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],
   /* use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        viewport: { width: 1280, height: 720 },
    }, */

    reporter: [['list'], ['json'], ['allure-playwright', { outputFile: 'allure-results/results.json' }]],
});
