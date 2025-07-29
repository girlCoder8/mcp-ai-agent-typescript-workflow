import * as fs from 'fs';
import * as path from 'path';

interface TestStats {
    duration?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    flaky?: number;
    timeout?: number;
    expected?: number;
    unexpected?: number;
}

interface TestSuite {
    title: string;
    file: string;
    tests: TestSpec[];
    suites?: TestSuite[];
}

interface TestSpec {
    title: string;
    fullTitle?: string;
    outcome: string;
    results: TestResult[];
}

interface TestResult {
    duration: number;
    status: string;
    error?: {
        message: string;
        stack?: string;
    };
}

interface PlaywrightResults {
    config: any;
    suites: TestSuite[];
    stats: TestStats;
}

interface TestSummaryData {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    flakyTests: number;
    totalDuration: number;
    webTests: number;
    mobileTests: number;
    failedTestsList: string[];
    platformBreakdown: {
        [key: string]: {
            passed: number;
            failed: number;
            skipped: number;
        };
    };
}

export function generateTestSummary(): void {
    try {
        const resultsPath = './test-reports/results.json';
        const customReportPath = './test-reports/test-case-report.json';

        if (!fs.existsSync(resultsPath) && !fs.existsSync(customReportPath)) {
            console.log('❌ No test results found. Run tests first.');
            console.log('💡 Try running: npm run test');
            return;
        }

        let summaryData: TestSummaryData = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            flakyTests: 0,
            totalDuration: 0,
            webTests: 0,
            mobileTests: 0,
            failedTestsList: [],
            platformBreakdown: {}
        };

        // Try to read Playwright results first
        if (fs.existsSync(resultsPath)) {
            const results: PlaywrightResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            summaryData = processPlaywrightResults(results);
        }

        // Try to read custom report if available
        if (fs.existsSync(customReportPath)) {
            const customResults = JSON.parse(fs.readFileSync(customReportPath, 'utf8'));
            summaryData = mergeCustomResults(summaryData, customResults);
        }

        // Display summary
        displaySummary(summaryData);

        // Generate additional insights
        generateInsights(summaryData);

    } catch (error) {
        console.error('❌ Error generating summary:', (error as Error).message);
        console.log('🔍 Debug info:');
        console.log('   - Check if test results files are valid JSON');
        console.log('   - Ensure tests have been run recently');
        console.log('   - Try running: npm run test');
    }
}

function processPlaywrightResults(results: PlaywrightResults): TestSummaryData {
    const summaryData: TestSummaryData = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        flakyTests: 0,
        totalDuration: 0,
        webTests: 0,
        mobileTests: 0,
        failedTestsList: [],
        platformBreakdown: {}
    };

    // Process stats if available
    if (results.stats) {
        summaryData.totalTests = (results.stats.passed || 0) + (results.stats.failed || 0) + (results.stats.skipped || 0);
        summaryData.passedTests = results.stats.passed || 0;
        summaryData.failedTests = results.stats.failed || 0;
        summaryData.skippedTests = results.stats.skipped || 0;
        summaryData.flakyTests = results.stats.flaky || 0;
        summaryData.totalDuration = results.stats.duration || 0;
    }

    // Process suites recursively
    if (results.suites) {
        processSuites(results.suites, summaryData);
    }

    return summaryData;
}

function processSuites(suites: TestSuite[], summaryData: TestSummaryData): void {
    for (const suite of suites) {
        // Determine platform from file path
        const platform = suite.file.includes('/mobile/') ? 'mobile' :
            suite.file.includes('/web/') ? 'web' : 'other';

        if (!summaryData.platformBreakdown[platform]) {
            summaryData.platformBreakdown[platform] = { passed: 0, failed: 0, skipped: 0 };
        }

        // Process tests in this suite
        if (suite.tests) {
            for (const test of suite.tests) {
                if (platform === 'web') summaryData.webTests++;
                if (platform === 'mobile') summaryData.mobileTests++;

                // Update platform breakdown
                if (test.outcome === 'expected') {
                    summaryData.platformBreakdown[platform].passed++;
                } else if (test.outcome === 'unexpected') {
                    summaryData.platformBreakdown[platform].failed++;
                    summaryData.failedTestsList.push(`${test.fullTitle || test.title} (${suite.file})`);
                } else if (test.outcome === 'skipped') {
                    summaryData.platformBreakdown[platform].skipped++;
                }
            }
        }

        // Process nested suites
        if (suite.suites) {
            processSuites(suite.suites, summaryData);
        }
    }
}

