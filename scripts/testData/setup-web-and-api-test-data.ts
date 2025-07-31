import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

interface TestDataFile {
    path: string;
    content: string;
}

interface ParsedPseudoTest {
    testCaseId: string;
    testCaseName: string;
    objective: string;
    precondition: string;
    steps: string;
    component: string;
    comments: string;
}

function parsePseudoFile(filePath: string): ParsedPseudoTest | null {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Pseudo file not found: ${filePath}`);
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf8');

        // Extract test case ID and name from the first line
        const testCaseMatch = content.match(/Test Case:\s*(TC\d+)\s*-\s*(.+)/);
        if (!testCaseMatch) {
            console.log(`⚠️  Could not parse test case header in ${filePath}`);
            return null;
        }

        const testCaseId = testCaseMatch[1];
        const testCaseName = testCaseMatch[2].trim();

        // Extract preconditions
        const preconditionsMatch = content.match(/Preconditions:\s*([\s\S]*?)(?=Steps:)/);
        const preconditions = preconditionsMatch ? preconditionsMatch[1].trim() : '';

        // Extract steps
        const stepsMatch = content.match(/Steps:\s*([\s\S]*?)$/);
        const steps = stepsMatch ? stepsMatch[1].trim() : '';

        // Determine component and objective based on file name or content
        const fileName = path.basename(filePath, '.pseudo');
        let component = 'Web';
        let objective = `Execute ${testCaseName.toLowerCase()}`;

        if (fileName.includes('login') || content.includes('Login') || content.includes('mobile application')) {
            component = content.includes('mobile application') ? 'Mobile' : 'Web';
            objective = `Validate user authentication process including both valid and invalid login scenarios`;
        } else if (fileName.includes('web') || content.includes('wine') || content.includes('order')) {
            component = 'Web';
            objective = `Validate end-to-end purchase flow with authentication and payment processing`;
        }

        return {
            testCaseId,
            testCaseName,
            objective,
            precondition: preconditions,
            steps: steps,
            component,
            comments: `Generated from ${fileName}.pseudo file`
        };

    } catch (error) {
        console.error(`❌ Error parsing pseudo file ${filePath}:`, error);
        return null;
    }
}

function convertPseudoTestsToCSV(pseudoTests: ParsedPseudoTest[], isApiFormat: boolean = false): string {
    if (pseudoTests.length === 0) return '';

    let csvContent = '';

    if (isApiFormat) {
        // API CSV format
        csvContent = 'TestCaseID,TestCaseName,Objective,Precondition,TestCaseSteps,Component,Comments\n';
        pseudoTests.forEach(test => {
            const escapedSteps = `"${test.steps.replace(/"/g, '""')}"`;
            const escapedPrecondition = `"${test.precondition.replace(/"/g, '""')}"`;
            const escapedObjective = `"${test.objective.replace(/"/g, '""')}"`;
            const escapedComments = `"${test.comments.replace(/"/g, '""')}"`;

            csvContent += `${test.testCaseId},${test.testCaseName},${escapedObjective},${escapedPrecondition},${escapedSteps},API,${escapedComments}\n`;
        });
    } else {
        // Manual test cases CSV format
        csvContent = 'TestCaseID#,TestCaseName,TestCase Steps,Precondition,Objective,Component,Comments\n';
        pseudoTests.forEach(test => {
            const escapedSteps = `"${test.steps.replace(/"/g, '""')}"`;
            const escapedPrecondition = `"${test.precondition.replace(/"/g, '""')}"`;
            const escapedObjective = `"${test.objective.replace(/"/g, '""')}"`;
            const escapedComments = `"${test.comments.replace(/"/g, '""')}"`;

            csvContent += `${test.testCaseId},${test.testCaseName},${escapedSteps},${escapedPrecondition},${escapedObjective},${test.component},${escapedComments}\n`;
        });
    }

    return csvContent;
}

