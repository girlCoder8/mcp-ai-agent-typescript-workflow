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
            'appium:udid'?: string;
            'appium:xcodeOrgId'?: string;
            'appium:xcodeSigningId'?: string;
            'appium:updatedWDABundleId'?: string;
            'appium:useNewWDA'?: boolean;
            'appium:wdaLocalPort'?: number;
            'appium:mjpegServerPort'?: number;
            'appium:webkitDebugProxyPort'?: number;
            'custom:testExecutionId'?: string;
            'custom:aiEnhanced'?: boolean;
            'custom:deviceIndex'?: number;
            'custom:deviceTags'?: string;
            'custom:realDevice'?: boolean;
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

interface RealDeviceConfig {
    platformName: 'iOS';
    deviceName: string;
    platformVersion: string;
    udid: string; // Required for real devices
    browserName?: string;
    app?: string;
    priority: number;
    tags: string[];
    wdaLocalPort: number; // Unique port for each device
    mjpegServerPort: number; // Unique port for each device
    webkitDebugProxyPort: number; // Unique port for each device
    capabilities: Record<string, any>;
}

interface AIWdioRealConfig {
    smartDeviceSelection: {
        enabled: boolean;
        strategy: 'coverage' | 'priority';
        deviceMatrix: RealDeviceConfig[];
        adaptiveSelection: boolean;
    };
    parallelExecution: {
        enabled: boolean;
        maxDevices: number;
        resourceOptimization: boolean;
        devicePooling: boolean;
        portManagement: boolean;
    };
    intelligentRetry: {
        enabled: boolean;
        maxRetries: number;
        deviceSpecificRetry: boolean;
        platformAwareRetry: boolean;
        networkIssueRetry: boolean;
        realDeviceRetry: boolean;
    };
    performance: {
        appiumOptimizations: boolean;
        parallelAppInstall: boolean;
        smartWaiting: boolean;
        resourceMonitoring: boolean;
        realDeviceOptimizations: boolean;
    };
    reporting: {
        aiInsights: boolean;
        deviceCompatibilityMatrix: boolean;
        performanceMetrics: boolean;
        crossPlatformAnalysis: boolean;
        realDeviceMetrics: boolean;
    };
    provisioning: {
        xcodeOrgId?: string;
        xcodeSigningId?: string;
        updatedWDABundleId?: string;
        usePreinstalledWDA: boolean;
        wdaStartupRetries: number;
    };
}

function loadAIRealDeviceConfig(): AIWdioRealConfig {
    try {
        const configPath = path.join(process.cwd(), 'config', 'real_device_config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8')) as AIWdioRealConfig;
        }
    } catch (error) {
        console.warn('Failed to load AI real device config, using defaults:', error);
    }
    return getDefaultAIRealDeviceConfig();
}

