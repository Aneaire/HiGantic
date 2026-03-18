# Adding Features

Checklists for common extension points.

## Adding a New Automation Action Type

1. Add the `case` in `processAutomations()` in `server.ts`
2. Add the `case` in `executeScheduledActions()` if it should be schedulable
3. Add the `case` in `executeTimers()` if it should be timer-triggerable
4. Update automation creation UI if user-facing

## Adding a New Event Type

1. Add `convexClient.emitEvent()` call where the event originates
2. Document the event name and payload shape in `docs/reference/events.md`
3. Events automatically become available as automation triggers — no extra wiring needed

## System Prompt Construction (`system-prompt.ts`)

The system prompt is **dynamically assembled** — each section only appears if its tool set is enabled:

| Section | Gate | Purpose |
|---|---|---|
| Memories | `memory` | Injects stored memories so agent has context |
| Pages | `pages` | Lists existing pages (tasks, notes, spreadsheets) |
| Knowledge Base | `rag` | Lists uploaded documents, tells agent to use `search_documents` |
| Custom Tools | `custom_http_tools` | Lists configured HTTP tool names |
| Schedules | `schedules` | Shows active cron jobs and intervals |
| Automations | `automations` | Shows active event→action rules |
| Capabilities list | (all enabled) | Bullet list of what the agent can do |
| Autonomy Guidelines | `pages` | Tells agent to proactively create pages |
| Scheduling Guidelines | `schedules` or `timers` | When/how to use scheduling tools |
| Automation Guidelines | `automations` | When/how to create automations |
| Inter-Agent Guidelines | `agent_messages` | How to delegate to other agents |
| Image Gen Guidelines | `image_generation` | When/how to generate images |
| Custom Tool Guidance | `custom_http_tools` | Tells agent to suggest tool configs when it can't do something |

## General Rules / Gotchas

- **Every Convex module** needs both server-facing (`requireServerAuth`) and user-facing (`requireAuthUser`) endpoints
- **Tool names** in `buildAllowedTools()` must match exactly: `mcp__agent-tools__<tool_name>`
- **`web_search`** is special — it uses native Claude SDK tools (`WebSearch`, `WebFetch`), not MCP
- **`suggest_replies` and `ask_questions`** are always registered (core UX), never gated by `enabledToolSets`
- **Custom HTTP tools** are dynamic — one MCP tool per user-configured endpoint, named `custom_<name>`
- **Page tools** are partially dynamic — base tools always registered, per-tab tools added based on existing tabs
- **Gemini tools** are registered separately in `gemini-tools.ts` (native function declarations, not MCP)
- **Allowed tools**: Claude SDK requires an explicit allowlist. `buildAllowedTools()` mirrors the MCP registration — every tool registered in `buildMcpServer()` must also be listed in `buildAllowedTools()` with its `mcp__agent-tools__<name>` prefix.

## Dispatch System (`dispatch.ts` + `server.ts`)

Primary dispatch is **push-based** via Convex scheduler. When jobs/timers/schedules are created, a Convex action immediately notifies the agent server via HTTP endpoints (`/dispatch/job`, `/dispatch/timer`, `/dispatch/schedule`).

A **fallback poll** runs every 30s to catch missed dispatches. The agent server's `executeScheduleAction()` and `executeTimerAction()` functions handle the actual execution — used by both dispatch endpoints and fallback polls.

Both schedules and timers can execute: `send_email`, `create_task`, `fire_webhook`, `run_prompt`, `send_message`.
