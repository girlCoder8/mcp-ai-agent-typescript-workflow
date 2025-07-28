import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

// Types
interface ModelConfig {
    id: string;
    name: string;
    maxTokens: number;
    performance: {
        avgResponseTime: number;
        reliability: number;
        throughput: number;
    };
}

// Configuration
const AI_CONFIG_PATH = join(process.cwd(), 'config/ai_models_config.json');
const MODEL_METADATA_PATH = join(process.cwd(), 'data/model_metadata.json');
const PERFORMANCE_THRESHOLDS = {
    maxResponseTime: 10000, // 10 seconds
    minThroughput: 1, // requests per second
    maxErrorRate: 0.05, // 5%
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCpuUsage: 80 // 80%
};

// Test utilities
class PerformanceTestUtils {
    private static aiConfig: any;
    private static modelMetadata: any;

    static loadConfigurations() {
        try {
            this.aiConfig = JSON.parse(readFileSync(AI_CONFIG_PATH, 'utf-8'));
            this.modelMetadata = JSON.parse(readFileSync(MODEL_METADATA_PATH, 'utf-8'));
        } catch (error) {
            throw new Error(`Failed to load configuration files: ${error}`);
        }
    }

    static getModelsForTesting(): ModelConfig[] {
        const performanceModels = this.aiConfig.testSuites.performance.models;
        const models: ModelConfig[] = [];

        Object.values(this.aiConfig.models).forEach((provider: any) => {
            Object.entries(provider.models).forEach(([key, model]: [string, any]) => {
                if (performanceModels.includes(key)) {
                    models.push({
                        id: key,
                        name: model.name,
                        maxTokens: model.maxTokens,
                        performance: model.performance
                    });
                }
            });
        });
        return models;
    }

    static async measureResponseTime(apiCall: () => Promise<any>): Promise<number> {
        const startTime = performance.now();
        await apiCall();
        return performance.now() - startTime;
    }

    static async getSystemMetrics(): Promise<{ memory: number; cpu: number }> {
        const memUsage = process.memoryUsage();
        return {
            memory: memUsage.heapUsed,
            cpu: process.cpuUsage().user / 1000000 // Convert to ms
        };
    }

    static calculateThroughput(requests: number, timeMs: number): number {
        return requests / (timeMs / 1000);
    }

    static calculatePercentile(values: number[], percentile: number): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
}

// Setup configs
test.beforeAll(() => {
    PerformanceTestUtils.loadConfigurations();
});

