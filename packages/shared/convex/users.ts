import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./auth";

export const getOrCreate = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      plan: "free",
      maxAgents: 3,
    });
  },
});

export const upgradeMaxAgents = mutation({
  args: { maxAgents: v.number() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(user._id, { maxAgents: args.maxAgents });
  },
});

export const togglePlan = mutation({
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const newPlan = user.plan === "free" ? "pro" : "free";
    const newMaxAgents = newPlan === "pro" ? 25 : 3;

    await ctx.db.patch(user._id, { plan: newPlan, maxAgents: newMaxAgents });
    return { plan: newPlan };
  },
});

export const completeOnboarding = mutation({
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(user._id, { hasCompletedOnboarding: true });
  },
});

export const me = query({
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});
