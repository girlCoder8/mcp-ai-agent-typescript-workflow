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
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const ReportGenerator_1 = require("../../src/reports/ReportGenerator");
const enums_1 = require("../../src/types/enums");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
(0, test_1.test)('generateAllureReport produces a file in custom directory', async () => {
    const gen = new ReportGenerator_1.ReportGenerator();
    const results = [
        { taskName: 'unit_test', status: enums_1.TaskStatus.COMPLETED, output: 'ok', duration: 1 }
    ];
    const customDir = 'pipeline-reports';
    const filePath = await gen.generateAllureReport(results, customDir);
    // File should be saved inside customDir
    (0, test_1.expect)(filePath.startsWith(`${customDir}${path.sep}`) || filePath.startsWith(`${customDir}/`)).toBe(true);
    // Check the file exists
    const stat = await fs.stat(filePath);
    (0, test_1.expect)(stat.isFile()).toBe(true);
    // Read and check contents
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    (0, test_1.expect)(content.totalTests).toBe(1);
    (0, test_1.expect)(content.passed).toBe(1);
    // Clean up
    await fs.unlink(filePath);
    // Optionally remove the directory if empty (ignore errors)
    try {
        await fs.rmdir(customDir);
    }
    catch { }
});
(0, test_1.test)('syncWithZephyrJira works as expected', async () => {
    const gen = new ReportGenerator_1.ReportGenerator();
    const passing = [
        { taskName: 'should pass', status: enums_1.TaskStatus.COMPLETED, output: '', duration: 0.5 }
    ];
    const failing = [
        { taskName: 'should fail', status: enums_1.TaskStatus.FAILED, output: '', duration: 0.5, error: 'err' }
    ];
    const r1 = await gen.syncWithZephyrJira(passing);
    (0, test_1.expect)(r1).toMatch(/all tests passed/i);
    const r2 = await gen.syncWithZephyrJira(failing);
    (0, test_1.expect)(r2).toMatch(/Mock: Synced 1 failed/);
});
