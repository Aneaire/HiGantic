# Agent Maker Platform — Implementation Plan

## Context

Build a SaaS platform where users create, customize, and interact with their own AI agents. An "Agent Creator" agent guides users through building agents conversationally. Each agent gets its own memory bank, chat interface, and optional sidebar tabs. Agents are hosted on a VPS. Based on the architecture patterns from `aneaire-assistant`.

---

## 1. Project Structure

```
agent-maker/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── Dockerfile
├── packages/
│   ├── shared/              # Convex backend + shared types
│   │   ├── convex/
│   │   │   ├── schema.ts
│   │   │   ├── auth.ts          # Clerk JWT validation (multi-user)
│   │   │   ├── serverAuth.ts    # Agent-to-Convex auth (validates agentId)
│   │   │   ├── agents.ts        # Agent CRUD
│   │   │   ├── conversations.ts # Scoped to agentId
│   │   │   ├── messages.ts      # Same pattern as reference
│   │   │   ├── memories.ts      # Scoped to agentId
│   │   │   ├── sidebarTabs.ts   # Dynamic tab configs per agent
│   │   │   ├── customTools.ts   # User-defined HTTP tools
│   │   │   ├── creatorApi.ts    # Agent Creator endpoints
│   │   │   └── agentApi.ts      # Agent runtime endpoints
│   │   └── src/types/index.ts
│   ├── agent/               # Claude Agent SDK runtime
│   │   └── src/
│   │       ├── run-agent.ts       # Loads config by agentId, runs dynamically
│   │       ├── run-creator.ts     # The "Agent Creator" agent
│   │       ├── process-manager.ts # Bounded process pool + queue
│   │       ├── system-prompt.ts   # Builds prompt from agent config + memories
│   │       ├── mcp-server.ts      # Dynamically loads tools per agent config
│   │       ├── convex-client.ts   # Multi-tenant queries
│   │       └── tools/
│   │           ├── memory-tools.ts      # Always included, scoped to agentId
│   │           ├── web-browse-tools.ts  # Optional
│   │           └── custom-http-tools.ts # User-defined API tools
│   └── web/                 # TanStack Start + React 19 frontend
│       └── app/
│           ├── routes/
│           │   ├── __root.tsx
│           │   ├── index.tsx                    # Dashboard: agent grid
│           │   ├── agents/
│           │   │   ├── new.tsx                  # Agent Creator wizard
│           │   │   └── $agentId/
│           │   │       ├── index.tsx            # Redirect to chat
│           │   │       ├── chat.$conversationId.tsx
│           │   │       ├── memories.tsx
│           │   │       ├── settings.tsx
│           │   │       └── tab.$tabSlug.tsx     # Dynamic sidebar tabs
│           ├── components/
│           │   ├── DashboardLayout.tsx
│           │   ├── AgentCard.tsx
│           │   ├── AgentLayout.tsx        # Per-agent layout
│           │   ├── AgentSidebar.tsx       # Dynamic nav from sidebarTabs
│           │   ├── AgentChat.tsx
│           │   ├── AgentCreator.tsx       # Creator chat + config preview
│           │   ├── DynamicTab.tsx         # Renders tab by type
│           │   ├── ChatMessageList.tsx
│           │   ├── ChatMessage.tsx
│           │   └── ChatInput.tsx
│           ├── hooks/
│           │   ├── useAgentChat.ts
│           │   ├── useAgents.ts
│           │   └── useAgentMemories.ts
│           └── server/
│               ├── agent.ts              # triggerAgent(agentId, ...)
│               └── creator.ts            # triggerCreator()
```

---

## 2. Convex Schema

Multi-tenancy pivot: **every resource scopes through `agentId`**.

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `users` | clerkId, email, plan, maxAgents | User accounts with plan limits |
| `agents` | userId, name, slug, systemPrompt, model, enabledToolSets[], status | Core agent definitions |
| `agentToolConfigs` | agentId, toolSetName, config (JSON) | Per-agent tool credentials/settings |
| `customTools` | agentId, name, description, inputSchema, endpoint, method, headers | User-defined HTTP API tools |
| `sidebarTabs` | agentId, label, slug, icon, type, config, sortOrder | Dynamic sidebar tab definitions |
| `conversations` | agentId, userId, title | Chat sessions scoped to agent |
| `messages` | conversationId, role, content, status, toolCalls[] | Chat messages (same as reference) |
| `memories` | agentId, content, category | Agent memory bank (full-text search indexed) |
| `agentJobs` | agentId, conversationId, messageId, status, workerId?, startedAt?, error? | Job queue for agent runs (pending → processing → done/error) |
| `creatorSessions` | userId, status, partialConfig (JSON), agentId? | Tracks agent creation wizard state |

