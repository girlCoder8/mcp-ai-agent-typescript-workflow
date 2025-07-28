import { test, expect, Page, Locator } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Types
interface VisualTestConfig {
    threshold: number;
    clip?: { x: number; y: number; width: number; height: number }; // not supported by toHaveScreenshot, just kept for general config
    mask?: Array<{ selector: string }>;
    animations?: 'disabled' | 'allow';
}

interface ModelVisualCapability {
    id: string;
    name: string;
    supportsVision: boolean;
    testCases: string[];
}

// Configuration
const AI_CONFIG_PATH = join(process.cwd(), 'config/ai_models_config.json');
const VISUAL_TEST_IMAGES_PATH = join(process.cwd(), 'tests/visual/test-images');
const SCREENSHOT_PATH = join(process.cwd(), 'test-results/visual-screenshots');

const VISUAL_THRESHOLDS = {
    strict: 0.1,      // 0.1% pixel difference allowed
    moderate: 0.5,    // 0.5% pixel difference allowed
    relaxed: 2.0      // 2% pixel difference allowed
};

// Test utilities
class VisualTestUtils {
    private static aiConfig: any;

    static loadConfiguration() {
        try {
            this.aiConfig = JSON.parse(readFileSync(AI_CONFIG_PATH, 'utf-8'));
        } catch (error) {
            throw new Error(`Failed to load AI configuration: ${error}`);
        }
    }

    static getVisualModels(): ModelVisualCapability[] {
        const visualModels: ModelVisualCapability[] = [];

        Object.values(this.aiConfig.models).forEach((provider: any) => {
            Object.entries(provider.models).forEach(([key, model]: [string, any]) => {
                if (model.supportsVision) {
                    visualModels.push({
                        id: key,
                        name: model.name,
                        supportsVision: model.supportsVision,
                        testCases: this.aiConfig.testSuites.visual.models.includes(key) ?
                            ['image_description', 'chart_analysis', 'ocr_text_extraction'] : []
                    });
                }
            });
        });

        return visualModels;
    }

    static async waitForAIResponse(page: Page, timeout: number = 30000): Promise<void> {
        await page.waitForSelector('[data-testid="ai-response"]', {
            state: 'visible',
            timeout
        });

        // Wait for loading indicators to disappear
        await page.waitForSelector('[data-testid="loading-spinner"]', {
            state: 'hidden',
            timeout: 5000
        }).catch(() => {}); // Ignore if spinner doesn't exist

        // Wait for streaming to complete
        await page.waitForFunction(() => {
            const responseElement = document.querySelector('[data-testid="ai-response"]');
            return responseElement && !responseElement.classList.contains('streaming');
        }, { timeout: 10000 }).catch(() => {}); // Ignore if not streaming
    }

    static async uploadTestImage(page: Page, imageName: string): Promise<void> {
        const imagePath = join(VISUAL_TEST_IMAGES_PATH, imageName);
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(imagePath);
    }

    static async takeElementScreenshot(
        element: Locator,
        name: string,
        config: VisualTestConfig = { threshold: VISUAL_THRESHOLDS.moderate }
    ): Promise<void> {
        await expect(element).toHaveScreenshot(`${name}.png`, {
            threshold: config.threshold,
            // Removed 'clip', not supported here!
            mask: config.mask?.map(m => element.page().locator(m.selector)),
            animations: config.animations || 'disabled'
        });
    }

    static async compareVisualOutput(
        page: Page,
        testName: string,
        config: VisualTestConfig = { threshold: VISUAL_THRESHOLDS.moderate }
    ): Promise<void> {
        const responseContainer = page.locator('[data-testid="ai-response-container"]');
        await this.takeElementScreenshot(responseContainer, testName, config);
    }
}

// Test suite setup
test.beforeAll(async () => {
    VisualTestUtils.loadConfiguration();
});

test.describe('Visual AI Model Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/ai-chat');
        await page.waitForLoadState('networkidle');
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.addStyleTag({
            content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
        });
    });

    test('Image Description Interface', async ({ page }) => {
        const visualModels = VisualTestUtils.getVisualModels();
        for (const model of visualModels) {
            await test.step(`Image description UI for ${model.name}`, async () => {
                await page.selectOption('[data-testid="model-selector"]', model.id);
                await VisualTestUtils.uploadTestImage(page, 'sample-chart.png');
                const promptInput = page.locator('[data-testid="prompt-input"]');
                await promptInput.fill('Describe this image in detail');
                await VisualTestUtils.compareVisualOutput(
                    page,
                    `${model.id}-image-upload-interface`,
                    { threshold: VISUAL_THRESHOLDS.strict }
                );
                await page.click('[data-testid="submit-button"]');
                await VisualTestUtils.waitForAIResponse(page);
                await VisualTestUtils.compareVisualOutput(
                    page,
                    `${model.id}-image-description-response`,
                    {
                        threshold: VISUAL_THRESHOLDS.relaxed,
                        mask: [{ selector: '[data-testid="timestamp"]' }]
                    }
                );
                // --- ERROR WAS HERE ---
                // const responseText = page.locator('[data-testid="ai-response"]');
                // await expect(responseText).toBeVisible();
                // await expect(responseText).toContainText(['image', 'chart', 'data'].some(word =>
                //     responseText.textContent()?.toLowerCase().includes(word)
                // ) ? /.*/ : /image|chart|data/i);

                // FIXED CODE BELOW:
                const responseElem = page.locator('[data-testid="ai-response"]');
                await expect(responseElem).toBeVisible();
                const textContent = await responseElem.textContent();
                const found = ['image', 'chart', 'data'].some(word =>
                    (textContent ?? '').toLowerCase().includes(word)
                );
                expect(found).toBe(true);
            });
        }
    });
});
