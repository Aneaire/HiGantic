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
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

export const search = query({
  args: {
    agentId: v.id("agents"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("agentId", args.agentId)
      )
      .take(20);
  },
});

export const store = mutation({
  args: {
    agentId: v.id("agents"),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("memories", {
      agentId: args.agentId,
      content: args.content,
      category: args.category,
    });
  },
});

export const remove = mutation({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory) throw new Error("Memory not found");

    const agent = await ctx.db.get(memory.agentId);
    if (!agent) throw new Error("Agent not found");

    const user = await requireAuthUser(ctx);
    if (agent.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.memoryId);
  },
});
