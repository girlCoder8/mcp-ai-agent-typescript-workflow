import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
    isValid: boolean;
    filePath: string;
    fileSize: number;
    errors: string[];
    warnings: string[];
}

interface CSVValidationResult extends ValidationResult {
    rowCount: number;
    columnCount: number;
    hasHeaders: boolean;
    requiredColumns: string[];
    missingColumns: string[];
}

interface PseudoValidationResult extends ValidationResult {
    lineCount: number;
    actionCount: number;
    hasValidSyntax: boolean;
    supportedActions: string[];
    foundActions: string[];
}

export function validateTestData(): void {
    console.log('🔍 Validating test data files...\n');

    const requiredFiles = [
        './test-data/web-test-cases.csv',
        './test-data/mobile-test-cases.csv',
        './test-data/web-steps.pseudo',
        './test-data/mobile-steps.pseudo'
    ];

    let allValid = true;
    const validationResults: ValidationResult[] = [];

    // Validate each file
    for (const filePath of requiredFiles) {
        let result: ValidationResult;

        if (filePath.endsWith('.csv')) {
            result = validateCSVFile(filePath);
        } else if (filePath.endsWith('.pseudo')) {
            result = validatePseudoFile(filePath);
        } else {
            result = validateGenericFile(filePath);
        }

        validationResults.push(result);
        allValid = allValid && result.isValid;

        displayValidationResult(result);
    }

    // Validate directory structure
    console.log('\n📁 Validating directory structure...');
    const directoryValidation = validateDirectoryStructure();
    allValid = allValid && directoryValidation.isValid;

    // Display summary
    displayValidationSummary(validationResults, allValid);

    if (!allValid) {
        console.log('\n💡 To fix issues:');
        console.log('   - Run "npm run setup:files" to create missing files');
        console.log('   - Check file contents for proper formatting');
        console.log('   - Ensure CSV files have proper headers');
        console.log('   - Verify pseudo files contain valid action syntax');
        process.exit(1);
    }

    console.log('✅ All test data files are valid and ready for test generation!');
}

function validateCSVFile(filePath: string): CSVValidationResult {
    const result: CSVValidationResult = {
        isValid: true,
        filePath,
        fileSize: 0,
        errors: [],
        warnings: [],
        rowCount: 0,
        columnCount: 0,
        hasHeaders: false,
        requiredColumns: ['id', 'name', 'description', 'priority'],
        missingColumns: []
    };

    try {
        if (!fs.existsSync(filePath)) {
            result.isValid = false;
            result.errors.push('File does not exist');
            return result;
        }

        const stats = fs.statSync(filePath);
        result.fileSize = stats.size;

        if (stats.size === 0) {
            result.isValid = false;
            result.errors.push('File is empty');
            return result;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        result.rowCount = lines.length;

        if (lines.length < 2) {
            result.isValid = false;
            result.errors.push('CSV must have at least headers and one data row');
            return result;
        }

        // Validate headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        result.columnCount = headers.length;
        result.hasHeaders = true;

        // Check for required columns
        for (const requiredCol of result.requiredColumns) {
            if (!headers.includes(requiredCol.toLowerCase())) {
                result.missingColumns.push(requiredCol);
            }
        }

        if (result.missingColumns.length > 0) {
            result.warnings.push(`Missing recommended columns: ${result.missingColumns.join(', ')}`);
        }

        // Validate data rows
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            const columns = row.split(',');

            if (columns.length !== result.columnCount) {
                result.warnings.push(`Row ${i + 1} has ${columns.length} columns, expected ${result.columnCount}`);
            }

            // Check for empty required fields
            if (columns[0]?.trim() === '') {
                result.warnings.push(`Row ${i + 1} has empty ID field`);
            }
        }

        // Additional validations
        if (result.rowCount > 100) {
            result.warnings.push('Large number of test cases may impact generation time');
        }

        if (headers.includes('tags')) {
            result.warnings.push('Remember to use proper tag format: "tag1,tag2" or tag1;tag2');
        }

    } catch (error) {
        result.isValid = false;
        result.errors.push(`Error reading file: ${(error as Error).message}`);
    }

    return result;
}

function validatePseudoFile(filePath: string): PseudoValidationResult {
    const result: PseudoValidationResult = {
        isValid: true,
        filePath,
        fileSize: 0,
        errors: [],
        warnings: [],
        lineCount: 0,
        actionCount: 0,
        hasValidSyntax: true,
        supportedActions: ['goto', 'click', 'fill', 'expect', 'wait', 'tap', 'swipe', 'press', 'long_press', 'pinch'],
        foundActions: []
    };

    try {
        if (!fs.existsSync(filePath)) {
            result.isValid = false;
            result.errors.push('File does not exist');
            return result;
        }

        const stats = fs.statSync(filePath);
        result.fileSize = stats.size;

        if (stats.size === 0) {
            result.isValid = false;
            result.errors.push('File is empty');
            return result;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        result.lineCount = lines.length;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip comments and empty lines
            if (line === '' || line.startsWith('//') || line.startsWith('#')) {
                continue;
            }

            result.actionCount++;

            // Extract action from line
            const action = line.split(' ')[0].toLowerCase();

            if (result.supportedActions.includes(action)) {
                if (!result.foundActions.includes(action)) {
                    result.foundActions.push(action);
                }
            } else {
                result.warnings.push(`Line ${i + 1}: Unknown action "${action}"`);
            }

            // Validate common syntax patterns
            if (action === 'goto' && !line.includes('"')) {
                result.warnings.push(`Line ${i + 1}: goto should have URL in quotes`);
            }

            if ((action === 'click' || action === 'tap') && !line.includes('"') && !line.includes("'")) {
                result.warnings.push(`Line ${i + 1}: ${action} should have selector in quotes`);
            }

            if (action === 'fill' && !line.includes('with')) {
                result.warnings.push(`Line ${i + 1}: fill should use 'with' keyword`);
            }

            if (action === 'expect' && !line.includes('to')) {
                result.warnings.push(`Line ${i + 1}: expect should have assertion (toBeVisible, toHaveText, etc.)`);
            }

            // Check for proper selector formats
            if ((action === 'click' || action === 'fill' || action === 'expect' || action === 'tap') && line.includes('"')) {
                const selectorMatch = line.match(/"([^"]+)"/);
                if (selectorMatch) {
                    const selector = selectorMatch[1];
                    if (!isValidSelector(selector)) {
                        result.warnings.push(`Line ${i + 1}: Potentially invalid selector "${selector}"`);
                    }
                }
            }
        }

        // Final validations
        if (result.actionCount === 0) {
            result.isValid = false;
            result.errors.push('No valid actions found in pseudo file');
        }

        if (result.actionCount < 3) {
            result.warnings.push('Very few actions defined - consider adding more test steps');
        }

        if (!result.foundActions.includes('goto')) {
            result.warnings.push('No navigation actions found - consider adding goto statements');
        }

        if (!result.foundActions.includes('expect')) {
            result.warnings.push('No assertions found - consider adding expect statements');
        }

    } catch (error) {
        result.isValid = false;
        result.errors.push(`Error reading file: ${(error as Error).message}`);
    }

    return result;
}