test.describe('AI Model Performance Tests', () => {
    test.describe.configure({ mode: 'parallel' });

    test('Load Test - Concurrent Requests', async ({ request }) => {
        const models = PerformanceTestUtils.getModelsForTesting();
        const concurrentRequests = 10;
        const testPayload = {
            messages: [
                { role: 'user', content: 'Generate a brief summary of artificial intelligence.' }
            ],
            max_tokens: 150
        };

        for (const model of models) {
            await test.step(`Load testing ${model.name}`, async () => {
                const promises: Promise<number>[] = [];
                const responseTimes: number[] = [];
                const startTime = performance.now();

                // Create concurrent requests
                for (let i = 0; i < concurrentRequests; i++) {
                    const promise = PerformanceTestUtils.measureResponseTime(async () => {
                        const response = await request.post('/api/ai/chat', {
                            data: { ...testPayload, model: model.id },
                            timeout: PERFORMANCE_THRESHOLDS.maxResponseTime
                        });
                        expect(response.ok()).toBeTruthy();
                        await response.body();
                    });
                    promises.push(promise);
                }

                // Wait for all
                const results = await Promise.allSettled(promises);
                const totalTime = performance.now() - startTime;

                // Calculate metrics
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        responseTimes.push(result.value);
                    }
                });

                const successfulRequests = responseTimes.length;
                const failedRequests = concurrentRequests - successfulRequests;
                const errorRate = failedRequests / concurrentRequests;

                const avgResponseTime = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
                const p95 = PerformanceTestUtils.calculatePercentile(responseTimes, 95);
                const p99 = PerformanceTestUtils.calculatePercentile(responseTimes, 99);
                const throughput = PerformanceTestUtils.calculateThroughput(successfulRequests, totalTime);

                expect(errorRate).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.maxErrorRate);
                expect(avgResponseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.maxResponseTime);
                expect(throughput).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.minThroughput);

                console.log(`${model.name} Load Test Results:`, {
                    totalRequests: concurrentRequests,
                    successfulRequests,
                    failedRequests,
                    errorRate: (errorRate * 100).toFixed(2) + '%',
                    avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
                    p95ResponseTime: p95.toFixed(2) + 'ms',
                    p99ResponseTime: p99.toFixed(2) + 'ms',
                    throughput: throughput.toFixed(2) + ' req/s'
                });
            });
        }
    });

    test('Response Time Benchmarks', async ({ request }) => {
        const models = PerformanceTestUtils.getModelsForTesting();
        const testCases = [
            { name: 'Short prompt', content: 'Hello', expectedTime: 2000 },
            { name: 'Medium prompt', content: 'Explain machine learning in 100 words.', expectedTime: 5000 },
            { name: 'Long prompt', content: `Write a detailed analysis of the following topic: 
            The impact of artificial intelligence on modern society, covering economic, 
            social, and ethical implications. Include examples and future predictions.`, expectedTime: 10000 }
        ];

        for (const model of models) {
            for (const testCase of testCases) {
                await test.step(`${model.name} - ${testCase.name}`, async () => {
                    const responseTime = await PerformanceTestUtils.measureResponseTime(async () => {
                        const response = await request.post('/api/ai/chat', {
                            data: {
                                model: model.id,
                                messages: [{ role: 'user', content: testCase.content }],
                                max_tokens: 500
                            },
                            timeout: testCase.expectedTime + 5000
                        });
                        expect(response.ok()).toBeTruthy();
                        await response.body();
                    });

                    expect(responseTime).toBeLessThanOrEqual(testCase.expectedTime);

                    console.log(`${model.name} ${testCase.name}: ${responseTime.toFixed(2)}ms`);
                });
            }
        }
    });

    test('Memory Usage Monitoring', async ({ request }) => {
        const models = PerformanceTestUtils.getModelsForTesting();
        const iterations = 20;

        for (const model of models) {
            await test.step(`Memory usage for ${model.name}`, async () => {
                const memoryReadings: number[] = [];

                for (let i = 0; i < iterations; i++) {
                    const beforeMetrics = await PerformanceTestUtils.getSystemMetrics();

                    await request.post('/api/ai/chat', {
                        data: {
                            model: model.id,
                            messages: [{ role: 'user', content: `Generate text iteration ${i}` }],
                            max_tokens: 200
                        }
                    });

                    const afterMetrics = await PerformanceTestUtils.getSystemMetrics();
                    const memoryDiff = afterMetrics.memory - beforeMetrics.memory;
                    memoryReadings.push(memoryDiff);
                }

                const avgMemoryUsage = memoryReadings.length
                    ? memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length
                    : 0;
                const maxMemoryUsage = memoryReadings.length
                    ? Math.max(...memoryReadings)
                    : 0;

                expect(maxMemoryUsage).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.maxMemoryUsage);

                console.log(`${model.name} Memory Usage:`, {
                    average: (avgMemoryUsage / 1024 / 1024).toFixed(2) + 'MB',
                    maximum: (maxMemoryUsage / 1024 / 1024).toFixed(2) + 'MB'
                });
            });
        }
    });

    test('Streaming Performance (buffer simulation)', async ({ request }) => {
        const streamingModels = PerformanceTestUtils.getModelsForTesting()
            .filter(model => model.id !== 'gemini-pro-vision'); // Example exclusion

        for (const model of streamingModels) {
            await test.step(`Streaming performance for ${model.name}`, async () => {
                // NOTE: Playwright APIRequestContext does not support real incremental streaming!
                // Simulate the latency until "first chunk" by timing the initial response.

                const startTime = performance.now();

                const response = await request.post('/api/ai/stream', {
                    data: {
                        model: model.id,
                        messages: [{
                            role: 'user',
                            content: 'Write a detailed explanation of quantum computing in exactly 300 words.'
                        }],
                        max_tokens: 400,
                        stream: true
                    }
                });

                expect(response.ok()).toBeTruthy();

                // In Playwright, .body() returns Buffer, not a stream.
                const buffer = await response.body();
                const totalTime = performance.now() - startTime;
                // Simulate "first chunk latency" as total time, as we can't get real streaming partials.
                const firstChunkTime = totalTime;

                // Estimate tokens as words/4 (very rough)
                const resultText = buffer.toString();
                const estimatedTokens = Math.ceil(resultText.length / 4);
                const tokensPerSecond = estimatedTokens / (totalTime / 1000);

                expect(firstChunkTime).toBeLessThanOrEqual(3000);
                expect(tokensPerSecond).toBeGreaterThanOrEqual(10);

                console.log(`${model.name} Streaming Performance:`, {
                    firstChunkTime: firstChunkTime.toFixed(2) + 'ms',
                    totalTime: totalTime.toFixed(2) + 'ms',
                    estimatedTokens,
                    tokensPerSecond: tokensPerSecond.toFixed(2)
                });
            });
        }
    });

    test('Error Rate Under Load', async ({ request }) => {
        const models = PerformanceTestUtils.getModelsForTesting();
        const requestCount = 50;
        const maxConcurrency = 5;

        for (const model of models) {
            await test.step(`Error rate testing for ${model.name}`, async () => {
                const batches = Math.ceil(requestCount / maxConcurrency);
                let totalRequests = 0;
                let successfulRequests = 0;
                let errorsByType: Record<string, number> = {};

                for (let batch = 0; batch < batches; batch++) {
                    const batchSize = Math.min(maxConcurrency, requestCount - (batch * maxConcurrency));
                    const promises: Promise<any>[] = [];

                    for (let i = 0; i < batchSize; i++) {
                        totalRequests++;
                        const promise = request.post('/api/ai/chat', {
                            data: {
                                model: model.id,
                                messages: [{
                                    role: 'user',
                                    content: `Test request ${totalRequests} for error rate analysis`
                                }],
                                max_tokens: 100
                            },
                            timeout: 15000
                        }).then(response => {
                            if (response.ok()) {
                                successfulRequests++;
                                return {success: true, status: response.status()};
                            } else {
                                const errorType = `HTTP_${response.status()}`;
                                errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
                                return {success: false, status: response.status(), error: errorType};
                            }
                        }).catch(error => {
                            const errorType = error?.name || 'UNKNOWN_ERROR';
                            errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
                            return {success: false, error: errorType};
                        });
                        promises.push(promise);
                    }
                    await Promise.all(promises);
                }

                const errorRate = (totalRequests - successfulRequests) / totalRequests;

                expect(errorRate).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.maxErrorRate);

                console.log(`${model.name} Error Rate Test Results:`, {
                    totalRequests,
                    successfulRequests,
                    failedRequests: totalRequests - successfulRequests,
                    errorRate: (errorRate * 100).toFixed(2) + '%',
                    errorsByType,
                });
            });
        }
    });
});
