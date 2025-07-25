import { EventType, AgentType, TaskStatus } from './enums';

export interface CIPipelineEvent {
    eventType: EventType;
    timestamp: Date;
    branch: string;
    commitHash: string;
    author: string;
    metadata: Record<string, any>;
}

export interface TaskResult {
    taskName: string;
    status: TaskStatus;
    output: string;
    duration: number;
    error?: string;
}

export interface AgentReport {
    agentType: AgentType;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    testResults: TaskResult[];
}

export interface PipelineResult {
    event: CIPipelineEvent;
    taskResults: TaskResult[];
    agentReports: Record<string, AgentReport>;
    generatedReports: string[];
    pipelineStatus: string;
}