export function setupWebAndApiTestData(): void {
    const testDataDir = './test-data';

    // Create test-data directory
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
        console.log('📁 Created test-data directory');
    }

    // Parse .pseudo files if they exist
    const pseudoFiles = [
        './web_steps.pseudo',
        './mobile_wdio_steps.pseudo'
    ];

    const parsedPseudoTests: ParsedPseudoTest[] = [];

    pseudoFiles.forEach(filePath => {
        const parsed = parsePseudoFile(filePath);
        if (parsed) {
            parsedPseudoTests.push(parsed);
            console.log(`✅ Parsed pseudo file: ${filePath}`);
        }
    });

    // Manual test cases CSV (for web tests) - combining static and pseudo-generated tests
    let manualTestCasesContent = `TestCaseID#,TestCaseName,TestCase Steps,Precondition,Objective,Component,Comments
TC001,Purchase with Credit Card,"1. Navigate to homepage; 2. Login as test_user; 3. Go to Shop page; 4. Search for 'Case of Red Wine'; 5. Add wine to cart; 6. Proceed to checkout; 7. Enter credit card details; 8. Complete purchase","User is registered and has a valid credit card","Validate end-to-end purchase flow using credit card payment",Web,Core purchase functionality test
TC002,Login with Invalid Password,"1. Navigate to login page; 2. Enter valid username; 3. Enter invalid password; 4. Click login button; 5. Verify error message is displayed","User account exists in system","Verify login fails gracefully with appropriate error message when wrong password is supplied",Web,Negative test case for authentication
TC003,User Registration Flow,"1. Navigate to registration page; 2. Fill in all required fields; 3. Submit registration form; 4. Verify confirmation email is sent; 5. Confirm account via email link","No existing account for test email","Validate complete user registration process including email verification",Web,New user onboarding
TC004,Product Search Functionality,"1. Navigate to homepage; 2. Enter search term in search box; 3. Click search button; 4. Verify search results are displayed; 5. Filter results by category; 6. Sort results by price","User is on homepage","Test product search and filtering capabilities",Web,Search and discovery features
TC005,Shopping Cart Management,"1. Add multiple products to cart; 2. View cart contents; 3. Update quantities; 4. Remove items; 5. Apply discount code; 6. Verify total calculations","Products are available in inventory","Validate shopping cart operations and calculations",Web,E-commerce cart functionality
TC006,Password Reset Process,"1. Navigate to login page; 2. Click 'Forgot Password' link; 3. Enter email address; 4. Submit form; 5. Check for reset email; 6. Click reset link; 7. Set new password","User account exists with valid email","Test password reset functionality end-to-end",Web,Account recovery feature
TC007,Profile Information Update,"1. Login to user account; 2. Navigate to profile page; 3. Update personal information; 4. Change profile picture; 5. Save changes; 6. Verify updates are reflected","User is logged in with existing profile","Validate user profile management capabilities",Web,User account management
TC008,Wishlist Functionality,"1. Browse product catalog; 2. Add items to wishlist; 3. View wishlist page; 4. Move items from wishlist to cart; 5. Remove items from wishlist","User is logged in","Test wishlist feature for saving favorite products",Web,Product saving and organization`;

    // Add pseudo-generated tests to manual test cases (for web tests)
    const webPseudoTests = parsedPseudoTests.filter(test => test.component === 'Web' || test.component === 'Mobile');
    if (webPseudoTests.length > 0) {
        console.log(`📝 Adding ${webPseudoTests.length} tests from pseudo files to manual test cases`);
        const pseudoCsvContent = convertPseudoTestsToCSV(webPseudoTests, false);
        if (pseudoCsvContent) {
            // Remove header from pseudo CSV content and append to manual test cases
            const pseudoRows = pseudoCsvContent.split('\n').slice(1).filter(row => row.trim());
            if (pseudoRows.length > 0) {
                manualTestCasesContent += '\n' + pseudoRows.join('\n');
            }
        }
    }

    // API test cases CSV - combining static and pseudo-generated tests
    let apiTestCasesContent = `TestCaseID,TestCaseName,Objective,Precondition,TestCaseSteps,Component,Comments
TC_API_001,Complete Wine Purchase API Flow,"Validate complete API flow for authenticated wine purchase","API server is running and test data is available","1. GET /health - Verify API availability; 2. POST /auth/login with admin credentials; 3. GET /products/search?query=wine with auth token; 4. POST /cart/items to add wine to cart; 5. POST /orders to checkout with credit card; 6. GET /orders/{order_id} to confirm order success",API,End-to-end API test for wine purchase
TC_API_002,User Authentication API,"Test user login and token generation","Valid user credentials exist in system","1. POST /auth/login with valid credentials; 2. Verify 200 status code; 3. Validate auth token in response; 4. Test token expiration; 5. Verify invalid credentials return 401",API,Authentication endpoint testing
TC_API_003,Product Search API,"Validate product search functionality","Products exist in database","1. GET /products/search with various queries; 2. Test empty search results; 3. Verify response format; 4. Test search filters; 5. Validate pagination",API,Product discovery API testing
TC_API_004,Shopping Cart API Operations,"Test cart management endpoints","User is authenticated","1. POST /cart/items to add products; 2. GET /cart to retrieve cart contents; 3. PUT /cart/items to update quantities; 4. DELETE /cart/items to remove products; 5. Verify cart calculations",API,Cart management API testing
TC_API_005,Order Management API,"Test order creation and retrieval","User has items in cart","1. POST /orders to create order; 2. GET /orders/{id} to retrieve order; 3. PUT /orders/{id} to update order status; 4. Test order validation; 5. Verify payment processing",API,Order processing API testing
TC_API_006,Error Handling and Status Codes,"Validate API error responses","API server is running","1. Test 400 Bad Request scenarios; 2. Test 401 Unauthorized access; 3. Test 404 Not Found endpoints; 4. Test 500 Internal Server Error; 5. Verify error message format",API,API error handling validation
TC_API_007,User Profile API,"Test user profile management","User is authenticated","1. GET /users/profile to retrieve profile; 2. PUT /users/profile to update information; 3. POST /users/profile/avatar to upload image; 4. Test profile validation; 5. Verify response format",API,User management API testing
TC_API_008,Inventory Management API,"Test product inventory operations","Admin privileges required","1. GET /admin/products to list all products; 2. POST /admin/products to create product; 3. PUT /admin/products/{id} to update product; 4. DELETE /admin/products/{id} to remove product; 5. Test inventory tracking",API,Admin inventory API testing`;

    // Add pseudo-generated tests to API test cases (convert all pseudo tests to API format)
    if (parsedPseudoTests.length > 0) {
        console.log(`📝 Adding ${parsedPseudoTests.length} tests from pseudo files to API test cases`);
        const apiPseudoCsvContent = convertPseudoTestsToCSV(parsedPseudoTests, true);
        if (apiPseudoCsvContent) {
            // Remove header from pseudo CSV content and append to API test cases
            const pseudoRows = apiPseudoCsvContent.split('\n').slice(1).filter(row => row.trim());
            if (pseudoRows.length > 0) {
                apiTestCasesContent += '\n' + pseudoRows.join('\n');
            }
        }
    }

    // Create the files in the format expected by the Python script
    const files: TestDataFile[] = [
        {
            path: path.join(testDataDir, 'new_manual_test_cases.csv'),
            content: manualTestCasesContent
        },
        {
            path: path.join(testDataDir, 'api_test_cases.csv'),
            content: apiTestCasesContent
        }
    ];

    // Write the CSV files
    files.forEach(file => {
        fs.writeFileSync(file.path, file.content);
        console.log(`✅ Created ${file.path}`);
    });

    // Create additional directories that the Python script expects
    const directories = [
        './test-data',
        './test-data/web',
        './test-data/api',
        './tests',
        './tests/generated',
        './tests/generated/web',
        './tests/generated/api'
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });

    console.log('🎉 Test data setup completed!');
    console.log('📋 Files created:');
    console.log(`   - Manual test cases CSV with ${manualTestCasesContent.split('\n').length - 1} test scenarios (including ${webPseudoTests.length} from pseudo files)`);
    console.log(`   - API test cases CSV with ${apiTestCasesContent.split('\n').length - 1} test scenarios (including ${parsedPseudoTests.length} from pseudo files)`);
    console.log('   - Complete directory structure for test organization');

    if (parsedPseudoTests.length > 0) {
        console.log('📝 Pseudo files processed:');
        parsedPseudoTests.forEach(test => {
            console.log(`   - ${test.testCaseId}: ${test.testCaseName}`);
        });
    }
}

