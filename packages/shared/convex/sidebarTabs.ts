import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

export const list = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) return [];

    const tabs = await ctx.db
      .query("sidebarTabs")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    return tabs.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const get = query({
  args: { tabId: v.id("sidebarTabs") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) return null;

    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) return null;

    return tab;
  },
});

export const getBySlug = query({
  args: { agentId: v.id("agents"), slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) return null;

    const tabs = await ctx.db
      .query("sidebarTabs")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    return tabs.find((t) => t.slug === args.slug) ?? null;
  },
});

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    label: v.string(),
    type: v.union(
      v.literal("tasks"),
      v.literal("notes"),
      v.literal("spreadsheet"),
      v.literal("markdown"),
      v.literal("data_table"),
      v.literal("postgres"),
      v.literal("api"),
      v.literal("workflow"),
      v.literal("time_tracking")
    ),
    icon: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Agent not found");
    }

    // Plan-gate page types
    const plan = user.plan as "free" | "pro" | "enterprise";
    const allowedFree = ["tasks", "notes", "markdown", "data_table"];
    const allowedPro = [...allowedFree, "spreadsheet", "postgres", "api", "workflow", "time_tracking"];
    const allowed = plan === "free" ? allowedFree : allowedPro;
    if (!allowed.includes(args.type)) {
      throw new Error(
        `Page type "${args.type}" is not available on the ${plan} plan. Upgrade to access this feature.`
      );
    }

    // Postgres requires Pro+ plan
    if (args.type === "postgres" && plan === "free") {
      throw new Error("PostgreSQL connections require a Pro or Enterprise plan.");
    }

    // Generate slug
    const slug = args.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Get existing tabs and enforce limits
    const existing = await ctx.db
      .query("sidebarTabs")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const maxPages = plan === "enterprise" ? 50 : plan === "pro" ? 20 : 5;
    if (existing.length >= maxPages) {
      throw new Error(`Page limit reached (${maxPages} for ${plan} plan).`);
    }

    const maxOrder = existing.reduce(
      (max, t) => Math.max(max, t.sortOrder),
      -1
    );

    return await ctx.db.insert("sidebarTabs", {
      agentId: args.agentId,
      label: args.label,
      slug,
      icon: args.icon,
      type: args.type,
      config: args.config,
      sortOrder: maxOrder + 1,
    });
  },
});

export const update = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    label: v.optional(v.string()),
    icon: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) throw new Error("Tab not found");

    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const { tabId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    if (filtered.label) {
      (filtered as Record<string, unknown>).slug = (filtered.label as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    await ctx.db.patch(tabId, filtered);
  },
});

export const remove = mutation({
  args: { tabId: v.id("sidebarTabs") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const tab = await ctx.db.get(args.tabId);
    if (!tab) throw new Error("Tab not found");

    const agent = await ctx.db.get(tab.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Delete backing data based on type
    if (tab.type === "tasks") {
      const tasks = await ctx.db
        .query("tabTasks")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const t of tasks) await ctx.db.delete(t._id);
    } else if (tab.type === "notes") {
      const notes = await ctx.db
        .query("tabNotes")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const n of notes) await ctx.db.delete(n._id);
    } else if (tab.type === "spreadsheet") {
      const cols = await ctx.db
        .query("tabSpreadsheetColumns")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const c of cols) await ctx.db.delete(c._id);
      const rows = await ctx.db
        .query("tabSpreadsheetRows")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    } else if (tab.type === "postgres") {
      const dbs = await ctx.db
        .query("agentDatabases")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const d of dbs) await ctx.db.delete(d._id);
    } else if (tab.type === "api") {
      const endpoints = await ctx.db
        .query("tabApiEndpoints")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const e of endpoints) await ctx.db.delete(e._id);
    } else if (tab.type === "time_tracking") {
      const entries = await ctx.db
        .query("tabTimeEntries")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
        .collect();
      for (const e of entries) await ctx.db.delete(e._id);
    }

    await ctx.db.delete(args.tabId);
  },
});

export const reorder = mutation({
  args: {
    agentId: v.id("agents"),
    tabIds: v.array(v.id("sidebarTabs")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Not authorized");
    }

    for (let i = 0; i < args.tabIds.length; i++) {
      await ctx.db.patch(args.tabIds[i], { sortOrder: i });
    }
  },
});
