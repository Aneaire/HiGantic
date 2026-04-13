import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  TOOL_SET_REGISTRY,
  type ToolSetCategory,
} from "@agent-maker/shared/src/tool-set-registry";

/**
 * Synergy map: for each tool set, which other tool sets pair well with it and why.
 * Used to generate contextual recommendations based on what's already enabled.
 */
const SYNERGY_MAP: Record<string, Array<{ key: string; reason: string }>> = {
  // Core synergies
  memory: [
    { key: "automations", reason: "Automations can store_memory on events, building knowledge automatically" },
    { key: "rag", reason: "Memory + Knowledge Base gives the agent both short-term recall and deep document search" },
  ],
  pages: [
    { key: "automations", reason: "Automations can create tasks/notes when events fire — hands-free tracking" },
    { key: "schedules", reason: "Scheduled actions can populate spreadsheets or create recurring tasks" },
    { key: "rag", reason: "Upload documents and reference them while building pages" },
  ],
  web_search: [
    { key: "pages", reason: "Research from the web can be saved into notes or spreadsheets" },
    { key: "schedules", reason: "Schedule recurring web searches for monitoring or reporting" },
  ],
  rag: [
    { key: "memory", reason: "Combine document search with conversational memory for richer context" },
    { key: "pages", reason: "Extract data from documents into structured spreadsheets or notes" },
  ],

  // Automation synergies
  schedules: [
    { key: "automations", reason: "Schedules trigger actions on time, automations trigger on events — complete workflow coverage" },
    { key: "timers", reason: "Schedules handle recurring work, timers handle one-off delays — different cadences" },
    { key: "email", reason: "Schedule recurring email reports or digests" },
    { key: "slack", reason: "Post scheduled updates or standup prompts to Slack" },
    { key: "gmail", reason: "Schedule recurring inbox checks or email summaries" },
  ],
  automations: [
    { key: "schedules", reason: "Pair event-driven automations with time-driven schedules for full coverage" },
    { key: "timers", reason: "Chain automations with delayed follow-ups: event fires → wait → act" },
    { key: "webhooks", reason: "Automations can fire webhooks to external services on any event" },
    { key: "agent_messages", reason: "Automations can trigger other agents — build multi-agent pipelines" },
  ],
  timers: [
    { key: "automations", reason: "Timers add delay capability to automation workflows" },
    { key: "schedules", reason: "Timers for one-off delays, schedules for recurring — complementary" },
  ],
  webhooks: [
    { key: "automations", reason: "Fire webhooks automatically when events occur" },
    { key: "schedules", reason: "Fire webhooks on a schedule for heartbeat or sync patterns" },
  ],
  agent_messages: [
    { key: "automations", reason: "Route events to specialized agents automatically" },
    { key: "schedules", reason: "Coordinate multi-agent workflows on a schedule" },
  ],

  // Integration synergies
  email: [
    { key: "automations", reason: "Send emails automatically when events fire (task done → email summary)" },
    { key: "schedules", reason: "Send recurring reports or digest emails" },
    { key: "timers", reason: "Send follow-up emails after a delay" },
  ],
  gmail: [
    { key: "automations", reason: "React to events by sending Gmail replies or creating drafts" },
    { key: "schedules", reason: "Check inbox on a schedule, send recurring emails" },
    { key: "google_calendar", reason: "Cross-reference emails with calendar events for scheduling context" },
    { key: "google_drive", reason: "Reference Drive files in email threads" },
  ],
  slack: [
    { key: "automations", reason: "Post to Slack channels automatically when events occur" },
    { key: "schedules", reason: "Post standup prompts, daily summaries, or recurring updates" },
    { key: "discord", reason: "Bridge messages between Slack and Discord" },
    { key: "timers", reason: "Send delayed follow-ups or reminders in Slack" },
  ],
  discord: [
    { key: "automations", reason: "Post Discord notifications when events fire" },
    { key: "schedules", reason: "Post recurring updates or reminders to Discord" },
    { key: "slack", reason: "Bridge messages between Discord and Slack" },
  ],
  notion: [
    { key: "automations", reason: "Create Notion pages automatically when events occur" },
    { key: "schedules", reason: "Sync data to Notion on a schedule" },
    { key: "pages", reason: "Use built-in pages for quick data + Notion for long-term knowledge management" },
  ],
  google_calendar: [
    { key: "gmail", reason: "Schedule meetings from email context, check availability before replying" },
    { key: "slack", reason: "Post calendar reminders or meeting summaries to Slack" },
    { key: "schedules", reason: "Trigger actions based on upcoming calendar events" },
  ],
  google_drive: [
    { key: "google_sheets", reason: "Drive files + Sheets data — full Google workspace integration" },
    { key: "gmail", reason: "Attach or reference Drive files in emails" },
    { key: "rag", reason: "Upload Drive documents to the Knowledge Base for semantic search" },
  ],
  google_sheets: [
    { key: "google_drive", reason: "Manage spreadsheet files alongside other Drive content" },
    { key: "automations", reason: "Log events to Google Sheets automatically" },
    { key: "schedules", reason: "Pull or push spreadsheet data on a schedule" },
    { key: "pages", reason: "Built-in spreadsheets for agent data + Google Sheets for shared team data" },
  ],
  image_generation: [
    { key: "pages", reason: "Generate images and embed them in notes or markdown pages" },
    { key: "slack", reason: "Generate and share images directly in Slack channels" },
    { key: "discord", reason: "Generate and share images in Discord" },
  ],
};

