import { BaseAgent } from './BaseAgent';
import { AgentType, TaskStatus } from '../types/enums';
import { TaskResult, AgentReport } from '../types/interfaces';
import { remote } from 'webdriverio';
import * as WebdriverIO from 'webdriverio';
import { Capabilities } from '@wdio/types';
import * as dotenv from 'dotenv';
dotenv.config();

export class HeadSpinAgent extends BaseAgent {
    private testResults: TaskResult[] = [];

    constructor() {
        super('HeadSpin Agent', AgentType.MOBILE_AGENT);
    }

    async executeTask(task: string, context: Record<string, any>): Promise<TaskResult> {
        try {
            const { result, duration } = await this.measureExecutionTime(task, async () => {
                switch (task) {
                    case 'headspin_ios_smoke':
                        return await this.runHeadSpinIOSSmokeTest();
                    default:
                        throw new Error(`Unknown task: ${task}`);
                }
            });

            const taskResult = this.createTaskResult(
                task,
                TaskStatus.COMPLETED,
                result,
                duration
            );
            this.testResults.push(taskResult);
            return taskResult;
        } catch (error: any) {
            const taskResult = this.createTaskResult(
                task,
                TaskStatus.FAILED,
                '',
                0,
                error instanceof Error ? error.message : String(error)
            );
            this.testResults.push(taskResult);
            return taskResult;
        }
    }

    private async runHeadSpinIOSSmokeTest(): Promise<string> {
        // These should come from your .env (see below)
        const HEADSPIN_USERNAME = process.env.HEADSPIN_USERNAME;
        const HEADSPIN_ACCESS_TOKEN = process.env.HEADSPIN_API_TOKEN;
        const HEADSPIN_HOST = process.env.HEADSPIN_HOST || "us-west2.headspin.io";
        const DEVICE_UDID = process.env.HEADSPIN_UDID;

        if (!HEADSPIN_ACCESS_TOKEN || !DEVICE_UDID) {
            throw new Error('Missing HeadSpin credentials or device info in .env');
        }

        const caps: Capabilities.W3CCapabilities = {
            alwaysMatch: {
                platformName: 'iOS',
                'appium:deviceName': 'Headspin iOS Device',
                'appium:udid': DEVICE_UDID,
                'appium:automationName': 'XCUITest',
                'appium:app': process.env.HEADSPIN_APP_URL, // Uploaded app .ipa HTTP/S url
            },
            firstMatch: [{}]
        };

        const browser: WebdriverIO.Browser = await remote({
            protocol: 'https',
            hostname: HEADSPIN_HOST,
            port: 443,
            path: `/v0/${HEADSPIN_ACCESS_TOKEN}/wd/hub`,
            capabilities: caps
        });

        let output = '';
        try {
            // Example: check the app is loaded, home screen element, etc
            await browser.pause(1000);
            output = 'HeadSpin iOS smoke test executed successfully!';
        } finally {
            await browser.deleteSession();
        }

        return output;
    }

    async generateReport(): Promise<AgentReport> {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === TaskStatus.COMPLETED).length;

        return {
            agentType: this.agentType,
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            testResults: this.testResults
        };
    }
}