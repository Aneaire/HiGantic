import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { CreatorConvexClient } from "../creator-convex-client.js";

export function createCreatorTools(
  convexClient: CreatorConvexClient,
  agentId: string
) {
  const updateConfig = tool(
    "update_agent_config",
    `Update the agent's configuration. Call this whenever the user decides on a name, description, system prompt, model, or tools. You can update one or multiple fields at once. Always call this to save progress as the conversation evolves.`,
    {
      name: z
        .string()
        .optional()
        .describe("The agent's display name"),
      description: z
        .string()
        .optional()
        .describe("A short description of what the agent does"),
      systemPrompt: z
        .string()
        .optional()
        .describe(
          "The full system prompt that defines the agent's personality, capabilities, and behavior"
        ),
      model: z
        .string()
        .optional()
        .describe(
          'The Claude model to use. Options: "claude-sonnet-4-6" (fast, good for most tasks), "claude-opus-4-6" (most capable), "claude-haiku-4-5-20251001" (fastest, cheapest)'
        ),
      enabledToolSets: z
        .array(z.string())
        .optional()
        .describe(
          'Tool sets to enable. Currently available: ["memory"] (always included). More coming soon.'
        ),
    },
    async (input) => {
      await convexClient.updateAgentConfig(agentId, input);
      const fields = Object.entries(input)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k);
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated agent config: ${fields.join(", ")}`,
          },
        ],
      };
    }
  );

  const previewConfig = tool(
    "preview_config",
    "Get the current agent configuration. Use this to review what's been set so far before finalizing.",
    {},
    async () => {
      const config = await convexClient.getAgentConfig(agentId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );

  const listToolSets = tool(
    "list_tool_sets",
    "List all available tool sets and capabilities that can be enabled for the agent.",
    {},
    async () => {
      const toolSets = [
        {
          name: "memory",
          description: "Store and recall information across conversations. Always included.",
          alwaysEnabled: true,
        },
        {
          name: "web_search",
          description: "Search the web and fetch web pages for current information. Always included.",
          alwaysEnabled: true,
        },
        {
          name: "pages",
          description: "Create and manage pages: Tasks (kanban boards), Notes (markdown), Spreadsheets (data tables with dynamic columns), Markdown pages, Data Tables. The agent can autonomously create pages and manage data. Always included.",
          alwaysEnabled: true,
        },
        {
          name: "custom_http_tools",
          description: "User-defined HTTP API tools. Users can add custom endpoints in Settings that the agent can call. Configured per-agent.",
          alwaysEnabled: true,
        },
        {
          name: "rest_api",
          description: "Expose the agent as a REST API. Users can create API endpoints that external systems call, with the agent processing requests. Pro+ plan only.",
          requiresPlan: "pro",
        },
        {
          name: "postgres",
          description: "Connect to external PostgreSQL databases. The agent can run read-only queries. Pro+ plan only.",
          requiresPlan: "pro",
        },
      ];
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(toolSets, null, 2),
          },
        ],
      };
    }
  );

  const finalizeAgent = tool(
    "finalize_agent",
    "Finalize and activate the agent. Call this ONLY when the user has confirmed they are happy with the configuration. This sets the agent to active and completes the creation process.",
    {},
    async () => {
      // Verify config is complete
      const config = await convexClient.getAgentConfig(agentId);
      if (!config) {
        return {
          content: [
            { type: "text" as const, text: "Error: Agent not found." },
          ],
        };
      }
      if (config.name === "New Agent") {
        return {
          content: [
            {
              type: "text" as const,
              text: "The agent still has the default name. Please ask the user for a name first.",
            },
          ],
        };
      }

      await convexClient.finalizeAgent(agentId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Agent "${config.name}" has been created and activated! The user can now find it on their dashboard.`,
          },
        ],
      };
    }
  );

  return [updateConfig, previewConfig, listToolSets, finalizeAgent];
}
