# Agent Maker — TODO

## Phase 1: Foundation ✅
- [x] Bun monorepo setup (workspaces, tsconfig, 3 packages)
- [x] Convex schema (all 10 tables deployed)
- [x] Convex functions: users, agents, conversations, messages, memories, agentJobs
- [x] Auth: Clerk + Convex JWT integration (custom useAuth with template: "convex")
- [x] Auto-create user record on first mutation (getOrCreateAuthUser)
- [x] Rate limiting in messages.send (per-plan concurrent job limits)
- [x] React Router 7 + Tailwind v4 frontend
- [x] Dashboard: agent grid, landing page, create dialog
- [x] Agent detail page with config display
- [x] End-to-end: sign in → create agent → view agent → delete agent

## Phase 2: Core Agent Runtime ✅
- [x] `packages/agent/src/convex-client.ts` — Convex HTTP client for agent process
- [x] `packages/agent/src/system-prompt.ts` — build prompt from agent config + memories
- [x] `packages/agent/src/mcp-server.ts` — dynamic MCP tool loading per agent
- [x] `packages/agent/src/tools/memory-tools.ts` — store/recall/search scoped to agentId
- [x] `packages/agent/src/run-agent.ts` — load config, run Claude SDK, stream back
- [x] `packages/agent/src/process-manager.ts` — bounded pool + queue + timeout + onComplete callback
- [x] `packages/agent/src/server.ts` — Hono HTTP server (trigger endpoint + job polling)
- [x] `packages/shared/convex/agentApi.ts` — server-auth mutations for agent process
- [x] `packages/shared/convex/serverAuth.ts` — shared secret token validation
- [x] `packages/agent/src/index.ts` — public exports
- [x] Wire up: web sends message → job created → agent server picks up → streams response

## Phase 3: Chat Interface ✅
- [x] `AgentLayout.tsx` (routes/agents.$agentId.tsx) — layout with Outlet + sidebar
- [x] `AgentSidebar.tsx` — conversations list, new chat, memories link, settings link
- [x] `ChatMessageList.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`
- [x] `routes/agents.$agentId.chat.$conversationId.tsx` — full chat page
- [x] `routes/agents.$agentId.index.tsx` — agent overview with start chat button
- [x] Conversation list sidebar scoped to agent (real-time via Convex useQuery)
- [x] Real-time streaming via Convex subscriptions (message status + content updates)
- [x] Memories page (`routes/agents.$agentId.memories.tsx`) — list, search, delete
- [x] Nested routes: `/agents/:agentId`, `/agents/:agentId/chat/:conversationId`, `/agents/:agentId/memories`

## Phase 4: Agent Creator ✅
- [x] Creator system prompt (guides through name, personality, prompt, model, review)
- [x] Creator MCP tools: `update_agent_config`, `preview_config`, `list_tool_sets`, `finalize_agent`
- [x] `run-creator.ts` + `creator-convex-client.ts` — creator agent runtime
- [x] `tools/creator-tools.ts` — MCP tools for building agent config
- [x] `creatorSessions.ts` — start, get, getByConversation, abandon (with draft cleanup)
- [x] `creatorApi.ts` — server-auth: getAgentConfig, updateAgentConfig, finalizeAgent
- [x] `routes/agents.new.tsx` — split view: chat left + live config preview right
- [x] Server detects draft agents and routes to `runCreator()` instead of `runAgent()`
- [x] Dashboard hides draft agents, links "New Agent" to `/agents/new`
- [x] Auto-redirect to agent page on finalization

## Phase 5: Agent Pages (Dynamic Sidebar Tabs) ← NEXT

Each agent can have extra pages beyond Chat and Memories. Users can add pages
from a set of scoped page types. Pages must stay within the "assistant" scope
— no arbitrary code execution, no raw HTML injection.

### 5a: Schema & CRUD ✅
- [x] Updated `sidebarTabs` schema — types: `tasks`, `notes`, `spreadsheet`, `markdown`, `data_table`, `postgres`
- [x] `sidebarTabs` Convex CRUD: `list`, `get`, `getBySlug`, `create`, `update`, `remove`, `reorder`
- [x] Backing tables deployed:
  - `tabTasks` — with `by_tab`, `by_agent`, `by_tab_status` indexes + search
  - `tabNotes` — with `by_tab`, `by_agent` indexes + full-text search
  - `tabSpreadsheetColumns` + `tabSpreadsheetRows` — with limits (100 cols, 10k rows)
  - `agentDatabases` — for postgres connections
- [x] `tabTasks.ts` — list, listByStatus, create, update, remove
- [x] `tabNotes.ts` — list, get, search, create, update, remove
- [x] `tabSpreadsheet.ts` — listColumns, addColumn, removeColumn, listRows, addRow, updateRow, removeRow

### 5b: Page Type Implementations ✅
- [x] **Memories** (default) — Always present in sidebar, hardcoded link to memories page
- [x] **Tasks** — Kanban board (3 columns), inline create, click to move between columns, priority badges, delete
- [x] **Notes** — Split view: note list + editor, full-text search, create/edit/delete
- [x] **Spreadsheet** — Dynamic columns (text/number/date/checkbox), add/edit/delete rows, column management
- [x] **Markdown** (read-only) — Renders content from tab config, agent-writable
- [x] **Data Table** — Shares MarkdownPage renderer for now

