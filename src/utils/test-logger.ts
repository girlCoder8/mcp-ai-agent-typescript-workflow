import fs from "fs";
import path from "path";

// Unicode symbols for pass/fail
const PASS_SYMBOL = "✅";
const FAIL_SYMBOL = "❌";

export enum LogLevel {
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR"
}

export interface ScreenshotContext {
    pageOrBrowser?: any; // WDIO browser instance
    screenshotDir?: string;
}

export class TestLogger {
    static logFilePath = path.resolve(__dirname, "../../logs/test-execution.log");
    static screenshotDir = path.resolve(__dirname, "../../logs/screenshots");

    static log(message: string, level: LogLevel = LogLevel.INFO) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [${level}] ${message}\n`;
        console.log(formatted.trim());
        fs.appendFileSync(TestLogger.logFilePath, formatted);
    }

    static async handleError(testName: string, err: unknown, context?: ScreenshotContext) {
        const errorMsg = (err instanceof Error) ? err.stack || err.message : String(err);
        TestLogger.log(`${FAIL_SYMBOL} Error in "${testName}": ${errorMsg}`, LogLevel.ERROR);

        // Screenshot logic
        if (context && context.pageOrBrowser) {
            try {
                if (!fs.existsSync(this.screenshotDir)) fs.mkdirSync(this.screenshotDir, { recursive: true });
                const screenshotPath = path.join(
                    this.screenshotDir,
                    `${testName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.png`
                );

                // Playwright: page.screenshot
                if (typeof context.pageOrBrowser.screenshot === "function") {
                    await context.pageOrBrowser.screenshot({ path: screenshotPath, fullPage: true });
                    TestLogger.log(`Screenshot saved: ${screenshotPath}`);
                }
                // WebdriverIO: browser.saveScreenshot
                else if (typeof context.pageOrBrowser.saveScreenshot === "function") {
                    await context.pageOrBrowser.saveScreenshot(screenshotPath);
                    TestLogger.log(`Screenshot saved: ${screenshotPath}`);
                }
            } catch (screenshotErr) {
                TestLogger.log(`Failed to capture screenshot in "${testName}": ${screenshotErr}`, LogLevel.WARN);
            }
        }
    }

    static pass(testName: string) {
        TestLogger.log(`${PASS_SYMBOL} ${testName} passed`, LogLevel.INFO);
    }

    static fail(testName: string) {
        TestLogger.log(`${FAIL_SYMBOL} ${testName} failed`, LogLevel.ERROR);
    }
}
