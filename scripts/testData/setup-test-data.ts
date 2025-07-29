import * as fs from 'fs';
import * as path from 'path';

interface TestDataFile {
    path: string;
    content: string;
}

export function setupTestData(): void {
    const testDataDir = './test-data';

    // Create test-data directory
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
        console.log('📁 Created test-data directory');
    }

    // Sample web test cases CSV
    const webCsvContent = `id,name,description,steps,expectedResult,priority,tags
web-001,Homepage Load,Test homepage loading,navigate to homepage;check title;verify logo,Page loads successfully,high,"smoke,web"
web-002,User Login,Test user authentication,navigate to login;enter credentials;click login;verify dashboard,User successfully logged in,critical,"auth,web"
web-003,Product Search,Test search functionality,navigate to search;enter product name;click search;verify results,Search results displayed,medium,"search,web"
web-004,Shopping Cart,Test add to cart,navigate to product;click add to cart;verify cart count,Product added to cart,high,"cart,web"
web-005,Checkout Process,Test checkout flow,add product to cart;proceed to checkout;enter details;complete purchase,Order completed successfully,critical,"checkout,web"
web-006,User Registration,Test user signup,navigate to register;fill form;submit;verify email,Registration successful,medium,"auth,registration,web"
web-007,Password Reset,Test password reset flow,click forgot password;enter email;submit;check email,Reset email sent,low,"auth,password,web"
web-008,Profile Update,Test profile editing,login;go to profile;edit details;save,Profile updated successfully,medium,"profile,web"
web-009,Product Filter,Test product filtering,go to products;apply filters;verify results,Filtered results shown,medium,"filter,web"
web-010,Wishlist Feature,Test add to wishlist,view product;click wishlist;verify added,Product added to wishlist,low,"wishlist,web"`;

    // Sample mobile test cases CSV
    const mobileCsvContent = `id,name,description,steps,expectedResult,priority,tags
mob-001,Mobile Homepage,Test mobile homepage,navigate to homepage;check responsive design;verify navigation,Mobile page renders correctly,high,"smoke,mobile"
mob-002,Mobile Login,Test mobile authentication,tap login button;enter credentials;tap submit;verify profile,User logged in on mobile,critical,"auth,mobile"
mob-003,Mobile Search,Test mobile search,tap search icon;enter query;tap search;swipe results,Search works on mobile,medium,"search,mobile"
mob-004,Mobile Cart,Test mobile cart functionality,tap product;tap add to cart;check cart badge,Product added on mobile,high,"cart,mobile"
mob-005,Mobile Menu,Test mobile navigation menu,tap hamburger menu;verify menu items;tap category,Mobile menu functions correctly,medium,"navigation,mobile"
mob-006,Mobile Checkout,Test mobile checkout flow,add to cart;tap checkout;fill details;complete,Mobile checkout successful,critical,"checkout,mobile"
mob-007,Mobile Registration,Test mobile signup,tap register;fill form;submit;verify,Mobile registration works,medium,"auth,registration,mobile"
mob-008,Mobile Profile,Test mobile profile view,login;tap profile;verify details,Profile displayed correctly,medium,"profile,mobile"
mob-009,Mobile Filter,Test mobile product filters,go to products;tap filter;select options,Mobile filters work,medium,"filter,mobile"
mob-010,Mobile Swipe,Test swipe gestures,open product list;swipe left/right;verify navigation,Swipe gestures work,low,"gestures,mobile"`;

    // Sample web pseudo code
    const webPseudoContent = `// Web test steps pseudo code
// Homepage navigation and verification
goto "https://example.com"
wait for "#page-loader" toBeHidden
expect "h1" toContain "Welcome"
expect ".main-logo" toBeVisible
expect "nav" toBeVisible

// Login flow
click "[data-testid='login-btn']"
wait for "#login-modal" toBeVisible
fill "#username" with "testuser@example.com"
fill "#password" with "password123"
click "button[type='submit']"
wait for ".dashboard"
expect ".user-profile" toBeVisible
expect ".user-name" toHaveText "Test User"

// Search functionality
click "#search-input"
fill "#search-input" with "test product"
press "Enter"
wait for ".search-results"
expect ".search-results .product-item" toHaveCount 5
expect ".search-summary" toContain "5 results found"

// Product interaction
click ".product-item:first-child"
wait for ".product-details" toBeVisible
expect ".product-title" toBeVisible
expect ".product-price" toBeVisible
expect ".add-to-cart-btn" toBeEnabled

// Shopping cart
click ".add-to-cart-btn"
wait for ".cart-notification" toBeVisible
expect ".cart-count" toHaveText "1"
click ".cart-icon"
wait for ".cart-sidebar" toBeVisible
expect ".cart-item" toBeVisible

// Navigation
click "nav a[href='/products']"
expect "h1" toHaveText "Products"
expect ".product-grid" toBeVisible
expect ".filter-sidebar" toBeVisible`;

    // Sample mobile pseudo code
    const mobilePseudoContent = `// Mobile test steps pseudo code
// Mobile homepage verification
goto "https://m.example.com"
wait for ".mobile-header" toBeVisible
expect ".mobile-logo" toBeVisible
expect ".hamburger-menu" toBeVisible

// Mobile navigation
tap ".hamburger-menu"
wait for ".mobile-nav" toBeVisible
expect ".nav-item" toHaveCount 5
tap "a[href='/login']"

// Mobile login flow
wait for ".mobile-login-form" toBeVisible
tap "[data-testid='mobile-username']"
fill "[data-testid='mobile-username']" with "mobile@test.com"
tap "[data-testid='mobile-password']"
fill "[data-testid='mobile-password']" with "mobilepass"
tap ".login-submit-btn"
wait for ".mobile-dashboard" toBeVisible

// Mobile search with gestures
tap ".search-toggle"
wait for ".mobile-search-input" toBeVisible
fill ".mobile-search-input" with "mobile product"
tap ".search-button"
wait for ".mobile-results" toBeVisible
swipe ".results-container" direction="up"
expect ".mobile-product-card" toBeVisible

// Mobile product interactions
tap ".product-item:first-child"
wait for ".product-details" toBeVisible
swipe ".product-images" direction="left"
tap ".add-to-cart-mobile"
wait for ".cart-toast" toBeVisible
expect ".cart-badge" toHaveText "1"

// Mobile checkout flow
tap ".cart-badge"
wait for ".mobile-cart" toBeVisible
tap ".checkout-btn"
wait for ".checkout-form" toBeVisible
fill "#mobile-address" with "123 Test Street"
fill "#mobile-city" with "Test City"
swipe ".checkout-form" direction="up"
tap ".complete-order-btn"
wait for ".order-confirmation" toBeVisible

// Mobile gestures and interactions
swipe ".product-carousel" direction="left"
pinch ".product-image" scale="2"
tap ".back-button"
long_press ".product-item" duration="1000"
expect ".context-menu" toBeVisible`;

    // Create array of files to write
    const files: TestDataFile[] = [
        { path: path.join(testDataDir, 'web-test-cases.csv'), content: webCsvContent },
        { path: path.join(testDataDir, 'mobile-test-cases.csv'), content: mobileCsvContent },
        { path: path.join(testDataDir, 'web-steps.pseudo'), content: webPseudoContent },
        { path: path.join(testDataDir, 'mobile-steps.pseudo'), content: mobilePseudoContent }
    ];

    // Write files
    files.forEach(file => {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, file.content);
            console.log(`✅ Created ${file.path}`);
        } else {
            console.log(`⚠️  ${file.path} already exists, skipping...`);
        }
    });

    // Create additional directories
    const directories = [
        './tests',
        './tests/generated',
        './tests/generated/web',
        './tests/generated/mobile',
        './tests/manual',
        './tests/api',
        './tests/visual',
        './tests/performance',
        './test-reports',
        './test-results'
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });

    console.log('🎉 Test data setup completed!');
    console.log('📋 Files created:');
    console.log('   - Web test cases CSV with 10 test scenarios');
    console.log('   - Mobile test cases CSV with 10 test scenarios');
    console.log('   - Web pseudo code with comprehensive step definitions');
    console.log('   - Mobile pseudo code with gesture and touch interactions');
    console.log('   - Complete directory structure for test organization');
}

// Run setup if called directly
if (require.main === module) {
    setupTestData();
}