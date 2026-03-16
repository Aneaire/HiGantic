import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

export const list = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) return [];

    return await ctx.db
      .query("customTools")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

export const get = query({
  args: { toolId: v.id("customTools") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) return null;
    const agent = await ctx.db.get(tool.agentId);
    if (!agent || agent.userId !== user._id) return null;
    return tool;
  },
});

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.string(),
    description: v.string(),
    endpoint: v.string(),
    method: v.union(
      v.literal("GET"),
      v.literal("POST"),
      v.literal("PUT"),
      v.literal("DELETE"),
      v.literal("PATCH")
    ),
    inputSchema: v.optional(v.any()),
    headers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Agent not found");
    }

    // Limit: max 20 custom tools per agent
    const existing = await ctx.db
      .query("customTools")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
    if (existing.length >= 20) {
      throw new Error("Maximum 20 custom tools per agent");
    }

    // Validate name (must be valid tool identifier)
    const cleanName = args.name
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!cleanName) throw new Error("Invalid tool name");

    return await ctx.db.insert("customTools", {
      agentId: args.agentId,
      name: cleanName,
      description: args.description.substring(0, 500),
      endpoint: args.endpoint.substring(0, 2000),
      method: args.method,
      inputSchema: args.inputSchema,
      headers: args.headers,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("customTools"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    method: v.optional(
      v.union(
        v.literal("GET"),
        v.literal("POST"),
        v.literal("PUT"),
        v.literal("DELETE"),
        v.literal("PATCH")
      )
    ),
    inputSchema: v.optional(v.any()),
    headers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    const agent = await ctx.db.get(tool.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    const { toolId, ...updates } = args;
    const filtered: Record<string, any> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) {
        if (k === "name") {
          filtered.name = (val as string)
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_|_$/g, "");
        } else if (k === "description") {
          filtered.description = (val as string).substring(0, 500);
        } else if (k === "endpoint") {
          filtered.endpoint = (val as string).substring(0, 2000);
        } else {
          filtered[k] = val;
        }
      }
    }

    await ctx.db.patch(toolId, filtered);
  },
});

export const remove = mutation({
  args: { toolId: v.id("customTools") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    const agent = await ctx.db.get(tool.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.toolId);
  },
});
