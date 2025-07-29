/// <reference types="webdriverio" />
/// <reference types="mocha" />
/// <reference types="expect-webdriverio" />

import { expect } from 'expect-webdriverio';

describe('iOS Simulator App smoke test', () => {
    it('should launch and show main UI element', async () => {
        // Example for a native iOS app:
        const el = await $('~main-screen'); // replace with your app's accessibility id
        await expect(el).toBeDisplayed();
    });
});
