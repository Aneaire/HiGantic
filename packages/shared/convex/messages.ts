import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Create user message
    const userMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      status: "done",
    });

    // Create placeholder assistant message
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      status: "pending",
    });

    // Check rate limit: concurrent active jobs for this user
    const activeJobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "processing")
      )
      .collect();

    const pendingJobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "pending")
      )
      .collect();

    const concurrentJobs = activeJobs.length + pendingJobs.length;
    const maxConcurrent =
      user.plan === "enterprise" ? 20 : user.plan === "pro" ? 5 : 1;

    if (concurrentJobs >= maxConcurrent) {
      await ctx.db.patch(assistantMessageId, {
        status: "error",
        error: `Rate limited: ${concurrentJobs} active jobs (max ${maxConcurrent} for ${user.plan} plan)`,
      });
      return { userMessageId, assistantMessageId, rateLimited: true };
    }

    // Enqueue job
    const agent = await ctx.db.get(conv.agentId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.insert("agentJobs", {
      agentId: conv.agentId,
      conversationId: args.conversationId,
      messageId: assistantMessageId,
      userId: user._id,
      status: "pending",
    });

    return { userMessageId, assistantMessageId, rateLimited: false };
  },
});

export const updateContent = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { content: args.content });
  },
});

export const stop = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Find active assistant messages and mark them done
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const msg of messages) {
      if (
        msg.role === "assistant" &&
        (msg.status === "pending" || msg.status === "processing")
      ) {
        await ctx.db.patch(msg._id, {
          status: "done",
          content: msg.content || "(Stopped)",
        });
      }
    }

    // Also mark any pending/processing jobs as done
    const jobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_agent", (q) => q.eq("agentId", conv.agentId))
      .collect();

    for (const job of jobs) {
      if (
        job.conversationId === args.conversationId &&
        (job.status === "pending" || job.status === "processing")
      ) {
        await ctx.db.patch(job._id, {
          status: "done",
          completedAt: Date.now(),
        });
      }
    }
  },
});

export const updateStatus = mutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = { status: args.status };
    if (args.error) update.error = args.error;
    await ctx.db.patch(args.messageId, update);
  },
});
