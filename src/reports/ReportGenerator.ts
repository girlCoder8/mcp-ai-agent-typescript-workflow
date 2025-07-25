import { TaskResult } from '../types/interfaces';
import { TaskStatus } from '../types/enums';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ReportGenerator {
    /**
     * Generate a custom summary report in 'pipeline-reports' directory.
     * Returns the full file path.
     */
    async generateAllureReport(
        testResults: TaskResult[],
        outputDir: string = 'pipeline-reports'
    ): Promise<string> {
        // Ensure the custom directory exists (not 'allure-results'!)
        await fs.mkdir(outputDir, { recursive: true });

        const filePath = path.join(outputDir, `allure-report-${Date.now()}.json`);
        const data = {
            timestamp: new Date().toISOString(),
            totalTests: testResults.length,
            passed: testResults.filter(r => r.status === TaskStatus.COMPLETED).length,
            failed: testResults.filter(r => r.status === TaskStatus.FAILED).length,
            results: testResults
        };

        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return filePath;
    }

    /**
     * Simulate syncing failed test results with Zephyr/Jira.
     */
    async syncWithZephyrJira(testResults: TaskResult[]): Promise<string> {
        const failed = testResults.filter(r => r.status === TaskStatus.FAILED);
        await this.delay(150);
        if (failed.length) {
            return `Mock: Synced ${failed.length} failed test(s) with Jira.`;
        }
        return 'No issues to sync with Jira/Zephyr - all tests passed!';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
