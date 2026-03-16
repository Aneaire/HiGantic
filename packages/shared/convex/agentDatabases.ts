import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

export const getByTab = query({
  args: { tabId: v.id("sidebarTabs") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) return null;
    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) return null;

    return await ctx.db
      .query("agentDatabases")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .first();
  },
});

export const connect = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    displayName: v.string(),
    connectionString: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) throw new Error("Tab not found");
    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    // Plan check
    if (user.plan === "free") {
      throw new Error("PostgreSQL connections require a Pro or Enterprise plan.");
    }

    // Check connection limit
    const maxConnections = user.plan === "enterprise" ? 5 : 1;
    const existingDbs = await ctx.db
      .query("agentDatabases")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .collect();

    // Don't count the current tab's existing connection
    const otherDbs = existingDbs.filter((d) => d.tabId !== args.tabId);
    if (otherDbs.length >= maxConnections) {
      throw new Error(
        `Database connection limit reached (${maxConnections} for ${user.plan} plan).`
      );
    }

    // Remove existing connection for this tab
    const existing = existingDbs.find((d) => d.tabId === args.tabId);
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("agentDatabases", {
      agentId: agent._id,
      tabId: args.tabId,
      displayName: args.displayName.substring(0, 100),
      connectionString: args.connectionString,
      status: "disconnected",
    });
  },
});

export const disconnect = mutation({
  args: { dbId: v.id("agentDatabases") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const db = await ctx.db.get(args.dbId);
    if (!db) throw new Error("Database not found");
    const agent = await ctx.db.get(db.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.dbId);
  },
});

export const updateStatus = mutation({
  args: {
    dbId: v.id("agentDatabases"),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const db = await ctx.db.get(args.dbId);
    if (!db) throw new Error("Database not found");
    const agent = await ctx.db.get(db.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.dbId, {
      status: args.status,
      lastTestedAt: Date.now(),
    });
  },
});
