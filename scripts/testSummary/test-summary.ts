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
    apiTests: number;
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
        console.log('🔍 Starting test summary generation...');

        const resultsPath = './playwright-report/index.html';
        const customReportPath = './playwright-report/results.json';
        const alternativeResultsPath = './test-results/test-case-report.json';

        console.log('📁 Checking for results files:');
        console.log(`   - ${resultsPath}: ${fs.existsSync(resultsPath) ? '✅ Found' : '❌ Not found'}`);
        console.log(`   - ${customReportPath}: ${fs.existsSync(customReportPath) ? '✅ Found' : '❌ Not found'}`);
        console.log(`   - ${alternativeResultsPath}: ${fs.existsSync(alternativeResultsPath) ? '✅ Found' : '❌ Not found'}`);

        // Check which result file to use
        let activeResultsPath = '';
        if (fs.existsSync(resultsPath)) {
            activeResultsPath = resultsPath;
        } else if (fs.existsSync(alternativeResultsPath)) {
            activeResultsPath = alternativeResultsPath;
        }

        if (!activeResultsPath && !fs.existsSync(customReportPath)) {
            console.log('❌ No test results found. Run tests first.');
            console.log('💡 Expected locations:');
            console.log('   - playwright-report/index.html (from Playwright config)');
            console.log('   - pipeline-reports/playwright-results.json (default location)');
            console.log('   - test-case-results/test-case-report.json (custom report)');
            console.log('💡 Try running: npx playwright test --config=playwright.config.tc.ts --list');
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
            apiTests: 0,
            failedTestsList: [],
            platformBreakdown: {}
        };

        // Try to read Playwright results first
        if (activeResultsPath) {
            console.log(`📖 Reading Playwright results from: ${activeResultsPath}`);
            try {
                const results: PlaywrightResults = JSON.parse(fs.readFileSync(activeResultsPath, 'utf8'));
                console.log('✅ Successfully parsed Playwright results');
                console.log(`📊 Raw stats:`, results.stats);
                summaryData = processPlaywrightResults(results);
            } catch (parseError) {
                console.error('❌ Error parsing Playwright results:', (parseError as Error).message);
            }
        }

        // Try to read a custom report if available
        if (fs.existsSync(customReportPath)) {
            console.log(`📖 Reading custom results from: ${customReportPath}`);
            try {
                const customResults = JSON.parse(fs.readFileSync(customReportPath, 'utf8'));
                console.log('✅ Successfully parsed custom results');
                summaryData = mergeCustomResults(summaryData, customResults);
            } catch (parseError) {
                console.error('❌ Error parsing custom results:', (parseError as Error).message);
            }
        }

        console.log('📊 Final summary data:', summaryData);

        // Display summary
        displaySummary(summaryData);

        // Generate additional insights
        generateInsights(summaryData);

    } catch (error) {
        console.error('❌ Error generating summary:', (error as Error).message);
        console.error('🔍 Stack trace:', (error as Error).stack);
        console.log('🔍 Debug info:');
        console.log('   - Check if test results files are valid JSON');
        console.log('   - Ensure tests have been run recently');
        console.log('   - Try running: npx playwright test');
    }
}

function processPlaywrightResults(results: PlaywrightResults): TestSummaryData {
    console.log('🔄 Processing Playwright results...');

    const summaryData: TestSummaryData = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        flakyTests: 0,
        totalDuration: 0,
        webTests: 0,
        apiTests: 0,
        failedTestsList: [],
        platformBreakdown: {}
    };

    // Process stats if available
    if (results.stats) {
        console.log('📊 Processing stats:', results.stats);
        summaryData.totalTests = (results.stats.passed || 0) + (results.stats.failed || 0) + (results.stats.skipped || 0);
        summaryData.passedTests = results.stats.passed || 0;
        summaryData.failedTests = results.stats.failed || 0;
        summaryData.skippedTests = results.stats.skipped || 0;
        summaryData.flakyTests = results.stats.flaky || 0;
        summaryData.totalDuration = results.stats.duration || 0;
    } else {
        console.log('⚠️ No stats found in results');
    }

    // Process suites recursively
    if (results.suites && results.suites.length > 0) {
        console.log(`📁 Processing ${results.suites.length} test suites...`);
        processSuites(results.suites, summaryData);
    } else {
        console.log('⚠️ No suites found in results');
    }

    console.log('✅ Finished processing Playwright results');
    return summaryData;
}

