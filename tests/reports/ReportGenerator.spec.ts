import { test, expect } from '@playwright/test';
import { ReportGenerator } from '../../src/reports/ReportGenerator';
import { TaskResult } from '../../src/types/interfaces';
import { TaskStatus } from '../../src/types/enums';
import * as fs from 'fs/promises';
import * as path from 'path';

test('generateAllureReport produces a file in custom directory', async () => {
    const gen = new ReportGenerator();
    const results: TaskResult[] = [
        { taskName: 'unit_test', status: TaskStatus.COMPLETED, output: 'ok', duration: 1 }
    ];

    const customDir = 'pipeline-reports';
    const filePath = await gen.generateAllureReport(results, customDir);

    // File should be saved inside customDir
    expect(filePath.startsWith(`${customDir}${path.sep}`) || filePath.startsWith(`${customDir}/`)).toBe(true);

    // Check the file exists
    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);

    // Read and check contents
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    expect(content.totalTests).toBe(1);
    expect(content.passed).toBe(1);

    // Clean up
    await fs.unlink(filePath);
    // Optionally remove the directory if empty (ignore errors)
    try { await fs.rmdir(customDir); } catch {}
});

test('syncWithZephyrJira works as expected', async () => {
    const gen = new ReportGenerator();
    const passing: TaskResult[] = [
        { taskName: 'should pass', status: TaskStatus.COMPLETED, output: '', duration: 0.5 }
    ];
    const failing: TaskResult[] = [
        { taskName: 'should fail', status: TaskStatus.FAILED, output: '', duration: 0.5, error: 'err' }
    ];

    const r1 = await gen.syncWithZephyrJira(passing);
    expect(r1).toMatch(/all tests passed/i);

    const r2 = await gen.syncWithZephyrJira(failing);
    expect(r2).toMatch(/Mock: Synced 1 failed/);
});
