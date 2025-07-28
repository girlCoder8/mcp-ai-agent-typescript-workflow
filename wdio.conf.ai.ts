import type { Options } from '@wdio/types';
import * as fs from 'fs';
import * as path from 'path';

/** --- TypeScript augment for WebdriverIO custom commands and standard commands --- */
declare global {
    namespace WebdriverIO {
        interface Browser {
            smartWaitForElement(selector: string, timeout?: number): Promise<boolean>;
            aiEnhancedClick(selector: string): Promise<void>;
            smartScrollIntoView(selector: string): Promise<void>;
            waitForExist(selector: string, options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string; interval?: number }): Promise<boolean>;
            waitForClickable(selector: string, options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string; interval?: number }): Promise<boolean>;
            takeScreenshot(): Promise<string>;
            $(selector: string): ChainablePromiseElement;
            execute(script: string | ((...args: any[]) => any), ...args: any[]): Promise<any>;
        }
        interface Capabilities {
            'appium:newCommandTimeout'?: number;
            'appium:launchTimeout'?: number;
            'appium:waitForIdleTimeout'?: number;
            'appium:automationName'?: string;
            'appium:wdaLaunchTimeout'?: number;
            'appium:wdaConnectionTimeout'?: number;
            'appium:includeSafariInWebviews'?: boolean;
            'appium:safariInitialUrl'?: string;
            'appium:safariAllowPopups'?: boolean;
            'appium:skipServerInstallation'?: boolean;
            'appium:skipDeviceInitialization'?: boolean;
            'appium:fastReset'?: boolean;
            'appium:noReset'?: boolean;
            'custom:testExecutionId'?: string;
            'custom:aiEnhanced'?: boolean;
            'custom:deviceIndex'?: number;
            'custom:deviceTags'?: string;
            [key: string]: any;
        }
    }
}

interface MobileTestMetadata {
    testId: string;
    name: string;
    filePath: string;
    deviceTypes: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    avgDuration: number;
    flakiness: number;
    platform: 'ios';
    tags: string[];
    lastExecution?: string;
    successRate: number;
}

interface DeviceConfig {
    platformName: 'iOS';
    deviceName: string;
    platformVersion: string;
    udid?: string;
    browserName?: string;
    app?: string;
    priority: number;
    tags: string[];
    capabilities: Record<string, any>;
}

interface AIWdioConfig {
    smartDeviceSelection: {
        enabled: boolean;
        strategy: 'coverage' | 'priority';
        deviceMatrix: DeviceConfig[];
        adaptiveSelection: boolean;
    };
    parallelExecution: {
        enabled: boolean;
        maxDevices: number;
        resourceOptimization: boolean;
        devicePooling: boolean;
    };
    intelligentRetry: {
        enabled: boolean;
        maxRetries: number;
        deviceSpecificRetry: boolean;
        platformAwareRetry: boolean;
        networkIssueRetry: boolean;
    };
    performance: {
        appiumOptimizations: boolean;
        parallelAppInstall: boolean;
        smartWaiting: boolean;
        resourceMonitoring: boolean;
    };
    reporting: {
        aiInsights: boolean;
        deviceCompatibilityMatrix: boolean;
        performanceMetrics: boolean;
        crossPlatformAnalysis: boolean;
    };
}

function loadAIMobileConfig(): AIWdioConfig {
    try {
        const configPath = path.join(process.cwd(), 'config', 'ai_mobile_config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8')) as AIWdioConfig;
        }
    } catch (error) {
        console.warn('Failed to load AI mobile config, using defaults:', error);
    }
    return getDefaultAIMobileConfig();
}

function getDefaultAIMobileConfig(): AIWdioConfig {
    return {
        smartDeviceSelection: {
            enabled: true,
            strategy: 'coverage',
            deviceMatrix: [],
            adaptiveSelection: true,
        },
        parallelExecution: {
            enabled: true,
            maxDevices: 4,
            resourceOptimization: true,
            devicePooling: true,
        },
        intelligentRetry: {
            enabled: true,
            maxRetries: 3,
            deviceSpecificRetry: true,
            platformAwareRetry: true,
            networkIssueRetry: true,
        },
        performance: {
            appiumOptimizations: true,
            parallelAppInstall: false,
            smartWaiting: true,
            resourceMonitoring: true,
        },
        reporting: {
            aiInsights: true,
            deviceCompatibilityMatrix: true,
            performanceMetrics: true,
            crossPlatformAnalysis: true,
        }
    };
}

