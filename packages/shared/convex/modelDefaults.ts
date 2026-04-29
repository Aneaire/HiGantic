import type { GenericQueryCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";

/** AI provider credential types in priority order. */
const AI_PROVIDER_TYPES = ["google_ai", "openai"] as const;

/** Maps AI provider credential types to their best default model. */
const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  google_ai: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
};

/**
 * Default model when the user has no AI provider credentials (BYOK).
 * The server has GEMINI_API_KEY set as a platform-level key, so Gemini
 * models work for all users without needing their own credentials.
 */
const FALLBACK_MODEL = "gemini-2.5-flash";

/**
 * Picks the best default model for a user based on which AI provider
 * credentials they have configured. Returns the first available provider's
 * default model, preferring google_ai > openai.
 * Falls back to gemini-2.5-flash (platform-provided Gemini key).
 */
export async function getDefaultModelForUser(
  ctx: GenericQueryCtx<DataModel>,
  userId: Id<"users">
): Promise<string> {
  const creds = await ctx.db
    .query("credentials")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const provider of AI_PROVIDER_TYPES) {
    if (creds.some((c) => c.type === provider)) {
      return PROVIDER_DEFAULT_MODEL[provider] ?? FALLBACK_MODEL;
    }
  }

  return FALLBACK_MODEL;
}
