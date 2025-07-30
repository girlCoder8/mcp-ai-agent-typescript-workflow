import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface HealthCheckResult {
    category: string;
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    version?: string;
    details?: string;
}

interface SystemInfo {
    nodeVersion: string;
    npmVersion: string;
    osType: string;
    osRelease: string;
    arch: string;
    totalMemory: string;
    freeMemory: string;
}

export function healthCheck(): void {
    console.log('🏥 Running comprehensive health check...\n');

    const results: HealthCheckResult[] = [];

    // System checks
    results.push(...checkSystemRequirements());

    // Dependencies checks
    results.push(...checkDependencies());

    // File structure checks
    results.push(...checkFileStructure());

    // Configuration checks
    results.push(...checkConfiguration());

    // Browser checks
    results.push(...checkBrowsers());

    // Display results
    displayHealthCheckResults(results);

    // Display system info
    displaySystemInfo();

    // Overall assessment
    const overallStatus = assessOverallHealth(results);
    displayOverallAssessment(overallStatus, results);
}

function checkSystemRequirements(): HealthCheckResult[] {
    const results: HealthCheckResult[] = [];

    // Node.js version check
    const nodeVersion = process.version;
    const nodeVersionNum = parseInt(nodeVersion.slice(1).split('.')[0]);

    results.push({
        category: 'System',
        name: 'Node.js Version',
        status: nodeVersionNum >= 18 ? 'pass' : nodeVersionNum >= 16 ? 'warn' : 'fail',
        message: nodeVersionNum >= 18 ? 'Supported version' :
            nodeVersionNum >= 16 ? 'Minimum supported version' : 'Unsupported version',
        version: nodeVersion,
        details: 'Node.js 18+ recommended for optimal performance'
    });

    // NPM version check
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        const npmVersionNum = parseInt(npmVersion.split('.')[0]);

        results.push({
            category: 'System',
            name: 'npm Version',
            status: npmVersionNum >= 8 ? 'pass' : npmVersionNum >= 6 ? 'warn' : 'fail',
            message: npmVersionNum >= 8 ? 'Supported version' :
                npmVersionNum >= 6 ? 'Minimum supported version' : 'Unsupported version',
            version: `v${npmVersion}`,
            details: 'npm 8+ recommended'
        });
    } catch (error) {
        results.push({
            category: 'System',
            name: 'npm',
            status: 'fail',
            message: 'npm not found or not accessible',
            details: 'Ensure npm is installed and in PATH'
        });
    }

    // Memory check
    const totalMemGB = (require('os').totalmem() / (1024 ** 3)).toFixed(1);
    const freeMemGB = (require('os').freemem() / (1024 ** 3)).toFixed(1);

    results.push({
        category: 'System',
        name: 'Memory',
        status: parseFloat(totalMemGB) >= 4 ? 'pass' : parseFloat(totalMemGB) >= 2 ? 'warn' : 'fail',
        message: `${freeMemGB}GB free of ${totalMemGB}GB total`,
        details: '4GB+ total memory recommended for Playwright tests'
    });

    return results;
}

function checkDependencies(): HealthCheckResult[] {
    const results: HealthCheckResult[] = [];

    // Check if package.json exists
    if (!fs.existsSync('./package.json')) {
        results.push({
            category: 'Dependencies',
            name: 'package.json',
            status: 'fail',
            message: 'package.json not found',
            details: 'Run npm init to create package.json'
        });
        return results;
    }

    // Read package.json
    let packageJson: any;
    try {
        packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    } catch (error) {
        results.push({
            category: 'Dependencies',
            name: 'package.json',
            status: 'fail',
            message: 'Invalid package.json format',
            details: 'Check JSON syntax in package.json'
        });
        return results;
    }

    // Check Playwright installation
    try {
        const playwrightPath = require.resolve('@playwright/test');
        const playwrightPackage = JSON.parse(fs.readFileSync(path.join(path.dirname(playwrightPath), '..', 'package.json'), 'utf8'));
        const version = playwrightPackage.version;

        results.push({
            category: 'Dependencies',
            name: 'Playwright',
            status: 'pass',
            message: 'Installed and accessible',
            version: `v${version}`,
            details: 'Core testing framework available'
        });
    } catch (error) {
        results.push({
            category: 'Dependencies',
            name: 'Playwright',
            status: 'fail',
            message: 'Not installed or not accessible',
            details: 'Run: npm install @playwright/test'
        });
    }

    // Check TypeScript
    try {
        const tsVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
        results.push({
            category: 'Dependencies',
            name: 'TypeScript',
            status: 'pass',
            message: 'Available',
            version: tsVersion,
            details: 'TypeScript compiler accessible'
        });
    } catch (error) {
        results.push({
            category: 'Dependencies',
            name: 'TypeScript',
            status: 'warn',
            message: 'Not available or not in PATH',
            details: 'Install with: npm install -D typescript'
        });
    }

    // Check csv-parser
    try {
        require.resolve('csv-parser');
        results.push({
            category: 'Dependencies',
            name: 'csv-parser',
            status: 'pass',
            message: 'Available for CSV processing',
            details: 'Required for test case generation'
        });
    } catch (error) {
        results.push({
            category: 'Dependencies',
            name: 'csv-parser',
            status: 'fail',
            message: 'Not installed',
            details: 'Run: npm install csv-parser'
        });
    }

    return results;
}

