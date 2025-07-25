import { AgentType, TaskStatus } from '../types/enums';
import { TaskResult, AgentReport } from '../types/interfaces';

export abstract class BaseAgent {
    protected name: string;
    protected agentType: AgentType;
    protected tasks: string[] = [];

    constructor(name: string, agentType: AgentType) {
        this.name = name;
        this.agentType = agentType;
    }

    abstract executeTask(task: string, context: Record<string, any>): Promise<TaskResult>;
    abstract generateReport(): Promise<AgentReport>;

    protected async measureExecutionTime<T>(
        taskName: string,
        operation: () => Promise<T>
    ): Promise<{ result: T; duration: number }> {
        const startTime = Date.now();
        const result = await operation();
        const duration = (Date.now() - startTime) / 1000;
        return { result, duration };
    }

    protected createTaskResult(
        taskName: string,
        status: TaskStatus,
        output: string,
        duration: number,
        error?: string
    ): TaskResult {
        return {
            taskName,
            status,
            output,
            duration,
            error
        };
    }
}
