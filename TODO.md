# Agent Maker — Phase 1 TODO

## 1. Monorepo Setup
- [x] Initialize pnpm workspace (`pnpm-workspace.yaml`, root `package.json`)
- [x] Create `tsconfig.base.json` with shared compiler options
- [x] Scaffold `packages/shared`, `packages/agent`, `packages/web`
- [x] Each package gets its own `package.json` + `tsconfig.json`

## 2. Convex Backend (`packages/shared`)
- [ ] `npx convex init` inside shared package (needs Convex project)
- [x] `schema.ts` — all tables: users, agents, agentToolConfigs, customTools, sidebarTabs, conversations, messages, memories, agentJobs, creatorSessions
- [x] `auth.ts` — Clerk JWT validation helper
- [x] `auth.config.ts` — Clerk provider config
- [x] `agents.ts` — create, update, delete, list (scoped to userId)
- [x] `conversations.ts` — create, list, get (scoped to agentId)
- [x] `messages.ts` — send, list, updateStatus (pending → processing → done/error)
- [x] `memories.ts` — store, search, list, delete (scoped to agentId)
- [x] `agentJobs.ts` — listPending, claim, complete, fail
- [x] `users.ts` — getOrCreate from Clerk, me() query
- [x] Rate limiting — check concurrent active jobs per user in messages.send

## 3. Auth (Clerk)
- [ ] Create Clerk application (manual step)
- [ ] Set env vars: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_ISSUER_DOMAIN`
- [x] ClerkProvider in `root.tsx`
- [x] ConvexProviderWithClerk wired up

## 4. Frontend Scaffold (`packages/web`)
- [x] React Router 7 project setup with Vite
- [x] Tailwind v4 setup
- [x] `root.tsx` — ClerkProvider + ConvexProviderWithClerk
- [x] `routes/home.tsx` — Dashboard route (agent grid + landing)
- [x] `DashboardLayout.tsx` — top nav, user button
- [x] `AgentCard.tsx` — card component for each agent
- [x] `CreateAgentDialog.tsx` — create agent modal
- [x] `entry.server.tsx` + `entry.client.tsx`

## 5. Agent Detail Page
- [x] `routes/agents.$agentId.tsx` — agent detail page
- [x] System prompt display
- [x] Configuration display
- [x] Placeholder nav items (Chat, Memories, Settings)

## 6. Remaining Setup Steps
- [ ] Create Convex project and run `npx convex dev` to generate types
- [ ] Create Clerk app and configure JWT template for Convex
- [ ] Set all env vars
- [ ] Test end-to-end: sign in → create agent → view agent → delete agent
- [ ] Verify rate limit rejects when over limit