---

## 3. Agent Creator Flow

The Agent Creator is itself a Claude agent with specialized tools:

1. User clicks **"Create New Agent"** → creates `creatorSessions` record + conversation
2. `triggerCreator()` fires the creator agent (same fire-and-forget pattern as reference)
3. Creator agent guides user through:
   - Name & purpose → personality & tone → tool selection → custom tools → sidebar tabs → branding
4. Creator tools: `update_agent_config`, `preview_system_prompt`, `list_available_tool_sets`, `validate_custom_tool`, `finalize_agent`
5. On `finalize_agent` → creates `agents` record, copies configs, creates default sidebar tabs → redirects user to new agent

**UI**: Split view — chat on left, live config preview panel on right showing the agent being built.

---

## 4. Agent Runtime Architecture

**Queue-based process pool on VPS** (same fire-and-forget pattern as reference, with concurrency management):

```
Web → triggerAgent(agentId, conversationId) → Process Manager
  ├── Queue (overflow when at capacity)
  ├── Active processes Map<runId, ChildProcess>
  ├── Max concurrent: configurable (env MAX_CONCURRENT_AGENTS)
  └── Timeout: kill after 5 min (env AGENT_TIMEOUT_MS)
```

**Dynamic config loading per run:**
1. Load agent config from Convex (systemPrompt, model, enabledToolSets)
2. Load agent memories (top 20 recent)
3. Build system prompt: user-defined prompt + memory bank section
4. Build MCP server: always include memory tools + conditionally add enabled tool sets + generate custom HTTP tools
5. Run `claude-agent-sdk query()` with dynamic config
6. Stream responses via Convex `updateMessage()` mutations

**Scaling path**: Single VPS (10-20 concurrent) → Multi-VPS with shared queue → Container-per-agent for enterprise.

### Scalability & Multi-User Design

**Data isolation**: Every resource scopes through `userId` → `agentId`. Convex handles concurrent reads/writes natively. No cross-user data leakage by design.

**Job queue (decouples request from execution):**
- Add `agentJobs` table in Convex: `{ agentId, conversationId, messageId, status, workerId?, startedAt?, error? }`
- User sends message → Convex mutation creates job with `status: "pending"` → agent server polls/subscribes for pending jobs
- This decoupling means the web frontend never talks directly to the agent process — Convex is the only shared state

**Message status lifecycle:**
```
pending → processing → done | error
```
- UI shows spinner/typing indicator based on status
- If a worker crashes, job stays `"processing"` — a reaper marks it `"error"` after timeout

**Rate limiting (enforced in Convex mutations):**
- Check concurrent active jobs per user before accepting new ones
- Free: 1 concurrent run, Pro: 5, Enterprise: 20
- Return clear error to UI when rate-limited

**Process manager backpressure:**
- In-memory queue on the agent server (Phase 1)
- Max concurrent runs: `MAX_CONCURRENT_AGENTS` env var (default 20)
- Timeout: `AGENT_TIMEOUT_MS` env var (default 300000 / 5 min)
- Kill and mark `"error"` on timeout

**Stateless workers (critical for future scaling):**
- Agent processes read everything from Convex (config, memories, messages)
- Agent processes write everything back to Convex (responses, tool results, new memories)
- No local state — any worker can pick up any job
- This makes horizontal scaling (Phase 2+) a matter of adding more servers

**Scaling roadmap:**

| Phase | Architecture | Capacity |
|-------|-------------|----------|
| 1 (now) | Single server, in-memory queue | ~20 concurrent runs |
| 2 | Redis/BullMQ queue + multiple worker VPS | ~100+ concurrent runs |
| 3 | Serverless per-run (Fly Machines / Modal) | Unlimited, scale to zero |

---

## 5. Dynamic Sidebar Tabs

Each agent's sidebar is data-driven from the `sidebarTabs` table (unlike the reference which hardcodes nav in `nav.ts`).

**Fixed items** (always present): Chat, Memories, Settings
**Dynamic items**: Loaded from DB, rendered by `DynamicTab.tsx`

**Tab types**:
| Type | Renders |
|------|---------|
| `memories` | Built-in memories view |
| `data_table` | Tabular data view |
| `iframe` | Embedded external URL |
| `markdown` | Rendered markdown content |
| `kanban` | Kanban board (Convex-backed) |

