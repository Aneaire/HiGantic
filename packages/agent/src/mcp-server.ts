import type { Tool } from "ai";
import { createSdkMcpServer, tool } from "./ai-sdk-shim.js";
import { z } from "zod";
import type { AgentConvexClient } from "./convex-client.js";
import { createMemoryTools } from "./tools/memory-tools.js";
import { createPageTools } from "./tools/page-tools.js";
import { createCustomHttpTools } from "./tools/custom-http-tools.js";
import { createSuggestTools } from "./tools/suggest-tools.js";
import { createRagTools } from "./tools/rag-tools.js";
import { createEmailTools } from "./tools/email-tools.js";
import { createScheduleTools } from "./tools/schedule-tools.js";
import { createAutomationTools } from "./tools/automation-tools.js";
import { createTimerTools } from "./tools/timer-tools.js";
import { createWebhookManagementTools } from "./tools/webhook-management-tools.js";
import { createAgentMessageTools } from "./tools/agent-message-tools.js";
import { createNotionTools } from "./tools/notion-tools.js";
import { createSlackTools } from "./tools/slack-tools.js";
import { createDiscordTools } from "./tools/discord-tools.js";
import { createGCalTools } from "./tools/gcal-tools.js";
import { createGDriveTools } from "./tools/gdrive-tools.js";
import { createGSheetsTools } from "./tools/gsheets-tools.js";
import { createImageGenTools } from "./tools/image-gen-tools.js";
import { createGmailTools } from "./tools/gmail-tools.js";
import { createExploreCapabilitiesTools } from "./tools/explore-capabilities-tools.js";
import { createTimeTrackingTools } from "./tools/time-tracking-tools.js";

interface Tab {
  _id: string;
  type: string;
  label: string;
}

interface CustomToolConfig {
  _id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  inputSchema?: any;
  headers?: Record<string, string>;
}

interface EmailConfig {
  resendApiKey: string;
  fromEmail: string;
  fromName?: string;
}

interface NotionConfig {
  apiKey: string;
}

interface SlackConfig {
  botToken: string;
  defaultChannel?: string;
}

interface DiscordConfig {
  botToken: string;
  defaultChannel?: string;
}

interface GCalConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface GDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface GSheetsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface ImageGenConfig {
  provider: "gemini" | "nano_banana";
  geminiApiKey?: string;
  nanoBananaApiKey?: string;
}

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface McpServerDeps {
  convexClient: AgentConvexClient;
  agentId: string;
  messageId?: string;
  conversationId?: string;
  enabledToolSets: string[];
  tabs: Tab[];
  customTools: CustomToolConfig[];
  emailConfig?: EmailConfig | null;
  notionConfig?: NotionConfig | null;
  slackConfig?: SlackConfig | null;
  discordConfig?: DiscordConfig | null;
  gcalConfig?: GCalConfig | null;
  gdriveConfig?: GDriveConfig | null;
  gsheetsConfig?: GSheetsConfig | null;
  imageGenConfig?: ImageGenConfig | null;
  imageGenModel?: string | null;
  gmailConfig?: GmailConfig | null;
  /** User's Google AI API key (for embedding-backed memory + RAG). Optional —
   * tools fall back to the server env-var key when absent. */
  googleApiKey?: string | null;
  onToolProgress?: (toolName: string, progress: string) => void;
  isDiscordConversation?: boolean;
}

function has(enabledToolSets: string[], name: string): boolean {
  return enabledToolSets.includes(name);
}

/**
 * Builds the AI SDK tool bundle dynamically based on the agent's
 * enabledToolSets, existing page tabs, and custom HTTP tools. Returns
 * `{ tools: Record<string, Tool> }` — spread directly into `streamText`.
 */
