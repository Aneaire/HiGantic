import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireServerAuth } from "./serverAuth";

// ── QUERIES ──────────────────────────────────────────────────────────

export const getAgentConfig = query({
  args: {
    serverToken: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    await requireServerAuth(ctx, args.serverToken);
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;
    return {
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      enabledToolSets: agent.enabledToolSets,
      status: agent.status,
    };
  },
});

// ── MUTATIONS ────────────────────────────────────────────────────────

export const updateAgentConfig = mutation({
  args: {
    serverToken: v.string(),
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    enabledToolSets: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireServerAuth(ctx, args.serverToken);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.status !== "draft") {
      throw new Error("Draft agent not found");
    }

    const { serverToken, agentId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    // Update slug if name changes
    if (filtered.name) {
      (filtered as Record<string, unknown>).slug = (filtered.name as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    await ctx.db.patch(agentId, filtered);

    // Also update the session's partialConfig
    const sessions = await ctx.db
      .query("creatorSessions")
      .collect();
    const session = sessions.find(
      (s) => s.agentId === agentId && s.status === "active"
    );
    if (session) {
      const currentConfig = (session.partialConfig as Record<string, unknown>) ?? {};
      await ctx.db.patch(session._id, {
        partialConfig: { ...currentConfig, ...filtered },
      });
    }

    return { success: true };
  },
});

export const finalizeAgent = mutation({
  args: {
    serverToken: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    await requireServerAuth(ctx, args.serverToken);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.status !== "draft") {
      throw new Error("Draft agent not found");
    }

    // Set agent to active
    await ctx.db.patch(args.agentId, { status: "active" });

    // Complete the creator session
    const sessions = await ctx.db.query("creatorSessions").collect();
    const session = sessions.find(
      (s) => s.agentId === args.agentId && s.status === "active"
    );
    if (session) {
      await ctx.db.patch(session._id, { status: "completed" });
    }

    return { success: true, agentId: args.agentId };
  },
});
