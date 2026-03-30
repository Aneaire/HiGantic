# Agent Maker — Improvement Roadmap

> Generated from a full codebase analysis on 2026-03-30. Covers architecture, UX, features, and reliability.

---

## Current State Summary

### Architecture (What's Working Well)
- **Push-based job dispatch** with 30s fallback polling — near-instant agent responses
- **Convex-native automation execution** — schedules, timers, automations run without HTTP round-trip
- **MCP protocol** for dynamic tool registration per agent config (17 tool sets, 60+ tools)
- **Multi-model support** — Claude primary (Sonnet/Opus/Haiku), Gemini for embeddings + image gen
- **Real-time everything** — Convex subscriptions for streaming chat, live task updates, sidebar changes
- **Encrypted credential store** with OAuth flow support
- **Workspace paradigm** — structured pages (tasks, notes, spreadsheets, API, workflows) beyond just chat
- **Creator flow** — AI-guided agent creation is a strong differentiator
- **Seed-based testing** — sandbox system for end-to-end verification

### Known Gaps
- No onboarding flow for new users
- No agent sharing or embedding
- No file upload in chat (vision)
- No centralized activity view across agents
- Workflow page type planned but not built
- No conversation search
- No idempotent automations (duplicate events can fire duplicate actions)
- No automatic event cleanup (accumulates forever)
- No job retry / dead-letter queue
- No structured logging or observability

---

## Feature Ideas

### Tier 1 — High Impact, Build First

#### 1. Agent Activity Feed / Dashboard
**Problem:** Users create autonomous agents but have no centralized view of what they're doing. This is the #1 trust gap for autonomous execution.

**What to build:**
- New route: `/activity` showing a unified feed across all agents
- Pull from `agentEvents`, `automationRuns`, `scheduledActionRuns`, `agentTimers`
- Show: agent name, event type, timestamp, status (success/fail), expandable details
- Filters: by agent, by event type, by time range
- "Health pulse" badge on each agent card on dashboard (green = active, yellow = errors, gray = idle)

**Touches:** New route + new Convex query joining existing tables. ~2-3 days.

---

#### 2. Guided Onboarding Flow
**Problem:** New users land on an empty dashboard with no guidance. High churn risk.

**What to build:**
- First-login detection (user has no agents)
- Step 1: "What do you want your agent to do?" — 3 use-case cards (Personal, Work, Business)
- Step 2: Template selection with live preview of what the agent will include
- Step 3: Auto-create agent with sample data (leverage existing seed system)
- Step 4: Drop user into first conversation with agent pre-greeting
- Track onboarding completion in user record

**Touches:** New component overlay on dashboard + user table field. ~2-3 days.

---

#### 3. Agent Sharing & Embedding
**Problem:** Agents are user-private. Can't share or embed. Limits growth and use cases (customer support bots, public assistants).

**What to build:**
- Add `visibility: "private" | "unlisted" | "public"` to agents table
- Public agent route: `/a/:agentSlug` — standalone chat interface (no auth required)
- Embed snippet generator: `<iframe src="higantic.com/embed/:agentSlug">`
- Rate limiting for public agents (messages per hour per IP)
- Optional: custom branding (logo, accent color) on embedded chat

**Touches:** Schema change + new route + auth-optional chat + rate limiting. ~4-5 days.

---

#### 4. File Upload in Chat (Vision / Documents)
**Problem:** Claude supports vision and multimodal input. Users expect to send screenshots, PDFs, images to their agent.

**What to build:**
- File upload button in ChatInput component (drag-and-drop too)
- Upload to Convex storage, attach `storageId` array to message record
- Pass image URLs/base64 in Claude API call as `image` content blocks
- Support: images (PNG/JPG/GIF/WebP), PDFs (extract text via existing pdf-parse)
- Show thumbnails in message bubble
- Store in assets automatically if agent has asset management enabled

**Touches:** ChatInput UI + message schema + agent runner multimodal support. ~2-3 days.

---

