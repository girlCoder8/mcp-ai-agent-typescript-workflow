"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.HeadSpinAgent = void 0;
const BaseAgent_1 = require("./BaseAgent");
const enums_1 = require("../types/enums");
const webdriverio_1 = require("webdriverio");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class HeadSpinAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super('HeadSpin Agent', enums_1.AgentType.MOBILE_AGENT);
        this.testResults = [];
    }
    executeTask(task, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { result, duration } = yield this.measureExecutionTime(task, () => __awaiter(this, void 0, void 0, function* () {
                    switch (task) {
                        case 'headspin_ios_smoke':
                            return yield this.runHeadSpinIOSSmokeTest();
                        default:
                            throw new Error(`Unknown task: ${task}`);
                    }
                }));
                const taskResult = this.createTaskResult(task, enums_1.TaskStatus.COMPLETED, result, duration);
                this.testResults.push(taskResult);
                return taskResult;
            }
            catch (error) {
                const taskResult = this.createTaskResult(task, enums_1.TaskStatus.FAILED, '', 0, error instanceof Error ? error.message : String(error));
                this.testResults.push(taskResult);
                return taskResult;
            }
        });
    }
    runHeadSpinIOSSmokeTest() {
        return __awaiter(this, void 0, void 0, function* () {
            // These should come from your .env (see below)
            const HEADSPIN_USERNAME = process.env.HEADSPIN_USERNAME;
            const HEADSPIN_ACCESS_TOKEN = process.env.HEADSPIN_API_TOKEN;
            const HEADSPIN_HOST = process.env.HEADSPIN_HOST || "us-west2.headspin.io";
            const DEVICE_UDID = process.env.HEADSPIN_UDID;
            if (!HEADSPIN_ACCESS_TOKEN || !DEVICE_UDID) {
                throw new Error('Missing HeadSpin credentials or device info in .env');
            }
            const caps = {
                alwaysMatch: {
                    platformName: 'iOS',
                    'appium:deviceName': 'Headspin iOS Device',
                    'appium:udid': DEVICE_UDID,
                    'appium:automationName': 'XCUITest',
                    'appium:app': process.env.HEADSPIN_APP_URL, // Uploaded app .ipa HTTP/S url
                },
                firstMatch: [{}]
            };
            const browser = yield (0, webdriverio_1.remote)({
                protocol: 'https',
                hostname: HEADSPIN_HOST,
                port: 443,
                path: `/v0/${HEADSPIN_ACCESS_TOKEN}/wd/hub`,
                capabilities: caps
            });
            let output = '';
            try {
                // Example: check the app is loaded, home screen element, etc
                yield browser.pause(1000);
                output = 'HeadSpin iOS smoke test executed successfully!';
            }
            finally {
                yield browser.deleteSession();
            }
            return output;
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
exports.HeadSpinAgent = HeadSpinAgent;
