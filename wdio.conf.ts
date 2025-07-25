import * as fs from 'fs/promises';
import path from 'path';

export const config: WebdriverIO.Config = {
    // WDIO + Appium runs iOS mobile iPad simulators
    runner: 'local',
    tsConfigPath: './tsconfig.json',
    //
    port: 4723,
    //
    specs: [
        "./tests/mobile/**/*.spec.ts",
    ],
    exclude: [],
    //
    // ============
    // Capabilities
    // ============
    //
    maxInstances: 10,
    //
    capabilities: [{
        // capabilities for local Appium web tests on iOS
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
    //
    // ===================
    // Test Configurations
    // ===================
    //
    // Level of logging verbosity: trace | debug | info | warn | error | silent
    logLevel: 'info',
    //
    bail: 0,
    //
    waitforTimeout: 10000,
    //
    connectionRetryTimeout: 120000,
    //
    connectionRetryCount: 2,
    //
    services: [
        ['appium', {
            // Use globally installed appium (if installed globally)
            command: 'appium',
        }]
    ],
    //
    framework: 'mocha',
    //
    // Reporter configuration
    reporters: [
        'spec', // Generates a console-based spec report
        ['allure', {
            outputDir: 'allure-results', // Directory for raw Allure results
            disableWebdriverStepsReporting: true,
            disableWebdriverScreenshotsReporting: false,
        }],
    ],
    mochaOpts: {
        //   ui: 'bdd',
        timeout: 60000
    },

    onPrepare: () => {
        console.log('Starting WebdriverIO Appium test run at', new Date().toISOString());
    },
    onComplete: () => {
        console.log('Test run completed. Generating Allure report...');
        // Command to generate an Allure report (run via a script or CI)
    },
}
