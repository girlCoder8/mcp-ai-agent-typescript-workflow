import AnalyticsAgent from './AnalyticsAgent';
import * as fs from 'fs/promises';

interface TestPriority {
    type: string;
    priority: number;
}

async function prioritizeTestFiles(testFiles: string[]): Promise<string[]> {
    /* Prioritizing test files based on AI-driven insights from analytics agent. */
    if (testFiles.length === 0) return testFiles;

    // Use a sample test data path (e.g., latest failures) for analysis
    const testDataPath = 'data/latest_failures.json';
    let insights = 'No insights available';

    try {
        insights = await AnalyticsAgent.analyzeTestResults(testDataPath);
        console.log('AI Insights:', insights);
    } catch (error) {
        console.error('Failed to analyze test results:', error);
    }

    const priorities = AnalyticsAgent.prioritizeTests(insights);

    return testFiles.sort((a, b) => {
        const aPriority = priorities.find(p => a.includes(p.type))?.priority || 10;
        const bPriority = priorities.find(p => b.includes(p.type))?.priority || 10;
        return aPriority - bPriority;
    });
}

export { prioritizeTestFiles, TestPriority };