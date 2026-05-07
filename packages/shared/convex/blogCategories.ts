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
    const categories = await ctx.db.query("blogCategories").collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listPublic = query({
  handler: async (ctx) => {
    const categories = await ctx.db.query("blogCategories").collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = slugify(args.name);
    const existing = await ctx.db
      .query("blogCategories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) throw new Error(`Category slug "${slug}" already exists`);

    const all = await ctx.db.query("blogCategories").collect();
    return ctx.db.insert("blogCategories", {
      name: args.name,
      slug,
      description: args.description,
      sortOrder: args.sortOrder ?? all.length,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("blogCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const patch: Record<string, any> = {};
    if (updates.name !== undefined) {
      patch.name = updates.name;
      patch.slug = slugify(updates.name);
      const existing = await ctx.db
        .query("blogCategories")
        .withIndex("by_slug", (q) => q.eq("slug", patch.slug))
        .unique();
      if (existing && existing._id !== id) {
        throw new Error(`Category slug "${patch.slug}" already exists`);
      }
    }
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("blogCategories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();
    if (posts) {
      throw new Error("Cannot delete category that has posts assigned to it");
    }
    await ctx.db.delete(args.id);
  },
});
