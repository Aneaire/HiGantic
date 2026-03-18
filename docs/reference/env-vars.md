# Environment Variables

## packages/agent (Agent Server)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONVEX_URL` | Yes | — | Convex deployment URL |
| `AGENT_SERVER_TOKEN` | Yes | — | Shared secret for server-to-Convex auth |
| `PORT` | No | `3001` | Agent server port |
| `POLL_INTERVAL_MS` | No | `30000` | Fallback poll interval in ms (primary dispatch is push-based) |
| `MAX_CONCURRENT_AGENTS` | No | `20` | Max concurrent agent runs |
| `AGENT_TIMEOUT_MS` | No | `300000` | Per-run timeout (5 min default) |
| `GEMINI_API_KEY` | For RAG | — | Google Gemini API key for document embeddings |

## packages/shared (Convex Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_SERVER_TOKEN` | Yes | Must match the agent server's token |
| `AGENT_SERVER_URL` | No | Agent server URL for push dispatch (default: `http://localhost:3001`) |

Convex deployment URL is auto-configured by `convex dev`.

## packages/web (Web UI)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | Yes | Convex deployment URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk authentication publishable key |

## Per-Agent Configuration (Stored in DB)

These are configured per-agent in the Settings UI, not as environment variables:

| Config | Tool Set | Fields |
|--------|----------|--------|
| Email | `email` | `resendApiKey`, `fromEmail`, `fromName` |
| PostgreSQL | `postgres` | `connectionString` |
| Custom HTTP | `custom_http_tools` | `name`, `endpoint`, `method`, `headers`, `inputSchema` |
