import { CIPipelineEvent, PipelineResult, AgentReport, TaskResult } from '../types/interfaces';
import { EventType, TaskStatus } from '../types/enums';
import { APIAgent } from '../agents/APIAgent';
import { MobileAgent } from '../agents/MobileAgent';
import { WireMockAgent } from '../agents/WireMockAgent';
// import { DBSeederAgent } from '../agents/DBSeederAgent';
import { ReportGenerator } from '../reports/ReportGenerator';

export class MCPAgentOrchestrator {
    private agents: Record<string, { executeTask: Function; generateReport: Function }>;
    private reportGenerator: ReportGenerator;

    constructor() {
        // Register agents here. Extend by adding more agents as needed.
        this.agents = {
            api_agent: new APIAgent(),
            mobile_agent: new MobileAgent(),
            wiremock_agent: new WireMockAgent(), // Register WireMockAgent
          //  db_seeder_agent: new DBSeederAgent(), // Register DBSeederAgent
        };
        this.reportGenerator = new ReportGenerator();
    }

    /**
     * Determine which tasks are run by each agent for a given event.
     * You can expand this for more dynamic logic based on events.
     */
    private getTasksForEvent(event: CIPipelineEvent): Record<string, string[]> {
        // Extend the task assignment based on an event type
        switch (event.eventType) {
            case EventType.CI_EVENT:
            case EventType.PR_EVENT:
            case EventType.DEV_EVENT:
            default:
                return {
                    api_agent: ['postman_tests', 'api_validation'], //Task for Playwright API tests
                    mobile_agent: ['appium_tests', 'webdriver_tests'], //Task for Webdriverio/Appium mobile simulator tests
                    wiremock_agent: ['wiremock_tests', 'wiremock_tests'], // Task for WireMockAgent
                 //   db_seeder_agent: ['seed_database'], // Task for DBSeederAgent
                };
          }
    }

    /**
     * Aggregate status of all tasks to return a concise pipeline state.
     */
    private getPipelineStatus(taskResults: TaskResult[]): string {
        if (taskResults.some(r => r.status === TaskStatus.FAILED)) return 'FAILED';
        if (taskResults.every(r => r.status === TaskStatus.COMPLETED)) return 'SUCCESS';
        return 'INCOMPLETE';
    }

    /**
     * Main entry: process an event, coordinate all agents, collect and report results.
     */
    async processEvent(event: CIPipelineEvent): Promise<PipelineResult> {
        console.log(`[MCPAgentOrchestrator] Processing ${event.eventType} for branch ${event.branch}`);

        const tasksByAgent = this.getTasksForEvent(event);
        const allResults: TaskResult[] = [];

        // Execute defined tasks for each agent
        for (const [agentName, agentTasks] of Object.entries(tasksByAgent)) {
            const agent = this.agents[agentName];
            for (const task of agentTasks) {
                // Extend context as needed
                const context = {
                    event,
                    branch: event.branch,
                    commit: event.commitHash,
                    timestamp: event.timestamp
                };
                console.log(`[MCPAgentOrchestrator] Executing ${task} on ${agentName}`);
                const result = await agent.executeTask(task, context);
                allResults.push(result);
            }
        }

        // Generate external and integration reports in parallel
        const [allureReport, jiraSyncResult] = await Promise.all([
            this.reportGenerator.generateAllureReport(allResults),
            this.reportGenerator.syncWithZephyrJira(allResults)
        ]);

        // Gather per-agent reports
        const agentReports: Record<string, AgentReport> = {};
        for (const [name, agent] of Object.entries(this.agents)) {
            agentReports[name] = await agent.generateReport();
        }

        // Return all result data for audit/logging/UI
        return {
            event,
            taskResults: allResults,
            agentReports,
            generatedReports: [allureReport, jiraSyncResult],
            pipelineStatus: this.getPipelineStatus(allResults)
        };
    }
}

export default MCPAgentOrchestrator;