export function generatePlaywrightTests(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting Playwright test generation...');

        // Check if Python script exists
        const pythonScriptPath = './generate_playwright_tests_from_csv.py';
        if (!fs.existsSync(pythonScriptPath)) {
            console.error('❌ Python script not found:', pythonScriptPath);
            reject(new Error('Python script not found'));
            return;
        }

        // Check if required CSV files exist
        const requiredFiles = [
            './test-data/new_manual_test_cases.csv',
            './test-data/api_test_cases.csv'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.error('❌ Required CSV file not found:', file);
                reject(new Error(`Required CSV file not found: ${file}`));
                return;
            }
        }

        // Spawn Python process
        const pythonProcess = spawn('python', [pythonScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                // Make sure OpenAI API key is available
                OPENAI_API_KEY: process.env.OPENAI_API_KEY
            }
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log(output.trim());
        });

        pythonProcess.stderr.on('data', (data) => {
            const error = data.toString();
            stderr += error;
            console.error('Python script error:', error.trim());
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Playwright tests generated successfully!');
                console.log('📁 Check the following directories for generated tests:');
                console.log('   - ./test-data/web/ (Web tests)');
                console.log('   - ./test-data/api/ (API tests)');
                resolve();
            } else {
                console.error(`❌ Python script exited with code ${code}`);
                console.error('Error output:', stderr);
                reject(new Error(`Python script failed with exit code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('❌ Failed to start Python script:', error.message);
            reject(error);
        });
    });
}

export async function setupAndGenerateTests(): Promise<void> {
    try {
        console.log('🎯 Setting up test data and generating Playwright tests...\n');

        // Step 1: Setup test data (create CSV files)
        console.log('📋 Step 1: Setting up test data...');
        setupWebAndApiTestData();

        console.log('\n⏳ Step 2: Generating Playwright tests from CSV files...');

        // Step 2: Generate Playwright tests using Python script
        await generatePlaywrightTests();

        console.log('\n🎉 Complete! Test setup and generation finished successfully.');
        console.log('\n📖 Next steps:');
        console.log('   1. Review generated tests in ./test-data/web/ and ./test-data/api/');
        console.log('   2. Install dependencies: npm install @playwright/test');
        console.log('   3. Run tests: npx playwright test');
        console.log('   4. Check pseudo files were processed and integrated into CSV files');

    } catch (error) {
        console.error('❌ Error during setup and generation:', error);
        throw error;
    }
}

// Run setup and generation if called directly
if (require.main === module) {
    setupAndGenerateTests().catch(console.error);
}