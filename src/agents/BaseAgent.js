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
exports.BaseAgent = void 0;
class BaseAgent {
    constructor(name, agentType) {
        this.tasks = [];
        this.name = name;
        this.agentType = agentType;
    }
    measureExecutionTime(taskName, operation) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const result = yield operation();
            const duration = (Date.now() - startTime) / 1000;
            return { result, duration };
        });
    }
    createTaskResult(taskName, status, output, duration, error) {
        return {
            taskName,
            status,
            output,
            duration,
            error
        };
    }
}
exports.BaseAgent = BaseAgent;
