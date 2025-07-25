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
const MCPAgentOrchestrator_1 = require("./orchestrator/MCPAgentOrchestrator");
const enums_1 = require("./types/enums");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const orchestrator = new MCPAgentOrchestrator_1.MCPAgentOrchestrator();
        const result = yield orchestrator.processEvent({
            eventType: enums_1.EventType.CI_EVENT,
            timestamp: new Date(),
            branch: 'main',
            commitHash: '123abc',
            author: 'CI Bot',
            metadata: {}
        });
        console.log(JSON.stringify(result, null, 2));
    });
}
main().catch(console.error);
