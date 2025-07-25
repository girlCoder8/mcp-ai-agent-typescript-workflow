import { test as base, expect } from '@playwright/test';
import { TestLogger } from '../../src/utils/test-logger'

// Extend the base test with afterEach
const test = base;

test.afterEach(async ({ page }, testInfo) => {
    const testName = testInfo.title;
    if (testInfo.status !== testInfo.expectedStatus) {
        await TestLogger.handleError(testName, testInfo.error, { pageOrBrowser: page });
        TestLogger.fail(testName);
    } else {
        TestLogger.pass(testName);
    }
});

export { test, expect };

