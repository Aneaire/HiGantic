import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { jobId: v.id("agentJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const listPending = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(50);
  },
});

export const claim = mutation({
  args: {
    jobId: v.id("agentJobs"),
    workerId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "pending") return false;

    await ctx.db.patch(args.jobId, {
      status: "processing",
      workerId: args.workerId,
      startedAt: Date.now(),
    });
    return true;
  },
});

export const complete = mutation({
  args: { jobId: v.id("agentJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    await ctx.db.patch(args.jobId, {
      status: "done",
      completedAt: Date.now(),
    });
  },
});

export const fail = mutation({
  args: {
    jobId: v.id("agentJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    await ctx.db.patch(args.jobId, {
      status: "error",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});
