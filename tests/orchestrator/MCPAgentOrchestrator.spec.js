"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const MCPAgentOrchestrator_1 = require("../../src/orchestrator/MCPAgentOrchestrator");
const enums_1 = require("../../src/types/enums");
(0, test_1.test)('Orchestrator runs pipeline and generates results', async () => {
    const orchestrator = new MCPAgentOrchestrator_1.MCPAgentOrchestrator();
    const result = await orchestrator.processEvent({
        eventType: enums_1.EventType.CI_EVENT,
        timestamp: new Date(),
        branch: 'test',
        commitHash: 'deadbeef',
        author: 'Tester',
        metadata: {}
    });
    (0, test_1.expect)(result.pipelineStatus).toMatch(/SUCCESS|FAILED/);
});
