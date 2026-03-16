import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

async function requireTabAccess(ctx: any, tabId: string) {
  const user = await requireAuthUser(ctx);
  const tab = await ctx.db.get(tabId);
  if (!tab) throw new Error("Tab not found");
  const agent = await ctx.db.get(tab.agentId);
  if (!agent || agent.userId !== user._id) throw new Error("Not authorized");
  return { user, tab, agent };
}

export const list = query({
  args: { tabId: v.id("sidebarTabs") },
  handler: async (ctx, args) => {
    await requireTabAccess(ctx, args.tabId);
    return await ctx.db
      .query("tabApiEndpoints")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();
  },
});

export const create = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    name: v.string(),
    method: v.union(
      v.literal("GET"),
      v.literal("POST"),
      v.literal("PUT"),
      v.literal("DELETE"),
      v.literal("PATCH")
    ),
    description: v.optional(v.string()),
    promptTemplate: v.string(),
    responseFormat: v.optional(
      v.union(v.literal("json"), v.literal("text"))
    ),
  },
  handler: async (ctx, args) => {
    const { tab } = await requireTabAccess(ctx, args.tabId);

    // Max 20 endpoints per tab
    const existing = await ctx.db
      .query("tabApiEndpoints")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();
    if (existing.length >= 20) {
      throw new Error("Maximum 20 endpoints per API page");
    }

    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness within agent
    const dupes = await ctx.db
      .query("tabApiEndpoints")
      .withIndex("by_agent_slug", (q) =>
        q.eq("agentId", tab.agentId).eq("slug", slug)
      )
      .collect();
    if (dupes.length > 0) {
      throw new Error(`Endpoint slug "${slug}" already exists for this agent`);
    }

    return await ctx.db.insert("tabApiEndpoints", {
      tabId: args.tabId,
      agentId: tab.agentId,
      name: args.name.substring(0, 100),
      slug,
      method: args.method,
      description: args.description?.substring(0, 500),
      promptTemplate: args.promptTemplate.substring(0, 5000),
      responseFormat: args.responseFormat ?? "json",
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    endpointId: v.id("tabApiEndpoints"),
    name: v.optional(v.string()),
    method: v.optional(
      v.union(
        v.literal("GET"),
        v.literal("POST"),
        v.literal("PUT"),
        v.literal("DELETE"),
        v.literal("PATCH")
      )
    ),
    description: v.optional(v.string()),
    promptTemplate: v.optional(v.string()),
    responseFormat: v.optional(
      v.union(v.literal("json"), v.literal("text"))
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const endpoint = await ctx.db.get(args.endpointId);
    if (!endpoint) throw new Error("Endpoint not found");
    await requireTabAccess(ctx, endpoint.tabId);

    const { endpointId, ...updates } = args;
    const filtered: Record<string, any> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) {
        if (k === "name") {
          filtered.name = (val as string).substring(0, 100);
          filtered.slug = (val as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        } else if (k === "promptTemplate") {
          filtered.promptTemplate = (val as string).substring(0, 5000);
        } else if (k === "description") {
          filtered.description = (val as string).substring(0, 500);
        } else {
          filtered[k] = val;
        }
      }
    }

    await ctx.db.patch(endpointId, filtered);
  },
});

export const remove = mutation({
  args: { endpointId: v.id("tabApiEndpoints") },
  handler: async (ctx, args) => {
    const endpoint = await ctx.db.get(args.endpointId);
    if (!endpoint) throw new Error("Endpoint not found");
    await requireTabAccess(ctx, endpoint.tabId);
    await ctx.db.delete(args.endpointId);
  },
});

// ── API Keys ─────────────────────────────────────────────────────────

export const listKeys = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) return [];

    const keys = await ctx.db
      .query("agentApiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    // Mask keys — only show last 8 chars
    return keys.map((k) => ({
      ...k,
      key: "ak_..." + k.key.slice(-8),
      _fullKey: undefined,
    }));
  },
});

export const createKey = mutation({
  args: {
    agentId: v.id("agents"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Agent not found");
    }

    // Max 5 keys per agent
    const existing = await ctx.db
      .query("agentApiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
    if (existing.length >= 5) {
      throw new Error("Maximum 5 API keys per agent");
    }

    // Generate key
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "ak_";
    for (let i = 0; i < 40; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }

    const id = await ctx.db.insert("agentApiKeys", {
      agentId: args.agentId,
      userId: user._id,
      key,
      label: args.label.substring(0, 100),
      createdAt: Date.now(),
    });

    // Return the full key ONCE (it's masked in subsequent reads)
    return { id, key };
  },
});

export const revokeKey = mutation({
  args: { keyId: v.id("agentApiKeys") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const apiKey = await ctx.db.get(args.keyId);
    if (!apiKey) throw new Error("Key not found");
    if (apiKey.userId !== user._id) throw new Error("Not authorized");
    await ctx.db.delete(args.keyId);
  },
});
