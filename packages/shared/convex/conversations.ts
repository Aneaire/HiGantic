import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./auth";

export const list = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    return await ctx.db
      .query("conversations")
      .withIndex("by_agent_and_user", (q) =>
        q.eq("agentId", args.agentId).eq("userId", user._id)
      )
      .order("desc")
      .collect();
  },
});

/**
 * List Slack-originated conversations for an agent, grouped by channel.
 * Each entry includes the conversation title, last mentioner name, last activity,
 * and the slack conversation map metadata (channel, thread, mode).
 */
export const listSlackConversationsForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) return [];

    const maps = await ctx.db
      .query("slackConversationMap")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const enriched = await Promise.all(
      maps.map(async (m) => {
        const conv = await ctx.db.get(m.conversationId);
        return {
          _id: m._id,
          conversationId: m.conversationId,
          slackChannelId: m.slackChannelId,
          slackChannelName: m.slackChannelName,
          slackThreadTs: m.slackThreadTs,
          channelType: m.channelType,
          mode: m.mode,
          lastMentionerUserId: m.lastMentionerUserId,
          lastMentionerUserName: m.lastMentionerUserName,
          title: conv?.title ?? null,
          lastActivity: conv?._creationTime ?? m._creationTime,
        };
      })
    );

    return enriched
      .filter((e) => e.title !== null)
      .sort((a, b) => b.lastActivity - a.lastActivity);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) return null;
    return conv;
  },
});

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== user._id) {
      throw new Error("Agent not found");
    }

    return await ctx.db.insert("conversations", {
      agentId: args.agentId,
      userId: user._id,
      title: args.title,
    });
  },
});

export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }
    await ctx.db.patch(args.conversationId, { title: args.title });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }
    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(args.conversationId);
  },
});