function getDefaultAIRealDeviceConfig(): AIWdioRealConfig {
    return {
        smartDeviceSelection: {
            enabled: true,
            strategy: 'coverage',
            deviceMatrix: [],
            adaptiveSelection: true,
        },
        parallelExecution: {
            enabled: true,
            maxDevices: 2, // Conservative for real devices
            resourceOptimization: true,
            devicePooling: true,
            portManagement: true,
        },
        intelligentRetry: {
            enabled: true,
            maxRetries: 4, // More retries for real devices
            deviceSpecificRetry: true,
            platformAwareRetry: true,
            networkIssueRetry: true,
            realDeviceRetry: true,
        },
        performance: {
            appiumOptimizations: true,
            parallelAppInstall: false, // Safer for real devices
            smartWaiting: true,
            resourceMonitoring: true,
            realDeviceOptimizations: true,
        },
        reporting: {
            aiInsights: true,
            deviceCompatibilityMatrix: true,
            performanceMetrics: true,
            crossPlatformAnalysis: true,
            realDeviceMetrics: true,
        },
        provisioning: {
            xcodeOrgId: process.env.XCODE_ORG_ID,
            xcodeSigningId: process.env.XCODE_SIGNING_ID || 'iPhone Developer',
            updatedWDABundleId: process.env.WDA_BUNDLE_ID,
            usePreinstalledWDA: false,
            wdaStartupRetries: 3,
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

function getAvailableRealDevices(): RealDeviceConfig[] {
    const aiConfig = loadAIRealDeviceConfig();

    const iosOnlyDeviceMatrix = aiConfig.smartDeviceSelection.deviceMatrix.filter(d => d.platformName === 'iOS');
    if (iosOnlyDeviceMatrix.length === 0) {
        // Default configuration - you need to update UDIDs for your actual devices
        return [
            {
                platformName: 'iOS',
                deviceName: "iPad Air",
                platformVersion: '17.5',
                udid: process.env.IPAD_UDID_1 || 'YOUR_IPAD_UDID_1', // Replace with actual UDID
                browserName: 'Safari',
                priority: 1,
                tags: ['ipad', 'ios', 'safari', 'real-device'],
                wdaLocalPort: 8100,
                mjpegServerPort: 9100,
                webkitDebugProxyPort: 27753,
                capabilities: {
                    "appium:automationName": "XCUITest",
                    'appium:orientation': 'PORTRAIT',
                    'appium:newCommandTimeout': 300, // Longer for real devices
                    'appium:launchTimeout': 120000, // Longer for real devices
                }
            },
            {
                platformName: 'iOS',
                deviceName: "iPad Pro",
                platformVersion: '17.5',
                udid: process.env.IPAD_UDID_2 || 'YOUR_IPAD_UDID_2', // Replace with actual UDID
                browserName: 'Safari',
                priority: 2,
                tags: ['ipad-pro', 'ios', 'safari', 'real-device'],
                wdaLocalPort: 8101,
                mjpegServerPort: 9101,
                webkitDebugProxyPort: 27754,
                capabilities: {
                    "appium:automationName": "XCUITest",
                    'appium:orientation': 'PORTRAIT',
                    'appium:newCommandTimeout': 300,
                    'appium:launchTimeout': 120000,
                }
            }
        ];
    }
    return iosOnlyDeviceMatrix;
}

function selectForCoverage(devices: RealDeviceConfig[], testMetadata: MobileTestMetadata[] = []): RealDeviceConfig[] {
    return devices.filter(d => d.platformName === 'iOS').sort((a, b) => a.priority - b.priority).slice(0, 2);
}

function selectByPriority(devices: RealDeviceConfig[], testMetadata: MobileTestMetadata[] = []): RealDeviceConfig[] {
    return devices.filter(d => d.platformName === 'iOS').sort((a, b) => a.priority - b.priority).slice(0, 2);
}

function selectOptimalRealDevices(testMetadata: MobileTestMetadata[]): RealDeviceConfig[] {
    const aiConfig = loadAIRealDeviceConfig();
    const availableDevices = getAvailableRealDevices();

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

function generateRealDeviceCapabilities(selectedDevices: RealDeviceConfig[]): WebdriverIO.Capabilities[] {
    const aiConfig = loadAIRealDeviceConfig();

    return selectedDevices.map((device, index) => {
        const baseCapabilities: WebdriverIO.Capabilities = {
            platformName: device.platformName,
            'appium:deviceName': device.deviceName,
            'appium:platformVersion': device.platformVersion,
            'appium:udid': device.udid, // Essential for real devices
            browserName: device.browserName,
            'appium:newCommandTimeout': 300, // Longer timeout for real devices
            'appium:launchTimeout': 120000, // Longer launch timeout
            'appium:waitForIdleTimeout': 15, // Longer idle timeout

            // Real device specific configurations
            'appium:wdaLocalPort': device.wdaLocalPort,
            'appium:mjpegServerPort': device.mjpegServerPort,
            'appium:webkitDebugProxyPort': device.webkitDebugProxyPort,
            'appium:useNewWDA': true, // Fresh WDA for each session

            ...(aiConfig.performance.realDeviceOptimizations && {
                'appium:skipServerInstallation': false, // Allow WDA installation
                'appium:skipDeviceInitialization': false,
                'appium:fastReset': false, // More thorough reset for real devices
                'appium:noReset': false
            }),

            // Provisioning settings
            ...(aiConfig.provisioning.xcodeOrgId && {
                'appium:xcodeOrgId': aiConfig.provisioning.xcodeOrgId
            }),
            ...(aiConfig.provisioning.xcodeSigningId && {
                'appium:xcodeSigningId': aiConfig.provisioning.xcodeSigningId
            }),
            ...(aiConfig.provisioning.updatedWDABundleId && {
                'appium:updatedWDABundleId': aiConfig.provisioning.updatedWDABundleId
            }),

            ...device.capabilities,
            'custom:testExecutionId': process.env.TEST_EXECUTION_ID || `real-device-${Date.now()}`,
            'custom:aiEnhanced': true,
            'custom:deviceIndex': index,
            'custom:deviceTags': device.tags.join(','),
            'custom:realDevice': true,
        };

        // iOS specific configurations for real devices
        Object.assign(baseCapabilities, {
            'appium:automationName': 'XCUITest',
            'appium:wdaLaunchTimeout': 120000, // Longer WDA timeout
            'appium:wdaConnectionTimeout': 90000, // Longer connection timeout
            'appium:includeSafariInWebviews': true,
            'appium:safariInitialUrl': 'about:blank',
            'appium:safariAllowPopups': false,
            'appium:preventWDAAttachments': true, // Prevent WDA from attaching to system apps
            'appium:shouldTerminateApp': true, // Ensure clean app state
        });

        return baseCapabilities;
    });
}

function shouldRetryRealDeviceTest(error: Error, attempt: number, capabilities: WebdriverIO.Capabilities): boolean {
    const aiConfig = loadAIRealDeviceConfig();
    if (!aiConfig.intelligentRetry.enabled || attempt >= aiConfig.intelligentRetry.maxRetries) {
        return false;
    }

    const errorMessage = error.message || error.toString();

    // Real device specific retry patterns
    const realDeviceRetryPatterns = [
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
        'Could not find device',
        'Device is locked',
        'Trust this computer',
        'Unable to launch WebDriverAgent',
        'Failed to receive any data within the timeout',
        'Lost connection to the application',
        'Application is not running',
        'WDA server is not listening',
        'Could not determine iOS device type',
        'Device appears to be locked'
    ];

    if (realDeviceRetryPatterns.some(pattern => errorMessage.includes(pattern))) return true;

    if (aiConfig.intelligentRetry.networkIssueRetry) {
        const networkPatterns = ['network', 'connection', 'timeout', 'refused', 'unreachable'];
        if (networkPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern))) return true;
    }

    // Real device specific retries
    if (aiConfig.intelligentRetry.realDeviceRetry) {
        const deviceSpecificPatterns = ['locked', 'trust', 'provisioning', 'certificate', 'wda'];
        if (deviceSpecificPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern))) return true;
    }

    return false;
}