function loadMobileTestMetadata(): MobileTestMetadata[] {
    try {
        const metadataPath = path.join(process.cwd(), 'data', 'mobile_test_metadata.json');
        if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as MobileTestMetadata[];
        }
    } catch (error) {
        console.warn('Failed to load mobile test metadata:', error);
    }
    return [];
}

function getAvailableDevices(): DeviceConfig[] {
    const aiConfig = loadAIMobileConfig();

    const iosOnlyDeviceMatrix = aiConfig.smartDeviceSelection.deviceMatrix.filter(d => d.platformName === 'iOS');
    if (iosOnlyDeviceMatrix.length === 0) {
        return [
            {
                platformName: 'iOS',
                deviceName: "iPad (10th generation)",
                platformVersion: '17.5',
                browserName: 'Safari',
                priority: 1,
                tags: ['flagship', 'ios', 'safari'],
                capabilities: {
                    "appium:automationName": "XCUITest",
                    'appium:orientation': 'PORTRAIT',
                    'appium:newCommandTimeout': 240,
                    'appium:launchTimeout': 90000,
                }
            }
        ];
    }
    return iosOnlyDeviceMatrix;
}

function selectForCoverage(devices: DeviceConfig[], testMetadata: MobileTestMetadata[] = []): DeviceConfig[] {
    return devices.filter(d => d.platformName === 'iOS').sort((a, b) => a.priority - b.priority).slice(0, 4);
}

function selectByPriority(devices: DeviceConfig[], testMetadata: MobileTestMetadata[] = []): DeviceConfig[] {
    return devices.filter(d => d.platformName === 'iOS').sort((a, b) => a.priority - b.priority).slice(0, 4);
}

function selectOptimalDevices(testMetadata: MobileTestMetadata[]): DeviceConfig[] {
    const aiConfig = loadAIMobileConfig();
    const availableDevices = getAvailableDevices();
    if (!aiConfig.smartDeviceSelection.enabled) {
        return availableDevices.slice(0, aiConfig.parallelExecution.maxDevices);
    }
    switch (aiConfig.smartDeviceSelection.strategy) {
        case 'coverage':
            return selectForCoverage(availableDevices, testMetadata).slice(0, aiConfig.parallelExecution.maxDevices);
        case 'priority':
            return selectByPriority(availableDevices, testMetadata).slice(0, aiConfig.parallelExecution.maxDevices);
        default:
            return availableDevices.slice(0, aiConfig.parallelExecution.maxDevices);
    }
}

function generateCapabilities(selectedDevices: DeviceConfig[]): WebdriverIO.Capabilities[] {
    const aiConfig = loadAIMobileConfig();
    return selectedDevices.map((device, index) => {
        const baseCapabilities: WebdriverIO.Capabilities = {
            platformName: device.platformName,
            'appium:deviceName': device.deviceName,
            'appium:platformVersion': device.platformVersion,
            browserName: device.browserName,
            'appium:newCommandTimeout': 240,
            'appium:launchTimeout': 90000,
            'appium:waitForIdleTimeout': 10,
            ...(aiConfig.performance.appiumOptimizations && {
                'appium:skipServerInstallation': true,
                'appium:skipDeviceInitialization': false,
                'appium:fastReset': true,
                'appium:noReset': false
            }),
            ...device.capabilities,
            'custom:testExecutionId': process.env.TEST_EXECUTION_ID || `mobile-${Date.now()}`,
            'custom:aiEnhanced': true,
            'custom:deviceIndex': index,
            'custom:deviceTags': device.tags.join(','),
        };
        Object.assign(baseCapabilities, {
            'appium:automationName': 'XCUITest',
            'appium:wdaLaunchTimeout': 90000,
            'appium:wdaConnectionTimeout': 60000,
            'appium:includeSafariInWebviews': true,
            'appium:safariInitialUrl': 'about:blank',
            'appium:safariAllowPopups': false
        });
        return baseCapabilities;
    });
}

function shouldRetryMobileTest(error: Error, attempt: number, capabilities: WebdriverIO.Capabilities): boolean {
    const aiConfig = loadAIMobileConfig();
    if (!aiConfig.intelligentRetry.enabled || attempt >= aiConfig.intelligentRetry.maxRetries) {
        return false;
    }
    const errorMessage = error.message || error.toString();
    const iOSRetryPatterns = [
        'Session not created',
        'Connection refused',
        'Socket hang up',
        'ECONNRESET',
        'timeout',
        'Could not proxy command',
        'An unknown server-side error occurred',
        'Failed to start WebDriverAgent',
        'Could not connect to WebDriverAgent',
        'WebDriverAgent quit unexpectedly',
        'xcodebuild failed',
        'Could not find device'
    ];
    if (iOSRetryPatterns.some(pattern => errorMessage.includes(pattern))) return true;
    if (aiConfig.intelligentRetry.networkIssueRetry) {
        const networkPatterns = ['network', 'connection', 'timeout', 'refused', 'unreachable'];
        if (networkPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern))) return true;
    }
    return false;
}

