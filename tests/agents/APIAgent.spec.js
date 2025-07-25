"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const APIAgent_1 = require("../../src/agents/APIAgent");
const test_1 = require("@playwright/test");
(0, test_1.test)('APIAgent completes postman_tests', async () => {
    const agent = new APIAgent_1.APIAgent();
    const result = await agent.executeTask('postman_tests', {});
    (0, test_1.expect)(result.status).toBe('completed');
    (0, test_1.expect)(result.taskName).toBe('postman_tests');
});
