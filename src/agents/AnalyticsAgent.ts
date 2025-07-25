import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

class AnalyticsAgent {
    async analyzeTestResults(testDataPath: string): Promise<string> {
        /* Analyzing test results to provide actionable insights. */
        const testData = JSON.parse(await fs.readFile(testDataPath, 'utf-8'));

        const prompt = `
      Analyze the following test results and suggest improvements:
      ${JSON.stringify(testData, null, 2)}
      Provide insights on failure trends and prioritization for next test runs.
    `;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
        });

        return response.choices[0].message?.content || 'No analysis available';
    }

    prioritizeTests(insights: string): Array<{ type: string; priority: number }> {
        /* Prioritizing test cases based on AI-driven insights. */
        const priorityList: Array<{ type: string; priority: number }> = [];
        if (insights.toLowerCase().includes('failure trends')) {
            priorityList.push({ type: 'regression', priority: 1 });
        }
        if (insights.toLowerCase().includes('performance issues')) {
            priorityList.push({ type: 'performance', priority: 2 });
        }
        return priorityList;
    }
}

export default new AnalyticsAgent();