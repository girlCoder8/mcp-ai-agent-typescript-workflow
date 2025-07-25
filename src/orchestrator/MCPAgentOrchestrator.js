"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPAgentOrchestrator = void 0;
const enums_1 = require("../types/enums");
const APIAgent_1 = require("../agents/APIAgent");
const MobileAgent_1 = require("../agents/MobileAgent");
const ReportGenerator_1 = require("../reports/ReportGenerator");
class MCPAgentOrchestrator {
    constructor() {
        // Register agents here. Extend by adding more agents as needed.
        this.agents = {
            api_agent: new APIAgent_1.APIAgent(),
            mobile_agent: new MobileAgent_1.MobileAgent(),
        };
        this.reportGenerator = new ReportGenerator_1.ReportGenerator();
    }
    /**
     * Determine which tasks are run by each agent for a given event.
     * You can expand this for more dynamic logic based on events.
     */
    getTasksForEvent(event) {
        // Simple example: could branch by event type
        switch (event.eventType) {
            case enums_1.EventType.CI_EVENT:
            case enums_1.EventType.PR_EVENT:
            case enums_1.EventType.DEV_EVENT:
            default:
                return {
                    api_agent: ['postman_tests', 'api_validation'],
                    mobile_agent: ['appium_tests', 'webdriver_tests'],
                };
        }
    }
    /**
     * Aggregate status of all tasks to return a concise pipeline state.
     */
    getPipelineStatus(taskResults) {
        if (taskResults.some(r => r.status === enums_1.TaskStatus.FAILED))
            return 'FAILED';
        if (taskResults.every(r => r.status === enums_1.TaskStatus.COMPLETED))
            return 'SUCCESS';
        return 'INCOMPLETE';
    }
    /**
     * Main entry: process an event, coordinate all agents, collect and report results.
     */
    processEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[MCPAgentOrchestrator] Processing ${event.eventType} for branch ${event.branch}`);
            const tasksByAgent = this.getTasksForEvent(event);
            const allResults = [];
            // Execute defined tasks for each agent
            for (const [agentName, agentTasks] of Object.entries(tasksByAgent)) {
                const agent = this.agents[agentName];
                for (const task of agentTasks) {
                    // You can extend the context as needed
                    const context = {
                        event,
                        branch: event.branch,
                        commit: event.commitHash,
                        timestamp: event.timestamp
                    };
                    console.log(`[MCPAgentOrchestrator] Executing ${task} on ${agentName}`);
                    const result = yield agent.executeTask(task, context);
                    allResults.push(result);
                }
            }
            // Generate external and integration reports in parallel
            const [allureReport, jiraSyncResult] = yield Promise.all([
                this.reportGenerator.generateAllureReport(allResults),
                this.reportGenerator.syncWithZephyrJira(allResults)
            ]);
            // Gather per-agent reports
            const agentReports = {};
            for (const [name, agent] of Object.entries(this.agents)) {
                agentReports[name] = yield agent.generateReport();
            }
            // Return all result data for audit/logging/UI
            return {
                event,
                taskResults: allResults,
                agentReports,
                generatedReports: [allureReport, jiraSyncResult],
                pipelineStatus: this.getPipelineStatus(allResults)
            };
        });
    }
}
exports.MCPAgentOrchestrator = MCPAgentOrchestrator;
