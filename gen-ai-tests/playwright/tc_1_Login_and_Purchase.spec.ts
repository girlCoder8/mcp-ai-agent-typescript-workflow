import { test, expect } from '@playwright/test';

test('Login and purchase a Case of Red Wine via Credit Card', async ({ page }) => {
    // 1. Launch Application
    await page.goto('https://yourapp.example.com/');

    // 2. Login
    await page.fill('#username', 'test_user');
    await page.fill('#password', 'secure_password');
    await page.click('button[type="submit"]');
    await expect(page.locator('#dashboard')).toBeVisible();

    // 3. Navigate to Shop
    await page.click('text=Shop All Products');
    await expect(page.locator('#shop-page')).toBeVisible();

    // 4. Search for Product
    await page.fill('#product-search', 'Case of Red Wine');
    await page.click('#btn-search');
    await expect(page.locator('.product-result')).toContainText('Wireless Earbuds');

    // 5. Add Product to Cart
    await page.click('text=Case of Red Wine');
    await page.click('button#add-to-cart');
    await expect(page.locator('#cart-count')).toHaveText(/^[1-9][0-9]*$/);

    // 6. Proceed to Checkout
    await page.click('button#checkout');
    await page.check('input[value="credit-card"]');

    // 7. Enter Credit Card Details
    await page.fill('#cc-number', '4111 1111 1111 1111');
    await page.fill('#cc-expiry', '12/27');
    await page.fill('#cc-cvv', '123');
    await page.click('button#pay-now');

    // 8. Validate Confirmation
    await expect(page.locator('text=Thank you')).toBeVisible();
});