Route: `/agents/:agentId/tab/:tabSlug` → `DynamicTab` reads tab config, renders appropriate component.

---

## 6. Memory Bank

Same pattern as reference but scoped to `agentId` instead of `userId`:

- **Storage**: Convex `memories` table with `agentId` + full-text search index
- **Loading**: Top 20 memories appended to system prompt at runtime
- **Agent tools**: `store_memory`, `recall_memory`, `search_memories` — all scoped to agentId
- **UI**: `/agents/:agentId/memories` — view, search, manually edit memories

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TanStack Start + React 19 + Tailwind v4 |
| Auth | Clerk |
| Database | Convex (real-time) |
| Agent | @anthropic-ai/claude-agent-sdk + MCP |
| Hosting | VPS (Docker, single container) |
| Build | pnpm workspaces + Vite 7 + TypeScript |

---

## 8. Implementation Phases

### Phase 1: Foundation (scaffold + schema + auth + dashboard + scalability foundations)
- [ ] Monorepo setup (pnpm, tsconfig, packages)
- [ ] Convex schema (all tables including `agentJobs`)
- [ ] Clerk auth + multi-user support
- [ ] Agent CRUD (Convex functions)
- [ ] Message status lifecycle (`pending` → `processing` → `done` | `error`)
- [ ] Rate limiting in Convex mutations (check concurrent jobs per user)
- [ ] Dashboard page with agent grid

### Phase 2: Core Agent Runtime
- [ ] `run-agent.ts` — dynamic config loading by agentId
- [ ] `system-prompt.ts` — build from agent config + memories
- [ ] `mcp-server.ts` — dynamic tool loading per agent
- [ ] Memory tools scoped to agentId
- [ ] Process manager (bounded pool + queue)
- [ ] `triggerAgent()` server function

### Phase 3: Chat Interface
- [ ] AgentLayout + AgentSidebar
- [ ] AgentChat (reuse ChatMessageList, ChatInput, ChatMessage patterns)
- [ ] Conversation list scoped to agent
- [ ] Real-time streaming via Convex subscriptions
- [ ] Memories page

### Phase 4: Agent Creator
- [ ] Creator system prompt
- [ ] Creator MCP tools (update_config, finalize_agent, etc.)
- [ ] `run-creator.ts`
- [ ] AgentCreator UI (chat + config preview)
- [ ] End-to-end creation flow

### Phase 5: Dynamic Sidebar Tabs
- [ ] sidebarTabs CRUD
- [ ] DynamicTab renderer
- [ ] Tab type implementations (memories, data_table, iframe, markdown)
- [ ] Tab config in agent settings
- [ ] Integrate into Agent Creator flow

### Phase 6: Custom Tools & Settings
- [ ] customTools CRUD
- [ ] `createCustomHttpTool()` — generates MCP tools from HTTP endpoint configs
- [ ] Custom tool definition UI
- [ ] Agent settings page (prompt, tools, tabs, branding)

### Phase 7: Billing & Scaling
- [ ] Stripe plans (free: 1 agent, pro: 10, enterprise: unlimited)
- [ ] Usage tracking + rate limiting
- [ ] Multi-VPS deployment
- [ ] Monitoring

---

## 9. Verification

- **Agent creation**: Create an agent via the Creator, verify it appears on dashboard with correct config
- **Chat**: Send messages to a created agent, verify streaming responses and tool calls
- **Memory**: Verify agent stores/recalls memories scoped to itself (not leaking across agents)
- **Sidebar tabs**: Add a custom tab, verify it renders on the agent's sidebar
- **Concurrency**: Trigger multiple agent runs simultaneously, verify process manager queues correctly
- **Isolation**: Create 2 agents, verify conversations/memories/tools don't cross-contaminate

---

## Reference Files from aneaire-assistant

| What | File |
|------|------|
| Schema pattern | `packages/shared/convex/schema.ts` |
| Agent runtime | `packages/agent/src/run-agent.ts` |
| MCP server | `packages/agent/src/mcp-server.ts` |
| System prompt | `packages/agent/src/system-prompt.ts` |
| Memory tools | `packages/agent/src/tools/memory-tools.ts` |
| Sidebar | `packages/web/app/components/Sidebar.tsx` |
| Chat page | `packages/web/app/components/ChatPage.tsx` |
| Server trigger | `packages/web/app/server/agent.ts` |
| Docker | `Dockerfile` |
