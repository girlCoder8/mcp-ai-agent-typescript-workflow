import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

interface TestCase {
    id: string;
    name: string;
    description: string;
    steps: string[];
    expectedResult: string;
    priority: 'high' | 'medium' | 'low';
    tags: string[];
    platform: 'web' | 'mobile' | 'both';
}

interface PseudoStep {
    action: string;
    selector: string;
    value?: string;
    assertion?: string;
}

class TestCaseGenerator {
    private testCases: TestCase[] = [];
    private outputDir: string;

    constructor(outputDir: string = './generated-tests') {
        this.outputDir = outputDir;
    }

    async readCSVFile(filePath: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const results: any[] = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }

    async readPseudoFile(filePath: string): Promise<string> {
        return fs.promises.readFile(filePath, 'utf-8');
    }

    parsePseudoCode(pseudoContent: string): PseudoStep[] {
        const lines = pseudoContent.split('\n').filter(line => line.trim());
        const steps: PseudoStep[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

            const step: PseudoStep = { action: '', selector: '' };

            // Parse different pseudo-code patterns
            if (trimmed.includes('click')) {
                step.action = 'click';
                step.selector = this.extractSelector(trimmed);
            } else if (trimmed.includes('type') || trimmed.includes('fill')) {
                step.action = 'fill';
                step.selector = this.extractSelector(trimmed);
                step.value = this.extractValue(trimmed);
            } else if (trimmed.includes('expect') || trimmed.includes('assert')) {
                step.action = 'expect';
                step.selector = this.extractSelector(trimmed);
                step.assertion = this.extractAssertion(trimmed);
            } else if (trimmed.includes('navigate') || trimmed.includes('goto')) {
                step.action = 'goto';
                step.value = this.extractURL(trimmed);
            } else if (trimmed.includes('wait')) {
                step.action = 'waitFor';
                step.selector = this.extractSelector(trimmed);
            }

            if (step.action) {
                steps.push(step);
            }
        }

        return steps;
    }

