import { MCPAgentOrchestrator } from './orchestrator/MCPAgentOrchestrator';
import { EventType } from './types/enums';

async function main() {
    const orchestrator = new MCPAgentOrchestrator();
    const result = await orchestrator.processEvent({
        eventType: EventType.CI_EVENT,
        timestamp: new Date(),
        branch: 'main',
        commitHash: '123abc',
        author: 'CI Bot',
        metadata: {}
    });
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