function calculateMobileRetryDelay(attempt: number, capabilities: WebdriverIO.Capabilities): number {
    const baseDelay = 5000;
    const platformMultiplier = 1.5;
    const delay = baseDelay * Math.pow(2, attempt - 1) * platformMultiplier;
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, 60000);
}

async function generateMobileInsights(): Promise<void> {
    const aiConfig = loadAIMobileConfig();
    if (!aiConfig.reporting.aiInsights) return;
    try {
        const testMetadata = loadMobileTestMetadata();
        const selectedDevices = selectOptimalDevices(testMetadata);
        const insights = {
            timestamp: new Date().toISOString(),
            deviceConfiguration: {
                totalDevices: selectedDevices.length,
                iosDevices: selectedDevices.length,
                selectedDevices: selectedDevices.map(d => ({
                    platform: d.platformName,
                    device: d.deviceName,
                    version: d.platformVersion,
                    priority: d.priority,
                    tags: d.tags
                }))
            },
            testAnalysis: {
                totalTests: testMetadata.length,
                criticalTests: testMetadata.filter(t => t.priority === 'critical').length,
                crossPlatformTests: testMetadata.length,
                avgTestDuration: testMetadata.length > 0
                    ? testMetadata.reduce((sum, t) => sum + t.avgDuration, 0) / testMetadata.length
                    : 0,
                flakyTests: testMetadata.filter(t => t.flakiness > 0.3).length
            },
            recommendations: [] as string[]
        };
        if (insights.testAnalysis.flakyTests > insights.testAnalysis.totalTests * 0.15) {
            insights.recommendations.push('High flakiness detected in mobile tests. Consider device-specific stabilization.');
        }
        if (insights.testAnalysis.avgTestDuration > 120000) {
            insights.recommendations.push('Long average test duration detected. Consider optimizing mobile test performance.');
        }
        const insightsPath = path.join(process.cwd(), 'pipeline-reports', 'mobile-test-insights.json');
        fs.mkdirSync(path.dirname(insightsPath), { recursive: true });
        fs.writeFileSync(insightsPath, JSON.stringify(insights, null, 2));
        console.log('📱 Mobile test insights generated');
    } catch (error) {
        console.warn('Failed to generate mobile insights:', error);
    }
}

// ---- MAIN WDIO CONFIG EXPORT ----

const aiConfig = loadAIMobileConfig();
const testMetadata = loadMobileTestMetadata();
const selectedDevices = selectOptimalDevices(testMetadata);

