# Importing HiGantic into Paperclip

## Quick Start (CLI)

```bash
# Preview what will be imported
paperclipai company import /home/aneaire/Desktop/Projects/agent-maker/company --target new --dry-run

# Import the company
paperclipai company import /home/aneaire/Desktop/Projects/agent-maker/company --target new --new-company-name "HiGantic" --yes
```

This imports the full org: 6 agents, 2 skills (COLDBOT, image-gen), 1 project, 1 team, and all adapter configs from `.paperclip.yaml`.

---

## After Import

### 1. Add Secrets

Go to each agent's settings page and configure:

| Agent | Secret | Required |
|-------|--------|----------|
| Creative Director | `GEMINI_API_KEY` | Yes — needed for image generation |
| Lead Developer | `GH_TOKEN` | Optional — for GitHub access |
| DevOps Engineer | `GH_TOKEN` | Optional — for GitHub access |

### 2. Enable Agents

Imported agents start with `status: idle`. Enable them in this order:

1. **CEO** — enable heartbeat first so it can receive and delegate work
2. **Lead Developer** — the builder
3. **QA Engineer** — the tester
4. **Product Strategist** — the idea engine
5. **Creative Director** — the visual designer
6. **DevOps Engineer** — the infra owner

### 3. Assign Your First Task

Create a task and assign it to the **CEO**. It will triage and delegate to the right agent using the COLDBOT protocol.

### 4. Approval Preferences

In **Company Settings**, toggle `requireBoardApprovalForNewAgents`:
- **On** — you approve every new agent hire before it activates
- **Off** — agents can hire without your approval

---

## Alternative: UI Method

If the CLI isn't available:

1. Open Paperclip UI → **Companies** page → **"New Company"** → name it **HiGantic**
2. Create agents in this order:

| # | Name | Role | Reports To | Model |
|---|------|------|-----------|-------|
| 1 | CEO | `ceo` | _(none)_ | claude-sonnet-4-6 |
| 2 | Lead Developer | `engineer` | CEO | claude-sonnet-4-6 |
| 3 | QA Engineer | `engineer` | CEO | claude-sonnet-4-6 |
| 4 | Product Strategist | `manager` | CEO | claude-sonnet-4-6 |
| 5 | Creative Director | `manager` | CEO | claude-sonnet-4-6 |
| 6 | DevOps Engineer | `engineer` | CEO | claude-sonnet-4-6 |

3. For each agent, open **Agent Detail** → paste the contents of their `AGENTS.md` into the instructions field
4. Go to **Company Skills** → add the `coldbot` and `image-gen` skills
5. Configure secrets per the table above

---

## Alternative: API Method

```bash
# 1. Create the company
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "HiGantic", "description": "Startup building an AI agent creation platform"}'

# 2. Save the company ID from the response
COMPANY_ID="<id-from-response>"

# 3. Create the CEO (first agent, no reportsTo)
curl -X POST http://localhost:3000/api/companies/$COMPANY_ID/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CEO",
    "role": "ceo",
    "title": "Chief Executive Officer",
    "reportsTo": null,
    "adapterType": "claude_local",
    "adapterConfig": {"model": "claude-sonnet-4-6"}
  }'

# 4. Save the CEO's agent ID
CEO_ID="<id-from-response>"

# 5. Create remaining agents (all report to CEO)
for agent in \
  '{"name":"Lead Developer","role":"engineer","title":"Lead Full-Stack Developer"}' \
  '{"name":"QA Engineer","role":"engineer","title":"Quality Assurance Engineer"}' \
  '{"name":"Product Strategist","role":"manager","title":"Product Strategist"}' \
  '{"name":"Creative Director","role":"manager","title":"Creative Director"}' \
  '{"name":"DevOps Engineer","role":"engineer","title":"DevOps & Infrastructure Engineer"}'
do
  curl -X POST http://localhost:3000/api/companies/$COMPANY_ID/agents \
    -H "Content-Type: application/json" \
    -d "$(echo $agent | jq --arg ceo "$CEO_ID" '. + {reportsTo: $ceo, adapterType: "claude_local", adapterConfig: {model: "claude-sonnet-4-6"}}')"
done
```

Then paste each agent's instruction files via the UI or `PATCH /api/agents/{agentId}`.

---

## Package Contents

```
company/
├── COMPANY.md                    — Company identity and COLDBOT overview
├── .paperclip.yaml               — Adapter configs and secret requirements
├── agents/
│   ├── ceo/                      — AGENTS.md, SOUL.md, HEARTBEAT.md, TOOLS.md
│   ├── lead-developer/           — AGENTS.md, SOUL.md, TOOLS.md, README.md
│   ├── qa-engineer/              — AGENTS.md, SOUL.md, TOOLS.md
│   ├── product-strategist/       — AGENTS.md, SOUL.md, TOOLS.md
│   ├── creative-director/        — AGENTS.md, SOUL.md, TOOLS.md
│   └── devops-engineer/          — AGENTS.md, SOUL.md, TOOLS.md
├── teams/core/TEAM.md            — Full team roster and workflow
├── skills/
│   ├── coldbot/SKILL.md          — Collaboration protocol (5 message types)
│   └── image-gen/SKILL.md        — Gemini prompt engineering guide
└── projects/
    └── agent-maker-v1/PROJECT.md — V1 deliverables
```

---

## Org Chart

```
Board (You)
  └── CEO
        ├── Lead Developer    — builds features (JS/React/Node/Bun)
        ├── QA Engineer       — tests in sandbox (aneaire010@gmail.com)
        ├── Product Strategist — researches and proposes features
        ├── Creative Director  — generates images with Gemini Nano Banana 2
        └── DevOps Engineer    — deploys and maintains infrastructure
```