function mergeCustomResults(summaryData: TestSummaryData, customResults: any): TestSummaryData {
    // Merge custom report data if available
    if (customResults.summary) {
        summaryData.totalTests = Math.max(summaryData.totalTests, customResults.summary.total || 0);
        summaryData.passedTests = Math.max(summaryData.passedTests, customResults.summary.passed || 0);
        summaryData.failedTests = Math.max(summaryData.failedTests, customResults.summary.failed || 0);
        summaryData.skippedTests = Math.max(summaryData.skippedTests, customResults.summary.skipped || 0);
        summaryData.webTests = Math.max(summaryData.webTests, customResults.summary.webTests || 0);
        summaryData.mobileTests = Math.max(summaryData.mobileTests, customResults.summary.mobileTests || 0);
    }

    return summaryData;
}

function displaySummary(data: TestSummaryData): void {
    console.log('\n🎯 TEST EXECUTION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`📊 Total Tests: ${data.totalTests}`);
    console.log(`⏱️  Total Duration: ${(data.totalDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Passed: ${data.passedTests} (${getPercentage(data.passedTests, data.totalTests)}%)`);
    console.log(`❌ Failed: ${data.failedTests} (${getPercentage(data.failedTests, data.totalTests)}%)`);
    console.log(`⏭️  Skipped: ${data.skippedTests} (${getPercentage(data.skippedTests, data.totalTests)}%)`);

    if (data.flakyTests > 0) {
        console.log(`🔄 Flaky: ${data.flakyTests}`);
    }

    console.log('═'.repeat(60));
    console.log(`🌐 Web Tests: ${data.webTests}`);
    console.log(`📱 Mobile Tests: ${data.mobileTests}`);

    // Platform breakdown
    if (Object.keys(data.platformBreakdown).length > 0) {
        console.log('\n📊 PLATFORM BREAKDOWN:');
        for (const [platform, stats] of Object.entries(data.platformBreakdown)) {
            const total = stats.passed + stats.failed + stats.skipped;
            console.log(`${getPlatformIcon(platform)} ${platform.toUpperCase()}: ${total} tests`);
            console.log(`   ✅ ${stats.passed} passed, ❌ ${stats.failed} failed, ⏭️ ${stats.skipped} skipped`);
        }
    }

    // Failed tests details
    if (data.failedTestsList.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        data.failedTestsList.slice(0, 10).forEach((test, index) => {
            console.log(`   ${index + 1}. ${test}`);
        });

        if (data.failedTestsList.length > 10) {
            console.log(`   ... and ${data.failedTestsList.length - 10} more`);
        }
    }

    console.log('═'.repeat(60));
    console.log(`📄 Full HTML report: test-reports/test-case-report.html`);
    console.log(`📄 Playwright report: test-reports/playwright-report/index.html`);
}

function generateInsights(data: TestSummaryData): void {
    console.log('\n💡 INSIGHTS & RECOMMENDATIONS:');

    const passRate = getPercentage(data.passedTests, data.totalTests);

    if (passRate >= 95) {
        console.log('🎉 Excellent! Test suite is very stable.');
    } else if (passRate >= 85) {
        console.log('👍 Good test stability. Consider investigating failing tests.');
    } else if (passRate >= 70) {
        console.log('⚠️  Test stability needs attention. Review failing tests.');
    } else {
        console.log('🚨 Critical: Low test stability. Immediate action required.');
    }

    if (data.flakyTests > 0) {
        console.log(`🔄 Flaky tests detected. Consider stabilizing ${data.flakyTests} flaky test(s).`);
    }

    if (data.totalDuration > 300000) { // 5 minutes
        console.log('⏰ Long test execution time. Consider parallel execution or test optimization.');
    }

    const mobileWebRatio = data.mobileTests / Math.max(data.webTests, 1);
    if (mobileWebRatio < 0.5) {
        console.log('📱 Consider adding more mobile test coverage.');
    }
}

function getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Number(((value / total) * 100).toFixed(1));
}

function getPlatformIcon(platform: string): string {
    switch (platform.toLowerCase()) {
        case 'web': return '🌐';
        case 'mobile': return '📱';
        case 'tablet': return '📲';
        case 'api': return '🔌';
        default: return '🔧';
    }
}

// Run summary if called directly
if (require.main === module) {
    generateTestSummary();
}
