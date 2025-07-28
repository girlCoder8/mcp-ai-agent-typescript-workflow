import { defineConfig, devices, Project, TestInfo, PlaywrightTestConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * AI-Enhanced Playwright Configuration
 * Provides intelligent test prioritization, dynamic resource allocation,
 * and smart retry logic based on historical data and ML predictions.
 */

interface TestMetadata {
    testId: string;
    name: string;
    filePath: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    flakiness: number;
    avgDuration: number;
    successRate: number;
    lastExecution?: string;
    tags: string[];
}

interface AITestConfig {
    prioritization: {
        enabled: boolean;
        model: string;
        factors: {
            businessPriority: number;
            flakiness: number;
            executionTime: number;
            failureImpact: number;
            codeChanges: number;
        };
    };
    smartRetry: {
        enabled: boolean;
        maxRetries: number;
        retryDelay: number;
        exponentialBackoff: boolean;
        retryPatterns: string[];
        skipPatterns: string[];
    };
    parallelization: {
        dynamic: boolean;
        maxWorkers: number;
        resourceBasedScaling: boolean;
        testGrouping: boolean;
    };
    reporting: {
        aiInsights: boolean;
        performancePrediction: boolean;
        flakinessTrends: boolean;
    };
}

/**
 * Load AI configuration
 */
function loadAIConfig(): AITestConfig {
    try {
        const configPath = path.join(process.cwd(), 'tests/config', 'ai_test_config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        console.warn('⚠️ Failed to load AI config, using defaults:', error);
    }
    return getDefaultAIConfig();
}

function getDefaultAIConfig(): AITestConfig {
    return {
        prioritization: {
            enabled: false, // Disabled to prevent hanging
            model: 'gpt-4',
            factors: {
                businessPriority: 0.3,
                flakiness: 0.2,
                executionTime: 0.2,
                failureImpact: 0.2,
                codeChanges: 0.1,
            },
        },
        smartRetry: {
            enabled: true,
            maxRetries: 2, // Reduced retries for API tests
            retryDelay: 1000,
            exponentialBackoff: true,
            retryPatterns: [
                'TimeoutError',
                'NetworkError',
                'ElementNotFound',
                'Page crashed',
                'Connection refused',
                'ECONNREFUSED',
                'ETIMEDOUT',
            ],
            skipPatterns: [
                'AssertionError',
                'expect(',
                'ValidationError',
            ],
        },
        parallelization: {
            dynamic: true,
            maxWorkers: 0, // Auto-detect
            resourceBasedScaling: true,
            testGrouping: true,
        },
        reporting: {
            aiInsights: false, // Disabled by default to prevent possible hanging
            performancePrediction: false,
            flakinessTrends: false,
        },
    };
}

/**
 * Load test metadata from historical data
 */
function loadTestMetadata(): TestMetadata[] {
    try {
        const metadataPath = path.join(process.cwd(), 'data/ai-models', 'test_metadata.json');
        if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
    } catch (error) {
        console.warn('⚠️Failed to load test model metadata:', error);
    }
    return [];
}

/**
 * Determine the optimal number of workers based on system resources and test characteristics
 */
function calculateOptimalWorkers(aiConfig: AITestConfig): number {
    if (!aiConfig.parallelization.dynamic) {
        return aiConfig.parallelization.maxWorkers || 4;
    }

    try {
        const cpuCount = os.cpus().length;
        const totalMemory = os.totalmem() / (1024 * 1024 * 1024); // GB

        const testMetadata = loadTestMetadata();
        const avgTestDuration = testMetadata.reduce((sum, test) => sum + test.avgDuration, 0) / (testMetadata.length || 1) || 30000;
        const highResourceTests = testMetadata.filter(test => test.tags.includes('resource-intensive')).length;

        let workers = Math.max(1, Math.floor(cpuCount * 0.8));

        if (totalMemory < 8) {
            workers = Math.min(workers, 2);
        } else if (totalMemory < 16) {
            workers = Math.min(workers, 4);
        }

        if (avgTestDuration > 60000) {
            workers = Math.min(workers, 3);
        }

        if (highResourceTests > testMetadata.length * 0.3) {
            workers = Math.min(workers, 2);
        }

        if (process.env.CI === 'true') {
            workers = Math.min(workers, 3);
        }

        return Math.max(1, Math.min(workers, aiConfig.parallelization.maxWorkers || 8));
    } catch (error) {
        console.warn('⚠️Failed to calculate optimal workers, using default:', error);
        return 4;
    }
}

/**
 * AI-powered test prioritization
 */
async function prioritizeTests(aiConfig: AITestConfig): Promise<string[]> {
    if (!aiConfig.prioritization.enabled) {
        return [];
    }

    try {
        const testMetadata = loadTestMetadata();

        if (testMetadata.length === 0) {
            return [];
        }

        const scoredTests = testMetadata.map(test => {
            const factors = aiConfig.prioritization.factors;

            const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 }[test.priority] || 2;
            const flakinessScore = Math.max(0, 1 - test.flakiness);
            const executionScore = Math.max(0, 1 - (test.avgDuration / 120000));
            const reliabilityScore = test.successRate;
            const recentnessScore = test.lastExecution
                ? Math.min(1, (Date.now() - new Date(test.lastExecution).getTime()) / (7 * 24 * 60 * 60 * 1000))
                : 1;

            const totalScore =
                priorityScore * factors.businessPriority +
                flakinessScore * factors.flakiness +
                executionScore * factors.executionTime +
                reliabilityScore * factors.failureImpact +
                recentnessScore * factors.codeChanges;

            return { ...test, score: totalScore };
        });

        return scoredTests
            .sort((a, b) => b.score - a.score)
            .map(test => test.filePath);
    } catch (error) {
        console.warn('⚠️AI prioritization failed, using default order:', error);
        return [];
    }
}

/**
 * Smart retry logic based on error patterns
 */
function shouldRetryTest(error: Error, attempt: number, aiConfig: AITestConfig): boolean {
    if (!aiConfig.smartRetry.enabled || attempt >= aiConfig.smartRetry.maxRetries) {
        return false;
    }

    const errorMessage = error.message || error.toString();

    for (const pattern of aiConfig.smartRetry.skipPatterns) {
        if (errorMessage.includes(pattern)) {
            return false;
        }
    }

    for (const pattern of aiConfig.smartRetry.retryPatterns) {
        if (errorMessage.includes(pattern)) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number, aiConfig: AITestConfig): number {
    const baseDelay = aiConfig.smartRetry.retryDelay;

    if (aiConfig.smartRetry.exponentialBackoff) {
        return baseDelay * Math.pow(2, attempt - 1);
    }

    return baseDelay;
}

/**
 * Generate test execution insights
 */
async function generateExecutionInsights(): Promise<void> {
    const aiConfig = loadAIConfig();

    if (!aiConfig.reporting.aiInsights) {
        return;
    }

    try {
        const testMetadata = loadTestMetadata();
        const insights = {
            timestamp: new Date().toISOString(),
            totalTests: testMetadata.length,
            avgSuccessRate: testMetadata.length > 0 ? testMetadata.reduce((sum, test) => sum + test.successRate, 0) / testMetadata.length : 0,
            flakyTests: testMetadata.filter(test => test.flakiness > 0.3).length,
            slowTests: testMetadata.filter(test => test.avgDuration > 60000).length,
            criticalTests: testMetadata.filter(test => test.priority === 'critical').length,
            recommendations: [] as string[],
        };

        if (insights.flakyTests > insights.totalTests * 0.1) {
            insights.recommendations.push('High number of flaky tests detected. Consider stabilizing before scaling test suite.');
        }

        if (insights.slowTests > insights.totalTests * 0.2) {
            insights.recommendations.push('Many slow tests detected. Consider optimizing or running in separate suite.');
        }

        const insightsPath = path.join(process.cwd(), 'pipeline-reports', 'test-insights.json');
        fs.mkdirSync(path.dirname(insightsPath), { recursive: true });
        fs.writeFileSync(insightsPath, JSON.stringify(insights, null, 2));
    } catch (error) {
        console.warn('⚠️Failed to generate execution insights:', error);
    }
}

// Load AI configuration
const aiConfig = loadAIConfig();

// Calculate optimal workers
const optimalWorkers = calculateOptimalWorkers(aiConfig);

/**
 * Main Playwright configuration with AI enhancements
 */
export default defineConfig({
    testDir: './tests',
    testMatch: [
        '**/*.spec.ts',
        '**/*.test.ts'
    ],
    timeout: 30000, // Reduced timeout for API tests
    expect: {
        timeout: 10000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 2 : Math.min(optimalWorkers, 4), // Limit workers for stability
    reporter: [
        ['list'], // list reporter for console output
        ['html', {  //HTML report
            open: process.env.CI ? 'never' : 'on-failure',
        }],
        ['json', {
            outputFile: 'pipeline-reports/playwright-results.json',
        }],
        ['junit', {
            outputFile: 'pipeline-reports/junit-results.xml',
        }],
        ['allure-playwright', { //Allure report
            outputFile: 'allure-results/playwright-allure-results.json',
        }],
    ],
    globalSetup: require.resolve('./scripts/globalSetup/global-setup.ts'),
    globalTeardown: require.resolve('./scripts/globalTeardown/global-teardown.ts'),
    //Projects: API, Web
    projects: [
        {
            name: 'api-tests',
            testMatch: '**/tests/api/**/*.{test,spec}.{ts,js}',
            use: {
                baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
                extraHTTPHeaders: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Test-Run-ID': process.env.TEST_RUN_ID || 'local-run',
                    'X-AI-Enhanced': 'true',
                },
            },
        },
        {
            name: 'chromium-desktop',
            testMatch: [
                '**/tests/web/**/*.{test,spec}.{ts,js}',
                './auto-gen-ai-tests/playwright/**/*.{js,ts}',
                ],
            //
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
                video: process.env.CI ? 'retain-on-failure' : 'off',
                screenshot: 'only-on-failure',
                trace: 'retain-on-failure',
                baseURL: process.env.BASE_URL || 'http://localhost:3000',
                extraHTTPHeaders: {
                    'X-Test-Run-ID': process.env.TEST_RUN_ID || 'local-run',
                    'X-AI-Enhanced': 'true',
                },
            },
        },
        {
            name: 'firefox-desktop',
            testMatch: [
                '**/tests/web/**/*.{test,spec}.{ts,js}',
                './auto-gen-ai-tests/playwright/**/*.{js,ts}',
                ],
            //
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1920, height: 1080 },
                video: 'retain-on-failure',
                screenshot: 'only-on-failure',
                trace: 'retain-on-failure',
                baseURL: process.env.BASE_URL || 'http://localhost:3000',
            },
        },
        {
            name: 'webkit-desktop',
            testMatch: [
                '**/tests/web/**/*.{test,spec}.{ts,js}',
                './auto-gen-ai-tests/playwright/**/*.{js,ts}',
                ],
            //
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1920, height: 1080 },
                video: 'retain-on-failure',
                screenshot: 'only-on-failure',
                trace: 'retain-on-failure',
                baseURL: process.env.BASE_URL || 'http://localhost:3000',
            },
        },
        {
            name: 'visual-tests',
            testMatch: '**/tests/visual/**/*.{test,spec}.{ts,js}',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
                screenshot: 'on',
            },
        },
        {
            name: 'performance-tests',
            testMatch: '**/tests/performance/**/*.{test,spec}.{ts,js}',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
                launchOptions: {
                    args: [
                        '--disable-web-security',
                        '--disable-features=TranslateUI',
                        '--disable-extensions',
                        '--no-sandbox',
                    ],
                },
            },
            timeout: 120000,
        },
    ],

    webServer: undefined,
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        extraHTTPHeaders: {
            'X-Test-Run-ID': process.env.TEST_RUN_ID || 'local-run',
            'X-AI-Enhanced': 'true',
        },
    },
});

export {
    loadAIConfig,
    loadTestMetadata,
    calculateOptimalWorkers,
    prioritizeTests,
    shouldRetryTest,
    generateExecutionInsights,
};