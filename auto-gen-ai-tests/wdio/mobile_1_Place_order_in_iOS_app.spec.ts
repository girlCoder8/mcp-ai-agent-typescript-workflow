/// <reference types="webdriverio" />
/// <reference types="mocha" />
/// <reference types="expect-webdriverio" />

import { expect } from 'expect-webdriverio';

describe('iOS App - Place Order', () => {
    it('should allow user to login and order wine with a Credit Card', async () => {
        // 1. (Optional) Launch or reset the app
        // Typically not needed; but uncomment if re-launch is required:
        // await driver.launchApp(); // or: await driver.reset();

        // 2. Login
        await $('~username_field').setValue('admin');
        await $('~password_field').setValue('secure_password');
        await $('~login_button').click();
        await expect($('~dashboard')).toBeDisplayed();

        // 3. Add red wine to the cart
        await $('~shop_tab').click();
        await $('~search_input').setValue('wine');
        await $('~product_wine').click();
        await $('~add_to_cart_button').click();

        // 4. Pay with a credit card
        await $('~checkout_button').click();
        await $('~creditcard_option').click();
        await $('~pay_now_button').click();

        // 5. Confirm order success
        await expect($('~thank_you_message')).toBeDisplayed();
    });
});