function processSuites(suites: TestSuite[], summaryData: TestSummaryData): void {
    for (const suite of suites) {
        console.log(`🔍 Processing suite: ${suite.title} (${suite.file})`);

        // Determine a platform from file path - updated to match your config
        const platform = suite.file.includes('/api/') ? 'api' :
            suite.file.includes('/web/') ? 'web' :
                suite.file.includes('/api/') ? 'api' :
                    suite.file.includes('/visual/') ? 'visual' :
                        suite.file.includes('/performance/') ? 'performance' :
                            suite.file.includes('/manual/') ? 'manual' : 'other';

        if (!summaryData.platformBreakdown[platform]) {
            summaryData.platformBreakdown[platform] = { passed: 0, failed: 0, skipped: 0 };
        }

        // Process tests in this suite
        if (suite.tests && suite.tests.length > 0) {
            console.log(`  📝 Processing ${suite.tests.length} tests in suite`);

            for (const test of suite.tests) {
                if (platform === 'web') summaryData.webTests++;
                if (platform === 'api') summaryData.apiTests++;

                console.log(`    🧪 Test: ${test.title} - Outcome: ${test.outcome}`);

                // Update platform breakdown based on a test outcome
                if (test.outcome === 'expected' || test.outcome === 'passed') {
                    summaryData.platformBreakdown[platform].passed++;
                } else if (test.outcome === 'unexpected' || test.outcome === 'failed') {
                    summaryData.platformBreakdown[platform].failed++;
                    summaryData.failedTestsList.push(`${test.fullTitle || test.title} (${suite.file})`);
                } else if (test.outcome === 'skipped') {
                    summaryData.platformBreakdown[platform].skipped++;
                }

                // Also check individual test results
                if (test.results && test.results.length > 0) {
                    for (const result of test.results) {
                        summaryData.totalDuration += result.duration || 0;
                    }
                }
            }
        } else {
            console.log('  ⚠️ No tests found in this suite');
        }

        // Process nested suites
        if (suite.suites && suite.suites.length > 0) {
            console.log(`  📁 Processing ${suite.suites.length} nested suites`);
            processSuites(suite.suites, summaryData);
        }
    }
}

function mergeCustomResults(summaryData: TestSummaryData, customResults: any): TestSummaryData {
    console.log('🔄 Merging custom results...');

    // Merge custom report data if available
    if (customResults.summary) {
        console.log('📊 Found custom summary data:', customResults.summary);
        summaryData.totalTests = Math.max(summaryData.totalTests, customResults.summary.total || 0);
        summaryData.passedTests = Math.max(summaryData.passedTests, customResults.summary.passed || 0);
        summaryData.failedTests = Math.max(summaryData.failedTests, customResults.summary.failed || 0);
        summaryData.skippedTests = Math.max(summaryData.skippedTests, customResults.summary.skipped || 0);
        summaryData.webTests = Math.max(summaryData.webTests, customResults.summary.webTests || 0);
        summaryData.apiTests = Math.max(summaryData.apiTests, customResults.summary.apiTests || 0);
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
    console.log(`📱 API Tests: ${data.apiTests}`);

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
    console.log(`📄 Full HTML report: pipeline-reports/playwright-report/index.html`);
    console.log(`📄 JSON results: pipeline-reports/results.json`);
}

function generateInsights(data: TestSummaryData): void {
    console.log('\n💡 INSIGHTS & RECOMMENDATIONS:');

    const passRate = getPercentage(data.passedTests, data.totalTests);

    if (data.totalTests === 0) {
        console.log('⚠️  No tests found. Make sure tests have been executed.');
        return;
    }

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

    const apiWebRatio = data.apiTests / Math.max(data.webTests, 1);
    if (apiWebRatio < 0.5 && data.webTests > 0) {
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
        case 'visual': return '👁️';
        case 'performance': return '⚡';
        case 'manual': return '🤚';
        default: return '🔧';
    }
}

// Run summary only if called directly
if (require.main === module) {
    generateTestSummary();
}
