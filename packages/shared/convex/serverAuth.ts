import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Server-to-server auth for the agent package.
 * Validates a shared secret token. Multi-tenant: does NOT return a user —
 * the agent process specifies agentId directly.
 */
export async function requireServerAuth(
  ctx: QueryCtx | MutationCtx,
  serverToken: string
) {
  const expected = process.env.AGENT_SERVER_TOKEN;
  if (!expected || serverToken !== expected) {
    throw new Error("Invalid server token");
  }
}