#### 5. Visual Workflow Builder
**Problem:** Automations are powerful but invisible. Users can't see the logic flow of "when X happens, do Y, then Z." The `workflow` page type exists in schema but isn't built.

**What to build:**
- Build the `workflow` page type component
- React Flow (or similar) for node-based graph editor
- Node types: Trigger (event), Condition (filter), Action (create_task, send_email, etc.), Delay
- Drag-and-connect interface to build automation chains
- Live execution indicator (green pulse when automation fires)
- Map to existing automation schema (visual → data → execution)
- Import/export workflow as JSON

**Touches:** New page component + React Flow integration + automation schema mapping. ~5-7 days.

---

### Tier 2 — High Value, Medium Effort

#### 6. Conversation Memory Summarization
**Problem:** System prompt loads top 20 memories, but long conversations lose context over time. Important decisions and facts from old conversations are forgotten.

**What to build:**
- After conversation goes idle (no new messages for 30 min), trigger summarization
- Use Claude to extract key facts, decisions, preferences, action items
- Auto-store as memories with `category: "conversation_summary"`
- Link memory to source conversation for traceability
- Configurable per agent in settings (opt-in)
- Summary quality improves with conversation length

**Touches:** New scheduled action + Claude API call + memory insertion. ~2-3 days.

---

#### 7. Inbound Webhooks (Full Implementation)
**Problem:** Schema has `webhooks` table with `incoming` type. Outgoing webhooks work. But there's no route to receive external webhooks and trigger agents.

**What to build:**
- Route: `POST /webhook/:agentId/:secret` on agent server
- Validate secret against `webhooks` table
- Emit `webhook.received` event with full request body as payload
- Automations trigger on `webhook.received` event
- UI: Show webhook URL + secret in Workflow page with copy button
- Support: JSON body parsing, header forwarding, query params

**Touches:** New server route + event emission + UI display. ~1-2 days.

---

#### 8. Smart Retry & Dead Letter Queue
**Problem:** Failed jobs silently die. For autonomous agents running schedules and automations, silent failures mean missed tasks.

**What to build:**
- Add `retryCount`, `maxRetries` (default 3), `lastError` to `agentJobs` schema
- On failure: if retryCount < maxRetries, re-queue with exponential backoff (5s, 30s, 2min)
- After max retries: move to `deadLetterJobs` table
- UI: "Failed Jobs" section in activity dashboard with manual retry button
- Alert: emit `job.failed_permanently` event (automations can notify via email/Slack)

**Touches:** Schema change + job processor retry logic + new table + UI. ~2-3 days.

---

#### 9. Agent Templates Marketplace
**Problem:** Templates exist but are hardcoded in the codebase. Power users can't share their agent configurations.

**What to build:**
- New `agentTemplates` table: creator, name, description, config snapshot, install count
- "Publish as Template" button in agent settings (strips credentials/personal data)
- Browse/search templates from `/templates` route
- One-click "Use This Template" → clones agent config + pages + sample structure
- Featured/curated section on landing page
- Categories: Personal, Business, Development, Creative, Research

**Touches:** New table + UI route + clone logic + curation. ~4-5 days.

---

#### 10. Conversation Search
**Problem:** No way to find past conversations except scrolling the sidebar. As agents accumulate hundreds of conversations, finding specific ones becomes impossible.

**What to build:**
- Global search input in agent sidebar (above conversation list)
- Full-text search on `messages.content` (add search index to schema)
- Results show: conversation title, matching message snippet, timestamp
- Click result → navigate to conversation, scroll to matching message
- Optional: cross-agent search from `/activity` dashboard

**Touches:** Schema search index + sidebar search UI + navigation. ~2-3 days.

---

### Tier 3 — Polish & Differentiation

#### 11. Agent Analytics Dashboard
Per-agent metrics page showing:
- Messages per day (sparkline chart)
- Tool usage breakdown (bar chart — which tools used most)
- Automation trigger counts
- Average response time
- Error rate over time
- Most active hours

