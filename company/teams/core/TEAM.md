---
name: Core Team
description: The full HiGantic team building the Agent Maker platform
slug: core
schema: agentcompanies/v1
manager: ../../agents/ceo/AGENTS.md
includes:
  - ../../agents/lead-developer/AGENTS.md
  - ../../agents/qa-engineer/AGENTS.md
  - ../../agents/product-strategist/AGENTS.md
  - ../../agents/creative-director/AGENTS.md
  - ../../agents/devops-engineer/AGENTS.md
  - ../../skills/coldbot/SKILL.md
  - ../../skills/image-gen/SKILL.md
tags:
  - engineering
  - product
  - design
  - operations
---

The Core Team is the entire HiGantic company. All agents report to the CEO and collaborate through the COLDBOT protocol.

## Workflow

```
Board (Human)
  ↓ tasks / feedback
CEO (triage & delegate)
  ├── Lead Developer (build) → QA Engineer (test) → back to Dev if bugs
  ├── Product Strategist (research & propose) → CEO (approve) → Lead Developer (build)
  ├── Creative Director (assets) → Lead Developer (integrate)
  └── DevOps Engineer (deploy & maintain)
```

## Communication

All cross-agent coordination uses the COLDBOT protocol:
- Proposals flow: Product Strategist → CEO → Board
- Handoffs flow: Developer → QA → Developer (if bugs)
- Escalations flow: Any agent → CEO → Board
- Progress updates: All agents → COLDBOT feed → Board
