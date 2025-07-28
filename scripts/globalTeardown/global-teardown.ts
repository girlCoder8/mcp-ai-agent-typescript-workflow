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

async function globalTeardown(config: FullConfig) {
    console.log('🧹 Running global teardown...');

    try {
        // Wrap teardown in timeout but don't throw errors
        await withTimeout(performTeardown(config), 15000, 'Global teardown');
        console.log('✅ Global teardown completed successfully');

    } catch (error) {
        console.error('❌ Global teardown failed:', error);
        // Don't throw in teardown to avoid masking test results
    }
}

async function performTeardown(config: FullConfig) {
    // Update test run metadata with completion time
    const reportsDir = path.join(process.cwd(), 'pipeline-reports');
    const metadataPath = path.join(reportsDir, 'test-run-metadata.json');

    try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        metadata.endTime = new Date().toISOString();
        metadata.duration = Date.now() - new Date(metadata.startTime).getTime();

        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        console.log('📝 Test run metadata updated');
    } catch (error) {
        console.warn('⚠️ Could not update test metadata:', error instanceof Error ? error.message : String(error));
    }

    // Finalize AI tracking data if enabled
    try {
        const aiDataPath = path.join(process.cwd(), 'data/ai-models', 'current-run.json');
        const aiDataExists = await fs.access(aiDataPath).then(() => true).catch(() => false);

        if (aiDataExists) {
            const aiData = JSON.parse(await fs.readFile(aiDataPath, 'utf-8'));
            aiData.endTime = new Date().toISOString();
            aiData.duration = Date.now() - new Date(aiData.startTime).getTime();

            // Archive the run data
            const archivePath = path.join(process.cwd(), 'data/ai-models', `run-${aiData.runId}.json`);
            await fs.writeFile(archivePath, JSON.stringify(aiData, null, 2));

            // Clean up the current run file
            await fs.unlink(aiDataPath);
            console.log('🤖 AI tracking data finalized');
        }
    } catch (error) {
        console.warn('⚠️ Could not finalize AI tracking:', error instanceof Error ? error.message : String(error));
    }

    // Add custom teardown logic here:
    // - Stop test servers
    // - Clean up test databases
    // - Remove temporary files
    // - Clean up mock services
    // - Revoke authentication tokens
    // - Delete test data

    // Clean up temporary test files
    try {
        const tempDir = path.join(process.cwd(), 'temp-test-files');
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('🗑️ Temporary files cleaned up');
    } catch (error) {
    }

    // Log final statistics
    try {
        const resultsPath = path.join(reportsDir, 'playwright-results.json');
        const resultsExist = await fs.access(resultsPath).then(() => true).catch(() => false);

        if (resultsExist) {
            const results = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
            console.log(`📊 Test Results: ${results.stats?.expected || 0} passed, ${results.stats?.unexpected || 0} failed`);
        }
    } catch (error) {
    }
}

export default globalTeardown;