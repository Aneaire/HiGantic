# Lead Developer — Personal Reference

This is your personal reference doc. Update it as you learn the codebase.

## Project Structure

```
agent-maker/
├── packages/
│   ├── web/        — React Router frontend (routes, components, styles)
│   ├── agent/      — Hono agent runtime (tools, MCP, job polling)
│   └── shared/     — Convex backend (schema, mutations, queries, auth)
├── docs/           — Comprehensive documentation
├── CLAUDE.md       — Authoritative project guide (keep in sync with AGENTS.md)
└── AGENTS.md       — Mirror of CLAUDE.md
```

## Key Files

- `packages/shared/convex/schema.ts` — Data model
- `packages/agent/src/system-prompt.ts` — Agent system prompt generation
- `packages/agent/src/mcp-server.ts` — MCP tool registration
- `packages/agent/src/run-agent.ts` — Agent execution loop
- `packages/shared/convex/processAutomation.ts` — Automation engine

## Checklists (from CLAUDE.md)

- **New tool set:** 8 steps (tool file → MCP → system prompt → UI → schema → list → events → seed)
- **New page type:** 8 steps (type union → schema → sidebar → component → route → icon → backend → seed)
- **New AI model:** 4 steps

## Notes

(Add your own notes as you work on the codebase.)
