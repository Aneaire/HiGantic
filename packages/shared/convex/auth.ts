import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const clerkId = identity.subject;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();

  return user;
}

export async function requireAuthUser(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

/** For mutations: get or auto-create the user record */
export async function getOrCreateAuthUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const clerkId = identity.subject;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();

  if (existing) return existing;

  const userId = await ctx.db.insert("users", {
    clerkId,
    email: identity.email ?? "",
    name: identity.name,
    imageUrl: identity.pictureUrl,
    plan: "free",
    maxAgents: 1,
  });

  return (await ctx.db.get(userId))!;
}
