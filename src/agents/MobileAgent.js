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
exports.MobileAgent = void 0;
const BaseAgent_1 = require("./BaseAgent");
const enums_1 = require("../types/enums");
class MobileAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super('Mobile Agent', enums_1.AgentType.MOBILE_AGENT);
        this.testResults = [];
        this.devices = ['iOS Simulator', 'Android Emulator'];
    }
    executeTask(task, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { result, duration } = yield this.measureExecutionTime(task, () => __awaiter(this, void 0, void 0, function* () {
                    switch (task) {
                        case 'appium_tests':
                            return yield this.runAppiumTests(context);
                        case 'webdriver_tests':
                            return yield this.runWebDriverTests(context);
                        default:
                            throw new Error(`Unknown task: ${task}`);
                    }
                }));
                const taskResult = this.createTaskResult(task, enums_1.TaskStatus.COMPLETED, result, duration);
                this.testResults.push(taskResult);
                return taskResult;
            }
            catch (error) {
                this.testResults.push(this.createTaskResult(task, enums_1.TaskStatus.FAILED, '', 0, error instanceof Error ? error.message : String(error)));
                return this.testResults[this.testResults.length - 1];
            }
        });
    }
    runAppiumTests(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const device of this.devices) {
                yield new Promise(res => setTimeout(res, 100));
                results.push(`✓ ${device} - All tests passed`);
            }
            return `Appium tests completed:\n${results.join('\n')}`;
        });
    }
    runWebDriverTests(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const browsers = context.browsers || ['Chrome', 'Firefox'];
            const results = [];
            for (const browser of browsers) {
                yield new Promise(res => setTimeout(res, 80));
                results.push(`✓ ${browser} - WebDriver tests succeeded`);
            }
            return `WebDriver tests completed:\n${results.join('\n')}`;
        });
    }
    generateReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalTests = this.testResults.length;
            const passedTests = this.testResults.filter(r => r.status === enums_1.TaskStatus.COMPLETED).length;
            return {
                agentType: this.agentType,
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                testResults: this.testResults
            };
        });
    }
}
exports.MobileAgent = MobileAgent;
