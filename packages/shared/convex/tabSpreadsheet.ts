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

// ── Columns ──────────────────────────────────────────────────────────

export const listColumns = query({
  args: { tabId: v.id("sidebarTabs") },
  handler: async (ctx, args) => {
    await requireTabAccess(ctx, args.tabId);
    const cols = await ctx.db
      .query("tabSpreadsheetColumns")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();
    return cols.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const addColumn = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    name: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("date"),
      v.literal("checkbox")
    ),
  },
  handler: async (ctx, args) => {
    const { tab } = await requireTabAccess(ctx, args.tabId);

    // Max 100 columns
    const existing = await ctx.db
      .query("tabSpreadsheetColumns")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();

    if (existing.length >= 100) {
      throw new Error("Maximum 100 columns per spreadsheet");
    }

    const maxOrder = existing.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      -1
    );

    return await ctx.db.insert("tabSpreadsheetColumns", {
      tabId: args.tabId,
      agentId: tab.agentId,
      name: args.name,
      type: args.type,
      sortOrder: maxOrder + 1,
    });
  },
});

export const removeColumn = mutation({
  args: { columnId: v.id("tabSpreadsheetColumns") },
  handler: async (ctx, args) => {
    const col = await ctx.db.get(args.columnId);
    if (!col) throw new Error("Column not found");
    await requireTabAccess(ctx, col.tabId);
    await ctx.db.delete(args.columnId);
  },
});

// ── Rows ─────────────────────────────────────────────────────────────

export const listRows = query({
  args: { tabId: v.id("sidebarTabs") },
  handler: async (ctx, args) => {
    await requireTabAccess(ctx, args.tabId);
    const rows = await ctx.db
      .query("tabSpreadsheetRows")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();
    return rows.sort((a, b) => a.rowIndex - b.rowIndex);
  },
});

export const addRow = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const { tab } = await requireTabAccess(ctx, args.tabId);

    // Max 10,000 rows
    const existing = await ctx.db
      .query("tabSpreadsheetRows")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();

    if (existing.length >= 10000) {
      throw new Error("Maximum 10,000 rows per spreadsheet");
    }

    const maxIndex = existing.reduce(
      (max, r) => Math.max(max, r.rowIndex),
      -1
    );

    return await ctx.db.insert("tabSpreadsheetRows", {
      tabId: args.tabId,
      agentId: tab.agentId,
      rowIndex: maxIndex + 1,
      data: args.data,
    });
  },
});

export const updateRow = mutation({
  args: {
    rowId: v.id("tabSpreadsheetRows"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) throw new Error("Row not found");
    await requireTabAccess(ctx, row.tabId);
    await ctx.db.patch(args.rowId, { data: args.data });
  },
});

export const removeRow = mutation({
  args: { rowId: v.id("tabSpreadsheetRows") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) throw new Error("Row not found");
    await requireTabAccess(ctx, row.tabId);
    await ctx.db.delete(args.rowId);
  },
});
