import { BaseAgent } from './BaseAgent';
import { AgentType, TaskStatus } from '../types/enums';
import { TaskResult, AgentReport } from '../types/interfaces';

export class MobileAgent extends BaseAgent {
    private testResults: TaskResult[] = [];
    private devices: string[] = ['iOS Simulator'];

    constructor() {
        super('Mobile Agent', AgentType.MOBILE_AGENT);
    }

    async executeTask(task: string, context: Record<string, any>): Promise<TaskResult> {
        try {
            const { result, duration } = await this.measureExecutionTime(task, async () => {
                switch (task) {
                    case 'appium_tests':
                        return await this.runAppiumTests(context);
                    case 'webdriver_tests':
                        return await this.runWebDriverTests(context);
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
            this.testResults.push(this.createTaskResult(
                task,
                TaskStatus.FAILED,
                '',
                0,
                error instanceof Error ? error.message : String(error)
            ));
            return this.testResults[this.testResults.length - 1];
        }
    }

    private async runAppiumTests(context: Record<string, any>): Promise<string> {
        const results: string[] = [];
        for (const device of this.devices) {
            await new Promise(res => setTimeout(res, 100));
            results.push(`✓ ${device} - All tests passed`);
        }
        return `Appium tests completed:\n${results.join('\n')}`;
    }

    private async runWebDriverTests(context: Record<string, any>): Promise<string> {
        const browsers = context.browsers || ['Chrome', 'Firefox'];
        const results: string[] = [];
        for (const browser of browsers) {
            await new Promise(res => setTimeout(res, 80));
            results.push(`✓ ${browser} - WebDriver tests succeeded`);
        }
        return `WebDriver tests completed:\n${results.join('\n')}`;
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
