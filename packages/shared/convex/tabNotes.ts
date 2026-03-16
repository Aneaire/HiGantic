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
      .query("tabNotes")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect();
  },
});

export const get = query({
  args: { noteId: v.id("tabNotes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) return null;
    await requireTabAccess(ctx, note.tabId);
    return note;
  },
});

export const search = query({
  args: { tabId: v.id("sidebarTabs"), query: v.string() },
  handler: async (ctx, args) => {
    await requireTabAccess(ctx, args.tabId);
    return await ctx.db
      .query("tabNotes")
      .withSearchIndex("search_notes", (q) =>
        q.search("content", args.query).eq("tabId", args.tabId)
      )
      .take(20);
  },
});

export const create = mutation({
  args: {
    tabId: v.id("sidebarTabs"),
    title: v.string(),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { tab } = await requireTabAccess(ctx, args.tabId);
    return await ctx.db.insert("tabNotes", {
      tabId: args.tabId,
      agentId: tab.agentId,
      title: args.title,
      content: args.content ?? "",
      tags: args.tags,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    noteId: v.id("tabNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");
    await requireTabAccess(ctx, note.tabId);

    const { noteId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(noteId, { ...filtered, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { noteId: v.id("tabNotes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");
    await requireTabAccess(ctx, note.tabId);
    await ctx.db.delete(args.noteId);
  },
});
