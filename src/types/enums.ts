export enum EventType {
    DEV_EVENT = 'dev_event',
    CI_EVENT = 'ci_event',
    PR_EVENT = 'pr_event'
}

export enum AgentType {
    API_AGENT = 'api_agent',
    MOBILE_AGENT = 'mobile_agent',
    WIREMOCK_AGENT = 'wiremock_agent'
}

export enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}
