import { tool } from "../ai-sdk-shim.js";
import { z } from "zod";
import type { AgentConvexClient } from "../convex-client.js";

interface Tab {
  _id: string;
  type: string;
  label: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function createTimeTrackingTools(
  convexClient: AgentConvexClient,
  agentId: string,
  tabs: Tab[]
) {
  // Find or auto-create the time_tracking tab
  async function getTimeTrackingTabId(): Promise<string> {
    const existing = tabs.find((t) => t.type === "time_tracking");
    if (existing) return existing._id;

    // Auto-create the page
    const tabId = await convexClient.createPage(agentId, "Time Tracking", "time_tracking");
    return tabId;
  }

  const startTimeTracking = tool(
    "start_time_tracking",
    `Start tracking time on an activity. Only one timer can run at a time — if another is running, it will be automatically stopped first.

Examples:
- "Track time on code review" → description: "Code review"
- "Start timer for client meeting, billable" → description: "Client meeting", billable: true`,
    {
      description: z.string().describe("What you're tracking time on"),
      tags: z.array(z.string()).optional().describe("Tags for categorization (e.g. ['engineering', 'review'])"),
      task_id: z.string().optional().describe("Optional task ID to link this time entry to"),
      billable: z.boolean().optional().describe("Whether this time is billable"),
    },
    async (input) => {
      try {
        const tabId = await getTimeTrackingTabId();
        const entryId = await convexClient.startTimeTracking(agentId, tabId, {
          description: input.description,
          tags: input.tags,
          taskId: input.task_id,
          billable: input.billable,
        });

        await convexClient.emitEvent(agentId, "time_tracking.started", "time_tracking_tools", {
          entryId,
          description: input.description,
          tags: input.tags,
          billable: input.billable,
        });

        return {
          content: [{
            type: "text" as const,
            text: `Timer started: "${input.description}". ID: ${entryId}`,
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to start timer: ${err.message}`,
          }],
        };
      }
    }
  );

  const stopTimeTracking = tool(
    "stop_time_tracking",
    "Stop the currently running timer.",
    {},
    async () => {
      try {
        const result = await convexClient.stopTimeTracking(agentId);

        await convexClient.emitEvent(agentId, "time_tracking.stopped", "time_tracking_tools", {
          entryId: result.entryId,
          description: result.description,
          duration: result.duration,
        });

        return {
          content: [{
            type: "text" as const,
            text: `Timer stopped: "${result.description}" — ${formatDuration(result.duration)}`,
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to stop timer: ${err.message}`,
          }],
        };
      }
    }
  );

  const logTime = tool(
    "log_time",
    `Manually log a completed time entry (for work already done).

Examples:
- "Spent 2 hours on design review" → description: "Design review", duration_minutes: 120
- "45 minutes on standup, billable" → description: "Standup", duration_minutes: 45, billable: true`,
    {
      description: z.string().describe("What you tracked time on"),
      duration_minutes: z.number().describe("Duration in minutes (e.g. 90 for 1.5 hours)"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      task_id: z.string().optional().describe("Optional task ID to link this entry to"),
      billable: z.boolean().optional().describe("Whether this time is billable"),
    },
    async (input) => {
      try {
        const tabId = await getTimeTrackingTabId();
        const entryId = await convexClient.logTimeEntry(agentId, tabId, {
          description: input.description,
          durationMinutes: input.duration_minutes,
          tags: input.tags,
          taskId: input.task_id,
          billable: input.billable,
        });

        await convexClient.emitEvent(agentId, "time_tracking.logged", "time_tracking_tools", {
          entryId,
          description: input.description,
          duration: Math.round(input.duration_minutes * 60),
          tags: input.tags,
          billable: input.billable,
        });

        return {
          content: [{
            type: "text" as const,
            text: `Time logged: "${input.description}" — ${formatDuration(Math.round(input.duration_minutes * 60))}. ID: ${entryId}`,
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to log time: ${err.message}`,
          }],
        };
      }
    }
  );

  const listTimeEntries = tool(
    "list_time_entries",
    "List recent time entries. Returns the most recent entries.",
    {
      limit: z.number().optional().describe("Number of entries to return (default 10)"),
    },
    async (input) => {
      try {
        const entries = await convexClient.listTimeEntries(agentId, undefined, input.limit ?? 10);
        if (!entries || entries.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No time entries found.",
            }],
          };
        }

        const running = entries.find((e: any) => e.isRunning);
        const lines = entries.map((e: any) => {
          const dur = e.isRunning
            ? `${formatDuration(Math.round((Date.now() - e.startTime) / 1000))} (running)`
            : formatDuration(e.duration ?? 0);
          const tags = e.tags?.length ? ` [${e.tags.join(", ")}]` : "";
          const billable = e.billable ? " 💰" : "";
          const date = new Date(e.startTime).toLocaleDateString();
          return `- ${date} | "${e.description}" — ${dur}${tags}${billable} (ID: ${e._id})`;
        });

        let header = `${entries.length} time entries:`;
        if (running) {
          header = `⏱️ Currently tracking: "${running.description}" (${formatDuration(Math.round((Date.now() - running.startTime) / 1000))})\n\n${entries.length} entries:`;
        }

        return {
          content: [{
            type: "text" as const,
            text: `${header}\n${lines.join("\n")}`,
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to list time entries: ${err.message}`,
          }],
        };
      }
    }
  );

  const getTimeSummary = tool(
    "get_time_summary",
    "Get a summary of time tracked over a period.",
    {
      period: z.enum(["today", "week", "month"]).optional().describe("Time period to summarize (default: today)"),
    },
    async (input) => {
      try {
        const summary = await convexClient.getTimeSummary(agentId, undefined, input.period ?? "today");
        if (!summary) {
          return {
            content: [{
              type: "text" as const,
              text: "No time tracking data found.",
            }],
          };
        }

        const tagLines = Object.entries(summary.byTag)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([tag, secs]) => `  - ${tag}: ${formatDuration(secs as number)}`);

        const parts = [
          `Time Summary (${summary.period}):`,
          `Total: ${formatDuration(summary.totalSeconds)}`,
          `Billable: ${formatDuration(summary.billableSeconds)}`,
          `Entries: ${summary.entryCount}`,
        ];

        if (tagLines.length > 0) {
          parts.push(`By tag:\n${tagLines.join("\n")}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: parts.join("\n"),
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to get time summary: ${err.message}`,
          }],
        };
      }
    }
  );

  const deleteTimeEntry = tool(
    "delete_time_entry",
    "Delete a time entry by ID.",
    {
      entry_id: z.string().describe("ID of the time entry to delete"),
    },
    async (input) => {
      try {
        await convexClient.deleteTimeEntry(input.entry_id);

        await convexClient.emitEvent(agentId, "time_tracking.deleted", "time_tracking_tools", {
          entryId: input.entry_id,
        });

        return {
          content: [{
            type: "text" as const,
            text: "Time entry deleted.",
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to delete time entry: ${err.message}`,
          }],
        };
      }
    }
  );

  return [startTimeTracking, stopTimeTracking, logTime, listTimeEntries, getTimeSummary, deleteTimeEntry];
}