interface ToolSetView {
  key: string;
  label: string;
  description: string;
  category: ToolSetCategory;
  subcategory?: string;
  requiresCredential: boolean;
  requiresPlan?: string;
}

interface SynergyRecommendation {
  key: string;
  label: string;
  description: string;
  reason: string;
  requiresCredential: boolean;
  requiresPlan?: string;
  synergyWith: string[];
}

export function createExploreCapabilitiesTools(enabledToolSets: string[]) {
  const exploreCapabilities = tool(
    "explore_capabilities",
    `Inspect what this agent can and cannot do. Returns a structured view of:
- Currently enabled capabilities (grouped by category)
- Disabled capabilities that could be enabled (grouped by category)
- Synergy recommendations: which disabled capabilities would pair best with what's already enabled, and why

Use this tool when:
- The user asks "what can you do?", "how can we improve this agent?", "what features are available?"
- The user's request hints at a capability that isn't enabled
- You want to proactively suggest improvements based on the user's workflow
- You're assessing gaps in the agent's current setup

The recommendations are ranked by how many synergies they have with the current enabled set — the most impactful additions appear first.`,
    {
      focus: z
        .enum(["all", "recommendations", "enabled", "disabled"])
        .default("all")
        .describe(
          "What to return: 'all' for full assessment, 'recommendations' for just synergy picks, 'enabled' for current capabilities, 'disabled' for available additions"
        ),
      category: z
        .enum(["core", "automation", "integration"])
        .optional()
        .describe("Filter to a specific category. Omit for all categories."),
    },
    async (input) => {
      const enabled = new Set(enabledToolSets);

      // Build enabled/disabled views
      const enabledSets: ToolSetView[] = [];
      const disabledSets: ToolSetView[] = [];

      for (const def of Object.values(TOOL_SET_REGISTRY)) {
        if (input.category && def.category !== input.category) continue;

        const view: ToolSetView = {
          key: def.key,
          label: def.label,
          description: def.description,
          category: def.category,
          subcategory: def.subcategory,
          requiresCredential: def.requiresCredential,
          ...(def.requiresPlan ? { requiresPlan: def.requiresPlan } : {}),
        };

        if (enabled.has(def.key)) {
          enabledSets.push(view);
        } else {
          disabledSets.push(view);
        }
      }

      // Build synergy recommendations from disabled sets
      const recommendations: SynergyRecommendation[] = [];
      const disabledKeys = new Set(disabledSets.map((d) => d.key));

      for (const disabledSet of disabledSets) {
        const synergies: { enabledKey: string; reason: string }[] = [];

        // Check: which enabled sets recommend this disabled set?
        for (const enabledKey of enabled) {
          const mappings = SYNERGY_MAP[enabledKey] ?? [];
          const match = mappings.find((m) => m.key === disabledSet.key);
          if (match) {
            synergies.push({ enabledKey, reason: match.reason });
          }
        }

        // Also check: does this disabled set recommend any enabled sets? (reverse lookup)
        const reverseMappings = SYNERGY_MAP[disabledSet.key] ?? [];
        for (const rm of reverseMappings) {
          if (
            enabled.has(rm.key) &&
            !synergies.some((s) => s.enabledKey === rm.key)
          ) {
            synergies.push({ enabledKey: rm.key, reason: rm.reason });
          }
        }

        if (synergies.length > 0) {
          recommendations.push({
            key: disabledSet.key,
            label: disabledSet.label,
            description: disabledSet.description,
            reason: synergies.map((s) => s.reason).join("; "),
            requiresCredential: disabledSet.requiresCredential,
            ...(disabledSet.requiresPlan
              ? { requiresPlan: disabledSet.requiresPlan }
              : {}),
            synergyWith: synergies.map((s) => s.enabledKey),
          });
        }
      }

      // Sort recommendations by synergy count (most impactful first)
      recommendations.sort((a, b) => b.synergyWith.length - a.synergyWith.length);

      // Build response based on focus
      const result: Record<string, any> = {};

      if (input.focus === "all" || input.focus === "enabled") {
        const grouped: Record<string, ToolSetView[]> = {};
        for (const s of enabledSets) {
          const cat = s.category;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(s);
        }
        result.enabled = {
          count: enabledSets.length,
          byCategory: grouped,
        };
      }

      if (input.focus === "all" || input.focus === "disabled") {
        const grouped: Record<string, ToolSetView[]> = {};
        for (const s of disabledSets) {
          const cat = s.category;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(s);
        }
        result.disabled = {
          count: disabledSets.length,
          byCategory: grouped,
        };
      }

      if (input.focus === "all" || input.focus === "recommendations") {
        result.recommendations = {
          count: recommendations.length,
          items: recommendations,
        };
      }

      result.summary = {
        totalEnabled: enabledSets.length,
        totalDisabled: disabledSets.length,
        totalAvailable: enabledSets.length + disabledSets.length,
        topRecommendation:
          recommendations.length > 0
            ? `Enable "${recommendations[0].label}" — synergizes with ${recommendations[0].synergyWith.length} of your current capabilities`
            : "All synergistic capabilities are already enabled",
        enablePath:
          "User can enable capabilities in the Settings page under Tool Sets",
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return [exploreCapabilities];
}
