export type Plan = "free" | "pro" | "enterprise";
export type AgentStatus = "active" | "paused" | "draft";
export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "pending" | "processing" | "done" | "error";
export type JobStatus = "pending" | "processing" | "done" | "error";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type TabType = "memories" | "data_table" | "iframe" | "markdown" | "kanban";

export const PLAN_LIMITS: Record<Plan, { maxAgents: number; maxConcurrentJobs: number }> = {
  free: { maxAgents: 1, maxConcurrentJobs: 1 },
  pro: { maxAgents: 10, maxConcurrentJobs: 5 },
  enterprise: { maxAgents: 100, maxConcurrentJobs: 20 },
};
