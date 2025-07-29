/// <reference types="webdriverio" />
/// <reference types="mocha" />
/// <reference types="expect-webdriverio" />

import { expect } from 'expect-webdriverio';

describe('HeadSpin iOS Device App smoke test', () => {
    it('should launch and show welcome UI element', async () => {
        const el = await $('~welcome'); // example accessibility ID
        await expect(el).toBeDisplayed();
    });
});
