# Architecture

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Web UI     │────▶│   Convex     │◀────│ Agent Server │
│ (React)      │     │ (Backend DB) │     │ (Hono + SDK) │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                    ┌───────────┼───────────┐
                                    │           │           │
                              ┌─────▼──┐  ┌────▼───┐  ┌───▼────┐
                              │  Job   │  │ Cron   │  │ Timer  │
                              │ Poller │  │ Poller │  │ Poller │
                              └────────┘  └────────┘  └────────┘
```

## Packages

### `packages/web` — Frontend
- React 19 + React Router
- Tailwind CSS + Lucide icons
- Clerk authentication
- Convex React client for real-time data

### `packages/shared` — Backend
- Convex serverless functions (queries, mutations, actions)
- Database schema with 20+ tables
- Server-to-server auth via `requireServerAuth()`
- User auth via Clerk + `requireAuthUser()`

### `packages/agent` — Runtime
- Hono HTTP server
- Vercel AI SDK for agentic execution (Gemini, OpenAI, OpenRouter)
- MCP tool server with dynamic registration
- Job polling, cron polling, timer polling
- Webhook handling + automation processing

## Data Flow

### Chat Message Flow

```
1. User types message in Web UI
2. Web UI creates message + agentJob in Convex
3. Agent server polls and claims the job
4. Server loads: agent config, conversation history, tools, memories, context
5. Server builds system prompt + MCP tool server
6. Vercel AI SDK runs with tools available
7. Agent streams response → debounced mutations to Convex
8. Web UI receives real-time updates via Convex subscriptions
9. Job marked as done
```

### Event Bus Flow

```
1. Tool action occurs (create task, send email, etc.)
2. Event emitted to agentEvents table
3. Server checks for matching automations
4. Matching automation actions execute in order
5. Each action may emit more events (cascading)
6. Outgoing webhooks are also fired for matching events
```

### Scheduling Flow

```
1. Agent or user creates a scheduled action
2. Server polls scheduledActions every 10 seconds
3. Due actions are claimed and executed
4. Run is logged in scheduledActionRuns
5. Next run time is computed
6. schedule.fired event emitted
7. Matching automations trigger
```

## Tool Architecture

Tools are registered as MCP tools and threaded into the Vercel AI SDK's `streamText({ tools })` call:

```
buildMcpServer()
  ├── Memory tools (if enabled)
  ├── Page tools (if enabled, dynamic based on existing pages)
  ├── Suggest tools (always on)
  ├── RAG tools (if enabled)
  ├── Email tools (if enabled + configured)
  ├── Custom HTTP tools (if enabled + tools exist)
  ├── Schedule tools (if enabled)
  ├── Automation tools (if enabled)
  ├── Timer tools (if enabled)
  ├── Webhook tools (if enabled)
  ├── Agent message tools (if enabled)
  ├── Notion tools (if enabled + configured)
  ├── Slack tools (if enabled + configured)
  ├── Google Calendar tools (if enabled + configured)
  ├── Google Drive tools (if enabled + configured)
  ├── Google Sheets tools (if enabled + configured)
  └── Image Generation tools (if enabled + configured)
```

For Gemini models, tools are registered separately via `buildGeminiTools()` in `gemini-tools.ts` using native function declarations instead of MCP.

Tools are also gated at the SDK level via `buildAllowedTools()`, which returns the exact list of tool names the AI SDK should accept.

## Database Tables

### Core
- `users` — Clerk-authed users with plans
- `agents` — Agent configs (name, prompt, model, enabled tools)
- `conversations` — Chat sessions
- `messages` — Chat messages with tool call tracking
- `agentJobs` — Job queue for agent execution

### Tool Data
- `memories` — Persistent agent memory (full-text search)
- `documents` / `documentChunks` — RAG document storage + vector embeddings
- `agentToolConfigs` — Per-tool configuration (e.g., email settings)
- `customTools` — User-defined HTTP tool configs

### Pages
- `sidebarTabs` — Page definitions (type, label, config)
- `tabTasks` — Task board data
- `tabNotes` — Note content
- `tabSpreadsheetColumns` / `tabSpreadsheetRows` — Spreadsheet data
- `tabApiEndpoints` — REST API endpoint definitions
- `agentDatabases` — PostgreSQL connections
- `agentApiKeys` — API key management

### Scheduling & Events
- `scheduledActions` — Cron/interval definitions
- `scheduledActionRuns` — Execution history
- `agentEvents` — Event bus log
- `automations` — Event → Action rules
- `agentTimers` — Delayed action queue

### Communication
- `webhooks` — Incoming/outgoing webhook configs
- `emailLogs` — Sent/failed email records
- `agentMessages` — Inter-agent message queue

### Assets
- `assetFolders` — Folder hierarchy for organizing assets
- `assets` — Generated images and uploaded files with metadata

### Creator
- `creatorSessions` — Agent creation/editing sessions

## Dispatch System

Primary dispatch is **push-based** via Convex's built-in scheduler (`ctx.scheduler`). When a job, timer, or schedule is created, a Convex action is scheduled that immediately notifies the agent server via HTTP.

| Trigger | Dispatch Method | Latency |
|---------|----------------|---------|
| Job created | `ctx.scheduler.runAfter(0, ...)` → `POST /dispatch/job` | Sub-second |
| Timer created | `ctx.scheduler.runAfter(delayMs, ...)` → `POST /dispatch/timer` | Exact time |
| Schedule due | `ctx.scheduler.runAfter(delayMs, ...)` → `POST /dispatch/schedule` | Exact time |

A **fallback poll** runs every 30s (configurable via `POLL_INTERVAL_MS`) to catch any missed dispatches. This is a safety net, not the primary mechanism.

The dispatch module lives in `packages/shared/convex/dispatch.ts` with three internal actions: `notifyJobCreated`, `fireTimer`, `fireSchedule`.

## Auth Model

Two auth paths:

1. **User-facing** (Web UI → Convex): Clerk JWT via `requireAuthUser(ctx)`
2. **Server-facing** (Agent Server → Convex): Shared token via `requireServerAuth(ctx, token)`

The agent server uses HTTP client to call Convex functions with `serverToken` authentication.
