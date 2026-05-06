import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

export const list = query({
  args: {
    tabId: v.id("sidebarTabs"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) return [];
    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) return [];

    const all = await ctx.db
      .query("tabTimeEntries")
      .withIndex("by_tab_startTime", (q) => q.eq("tabId", args.tabId))
      .order("desc")
      .collect();

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 100;
    return all.slice(offset, offset + limit);
  },
});

export const listRunning = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) return null;

    const running = await ctx.db
      .query("tabTimeEntries")
      .withIndex("by_agent_running", (q) =>
        q.eq("agentId", args.agentId).eq("isRunning", true)
      )
      .first();

    return running;
  },
});

export const startTimer = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    description: v.string(),
    tags: v.optional(v.array(v.string())),
    taskId: v.optional(v.id("tabTasks")),
    billable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) throw new Error("Tab not found");
    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    // Stop any running timer first
    const running = await ctx.db
      .query("tabTimeEntries")
      .withIndex("by_agent_running", (q) =>
        q.eq("agentId", tab.agentId).eq("isRunning", true)
      )
      .first();

    if (running) {
      const now = Date.now();
      await ctx.db.patch(running._id, {
        isRunning: false,
        endTime: now,
        duration: Math.round((now - running.startTime) / 1000),
      });
    }

    return await ctx.db.insert("tabTimeEntries", {
      tabId: args.tabId,
      agentId: tab.agentId,
      description: args.description,
      startTime: Date.now(),
      isRunning: true,
      tags: args.tags,
      taskId: args.taskId,
      billable: args.billable,
    });
  },
});

export const stopTimer = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    const running = await ctx.db
      .query("tabTimeEntries")
      .withIndex("by_agent_running", (q) =>
        q.eq("agentId", args.agentId).eq("isRunning", true)
      )
      .first();

    if (!running) throw new Error("No timer is currently running");

    const now = Date.now();
    await ctx.db.patch(running._id, {
      isRunning: false,
      endTime: now,
      duration: Math.round((now - running.startTime) / 1000),
    });

    return running._id;
  },
});

export const create = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    description: v.string(),
    durationMinutes: v.number(),
    startTime: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    taskId: v.optional(v.id("tabTasks")),
    billable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) throw new Error("Tab not found");
    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    const durationSec = Math.round(args.durationMinutes * 60);
    const start = args.startTime ?? Date.now() - durationSec * 1000;

    return await ctx.db.insert("tabTimeEntries", {
      tabId: args.tabId,
      agentId: tab.agentId,
      description: args.description,
      startTime: start,
      endTime: start + durationSec * 1000,
      duration: durationSec,
      isRunning: false,
      tags: args.tags,
      taskId: args.taskId,
      billable: args.billable,
    });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("tabTimeEntries"),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    billable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    const agent = await ctx.db.get(entry.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    const { entryId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(entryId, filtered);
  },
});

export const remove = mutation({
  args: { entryId: v.id("tabTimeEntries") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    const agent = await ctx.db.get(entry.agentId);
    if (!agent || agent.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.entryId);
  },
});

export const getSummary = query({
  args: {
    tabId: v.id("sidebarTabs"),
    period: v.optional(v.union(v.literal("today"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) return null;
    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) return null;

    const now = Date.now();
    const period = args.period ?? "today";
    let since: number;
    if (period === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      since = d.getTime();
    } else if (period === "week") {
      since = now - 7 * 24 * 60 * 60 * 1000;
    } else {
      since = now - 30 * 24 * 60 * 60 * 1000;
    }

    const entries = await ctx.db
      .query("tabTimeEntries")
      .withIndex("by_tab_startTime", (q) =>
        q.eq("tabId", args.tabId).gte("startTime", since)
      )
      .collect();

    let totalSeconds = 0;
    let billableSeconds = 0;
    const byTag: Record<string, number> = {};

    for (const e of entries) {
      const dur = e.duration ?? (e.isRunning ? Math.round((now - e.startTime) / 1000) : 0);
      totalSeconds += dur;
      if (e.billable) billableSeconds += dur;
      if (e.tags) {
        for (const tag of e.tags) {
          byTag[tag] = (byTag[tag] ?? 0) + dur;
        }
      }
    }

    return {
      period,
      totalSeconds,
      billableSeconds,
      entryCount: entries.length,
      byTag,
    };
  },
});
