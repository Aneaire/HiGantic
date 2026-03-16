import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import type { AgentConvexClient } from "./convex-client.js";
import { createMemoryTools } from "./tools/memory-tools.js";
import { createPageTools, getPageToolNames } from "./tools/page-tools.js";
import { createCustomHttpTools } from "./tools/custom-http-tools.js";
import { createSuggestTools } from "./tools/suggest-tools.js";

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

interface McpServerDeps {
  convexClient: AgentConvexClient;
  agentId: string;
  messageId: string;
  enabledToolSets: string[];
  tabs: Tab[];
  customTools: CustomToolConfig[];
}

/**
 * Builds an MCP server with tools dynamically loaded based on the agent's
 * enabledToolSets, existing page tabs, and custom HTTP tools.
 */
export function buildMcpServer(deps: McpServerDeps) {
  const tools: any[] = [];

  // Memory tools (always included)
  tools.push(...createMemoryTools(deps.convexClient, deps.agentId));

  // Page tools (always includes create_page; other tools based on existing tabs)
  tools.push(
    ...createPageTools(deps.convexClient, deps.agentId, deps.tabs)
  );

  // Suggest replies tool (always included)
  tools.push(...createSuggestTools(deps.convexClient, deps.messageId));

  // Custom HTTP tools
  if (deps.customTools.length > 0) {
    tools.push(...createCustomHttpTools(deps.customTools));
  }

  return createSdkMcpServer({
    name: "agent-tools",
    version: "1.0.0",
    tools,
  });
}

/**
 * Returns the list of allowed tool names for the Claude SDK.
 */
export function buildAllowedTools(
  enabledToolSets: string[],
  tabs: Tab[],
  customTools: CustomToolConfig[] = []
): string[] {
  const allowed: string[] = [];

  // Built-in SDK tools (always available)
  allowed.push("WebSearch", "WebFetch");

  // Memory tools (always)
  allowed.push(
    "mcp__agent-tools__store_memory",
    "mcp__agent-tools__recall_memory",
    "mcp__agent-tools__search_memories"
  );

  // Page tools (always includes create_page + dynamic per tab type)
  allowed.push(...getPageToolNames(tabs));

  // Suggest replies & questions (always)
  allowed.push(
    "mcp__agent-tools__suggest_replies",
    "mcp__agent-tools__ask_questions"
  );

  // Custom HTTP tools
  for (const ct of customTools) {
    allowed.push(`mcp__agent-tools__custom_${ct.name}`);
  }

  return allowed;
}
