"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.AgentType = exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["DEV_EVENT"] = "dev_event";
    EventType["CI_EVENT"] = "ci_event";
    EventType["PR_EVENT"] = "pr_event";
})(EventType || (exports.EventType = EventType = {}));
var AgentType;
(function (AgentType) {
    AgentType["API_AGENT"] = "api_agent";
    AgentType["MOBILE_AGENT"] = "mobile_agent";
})(AgentType || (exports.AgentType = AgentType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