function checkFileStructure(): HealthCheckResult[] {
    const results: HealthCheckResult[] = [];

    const requiredFiles = [
        { path: './playwright.config.tc.ts', name: 'Playwright Config' },
        { path: './global-setup-tc.ts', name: 'Global Setup' },
        { path: './global-teardown-tc.ts', name: 'Global Teardown' }
    ];

    const requiredDirectories = [
        { path: './test-data', name: 'Test Data Directory' },
        { path: './tests', name: 'Tests Directory' },
        { path: './test-reports', name: 'Reports Directory' }
    ];

    const optionalDirectories = [
        { path: './tests/ai-generated', name: 'Generated Tests Directory' },
        { path: './tests/ai-generated/web', name: 'Web Tests Directory' },
        { path: './tests/ai-generated/mobile', name: 'Mobile Tests Directory' },
        { path: './scripts', name: 'Scripts Directory' }
    ];

    // Check required files
    for (const file of requiredFiles) {
        if (fs.existsSync(file.path)) {
            results.push({
                category: 'Files',
                name: file.name,
                status: 'pass',
                message: 'File exists',
                details: file.path
            });
        } else {
            results.push({
                category: 'Files',
                name: file.name,
                status: 'fail',
                message: 'File not found',
                details: `Expected at: ${file.path}`
            });
        }
    }

    // Check required directories
    for (const dir of requiredDirectories) {
        if (fs.existsSync(dir.path)) {
            results.push({
                category: 'Structure',
                name: dir.name,
                status: 'pass',
                message: 'Directory exists',
                details: dir.path
            });
        } else {
            results.push({
                category: 'Structure',
                name: dir.name,
                status: 'fail',
                message: 'Directory not found',
                details: `Create: mkdir -p ${dir.path}`
            });
        }
    }

    // Check optional directories
    for (const dir of optionalDirectories) {
        if (fs.existsSync(dir.path)) {
            results.push({
                category: 'Structure',
                name: dir.name,
                status: 'pass',
                message: 'Directory exists',
                details: dir.path
            });
        } else {
            results.push({
                category: 'Structure',
                name: dir.name,
                status: 'warn',
                message: 'Directory not found (optional)',
                details: `Will be created automatically: ${dir.path}`
            });
        }
    }

    return results;
}

function checkConfiguration(): HealthCheckResult[] {
    const results: HealthCheckResult[] = [];

    // Check playwright.config.tc.ts
    if (fs.existsSync('./playwright.config.tc.ts')) {
        try {
            const configContent = fs.readFileSync('./playwright.config.tc.ts', 'utf8');

            if (configContent.includes('global-setup-tc.ts')) {
                results.push({
                    category: 'Configuration',
                    name: 'Global Setup',
                    status: 'pass',
                    message: 'Global setup configured',
                    details: 'Test generation setup detected'
                });
            } else {
                results.push({
                    category: 'Configuration',
                    name: 'Global Setup',
                    status: 'warn',
                    message: 'Global setup not configured',
                    details: 'Add globalSetup to playwright.config.tc.ts'
                });
            }

            if (configContent.includes('global-teardown-tc.ts')) {
                results.push({
                    category: 'Configuration',
                    name: 'Global Teardown',
                    status: 'pass',
                    message: 'Global teardown configured',
                    details: 'Test cleanup and reporting setup detected'
                });
            } else {
                results.push({
                    category: 'Configuration',
                    name: 'Global Teardown',
                    status: 'warn',
                    message: 'Global teardown not configured',
                    details: 'Add globalTeardown to playwright.config.tc.ts'
                });
            }

        } catch (error) {
            results.push({
                category: 'Configuration',
                name: 'Playwright Config',
                status: 'fail',
                message: 'Error reading configuration',
                details: 'Check playwright.config.tc.ts syntax'
            });
        }
    }

    // Check test data files
    const testDataFiles = [
        'web-test-cases.csv',
        'mobile-test-cases.csv',
        'web-steps.pseudo',
        'mobile-steps.pseudo'
    ];

    let testDataCount = 0;

    for (const file of testDataFiles) {
        const filePath = path.join('./test-data', file);
        if (fs.existsSync(filePath)) {
            testDataCount++;
        }
    }

    results.push({
        category: 'Configuration',
        name: 'Test Data Files',
        status: testDataCount === 4 ? 'pass' : testDataCount > 0 ? 'warn' : 'fail',
        message: `${testDataCount}/4 test data files found`,
        details: testDataCount < 4 ? 'Run: npm run setup:files' : 'All test data files present'
    });

    return results;
}