### 5c: Frontend ✅
- [x] `routes/agents.$agentId.tab.$tabId.tsx` — dynamic tab route with type-based renderer dispatch
- [x] `pages/TasksPage.tsx`, `NotesPage.tsx`, `SpreadsheetPage.tsx`, `MarkdownPage.tsx`
- [x] "Add Page" dropdown in sidebar — pick from available types
- [x] Sidebar shows dynamic tabs from `sidebarTabs` query with type-specific icons
- [x] Active tab highlighting in sidebar
- [ ] Reorder tabs via drag-and-drop (stretch goal)
- [ ] Delete tab from sidebar (stretch goal)

### 5d: Agent Tools for Pages ✅
- [x] `tools/page-tools.ts` — dynamically creates MCP tools based on existing tabs:
  - `create_task`, `update_task`, `list_tasks` — for Tasks pages
  - `save_note`, `update_note`, `list_notes` — for Notes pages
  - `add_spreadsheet_row`, `update_spreadsheet_row`, `list_spreadsheet_data` — for Spreadsheet
  - `write_page_content` — for Markdown / Data Table pages
- [x] Tools dynamically registered based on which page types exist (loaded via `listTabs`)
- [x] Server-auth Convex endpoints in `agentApi.ts` for all page operations
- [x] `convex-client.ts` extended with all page query/mutation methods
- [x] `mcp-server.ts` + `run-agent.ts` updated to load tabs and build tools dynamically
- [ ] Server-auth Convex endpoints (`agentApi`) for all page tool operations

### 5e: Scope & Safety Rules ✅
- [x] Page types whitelisted via `v.union()` in schema — no custom renderers
- [x] No raw HTML rendering — all content in `<pre>`, `<textarea>`, or text inputs
- [x] Ownership verification on all agentApi page mutations (`requireTabOwnership`)
- [x] Size limits enforced:
  - Title: 500 chars, Description: 5,000 chars
  - Note content: 100KB, Spreadsheet cell data: 50KB, Tab config: 200KB
  - Tasks per tab: 500, Notes per tab: 200
  - Spreadsheet: 100 columns, 10,000 rows
- [x] Plan-gated page creation in `sidebarTabs.create`:
  - Free: tasks, notes, markdown, data_table (max 5 pages)
  - Pro: + spreadsheet, postgres (max 20 pages, 1 DB connection)
  - Enterprise: all types (max 50 pages, 5 DB connections)
- [x] `PLAN_LIMITS` updated with `allowedPageTypes`, `maxPagesPerAgent`, `maxPostgresConnections`
- [x] `TabType` fixed to match actual schema types

### 5f: PostgreSQL Add-on (Premium Feature) ✅
- [x] `agentDatabases.ts` — CRUD: getByTab, connect, disconnect, updateStatus
- [x] Plan gating: free plan blocked, Pro gets 1 connection, Enterprise gets 5
- [x] `PostgresPage.tsx` — connection setup UI (display name + connection string)
  - Connection string masked in UI after setup
  - Disconnect button
  - Status display (connected/disconnected/error)
- [x] Wired into dynamic tab route
- [ ] Agent tools: `query_database`, `describe_tables` (requires server-side Postgres client — deferred to when a Postgres driver is added to agent package)
- [ ] Query execution endpoint with timeout (10s) + row limit (1000) — deferred

## Phase 6: Custom Tools & Settings ✅
- [x] `customTools.ts` — Convex CRUD: list, get, create, update, remove (max 20 per agent, name sanitization)
- [x] `tools/custom-http-tools.ts` — generates MCP tools from HTTP configs (dynamic zod schema, 15s timeout, 10KB response limit)
- [x] `agentApi.listCustomTools` — server-auth endpoint for agent runtime
- [x] `convex-client.ts` — `listCustomTools()` method
- [x] `mcp-server.ts` + `run-agent.ts` — loads custom tools and wires into MCP server + allowed tools
- [x] `routes/agents.$agentId.settings.tsx` — full settings page:
  - Agent config: name, description, model picker, system prompt editor (with save/dirty detection)
  - Custom HTTP tools: add (name, method, endpoint, description), list, delete
- [x] Settings route wired (`/agents/:agentId/settings`)
- [x] Settings link already in sidebar footer

## Phase 7: Billing & Scaling
- [ ] Stripe plans:
  - Free: 3 agents, 1 concurrent run, basic page types (tasks, notes, markdown)
  - Pro ($15/mo): 10 agents, 5 concurrent runs, all page types + spreadsheet + 1 postgres connection
  - Enterprise ($49/mo): 100 agents, 20 concurrent runs, unlimited pages + 5 postgres connections + custom tools
- [ ] Usage tracking + rate limiting
- [ ] Multi-VPS deployment
- [ ] Monitoring & alerting