export function buildMcpServer(deps: McpServerDeps): { tools: Record<string, Tool<any, any>> } {
  const tools: Array<Record<string, Tool<any, any>>> = [];
  const enabled = deps.enabledToolSets;

  // Memory tools — gated by "memory"
  if (has(enabled, "memory")) {
    tools.push(
      ...createMemoryTools(deps.convexClient, deps.agentId, deps.googleApiKey)
    );
  }

  // Page tools — gated by "pages"
  if (has(enabled, "pages")) {
    tools.push(
      ...createPageTools(deps.convexClient, deps.agentId, deps.tabs)
    );
  }

  // Suggest replies & questions (always included — core UX, not a capability)
  tools.push(...createSuggestTools(deps.convexClient, deps.messageId ?? ""));

  // Explore capabilities (always included — lets agent introspect and recommend improvements)
  tools.push(...createExploreCapabilitiesTools(deps.enabledToolSets));

  // RAG / Knowledge Base tools — gated by "rag"
  if (has(enabled, "rag")) {
    tools.push(
      ...createRagTools(deps.convexClient, deps.agentId, deps.googleApiKey)
    );
  }

  // Email tools — gated by "email"
  if (has(enabled, "email") && deps.emailConfig) {
    tools.push(
      ...createEmailTools(deps.convexClient, deps.agentId, deps.emailConfig)
    );
  }

  // Custom HTTP tools — gated by "custom_http_tools"
  if (has(enabled, "custom_http_tools") && deps.customTools.length > 0) {
    tools.push(...createCustomHttpTools(deps.customTools));
  }

  // Scheduled Actions — gated by "schedules"
  if (has(enabled, "schedules")) {
    tools.push(...createScheduleTools(deps.convexClient, deps.agentId));
  }

  // Automations — gated by "automations"
  if (has(enabled, "automations")) {
    tools.push(...createAutomationTools(deps.convexClient, deps.agentId));
  }

  // Time Tracking — gated by "time_tracking"
  if (has(enabled, "time_tracking")) {
    tools.push(
      ...createTimeTrackingTools(deps.convexClient, deps.agentId, deps.tabs)
    );
  }

  // Timers / Delayed Actions — gated by "timers"
  if (has(enabled, "timers")) {
    tools.push(
      ...createTimerTools(deps.convexClient, deps.agentId, deps.conversationId)
    );
  }

  // Webhooks (outgoing + event bus) — gated by "webhooks"
  if (has(enabled, "webhooks")) {
    tools.push(
      ...createWebhookManagementTools(deps.convexClient, deps.agentId)
    );
  }

  // Inter-Agent Messaging — gated by "agent_messages"
  if (has(enabled, "agent_messages")) {
    tools.push(
      ...createAgentMessageTools(deps.convexClient, deps.agentId)
    );
  }

  // Notion — gated by "notion"
  if (has(enabled, "notion") && deps.notionConfig) {
    tools.push(
      ...createNotionTools(deps.convexClient, deps.agentId, deps.notionConfig)
    );
  }

  // Slack — gated by "slack"
  if (has(enabled, "slack") && deps.slackConfig) {
    tools.push(
      ...createSlackTools(deps.convexClient, deps.agentId, deps.slackConfig)
    );
  }

  // Discord — gated by "discord"
  if (has(enabled, "discord") && deps.discordConfig) {
    tools.push(
      ...createDiscordTools(deps.convexClient, deps.agentId, deps.discordConfig)
    );
  }

  // Discord channel history recall — available when conversation is Discord-sourced
  if (deps.isDiscordConversation && deps.conversationId) {
    const convexClient = deps.convexClient;
    const conversationId = deps.conversationId;
    tools.push(
      tool(
        "recall_channel_history",
        "Load older messages from this channel (Discord or Slack) beyond the 24-hour context window. Use this when the user references something from a previous day or you need deeper conversation history.",
        {
          hours_ago: z.number().default(48).describe("How many hours back to look (from now). Default 48."),
          limit: z.number().default(50).describe("Max number of messages to retrieve. Default 50."),
        },
        async (input) => {
          const beforeTimestamp = Date.now() - (input.hours_ago * 60 * 60 * 1000);
          const messages = await convexClient.listOlderMessages(conversationId, beforeTimestamp, input.limit);
          if (!messages || messages.length === 0) {
            return {
              content: [{ type: "text" as const, text: "No older messages found in this time range." }],
            };
          }
          const formatted = messages.map((m: any) =>
            `[${new Date(m._creationTime).toLocaleString()}] ${m.role}: ${m.content?.slice(0, 500) ?? "(empty)"}`
          ).join("\n\n");
          return {
            content: [{ type: "text" as const, text: `Found ${messages.length} older messages:\n\n${formatted}` }],
          };
        }
      )
    );
  }

  // Google Calendar — gated by "google_calendar"
  if (has(enabled, "google_calendar") && deps.gcalConfig) {
    tools.push(
      ...createGCalTools(deps.convexClient, deps.agentId, deps.gcalConfig)
    );
  }

  // Google Drive — gated by "google_drive"
  if (has(enabled, "google_drive") && deps.gdriveConfig) {
    tools.push(
      ...createGDriveTools(deps.convexClient, deps.agentId, deps.gdriveConfig)
    );
  }

  // Google Sheets — gated by "google_sheets"
  if (has(enabled, "google_sheets") && deps.gsheetsConfig) {
    tools.push(
      ...createGSheetsTools(deps.convexClient, deps.agentId, deps.gsheetsConfig)
    );
  }

  // Gmail — gated by "gmail"
  if (has(enabled, "gmail") && deps.gmailConfig) {
    tools.push(
      ...createGmailTools(deps.convexClient, deps.agentId, deps.gmailConfig)
    );
  }

  // Image Generation — gated by "image_generation"
  if (has(enabled, "image_generation")) {
    tools.push(
      ...createImageGenTools(
        deps.convexClient,
        deps.agentId,
        deps.imageGenConfig ?? { provider: "gemini" as const },
        deps.imageGenModel ?? undefined,
        deps.onToolProgress
      )
    );
  }

  return createSdkMcpServer({
    name: "agent-tools",
    version: "1.0.0",
    tools,
  });
}

