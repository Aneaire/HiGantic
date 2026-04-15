# Multi-Model SDK Architecture Plan

## Current Problem

Two completely separate code paths for AI model execution:

- **Claude** — `@anthropic-ai/claude-agent-sdk` `query()` handles the agentic loop + MCP + streaming internally. We observe the stream for UI updates.
- **Gemini** — `@google/generative-ai` with a hand-rolled 552-line agentic loop (`run-gemini-agent.ts`), a separate `gemini-tools.ts` (1348 lines of duplicated tools in Google's `SchemaType` format), and a separate `StreamFlusher`.

Adding OpenAI would mean a **third** runner, **third** tool format, **third** flusher. That's untenable.

---

## Recommendation: Vercel AI SDK

**Packages:** `ai` + `@ai-sdk/anthropic` + `@ai-sdk/google` + `@ai-sdk/openai`

Why this wins:

1. **TypeScript-first** — matches our stack exactly
2. **Unified tool calling** — Zod schemas, same `tool()` format for all providers
3. **Built-in agentic loops** — `stopWhen: stepCountIs(20)` replaces both `query()` and the manual Gemini loop
4. **Built-in streaming** — `streamText()` with async iterables, same API for all providers
5. **Provider switching** — one model string change, zero code path changes
6. **23.5k GitHub stars**, Vercel-backed, production-proven

### Alternatives Considered

| Tool | Verdict | Why |
|------|---------|-----|
| **OpenRouter** | Supplement only | API proxy, adds network hop + third-party dependency. Useful for fallback routing, not as primary SDK |
| **LiteLLM** | Not applicable | Python-only. Our agent server is TypeScript/Bun |
| **LangChain.js** | Overkill | Heavy abstraction layers (RunnableSequence, BaseChatModel, output parsers). Our use case is focused: agentic loop + tools. Vercel AI SDK handles this more directly |
| **Direct Provider SDKs** | Current problem | 3 different tool formats, 3 streaming APIs, 3 message formats, 3 agentic loop implementations. Exactly what we're fixing |

---

## Proposed Architecture

```
packages/agent/src/
├── providers/
│   ├── index.ts              # Provider factory: model string → AI SDK model instance
│   ├── types.ts              # Provider-agnostic types for our system
│   └── model-registry.ts     # Model metadata (limits, pricing, capabilities)
│
├── tools/                     # REFACTORED — unified AI SDK tool format
│   ├── memory-tools.ts        # Each returns Tool[] using AI SDK `tool()` + Zod
│   ├── page-tools.ts
│   ├── email-tools.ts
│   ├── slack-tools.ts
│   ├── discord-tools.ts
│   ├── ... (all existing tool sets)
│   └── registry.ts            # buildTools(enabledToolSets, deps) → Tool[]
│
├── runner/
│   ├── run-agent.ts           # Single unified runner (replaces both run-agent.ts + run-gemini-agent.ts)
│   ├── run-creator.ts         # Creator flow (can now use any model)
│   ├── run-api-endpoint.ts    # API endpoint runner
│   ├── stream-flusher.ts      # Single flusher (provider-agnostic, just handles Convex mutations)
│   └── context-builder.ts     # System prompt + history → AI SDK messages
│
├── mcp-server.ts              # KEEP for MCP client compatibility, but internally uses AI SDK tools
├── server.ts                  # Unchanged
└── system-prompt.ts           # Mostly unchanged
```

---

## Core Design

### 1. Provider Factory (`providers/index.ts`)

```ts
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'

export function getModel(modelId: string) {
  if (modelId.startsWith('claude-')) return anthropic(modelId)
  if (modelId.startsWith('gemini-')) return google(modelId)
  if (modelId.startsWith('gpt-') || modelId.startsWith('o')) return openai(modelId)
  throw new Error(`Unknown model: ${modelId}`)
}
```

### 2. Unified Tool Format

Convert all tool files from MCP `tool()` to AI SDK `tool()`:

```ts
// BEFORE (Claude Agent SDK MCP format):
export function createMemoryTools(deps: McpServerDeps) {
  return [
    tool("store_memory", "Store a memory...", z.object({ ... }), async (params) => { ... })
  ]
}

// AFTER (AI SDK format):
import { tool as aiTool } from 'ai'
import { z } from 'zod'

export function createMemoryTools(deps: ToolDeps) {
  return {
    store_memory: aiTool({
      description: 'Store a memory...',
      parameters: z.object({ ... }),
      execute: async (params) => { ... }
    })
  }
}
```

### 3. Unified Runner

Single `runAgent()` function for all providers:

```ts
import { streamText } from 'ai'
import { stepCountIs } from 'ai'

export async function runAgent(deps: AgentRunDeps) {
  const model = getModel(deps.effectiveModel)
  const tools = buildTools(deps.enabledToolSets, deps)
  const systemPrompt = await buildSystemPrompt(deps)
  const messages = buildMessages(deps.history)

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(20),
    onStepFinish({ toolResults }) {
      deps.flusher.flushToolCalls(toolResults)
    }
  })

  for await (const chunk of result.fullStream) {
    if (chunk.type === 'text-delta') {
      deps.flusher.appendText(chunk.textDelta)
    }
  }
}
```

### 4. Single StreamFlusher

Remove the Claude/Gemini split. The AI SDK normalizes streaming events, so one flusher handles all providers.

---

## Migration Plan (6 Phases)

| Phase | What | Risk | Effort |
|-------|------|------|--------|
| **1. Foundation** | Install `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`. Create `providers/` and `runner/` directories. Add `getModel()` factory. | Low | 1 day |
| **2. Tool Migration** | Convert all tool files from MCP `tool()` format to AI SDK `tool()` format. Start with `memory-tools.ts` as proof of concept, then migrate the rest. Keep `gemini-tools.ts` handlers — just wrap them in the new format. | Medium | 2-3 days |
| **3. Unified Runner** | Build the new `runAgent()` using `streamText()`. Wire into `server.ts`. Test with Claude model first (should behave identically to current). | Medium | 1-2 days |
| **4. Add Gemini** | Switch Gemini routing to use the unified runner instead of `run-gemini-agent.ts`. Test all Gemini tool calls. Delete `run-gemini-agent.ts` and `gemini-tools.ts`. | Medium | 1 day |
| **5. Add OpenAI** | Add `@ai-sdk/openai`. Add OpenAI models to model registry and UI selector. Zero runner changes needed. | Low | 0.5 day |
| **6. Cleanup** | Remove `@anthropic-ai/claude-agent-sdk` and `@google/generative-ai` dependencies. Remove old MCP server wiring. Update system prompt if needed. | Low | 0.5 day |

**Estimated total: 5-7 days**

---

## What Gets Deleted

- `run-gemini-agent.ts` (552 lines) — replaced by unified runner
- `gemini-tools.ts` (1348 lines) — replaced by unified tool format
- All `isGeminiModel()` routing checks — no more branching
- The separate Gemini `StreamFlusher` class
- The `createSdkMcpServer` dependency from Claude Agent SDK

## What Stays

- `system-prompt.ts` — model-agnostic, keeps working
- `server.ts` — job dispatch unchanged
- `process-manager.ts` — job pool unchanged
- All Convex mutations for streaming, tool calls, events
- `StreamFlusher` concept (simplified to one implementation)
- All tool handler logic (just wrapped in new format)
- `embeddings.ts` — stays on Gemini regardless of agent model

---

## Risk Mitigation

- **Phase 2-3**: Keep old code in parallel behind a feature flag. Route specific agents to old vs new runner via config.
- **Tool parity**: The unified format forces all tool sets to work on all providers. Currently Gemini is missing ~10 tool sets — this migration ensures feature parity.
- **Streaming behavior**: AI SDK normalizes streaming but provider quirks exist. Test each provider's streaming carefully (especially tool call delta events).
- **Model-specific tuning**: Add `maxTokens`, `temperature`, and `topP` to `model-registry.ts` per model since defaults vary.
