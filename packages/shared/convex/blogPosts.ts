import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function computeReadingTime(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/[#*_~\[\]()>|\\-]/g, "")
    .replace(/!?\[.*?\]\(.*?\)/g, "")
    .trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── Admin Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("scheduled"))
    ),
    categoryId: v.optional(v.id("blogCategories")),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.searchQuery && args.searchQuery.trim().length > 0) {
      let searchBuilder = ctx.db
        .query("blogPosts")
        .withSearchIndex("search_title", (q) => {
          let s = q.search("title", args.searchQuery!);
          if (args.status) s = s.eq("status", args.status);
          return s;
        });
      return searchBuilder.collect();
    }

    if (args.status) {
      const posts = await ctx.db
        .query("blogPosts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      if (args.categoryId) {
        return posts.filter((p) => p.categoryId === args.categoryId);
      }
      return posts.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    if (args.categoryId) {
      return ctx.db
        .query("blogPosts")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
    }

    const posts = await ctx.db.query("blogPosts").collect();
    return posts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getById = query({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");

    let featuredImageUrl: string | null = null;
    let ogImageUrl: string | null = null;
    if (post.featuredImageStorageId) {
      featuredImageUrl = await ctx.storage.getUrl(post.featuredImageStorageId);
    }
    if (post.ogImageStorageId) {
      ogImageUrl = await ctx.storage.getUrl(post.ogImageStorageId);
    }
    return { ...post, featuredImageUrl, ogImageUrl };
  },
});

// ── Public Queries ────────────────────────────────────────────────────

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!post || post.status !== "published" || !post.publishedAt) return null;
    if (post.publishedAt > Date.now()) return null;

    let featuredImageUrl: string | null = null;
    let ogImageUrl: string | null = null;
    if (post.featuredImageStorageId) {
      featuredImageUrl = await ctx.storage.getUrl(post.featuredImageStorageId);
    }
    if (post.ogImageStorageId) {
      ogImageUrl = await ctx.storage.getUrl(post.ogImageStorageId);
    }

    let category = null;
    if (post.categoryId) {
      category = await ctx.db.get(post.categoryId);
    }

    let tags: Array<{ _id: string; name: string; slug: string }> = [];
    if (post.tagIds?.length) {
      const resolved = await Promise.all(post.tagIds.map((id) => ctx.db.get(id)));
      tags = resolved.filter(Boolean) as any;
    }

    return { ...post, featuredImageUrl, ogImageUrl, category, tags };
  },
});

export const listPublished = query({
  handler: async (ctx) => {
    const now = Date.now();
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .collect();

    const published = posts
      .filter((p) => p.publishedAt && p.publishedAt <= now)
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

    return Promise.all(
      published.map(async (post) => {
        let featuredImageUrl: string | null = null;
        if (post.featuredImageStorageId) {
          featuredImageUrl = await ctx.storage.getUrl(post.featuredImageStorageId);
        }
        let category = null;
        if (post.categoryId) {
          category = await ctx.db.get(post.categoryId);
        }
        return {
          _id: post._id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          featuredImageUrl,
          category,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          readingTimeMinutes: post.readingTimeMinutes,
        };
      })
    );
  },
});

export const listPublishedSlugs = query({
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    return posts.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
  },
});

// ── Admin Mutations ───────────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    excerpt: v.string(),
    content: v.string(),
    categoryId: v.optional(v.id("blogCategories")),
    tagIds: v.optional(v.array(v.id("blogTags"))),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("scheduled"))
    ),
    scheduledAt: v.optional(v.number()),
    aiGenerated: v.optional(v.boolean()),
    aiModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const slug = args.slug || slugify(args.title);

    const existing = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) throw new Error(`Slug "${slug}" already exists`);

    const now = Date.now();
    const status = args.status ?? "draft";

    return ctx.db.insert("blogPosts", {
      title: args.title,
      slug,
      excerpt: args.excerpt,
      content: args.content,
      readingTimeMinutes: computeReadingTime(args.content),
      categoryId: args.categoryId,
      tagIds: args.tagIds,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      authorName: identity.name ?? "Admin",
      authorEmail: identity.email ?? "admin@higantic.com",
      status,
      publishedAt: status === "published" ? now : undefined,
      scheduledAt: args.scheduledAt,
      aiGenerated: args.aiGenerated,
      aiModel: args.aiModel,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("blogPosts"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    categoryId: v.optional(v.id("blogCategories")),
    tagIds: v.optional(v.array(v.id("blogTags"))),
    featuredImageStorageId: v.optional(v.id("_storage")),
    ogImageStorageId: v.optional(v.id("_storage")),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("scheduled"))
    ),
    scheduledAt: v.optional(v.number()),
    aiGenerated: v.optional(v.boolean()),
    aiModel: v.optional(v.string()),
    aiImageModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const post = await ctx.db.get(id);
    if (!post) throw new Error("Post not found");

    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (updates.slug !== undefined && updates.slug !== post.slug) {
      const existing = await ctx.db
        .query("blogPosts")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug!))
        .unique();
      if (existing && existing._id !== id) {
        throw new Error(`Slug "${updates.slug}" already exists`);
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (updates.content !== undefined) {
      patch.readingTimeMinutes = computeReadingTime(updates.content);
    }

    if (updates.status === "published" && post.status !== "published") {
      patch.publishedAt = Date.now();
    }

    await ctx.db.patch(id, patch);
  },
});

export const publish = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: "draft",
      publishedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    if (post.featuredImageStorageId) {
      await ctx.storage.delete(post.featuredImageStorageId);
    }
    if (post.ogImageStorageId) {
      await ctx.storage.delete(post.ogImageStorageId);
    }
    await ctx.db.delete(args.id);
  },
});

// ── Internal (for actions like blogGeneration.ts) ─────────────────────

export const _getById = internalQuery({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const _patchImage = internalMutation({
  args: {
    id: v.id("blogPosts"),
    featuredImageStorageId: v.optional(v.id("_storage")),
    ogImageStorageId: v.optional(v.id("_storage")),
    aiImageModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});
