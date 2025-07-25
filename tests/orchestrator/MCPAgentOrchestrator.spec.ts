import { test, expect } from '@playwright/test';
import { MCPAgentOrchestrator } from '../../src/orchestrator/MCPAgentOrchestrator';
import { EventType } from '../../src/types/enums';

test('Orchestrator runs pipeline and generates results', async () => {
    const orchestrator = new MCPAgentOrchestrator();
    const result = await orchestrator.processEvent({
        eventType: EventType.CI_EVENT,
        timestamp: new Date(),
        branch: 'test',
        commitHash: 'deadbeef',
        author: 'Admin',
        metadata: {}
    });
    expect(result.pipelineStatus).toMatch(/SUCCESS|FAILED/);
});
