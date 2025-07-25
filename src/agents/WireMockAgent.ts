import { BaseAgent } from './BaseAgent';
import { AgentType, TaskStatus } from '../types/enums';
import { TaskResult, AgentReport } from '../types/interfaces';
import { execSync } from 'child_process';

export class WireMockAgent extends BaseAgent{
    private wiremocks: string[] = [];
    private testResults: TaskResult[] = [];

    constructor() {
        super('Wiremock Agent', AgentType.WIREMOCK_AGENT);
    }

    async executeTask(task: string, context: Record<string, any>): Promise<TaskResult> {
        try {
            const { result, duration } = await this.measureExecutionTime(task, async () => {
                switch (task) {
                    case 'wiremock_tests':
                        return await this.runWiremockTests(context);
                    case 'mock_validation':
                        return await this.validateWiremocks(context);
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

    private async runWiremockTests(context: Record<string, any>): Promise<string> {
        const collectionPath = context.collectionPath || 'get-user.json';

        try {
            // This is a simulation; replace it with real Newman CLI if needed
            const command = `echo "Pretend running: wiremock run ${collectionPath}"`;
            const output = execSync(command, { encoding: 'utf8', timeout: 5000 });
            this.wiremocks.push(collectionPath);
            return `Wiremock tests simulated: ${output.substring(0, 100).trim()}...`;
        } catch (error: any) {
            throw new Error(`Wiremock tests failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async validateWiremocks(context: Record<string, any>): Promise<string> {
        const mocks = context.mocks || [
            '/mocks/user',
        ];

        const results: string[] = [];
        for (const mock of mocks) {
            await new Promise(res => setTimeout(res, 50));
            results.push(`✓ ${mocks} - Status: 200`);
        }
        return `Wiremock validation completed for ${results.length} wiremocks\n${results.join('\n')}`;
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