    private extractSelector(line: string): string {
        // Extract selectors from various formats
        const selectorPatterns = [
            /'([^']+)'/,  // Single quotes
            /"([^"]+)"/,  // Double quotes
            /\[([^\]]+)\]/, // Brackets
            /id:(\w+)/, // id:selector
            /class:([.\w-]+)/, // class:selector
        ];

        for (const pattern of selectorPatterns) {
            const match = line.match(pattern);
            if (match) return match[1];
        }

        return '';
    }

    private extractValue(line: string): string {
        const valueMatch = line.match(/with\s+['"]([^'"]+)['"]/);
        return valueMatch ? valueMatch[1] : '';
    }

    private extractAssertion(line: string): string {
        const assertionPatterns = [
            /toBeVisible/,
            /toHaveText\(['"]([^'"]+)['"]\)/,
            /toContain\(['"]([^'"]+)['"]\)/,
            /toBe\(['"]([^'"]+)['"]\)/,
        ];

        for (const pattern of assertionPatterns) {
            const match = line.match(pattern);
            if (match) return match[0];
        }

        return 'toBeVisible()';
    }

    private extractURL(line: string): string {
        const urlMatch = line.match(/['"]([^'"]*https?:\/\/[^'"]+)['"]/);
        return urlMatch ? urlMatch[1] : '';
    }

    generatePlaywrightTest(testCase: TestCase, steps: PseudoStep[], platform: 'web' | 'mobile'): string {
        const imports = platform === 'mobile'
            ? `import { test, expect, devices } from '@playwright/test';`
            : `import { test, expect } from '@playwright/test';`;

        const deviceConfig = platform === 'mobile'
            ? `\n  test.use({ ...devices['iPhone 13'] });`
            : '';

        let testBody = '';

        for (const step of steps) {
            switch (step.action) {
                case 'goto':
                    testBody += `  await page.goto('${step.value}');\n`;
                    break;
                case 'click':
                    testBody += `  await page.click('${step.selector}');\n`;
                    break;
                case 'fill':
                    testBody += `  await page.fill('${step.selector}', '${step.value}');\n`;
                    break;
                case 'expect':
                    testBody += `  await expect(page.locator('${step.selector}')).${step.assertion};\n`;
                    break;
                case 'waitFor':
                    testBody += `  await page.waitForSelector('${step.selector}');\n`;
                    break;
            }
        }

        return `${imports}

test.describe('${testCase.name}', () => {${deviceConfig}

  test('${testCase.description}', async ({ page }) => {
    // Test ID: ${testCase.id}
    // Priority: ${testCase.priority}
    // Tags: ${testCase.tags.join(', ')}
    
${testBody}
  });
});
`;
    }

    async processFiles(webCsvPath: string, mobileCsvPath: string, webPseudoPath: string, mobilePseudoPath: string) {
        try {
            // Read CSV files
            const webCsvData = await this.readCSVFile(webCsvPath);
            const mobileCsvData = await this.readCSVFile(mobileCsvPath);

            // Read pseudo files
            const webPseudoContent = await this.readPseudoFile(webPseudoPath);
            const mobilePseudoContent = await this.readPseudoFile(mobilePseudoPath);

            // Parse pseudo code
            const webSteps = this.parsePseudoCode(webPseudoContent);
            const mobileSteps = this.parsePseudoCode(mobilePseudoContent);

            // Create output directory
            await fs.promises.mkdir(this.outputDir, { recursive: true });
            await fs.promises.mkdir(path.join(this.outputDir, 'web'), { recursive: true });
            await fs.promises.mkdir(path.join(this.outputDir, 'mobile'), { recursive: true });

            // Generate web test cases
            for (const row of webCsvData) {
                const testCase: TestCase = {
                    id: row.id || row.testId || `web-${Date.now()}`,
                    name: row.name || row.testName || 'Web Test',
                    description: row.description || row.desc || 'Generated web test',
                    steps: row.steps ? row.steps.split(';') : [],
                    expectedResult: row.expectedResult || row.expected || '',
                    priority: (row.priority as 'high' | 'medium' | 'low') || 'medium',
                    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : ['web'],
                    platform: 'web'
                };

                const testContent = this.generatePlaywrightTest(testCase, webSteps, 'web');
                const fileName = `${testCase.id.replace(/[^a-zA-Z0-9]/g, '_')}.spec.ts`;
                await fs.promises.writeFile(
                    path.join(this.outputDir, 'web', fileName),
                    testContent
                );
            }

            // Generate mobile test cases
            for (const row of mobileCsvData) {
                const testCase: TestCase = {
                    id: row.id || row.testId || `mobile-${Date.now()}`,
                    name: row.name || row.testName || 'Mobile Test',
                    description: row.description || row.desc || 'Generated mobile test',
                    steps: row.steps ? row.steps.split(';') : [],
                    expectedResult: row.expectedResult || row.expected || '',
                    priority: (row.priority as 'high' | 'medium' | 'low') || 'medium',
                    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : ['mobile'],
                    platform: 'mobile'
                };

                const testContent = this.generatePlaywrightTest(testCase, mobileSteps, 'mobile');
                const fileName = `${testCase.id.replace(/[^a-zA-Z0-9]/g, '_')}.spec.ts`;
                await fs.promises.writeFile(
                    path.join(this.outputDir, 'mobile', fileName),
                    testContent
                );
            }

            console.log(`✅ Generated test cases in ${this.outputDir}`);
            console.log(`📱 Web tests: ${webCsvData.length} files`);
            console.log(`📱 Mobile tests: ${mobileCsvData.length} files`);

        } catch (error) {
            console.error('❌ Error processing files:', error);
            throw error;
        }
    }
}

async function globalSetup(config: FullConfig) {
    console.log('🚀 Starting test case generation...');

    const generator = new TestCaseGenerator('./tests/generated');

    // Define file paths - adjust these to your actual file locations
    const webCsvPath = './test-data/web-test-cases.csv';
    const mobileCsvPath = './test-data/mobile-test-cases.csv';
    const webPseudoPath = './test-data/web-steps.pseudo';
    const mobilePseudoPath = './test-data/mobile-steps.pseudo';

    // Check if files exist
    const filesToCheck = [webCsvPath, mobileCsvPath, webPseudoPath, mobilePseudoPath];

    for (const filePath of filesToCheck) {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  File not found: ${filePath}`);
            console.log('Creating sample file...');

            if (filePath.endsWith('.csv')) {
                const sampleCsv = `id,name,description,steps,expectedResult,priority,tags
test-001,Login Test,Test user login functionality,navigate to login;enter username;enter password;click login,User should be logged in successfully,high,auth,login
test-002,Search Test,Test search functionality,navigate to home;enter search term;click search,Search results should be displayed,medium,search`;
                await fs.promises.writeFile(filePath, sampleCsv);
            } else if (filePath.endsWith('.pseudo')) {
                const samplePseudo = `// Sample pseudo code for test steps
goto "https://example.com"
click "#login-button"
fill "[data-testid='username']" with "testuser"
fill "[data-testid='password']" with "password123"
click "button[type='submit']"
expect ".welcome-message" toBeVisible
wait for ".dashboard"`;
                await fs.promises.writeFile(filePath, samplePseudo);
            }
        }
    }

    try {
        await generator.processFiles(webCsvPath, mobileCsvPath, webPseudoPath, mobilePseudoPath);
    } catch (error) {
        console.error('Failed to generate test cases:', error);
        process.exit(1);
    }
}

export default globalSetup;