exports.config = {
    runner: 'local',
    specs: ["./tests/mobile/**/*.spec.ts"],
    capabilities: [
        {
            platformName: 'iOS',
            'appium:deviceName': 'iPad (10th generation)',
            'appium:platformVersion': '17.5',
            'appium:automationName': 'XCUITest',
            'appium:app': '/path/to/your.app',
        },
    ],
    logLevel: 'info',
    services: [['appium', { command: 'appium' }]],
    framework: 'mocha',
    reporters: ['spec'],
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            transpileOnly: true,
            project: './tsconfig.json',
        },
    },
    mochaOpts: {
        timeout: 60000,
    },
};