function validateGenericFile(filePath: string): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        filePath,
        fileSize: 0,
        errors: [],
        warnings: []
    };

    try {
        if (!fs.existsSync(filePath)) {
            result.isValid = false;
            result.errors.push('File does not exist');
            return result;
        }

        const stats = fs.statSync(filePath);
        result.fileSize = stats.size;

        if (stats.size === 0) {
            result.isValid = false;
            result.errors.push('File is empty');
        }

    } catch (error) {
        result.isValid = false;
        result.errors.push(`Error accessing file: ${(error as Error).message}`);
    }

    return result;
}

function validateDirectoryStructure(): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        filePath: 'Directory Structure',
        fileSize: 0,
        errors: [],
        warnings: []
    };

    const requiredDirectories = [
        './test-data',
        './tests',
        './test-reports'
    ];

    const recommendedDirectories = [
        './tests/generated',
        './tests/generated/web',
        './tests/generated/mobile',
        './tests/manual',
        './test-results'
    ];

    // Check required directories
    for (const dir of requiredDirectories) {
        if (!fs.existsSync(dir)) {
            result.isValid = false;
            result.errors.push(`Required directory missing: ${dir}`);
        }
    }

    // Check recommended directories
    for (const dir of recommendedDirectories) {
        if (!fs.existsSync(dir)) {
            result.warnings.push(`Recommended directory missing: ${dir}`);
        }
    }

    return result;
}

function isValidSelector(selector: string): boolean {
    // Basic validation for common selector patterns
    const patterns = [
        /^#[\w-]+$/, // ID selector
        /^\.[\w-]+$/, // Class selector
        /^\w+$/, // Tag selector
        /^\[[\w-]+.*\]$/, // Attribute selector
        /^[\w-]+\[.*\]$/, // Tag with attribute
        /^\.[\w-]+\s+\w+$/, // Class with descendant
        /^#[\w-]+\s+\.[\w-]+$/, // ID with class descendant
        /^\[data-testid/, // Data test ID (common pattern)
        /^button\[/, // Button with attribute
        /^input\[/, // Input with attribute
    ];

    return patterns.some(pattern => pattern.test(selector)) || selector.includes('data-testid');
}

function displayValidationResult(result: ValidationResult): void {
    const icon = result.isValid ? '✅' : '❌';
    const fileName = path.basename(result.filePath);

    console.log(`${icon} ${fileName}`);
    console.log(`   📏 Size: ${formatFileSize(result.fileSize)}`);

    if ('rowCount' in result) {
        const csvResult = result as CSVValidationResult;
        console.log(`   📊 Rows: ${csvResult.rowCount}, Columns: ${csvResult.columnCount}`);
        if (csvResult.missingColumns.length > 0) {
            console.log(`   ⚠️  Missing columns: ${csvResult.missingColumns.join(', ')}`);
        }
    }

    if ('actionCount' in result) {
        const pseudoResult = result as PseudoValidationResult;
        console.log(`   🔧 Actions: ${pseudoResult.actionCount}, Types: ${pseudoResult.foundActions.join(', ')}`);
    }

    // Display errors
    if (result.errors.length > 0) {
        result.errors.forEach(error => {
            console.log(`   ❌ Error: ${error}`);
        });
    }

    // Display warnings
    if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
            console.log(`   ⚠️  Warning: ${warning}`);
        });
    }

    console.log('');
}

function displayValidationSummary(results: ValidationResult[], allValid: boolean): void {
    console.log('═'.repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('═'.repeat(60));

    const validFiles = results.filter(r => r.isValid).length;
    const totalFiles = results.length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log(`📊 Files validated: ${totalFiles}`);
    console.log(`✅ Valid files: ${validFiles}`);
    console.log(`❌ Invalid files: ${totalFiles - validFiles}`);
    console.log(`🚨 Total errors: ${totalErrors}`);
    console.log(`⚠️  Total warnings: ${totalWarnings}`);

    if (allValid) {
        console.log('\n🎉 All validations passed! Ready for test generation.');
    } else {
        console.log('\n🚨 Validation failed! Please fix the issues above.');
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Run validation if called directly
if (require.main === module) {
    validateTestData();
}