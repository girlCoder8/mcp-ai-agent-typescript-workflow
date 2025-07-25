"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Playwright homepage loads and has correct title', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await (0, test_1.expect)(page).toHaveTitle(/Playwright/);
});
(0, test_1.test)('Playwright homepage search works', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    // Click into search box and enter text
    await page.getByPlaceholder('Search').click();
    await page.getByPlaceholder('Search').fill('test');
    // Wait for results to appear
    await (0, test_1.expect)(page.locator('.DocSearch-Hits')).toBeVisible();
});
