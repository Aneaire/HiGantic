import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("agents/new", "routes/agents.new.tsx"),
  route("agents/:agentId", "routes/agents.$agentId.tsx", [
    index("routes/agents.$agentId.index.tsx"),
    route("chat/:conversationId", "routes/agents.$agentId.chat.$conversationId.tsx"),
    route("memories", "routes/agents.$agentId.memories.tsx"),
    route("tab/:tabId", "routes/agents.$agentId.tab.$tabId.tsx"),
    route("settings", "routes/agents.$agentId.settings.tsx"),
  ]),
] satisfies RouteConfig;