function checkBrowsers(): HealthCheckResult[] {
    const results: HealthCheckResult[] = [];

    try {
        // Check if playwright browsers are installed
        const browsers = ['chromium', 'firefox', 'webkit'];

        for (const browser of browsers) {
            try {
                execSync(`npx playwright install ${browser}`, { stdio: 'pipe' });
                results.push({
                    category: 'Browsers',
                    name: browser.charAt(0).toUpperCase() + browser.slice(1),
                    status: 'pass',
                    message: 'Browser available',
                    details: `${browser} browser installed`
                });
            } catch (error) {
                results.push({
                    category: 'Browsers',
                    name: browser.charAt(0).toUpperCase() + browser.slice(1),
                    status: 'warn',
                    message: 'Browser may need installation',
                    details: `Run: npx playwright install ${browser}`
                });
            }
        }
    } catch (error) {
        results.push({
            category: 'Browsers',
            name: 'Browser Installation',
            status: 'fail',
            message: 'Unable to check browser status',
            details: 'Run: npx playwright install'
        });
    }

    return results;
}

function displayHealthCheckResults(results: HealthCheckResult[]): void {
    const categories = [...new Set(results.map(r => r.category))];

    for (const category of categories) {
        console.log(`\n📋 ${category.toUpperCase()}`);
        console.log('─'.repeat(50));

        const categoryResults = results.filter(r => r.category === category);

        for (const result of categoryResults) {
            const statusIcon = result.status === 'pass' ? '✅' :
                result.status === 'warn' ? '⚠️' : '❌';

            console.log(`${statusIcon} ${result.name}: ${result.message}`);

            if (result.version) {
                console.log(`   📦 Version: ${result.version}`);
            }

            if (result.details) {
                console.log(`   💡 ${result.details}`);
            }
        }
    }
}

function displaySystemInfo(): void {
    console.log('\n🖥️  SYSTEM INFORMATION');
    console.log('─'.repeat(50));

    const os = require('os');

    console.log(`Operating System: ${os.type()} ${os.release()}`);
    console.log(`Architecture: ${os.arch()}`);
    console.log(`CPU Cores: ${os.cpus().length}`);
    console.log(`Total Memory: ${(os.totalmem() / (1024 ** 3)).toFixed(1)} GB`);
    console.log(`Free Memory: ${(os.freemem() / (1024 ** 3)).toFixed(1)} GB`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
}

function assessOverallHealth(results: HealthCheckResult[]): 'healthy' | 'warning' | 'critical' {
    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;

    if (failCount > 0) return 'critical';
    if (warnCount > 3) return 'warning';
    return 'healthy';
}

function displayOverallAssessment(status: 'healthy' | 'warning' | 'critical', results: HealthCheckResult[]): void {
    console.log('\n🎯 OVERALL HEALTH ASSESSMENT');
    console.log('═'.repeat(60));

    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed: ${passCount}`);
    console.log(`⚠️  Warnings: ${warnCount}`);
    console.log(`❌ Failed: ${failCount}`);

    switch (status) {
        case 'healthy':
            console.log('\n🎉 System is healthy and ready for testing!');
            console.log('💡 You can run: npm run generate:tests && npm run test');
            break;
        case 'warning':
            console.log('\n⚠️  System has some warnings but should work.');
            console.log('💡 Address warnings for optimal performance.');
            break;
        case 'critical':
            console.log('\n🚨 Critical issues found! Please fix before proceeding.');
            console.log('💡 Address all failed checks first.');

            const criticalIssues = results.filter(r => r.status === 'fail');
            console.log('\n🔧 Actions needed:');
            criticalIssues.forEach(issue => {
                console.log(`   - ${issue.name}: ${issue.details || issue.message}`);
            });
            break;
    }

    console.log('═'.repeat(60));
}

// Run a health check if called directly
if (require.main === module) {
    healthCheck();
}