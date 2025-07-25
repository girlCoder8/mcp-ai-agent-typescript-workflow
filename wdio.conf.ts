import { TestLogger } from './src/utils/test-logger';
import path from "path";

declare const browser: WebdriverIO.Browser;

export const config: WebdriverIO.Config = {
    // WDIO + Appium runs iOS mobile iPad simulators
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    port: 4723,

    specs: [
        "./tests/mobile/**/*.spec.ts",
    ],
    exclude: [],

    maxInstances: 10,

    capabilities: [{
        "platformName": "iOS",
        "appium:deviceName": "iPad (10th generation)",
        "appium:platformVersion": "17.5",
        "appium:automationName": "XCUITest",
        "appium:wdaLaunchTimeout": 120000,
        "appium:wdaConnectionTimeout": 120000,
        "appium:showXcodeLog": true,
        "appium:useNewWDA": true,
        "appium:usePrebuiltWDA": false
    }],

    logLevel: 'info',

    bail: 0,

    waitforTimeout: 10000,

    connectionRetryTimeout: 120000,

    connectionRetryCount: 2,

    services: [
        ['appium', {
            command: 'appium',
        }]
    ],

    framework: 'mocha',

    reporters: [
        'spec',
        ['allure', {
            outputDir: 'allure-results',
            disableWebdriverStepsReporting: true,
            disableWebdriverScreenshotsReporting: false,
        }],
    ],

    mochaOpts: {
        timeout: 60000,
    },

    onPrepare: () => {
        console.log('Starting WebdriverIO Appium test run at', new Date().toISOString());
    },

    onComplete: () => {
        console.log('Test run completed. Generating Allure report...');
    },

    /**
     * Hook for global error handling that gets executed after each test
     */
    afterTest: async function (
        test,
        context,
        {error, result, duration, passed, retries}
    ) {
        const testName = test.title || "Test Name";
        if (!passed) {
            await TestLogger.handleError(testName, error, {pageOrBrowser: browser});
            TestLogger.fail(testName);
        } else {
            TestLogger.pass(testName);
        }
    },
}
