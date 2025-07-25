require('dotenv').config();

exports.config = {
    runner: 'local',
    specs: [
        './tests/mobile/**/*.spec.ts"'
    ],
    maxInstances: 1,
    hostname: process.env.HEADSPIN_HOST || 'us-west2.headspin.io',
    protocol: 'https',
    port: 443,
    path: `/v0/${process.env.HEADSPIN_API_TOKEN}/wd/hub`,
    capabilities: [{
        platformName: 'iOS',
        'appium:deviceName': 'HeadspinDevice',
        'appium:udid': process.env.HEADSPIN_UDID,
        'appium:automationName': 'XCUITest',
        'appium:app': process.env.HEADSPIN_APP_URL // HTTPS upload url
    }],
    logLevel: 'info',
    services: ['appium'],
    framework: 'mocha',
    reporters: ['spec', ['allure', { outputDir: 'allure-results' }]],
    mochaOpts: {
        timeout: 90000
    },
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            transpileOnly: true,
            project: 'tsconfig.json'
        }
    }
};
