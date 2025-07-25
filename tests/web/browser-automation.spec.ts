import { test, expect } from '@playwright/test';

test('Playwright homepage loads and has correct title', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await expect(page).toHaveTitle(/Playwright/);
});

test('Playwright homepage search works', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    // Click into the search box and enter text
    await page.getByPlaceholder('Search').click();
    await page.getByPlaceholder('Search').fill('test');
    // Wait for results to appear
    await expect(page.locator('.DocSearch-Hits')).toBeVisible();
});