Pull data from existing `agentEvents`, `agentJobs`, `messages` tables. ~3-4 days.

---

#### 12. Agent Cloning
One-click duplicate an agent with all config, pages, memories. Useful for creating variations ("Support Agent - EN" → clone → "Support Agent - ES") or backups before major changes. ~1 day.

---

#### 13. Keyboard Shortcuts
Power user features:
- `Cmd+K` — Quick agent switch (spotlight search)
- `Cmd+N` — New conversation
- `Cmd+/` — Toggle settings
- `Cmd+Enter` — Send message (already may exist)
- `Escape` — Close modals

~1-2 days.

---

#### 14. Rate Limit Feedback & Upgrade Prompts
When a free user hits the 1-concurrent-job limit, show a clear, friendly upgrade prompt instead of a generic error. Same for pro users at 5. Turn limit-hits into conversion moments. ~0.5 day.

---

#### 15. Prompt Library / Composable Personalities
Curated system prompt fragments users can mix-and-match:
- "Customer support tone"
- "Task management skills"
- "Technical writing style"
- "Research methodology"

Users compose agent personality from building blocks instead of writing from scratch. ~2-3 days.

---

#### 16. Conversation Export
Export conversations as:
- Markdown (.md)
- PDF
- JSON (for programmatic use)

Useful for documentation, compliance, sharing agent interactions with team. ~1-2 days.

---

#### 17. Multi-Language System Prompts
Allow agents to be configured to respond in specific languages. Auto-detect user language from browser and include language instruction in system prompt. Opens international market. ~1 day.

---

#### 18. Agent Status / Health Page
For agents exposed via API endpoints — a public status page showing:
- Uptime percentage
- Average response time
- Recent incidents (failed jobs)
- Current status (operational/degraded/down)

~2-3 days.

---

## Architecture Improvements (Non-Feature)

These don't add user-visible features but prevent future problems:

| Improvement | Why | Effort |
|------------|-----|--------|
| **Scheduled event cleanup** — Convex cron to run `agentEvents.cleanup()` daily | Events accumulate forever, 7-day TTL unenforced | 0.5 day |
| **Idempotency keys on automations** — dedup key per event+automation pair | Prevents duplicate actions from re-fired events | 1 day |
| **Structured logging** (pino) on agent server | Can't debug production issues without searchable logs | 1 day |
| **Stale job cleanup** — Convex cron to fail jobs stuck in "processing" > 10 min | Server crash leaves zombie jobs | 0.5 day |
| **Batch delete for agent removal** — replace sequential loops with bulk ops | Agent removal can timeout for large agents (20+ table loops) | 1 day |
| **Request tracing** — correlationId through job → tool → event chain | End-to-end debugging of "what happened when this automation fired" | 2 days |
| **Rate limit on public API endpoints** — per-IP throttling | Prevent abuse of agent REST APIs | 1 day |
| **Convex health check query** — lightweight endpoint to verify backend is up | Monitor backend separately from agent server | 0.5 day |

---

## Recommended Build Order

| Phase | Items | Goal |
|-------|-------|------|
| **Phase 1: Trust & Retention** | Activity Feed (#1), Onboarding (#2), File Upload (#4) | Users stay, trust autonomous agents, use expected features |
| **Phase 2: Growth & Power** | Agent Sharing (#3), Workflow Builder (#5), Inbound Webhooks (#7) | Viral growth, visual automation, external integrations |
| **Phase 3: Intelligence** | Memory Summarization (#6), Conversation Search (#10), Smart Retry (#8) | Agents get smarter, users find things, failures recover |
| **Phase 4: Ecosystem** | Templates Marketplace (#9), Analytics (#11), Prompt Library (#15) | Community, optimization, composability |
| **Phase 5: Polish** | Keyboard Shortcuts (#13), Export (#16), Cloning (#12), i18n (#17) | Power users, enterprise readiness |
| **Ongoing** | Architecture improvements (event cleanup, logging, idempotency, tracing) | Reliability at scale |
