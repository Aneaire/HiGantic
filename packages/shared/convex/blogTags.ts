import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const list = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("blogTags").collect();
  },
});

export const listPublic = query({
  handler: async (ctx) => {
    return ctx.db.query("blogTags").collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = slugify(args.name);
    const existing = await ctx.db
      .query("blogTags")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) throw new Error(`Tag "${args.name}" already exists`);

    return ctx.db.insert("blogTags", {
      name: args.name,
      slug,
      createdAt: Date.now(),
    });
  },
});

export const upsertMany = mutation({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ids: Array<string> = [];
    for (const name of args.names) {
      const slug = slugify(name.trim());
      if (!slug) continue;
      const existing = await ctx.db
        .query("blogTags")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (existing) {
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert("blogTags", {
          name: name.trim(),
          slug,
          createdAt: Date.now(),
        });
        ids.push(id);
      }
    }
    return ids;
  },
});

export const remove = mutation({
  args: { id: v.id("blogTags") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
