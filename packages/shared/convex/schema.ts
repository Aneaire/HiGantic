import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    maxAgents: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  agents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    model: v.string(),
    enabledToolSets: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("draft")
    ),
    iconUrl: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"]),

  agentToolConfigs: defineTable({
    agentId: v.id("agents"),
    toolSetName: v.string(),
    config: v.any(),
  }).index("by_agent", ["agentId"]),

  customTools: defineTable({
    agentId: v.id("agents"),
    name: v.string(),
    description: v.string(),
    inputSchema: v.any(),
    endpoint: v.string(),
    method: v.union(
      v.literal("GET"),
      v.literal("POST"),
      v.literal("PUT"),
      v.literal("DELETE"),
      v.literal("PATCH")
    ),
    headers: v.optional(v.any()),
  }).index("by_agent", ["agentId"]),

  sidebarTabs: defineTable({
    agentId: v.id("agents"),
    label: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    type: v.union(
      v.literal("memories"),
      v.literal("data_table"),
      v.literal("iframe"),
      v.literal("markdown"),
      v.literal("kanban")
    ),
    config: v.optional(v.any()),
    sortOrder: v.number(),
  }).index("by_agent", ["agentId"]),

  conversations: defineTable({
    agentId: v.id("agents"),
    userId: v.id("users"),
    title: v.optional(v.string()),
  })
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_agent_and_user", ["agentId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("error")
    ),
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          input: v.any(),
          output: v.optional(v.string()),
        })
      )
    ),
    error: v.optional(v.string()),
  }).index("by_conversation", ["conversationId"]),

  memories: defineTable({
    agentId: v.id("agents"),
    content: v.string(),
    category: v.optional(v.string()),
  })
    .index("by_agent", ["agentId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["agentId"],
    }),

  agentJobs: defineTable({
    agentId: v.id("agents"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("error")
    ),
    workerId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_agent", ["agentId"])
    .index("by_user_status", ["userId", "status"]),

  creatorSessions: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned")
    ),
    partialConfig: v.optional(v.any()),
    agentId: v.optional(v.id("agents")),
    conversationId: v.optional(v.id("conversations")),
  }).index("by_user", ["userId"]),
});