function calculateRealDeviceRetryDelay(attempt: number, capabilities: WebdriverIO.Capabilities): number {
    const baseDelay = 8000; // Longer base delay for real devices
    const realDeviceMultiplier = 2.0; // Higher multiplier for real devices
    const delay = baseDelay * Math.pow(2, attempt - 1) * realDeviceMultiplier;
    const jitter = Math.random() * 0.2 * delay; // More jitter for real devices
    return Math.min(delay + jitter, 120000); // Max 2 minutes
}

async function generateRealDeviceInsights(): Promise<void> {
    const aiConfig = loadAIRealDeviceConfig();
    if (!aiConfig.reporting.aiInsights) return;

    try {
        const testMetadata = loadMobileTestMetadata();
        const selectedDevices = selectOptimalRealDevices(testMetadata);

        const insights = {
            timestamp: new Date().toISOString(),
            deviceConfiguration: {
                totalDevices: selectedDevices.length,
                realDevices: selectedDevices.length,
                iosDevices: selectedDevices.length,
                selectedDevices: selectedDevices.map(d => ({
                    platform: d.platformName,
                    device: d.deviceName,
                    version: d.platformVersion,
                    udid: d.udid.substring(0, 8) + '...', // Partial UDID for privacy
                    priority: d.priority,
                    tags: d.tags,
                    ports: {
                        wda: d.wdaLocalPort,
                        mjpeg: d.mjpegServerPort,
                        webkit: d.webkitDebugProxyPort
                    }
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
            realDeviceSpecific: {
                provisioningConfigured: !!(aiConfig.provisioning.xcodeOrgId && aiConfig.provisioning.xcodeSigningId),
                parallelExecution: aiConfig.parallelExecution.enabled,
                portManagement: aiConfig.parallelExecution.portManagement,
                wdaConfiguration: {
                    usePreinstalled: aiConfig.provisioning.usePreinstalledWDA,
                    bundleId: aiConfig.provisioning.updatedWDABundleId || 'default'
                }
            },
            recommendations: [] as string[]
        };

        // Real device specific recommendations
        if (!insights.realDeviceSpecific.provisioningConfigured) {
            insights.recommendations.push('Configure Xcode provisioning for stable real device testing.');
        }

        if (insights.testAnalysis.flakyTests > insights.testAnalysis.totalTests * 0.1) {
            insights.recommendations.push('High flakiness detected. Consider device-specific stabilization for real devices.');
        }

        if (insights.testAnalysis.avgTestDuration > 180000) {
            insights.recommendations.push('Long test duration on real devices. Consider optimizing test performance.');
        }

        if (selectedDevices.length > 1 && !aiConfig.parallelExecution.portManagement) {
            insights.recommendations.push('Enable port management for better parallel execution on real devices.');
        }

        const insightsPath = path.join(process.cwd(), 'pipeline-reports', 'real-device-test-insights.json');
        fs.mkdirSync(path.dirname(insightsPath), { recursive: true });
        fs.writeFileSync(insightsPath, JSON.stringify(insights, null, 2));
        console.log('📱 Real device test insights generated');
    } catch (error) {
        console.warn('Failed to generate real device insights:', error);
    }
}

// ---- MAIN WDIO CONFIG EXPORT ----

const aiConfig = loadAIRealDeviceConfig();
const testMetadata = loadMobileTestMetadata();
const selectedDevices = selectOptimalRealDevices(testMetadata);

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
    capabilities: generateRealDeviceCapabilities(selectedDevices),

    services: [
        ['appium', {
            command: 'appium',
            args: {
                relaxedSecurity: true,
                allowInsecure: ['chromedriver_autodownload'],
                denyInsecure: [],
                log: './logs/appium-real-device.log',
                logLevel: process.env.DEBUG ? 'debug' : 'info',
                // Real device specific Appium args
                sessionOverride: true,
                keepAliveTimeout: 30,
                useDrivers: ['xcuitest']
            }
        }]
    ],

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 600000, // Longer timeout for real devices
        retries: 0 // Handled by custom retry logic
    },

    reporters: [
        'spec',
        ['json', {
            outputDir: './pipeline-reports/',
            outputFileFormat: (options: any) => `wdio-real-device-results-${options.cid}.json`
        }],
        ['junit', {
            outputDir: './pipeline-reports/',
            outputFileFormat: (options: any) => `wdio-real-device-junit-${options.cid}.xml`
        }],
        ['allure', {
            outputFile: 'allure-results/wdio-real-device-results.json',
            disableWebdriverStepsReporting: false,
            disableWebdriverScreenshotsReporting: false
        }]
    ],

    /**
     * Hooks: For the WDIO Testrunner
     */
    onPrepare: async function () {
        console.log('🚀 Preparing AI-enhanced real device test execution...');
        await generateRealDeviceInsights();

        const dirs = ['./logs', './pipeline-reports', './allure-results', './screenshots'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Validate real device configuration
        const devices = getAvailableRealDevices();
        for (const device of devices) {
            if (!device.udid || device.udid.startsWith('YOUR_')) {
                console.warn(`⚠️  Warning: Please configure actual UDID for device: ${device.deviceName}`);
            }
        }

        if (!aiConfig.provisioning.xcodeOrgId) {
            console.warn('⚠️  Warning: Xcode Org ID not configured. Set XCODE_ORG_ID environment variable.');
        }
    },

    onComplete: async function () {
        console.log('📊 Generating post-execution real device insights...');
        await generateRealDeviceInsights();
    },

    beforeSession: function (_config: unknown, _capabilities: unknown, _specs: string[]) {
        const caps = browser.capabilities as WebdriverIO.Capabilities;
        const deviceInfo = `${caps.platformName} ${caps['appium:deviceName']} ${caps['appium:platformVersion']} (${caps['appium:udid']?.substring(0, 8)}...)`;
        console.log(`📱 Starting real device session for: ${deviceInfo}`);
    },

    beforeTest: function (test: any, context: any): void {
        const caps = browser.capabilities as WebdriverIO.Capabilities;
        const deviceInfo = `${caps.platformName} ${caps['appium:deviceName']} (Real Device)`;
        console.log(`🧪 Starting test: ${test.title} on ${deviceInfo}`);
    },

    afterTest: async function (
        test: any,
        context: any,
        result: { error?: Error; duration: number; passed: boolean; retries?: { attempts: number } }
    ): Promise<any> {
        const caps = browser.capabilities as WebdriverIO.Capabilities;
        const deviceInfo = `${caps.platformName} ${caps['appium:deviceName']} (Real Device)`;
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

            if (error && shouldRetryRealDeviceTest(error, (retries?.attempts || 0), caps)) {
                const delay = calculateRealDeviceRetryDelay((retries?.attempts || 0) + 1, caps);
                console.log(`⏱️ Retrying real device test after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return { retry: true };
            }
        } else {
            console.log(`✅ Test passed: ${test.title} on ${deviceInfo} (${duration}ms)`);
        }
    },

    onError: function (error: Error, context: unknown) {
        console.error('🚨 Global real device error occurred:', error.message);
    },

    waitforTimeout: 30000, // Longer waits for real devices
    connectionRetryTimeout: 180000, // Longer connection timeout
    connectionRetryCount: 5, // More retries for real devices

    before: function (_capabilities: unknown, _specs: string[]) {
        // Enhanced commands for real devices
        browser.addCommand('smartWaitForElement', async function(this: WebdriverIO.Browser, selector: string, timeout: number = 15000): Promise<boolean> {
            const aiConfig = loadAIRealDeviceConfig();
            const browserCapabilities = browser.capabilities as WebdriverIO.Capabilities;

            if (aiConfig.performance.smartWaiting) {
                // Real devices may be slower
                const devicePerformance = 0.8; // Conservative performance factor
                const adjustedTimeout = timeout / devicePerformance;
                return this.waitForExist(selector, { timeout: adjustedTimeout });
            } else {
                return this.waitForExist(selector, { timeout });
            }
        });

        browser.addCommand('aiEnhancedClick', async function(this: WebdriverIO.Browser, selector: string): Promise<void> {
            await browser.smartWaitForElement(selector);
            await browser.waitForClickable(selector, { timeout: 8000 }); // Longer for real devices

            try {
                await browser.$(selector).click();
            } catch (clickError) {
                console.log('Standard click failed, trying touch action...');
                try {
                    await browser.$(selector).touchAction('tap');
                } catch (touchError) {
                    console.log('Touch action failed, trying coordinate tap...');
                    const element = browser.$(selector);
                    const location = await element.getLocation();
                    const size = await element.getSize();
                    await browser.touchAction([{
                        action: 'tap',
                        x: location.x + size.width / 2,
                        y: location.y + size.height / 2
                    }]);
                }
            }
        });

        browser.addCommand('smartScrollIntoView', async function(this: WebdriverIO.Browser, selector: string): Promise<void> {
            const element = browser.$(selector);
            try {
                await element.scrollIntoView();
            } catch (scrollError) {
                console.log('Standard scroll failed, trying mobile scroll...');
                try {
                    await browser.execute('mobile: scroll', {
                        direction: 'down',
                        element: element.elementId
                    });
                } catch (mobileScrollError) {
                    // Fallback to swipe gestures for real devices
                    const windowSize = await browser.getWindowSize();
                    await browser.touchAction([
                        { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.8 },
                        { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.2 },
                        { action: 'release' }
                    ]);
                }
            }
        });
    },

    // Environment specific overrides
    ...(process.env.CI === 'true' && {
        maxInstances: 1, // Conservative for CI real devices
        connectionRetryCount: 8,
        mochaOpts: {
            timeout: 900000 // 15 minutes for CI
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
    loadAIRealDeviceConfig,
    loadMobileTestMetadata,
    selectOptimalRealDevices,
    generateRealDeviceCapabilities,
    shouldRetryRealDeviceTest,
    generateRealDeviceInsights
};