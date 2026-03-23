export type Plan = "free" | "pro" | "enterprise";
export type AgentStatus = "active" | "paused" | "draft";
export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "pending" | "processing" | "done" | "error";
export type JobStatus = "pending" | "processing" | "done" | "error";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type TabType = "tasks" | "notes" | "spreadsheet" | "markdown" | "data_table" | "postgres" | "api" | "workflow";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type SpreadsheetColumnType = "text" | "number" | "date" | "checkbox";

export const PLAN_LIMITS: Record<
  Plan,
  {
    maxAgents: number;
    maxConcurrentJobs: number;
    maxPagesPerAgent: number;
    allowedPageTypes: TabType[];
    maxPostgresConnections: number;
  }
> = {
  free: {
    maxAgents: 3,
    maxConcurrentJobs: 1,
    maxPagesPerAgent: 5,
    allowedPageTypes: ["tasks", "notes", "markdown", "data_table"],
    maxPostgresConnections: 0,
  },
  pro: {
    maxAgents: 10,
    maxConcurrentJobs: 5,
    maxPagesPerAgent: 20,
    allowedPageTypes: ["tasks", "notes", "spreadsheet", "markdown", "data_table", "postgres", "api", "workflow"],
    maxPostgresConnections: 1,
  },
  enterprise: {
    maxAgents: 100,
    maxConcurrentJobs: 20,
    maxPagesPerAgent: 50,
    allowedPageTypes: ["tasks", "notes", "spreadsheet", "markdown", "data_table", "postgres", "api", "workflow"],
    maxPostgresConnections: 5,
  },
};
