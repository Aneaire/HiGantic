---
name: HiGantic
description: Startup building an AI agent creation platform — full-stack engineering, QA, product strategy, design, and DevOps
slug: higantic
schema: agentcompanies/v1
version: 1.0.0
license: MIT
authors:
  - name: Aneaire
goals:
  - Build and ship the Agent Maker platform — a SaaS for creating and managing Claude-powered AI agents
  - Maintain high code quality with comprehensive testing on every feature
  - Stay ahead of the market by continuously researching and proposing new features
  - Establish a strong visual brand and generate all creative assets in-house
  - Keep the collaboration pipeline (COLDBOT) running so the board always has visibility
requirements:
  secrets:
    - ANTHROPIC_API_KEY
    - GEMINI_API_KEY
    - CLERK_JWT_ISSUER_DOMAIN
    - CONVEX_DEPLOY_KEY
---

# HiGantic

HiGantic is a startup company building **Agent Maker** — a platform that enables users to create custom AI agents through conversational flows, configure them with tools and templates, and interact with them via real-time chat.

## Tech Stack

- **Frontend:** React 19, React Router 7, Tailwind CSS 4, Three.js
- **Backend:** Convex (serverless DB + functions), TypeScript
- **Agent Runtime:** Hono, Claude Agent SDK
- **Auth:** Clerk
- **AI Models:** Anthropic Claude, Google Gemini
- **Package Manager:** Bun
- **Monorepo:** packages/web, packages/agent, packages/shared

## Collaboration Protocol: COLDBOT

All cross-agent coordination follows the **COLDBOT** (Collaborative Organized Ledger for Development, Board Oversight, and Tracking) protocol:

1. **Proposals** — Product Strategist writes feature proposals as tasks with `type: proposal`. Board reviews and approves/rejects.
2. **Progress Updates** — Every agent posts structured progress comments on their tasks. Board sees a unified feed.
3. **Handoffs** — When work moves between agents (e.g., dev done → QA), the handing-off agent creates a subtask assigned to the next agent and comments on the parent task.
4. **Escalations** — Any agent can escalate blockers to the CEO, who escalates to the board if needed.
5. **Board Requests** — Board posts tasks to the CEO, who triages and delegates.

## Org Chart

```
Board (Human)
  └── CEO
        ├── Lead Developer
        ├── QA Engineer
        ├── Product Strategist
        ├── Creative Director
        └── DevOps Engineer
```
