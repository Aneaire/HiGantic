import { Link } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { Bot, Trash2 } from "lucide-react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export function AgentCard({ agent }: { agent: Doc<"agents"> }) {
  const removeAgent = useMutation(api.agents.remove);

  return (
    <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors">
      <Link to={`/agents/${agent._id}`} className="block">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
            <Bot className="h-5 w-5 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{agent.name}</h3>
            {agent.description && (
              <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                {agent.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              agent.status === "active"
                ? "bg-emerald-950 text-emerald-400"
                : agent.status === "paused"
                  ? "bg-amber-950 text-amber-400"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {agent.status}
          </span>
          <span className="text-xs text-zinc-500">{agent.model}</span>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`Delete "${agent.name}"?`)) {
            removeAgent({ agentId: agent._id });
          }
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