export const config: Options.Testrunner = {
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    port: 4723,

    specs: [
        './tests/mobile/**/*.{js,ts}',
     //   './tests/e2e/mobile/**/*.{js,ts}'  //e2e-wdio-mobile folder needed
    ],
    exclude: [
      //  './tests/mobile/**/*.skip.{js,ts}',
      //  './tests/mobile/**/*.wip.{js,ts}'
    ],
    maxInstances: aiConfig.parallelExecution.enabled ? aiConfig.parallelExecution.maxDevices : 1,
    maxInstancesPerCapability: 1,
    capabilities: generateCapabilities(selectedDevices),
    services: [
        ['appium', {
            command: 'appium',
            args: {
                relaxedSecurity: true,
                allowInsecure: ['chromedriver_autodownload'],
                denyInsecure: [],
                log: './logs/appium.log',
                logLevel: process.env.DEBUG ? 'debug' : 'info'
            }
        }]
    ],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 300000,
        retries: 0
    },
    reporters: [
        'spec',
        ['json', {
            outputDir: './pipeline-reports/',
            outputFileFormat: (options: any) => `wdio-results-${options.cid}.json`
        }],
        ['junit', {
            outputDir: './pipeline-reports/',
            outputFileFormat: (options: any) => `wdio-junit-${options.cid}.xml`
        }],
        ['allure', {
            outputFile: 'allure-results/wdio-results.json',
            disableWebdriverStepsReporting: false,
            disableWebdriverScreenshotsReporting: false
        }]
    ],
    /**
     * Hooks: For the WDIO Testrunner
     */
    onPrepare: async function () {
        console.log('🚀 Preparing AI-enhanced mobile test execution...');
        await generateMobileInsights();
        const dirs = ['./logs', './pipeline-reports', './allure-results', './screenshots'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    },
    onComplete: async function () {
        console.log('📊 Generating post-execution mobile insights...');
        await generateMobileInsights();
    },
    beforeSession: function (_config: unknown, _capabilities: unknown, _specs: string[]) {
        const caps = browser.capabilities as WebdriverIO.Capabilities;
        const deviceInfo = `${caps.platformName} ${caps['appium:deviceName']} ${caps['appium:platformVersion']}`;
        console.log(`📱 Starting session for: ${deviceInfo}`);
    },
    beforeTest: function (test: any, context: any): void {
        const caps = browser.capabilities as WebdriverIO.Capabilities;
        const deviceInfo = `${caps.platformName} ${caps['appium:deviceName']}`;
        console.log(`🧪 Starting test: ${test.title} on ${deviceInfo}`);
    },
    afterTest: async function (
        test: any,
        context: any,
        result: { error?: Error; duration: number; passed: boolean; retries?: { attempts: number } }
    ): Promise<any> {
        const caps = browser.capabilities as WebdriverIO.Capabilities;
        const deviceInfo = `${caps.platformName} ${caps['appium:deviceName']}`;
        const { error, duration, passed, retries } = result;
        if (!passed) {
            console.log(`❌ Test failed: ${test.title} on ${deviceInfo}`);
            try {
                const screenshot = await browser.takeScreenshot();
                const screenshotPath = path.join(process.cwd(), 'screenshots',
                    `${test.title.replace(/\s+/g, '_')}_${deviceInfo.replace(/\s+/g, '_')}_${Date.now()}.png`);
                fs.writeFileSync(screenshotPath, screenshot, 'base64');
                console.log(`📸 Screenshot saved: ${screenshotPath}`);
            } catch (screenshotError) {
                console.warn('Failed to take screenshot:', screenshotError);
            }
            if (error && shouldRetryMobileTest(error, (retries?.attempts || 0), caps)) {
                const delay = calculateMobileRetryDelay((retries?.attempts || 0) + 1, caps);
                console.log(`⏱️ Retrying after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return { retry: true };
            }
        } else {
            console.log(`✅ Test passed: ${test.title} on ${deviceInfo} (${duration}ms)`);
        }
    },
    onError: function (error: Error, context: unknown) {
        console.error('🚨 Global error occurred:', error.message);
    },
    waitforTimeout: 20000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    before: function (_capabilities: unknown, _specs: string[]) {
        browser.addCommand('smartWaitForElement', async function(this: WebdriverIO.Browser, selector: string, timeout: number = 10000): Promise<boolean> {
            const aiConfig = loadAIMobileConfig();
            const browserCapabilities = browser.capabilities as WebdriverIO.Capabilities;
            if (aiConfig.performance.smartWaiting) {
                const devicePerformance = 1.0; // iOS only
                const adjustedTimeout = timeout * devicePerformance;
                return this.waitForExist(selector, { timeout: adjustedTimeout });
            } else {
                return this.waitForExist(selector, { timeout });
            }
        });
        browser.addCommand('aiEnhancedClick', async function(this: WebdriverIO.Browser, selector: string): Promise<void> {
            await browser.smartWaitForElement(selector);
            await browser.waitForClickable(selector, { timeout: 5000 });
            try {
                await browser.$(selector).click();
            } catch {
                await browser.$(selector).touchAction('tap');
            }
        });
        browser.addCommand('smartScrollIntoView', async function(this: WebdriverIO.Browser, selector: string): Promise<void> {
            const element = browser.$(selector);
            try {
                await element.scrollIntoView();
            } catch {
                await browser.execute('mobile: scroll', {
                    direction: 'down',
                    element: element.elementId
                });
            }
        });
    },
    ...(process.env.CI === 'true' && {
        maxInstances: 2,
        connectionRetryCount: 5,
        mochaOpts: {
            timeout: 600000
        }
    }),
    ...(process.env.DEBUG === 'true' && {
        maxInstances: 1,
        logLevel: 'debug',
        mochaOpts: {
            timeout: 0
        }
    }),
} as Options.Testrunner & { capabilities: WebdriverIO.Capabilities[] };

export {
    loadAIMobileConfig,
    loadMobileTestMetadata,
    selectOptimalDevices,
    generateCapabilities,
    shouldRetryMobileTest,
    generateMobileInsights
};