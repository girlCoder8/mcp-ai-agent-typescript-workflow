import { APIAgent } from '../../src/agents/APIAgent';
import {expect, test} from "@playwright/test";

test('APIAgent completes postman_tests', async () => {
    const agent = new APIAgent();
    const result = await agent.executeTask('postman_tests', {});
    expect(result.status).toBe('completed');
    expect(result.taskName).toBe('postman_tests');
});
