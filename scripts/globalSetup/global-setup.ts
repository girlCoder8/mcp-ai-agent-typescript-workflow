import { FullConfig } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

// Timeout wrapper to prevent hanging
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

async function globalSetup(config: FullConfig) {
    console.log('🚀 Running global setup...');

    try {
        // Wrap the entire setup in a timeout
        await withTimeout(performSetup(config), 30000, 'Global setup');
        console.log('✅ Global setup completed successfully');

    } catch (error) {
        console.error('❌ Global setup failed:', error);
        throw error;
    }
}

async function performSetup(config: FullConfig) {
    // Ensure the reports directory exists
    const reportsDir = path.join(process.cwd(), 'pipeline-reports');
    await fs.mkdir(reportsDir, { recursive: true });

    // Ensure allure results directory exists
    const allureDir = path.join(process.cwd(), 'allure-results');
    await fs.mkdir(allureDir, { recursive: true });

    // Set up test run metadata
    const testRunId = process.env.TEST_RUN_ID || `run-${Date.now()}`;
    const testMetadata = {
        runId: testRunId,
        startTime: new Date().toISOString(),
        config: config.configFile,
        projects: config.projects.map(p => p.name),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            ci: !!process.env.CI,
        }
    };

    // Save test metadata
    await fs.writeFile(
        path.join(reportsDir, 'test-run-metadata.json'),
        JSON.stringify(testMetadata, null, 2)
    );

    console.log(`📝 Test run metadata saved: ${testRunId}`);

    // Initialize AI test tracking if enabled
    try {
        const aiConfigPath = path.join(process.cwd(), 'tests/config', 'ai_test_config.json');
        const aiConfigExists = await fs.access(aiConfigPath).then(() => true).catch(() => false);

        if (aiConfigExists) {
            console.log('🤖 AI test configuration found');
            // Initialize AI tracking data
            const aiTrackingData = {
                runId: testRunId,
                startTime: new Date().toISOString(),
                tests: [],
                insights: []
            };

            const aiDataDir = path.join(process.cwd(), 'data/ai-models');
            await fs.mkdir(aiDataDir, { recursive: true });
            await fs.writeFile(
                path.join(aiDataDir, 'current-run.json'),
                JSON.stringify(aiTrackingData, null, 2)
            );
        }
    } catch (error) {
        console.warn('⚠️ Could not initialize AI tracking:', error instanceof Error ? error.message : String(error));
    }

    // Add custom setup logic here:
    // - Start test servers
    // - Set up test databases
    // - Configure environment variables
    // - Initialize mock services

    // Example: Environment validation
    if (process.env.NODE_ENV !== 'test' && !process.env.CI) {
        console.warn('⚠️ NODE_ENV is not set to "test"');
    }

    // Example: API availability check for API tests
    if (config.projects.some(p => p.name === 'api-tests')) {
        console.log('🔍 Checking API availability...');
        // Add API health check here
    }
}

export default globalSetup;
