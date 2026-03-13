import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("agents/:agentId", "routes/agents.$agentId.tsx"),
] satisfies RouteConfig;
