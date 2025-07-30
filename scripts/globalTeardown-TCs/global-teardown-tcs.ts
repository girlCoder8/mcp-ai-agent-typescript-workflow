import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
    testId: string;
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    platform: 'web' | 'mobile';
    timestamp: string;
}

interface TestReport {
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        webTests: number;
        mobileTests: number;
        duration: number;
    };
    results: TestResult[];
    generatedAt: string;
}

class TestCaseCleanup {
    private generatedTestsDir: string;
    private reportsDir: string;

    constructor(generatedTestsDir: string = './tests/generated', reportsDir: string = './test-reports') {
        this.generatedTestsDir = generatedTestsDir;
        this.reportsDir = reportsDir;
    }

    async generateTestReport(): Promise<void> {
        try {
            // Create reports directory if it doesn't exist
            await fs.promises.mkdir(this.reportsDir, { recursive: true });

            const report: TestReport = {
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    webTests: 0,
                    mobileTests: 0,
                    duration: 0
                },
                results: [],
                generatedAt: new Date().toISOString()
            };

            // Read Playwright test results if available
            const playwrightResultsPath = path.join(this.reportsDir, 'results.json');

            if (fs.existsSync(playwrightResultsPath)) {
                console.log('📊 Reading Playwright test results...');
                const resultsData = await fs.promises.readFile(playwrightResultsPath, 'utf-8');
                const playwrightResults = JSON.parse(resultsData);

                // Process Playwright results
                if (playwrightResults.suites) {
                    this.processPlaywrightResults(playwrightResults, report);
                }
            } else {
                console.log('⚠️  No Playwright results found, generating basic report...');
                await this.generateBasicReport(report);
            }

            // Write consolidated report
            const reportPath = path.join(this.reportsDir, 'test-case-report.json');
            await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

            // Generate HTML report
            await this.generateHTMLReport(report);

            console.log('📄 Test report generated:', reportPath);
            this.printSummary(report);

        } catch (error) {
            console.error('❌ Error generating test report:', error);
        }
    }

    private processPlaywrightResults(playwrightResults: any, report: TestReport): void {
        const processSpecs = (specs: any[]) => {
            for (const spec of specs) {
                if (spec.tests) {
                    for (const test of spec.tests) {
                        const platform = spec.file.includes('/mobile/') ? 'mobile' : 'web';
                        const result: TestResult = {
                            testId: test.title || 'unknown',
                            testName: test.fullTitle || test.title || 'Unknown Test',
                            status: this.mapPlaywrightStatus(test.outcome),
                            duration: test.results?.[0]?.duration || 0,
                            error: test.results?.[0]?.error?.message,
                            platform,
                            timestamp: new Date().toISOString()
                        };

                        report.results.push(result);
                        report.summary.total++;
                        report.summary.duration += result.duration;

                        if (result.status === 'passed') report.summary.passed++;
                        else if (result.status === 'failed') report.summary.failed++;
                        else if (result.status === 'skipped') report.summary.skipped++;

                        if (platform === 'web') report.summary.webTests++;
                        else report.summary.mobileTests++;
                    }
                }

                if (spec.suites) {
                    processSpecs(spec.suites);
                }
            }
        };

        processSpecs(playwrightResults.suites);
    }

    private mapPlaywrightStatus(outcome: string): 'passed' | 'failed' | 'skipped' {
        switch (outcome) {
            case 'expected': return 'passed';
            case 'unexpected': return 'failed';
            case 'flaky': return 'failed';
            case 'skipped': return 'skipped';
            default: return 'failed';
        }
    }

    private async generateBasicReport(report: TestReport): Promise<void> {
        // Scan generated test files to create basic report
        const webTestsDir = path.join(this.generatedTestsDir, 'web');
        const mobileTestsDir = path.join(this.generatedTestsDir, 'mobile');

        if (fs.existsSync(webTestsDir)) {
            const webFiles = await fs.promises.readdir(webTestsDir);
            report.summary.webTests = webFiles.filter(f => f.endsWith('.spec.ts')).length;
        }

        if (fs.existsSync(mobileTestsDir)) {
            const mobileFiles = await fs.promises.readdir(mobileTestsDir);
            report.summary.mobileTests = mobileFiles.filter(f => f.endsWith('.spec.ts')).length;
        }

        report.summary.total = report.summary.webTests + report.summary.mobileTests;
    }

    private async generateHTMLReport(report: TestReport): Promise<void> {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Case Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 2em; }
        .summary-card p { margin: 0; opacity: 0.9; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .results-table th { background-color: #f8f9fa; font-weight: bold; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-skipped { color: #ffc107; font-weight: bold; }
        .platform-web { background-color: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .platform-mobile { background-color: #f3e5f5; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Case Execution Report</h1>
            <p>Generated at: ${new Date(report.generatedAt).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>${report.summary.total}</h3>
                <p>Total Tests</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.passed}</h3>
                <p>Passed</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.failed}</h3>
                <p>Failed</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.skipped}</h3>
                <p>Skipped</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.webTests}</h3>
                <p>Web Tests</p>
            </div>
            <div class="summary-card">
                <h3>${report.summary.mobileTests}</h3>
                <p>Mobile Tests</p>
            </div>
        </div>

        ${report.results.length > 0 ? `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Test ID</th>
                    <th>Test Name</th>
                    <th>Platform</th>
                    <th>Status</th>
                    <th>Duration (ms)</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(result => `
                <tr>
                    <td>${result.testId}</td>
                    <td>${result.testName}</td>
                    <td><span class="platform-${result.platform}">${result.platform.toUpperCase()}</span></td>
                    <td><span class="status-${result.status}">${result.status.toUpperCase()}</span></td>
                    <td>${result.duration.toLocaleString()}</td>
                    <td>${result.error ? result.error.substring(0, 100) + '...' : '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p>No detailed test results are available.</p>'}

        <div class="footer">
            <p>Report generated by Playwright Test Case Generator</p>
        </div>
    </div>
</body>
</html>`;

        const htmlPath = path.join(this.reportsDir, 'test-case-report.html');
        await fs.promises.writeFile(htmlPath, htmlContent);
        console.log('📊 HTML report generated:', htmlPath);
    }

    private printSummary(report: TestReport): void {
        console.log('\n📈 Test Execution Summary:');
        console.log('═'.repeat(50));
        console.log(`📊 Total Tests: ${report.summary.total}`);
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`⏭️  Skipped: ${report.summary.skipped}`);
        console.log(`🌐 Web Tests: ${report.summary.webTests}`);
        console.log(`📱 Mobile Tests: ${report.summary.mobileTests}`);
        console.log(`⏱️  Total Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
        console.log('═'.repeat(50));
    }

    async cleanupGeneratedFiles(keepFiles: boolean = true): Promise<void> {
        if (!keepFiles && fs.existsSync(this.generatedTestsDir)) {
            console.log('🧹 Cleaning up generated test files...');

            try {
                await fs.promises.rm(this.generatedTestsDir, { recursive: true, force: true });
                console.log('✅ Generated test files cleaned up');
            } catch (error) {
                console.error('❌ Error cleaning up files:', error);
            }
        } else {
            console.log('📁 Keeping generated test files');
        }
    }

    async archiveResults(): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveDir = path.join(this.reportsDir, 'archive', timestamp);

        try {
            await fs.promises.mkdir(archiveDir, { recursive: true });

            // Archive current reports
            const reportFiles = ['test-case-report.json', 'test-case-report.html'];

            for (const file of reportFiles) {
                const sourcePath = path.join(this.reportsDir, file);
                const targetPath = path.join(archiveDir, file);

                if (fs.existsSync(sourcePath)) {
                    await fs.promises.copyFile(sourcePath, targetPath);
                }
            }

            console.log('📦 Results archived to:', archiveDir);
        } catch (error) {
            console.error('❌ Error archiving results:', error);
        }
    }
}

async function globalTeardown(config: FullConfig) {
    console.log('🏁 Starting test case cleanup and reporting...');

    const cleanup = new TestCaseCleanup();

    try {
        // Generate a comprehensive test report
        await cleanup.generateTestReport();

        // Archive results for historical tracking
        await cleanup.archiveResults();

        // Cleanup generated files (set to false if you want to remove them)
        const keepGeneratedFiles = process.env.KEEP_GENERATED_FILES !== 'false';
        await cleanup.cleanupGeneratedFiles(keepGeneratedFiles);

        console.log('✅ Teardown completed successfully');

    } catch (error) {
        console.error('❌ Error during teardown:', error);
        process.exit(1);
    }
}

export default globalTeardown;