import { useQuery } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useParams, Link } from "react-router";
import { DashboardLayout } from "~/components/DashboardLayout";
import { Bot, MessageSquare, Brain, Settings } from "lucide-react";
import type { Id } from "@agent-maker/shared/convex/_generated/dataModel";

export default function AgentDetailPage() {
  const { agentId } = useParams();
  const agent = useQuery(api.agents.get, {
    agentId: agentId as Id<"agents">,
  });

  if (agent === undefined) {
    return (
      <DashboardLayout>
        <div className="animate-pulse h-64 rounded-xl bg-zinc-900 border border-zinc-800" />
      </DashboardLayout>
    );
  }

  if (agent === null) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-zinc-400">Agent not found</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-zinc-300 hover:text-zinc-100 underline underline-offset-4"
          >
            Back to dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800">
            <Bot className="h-7 w-7 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            {agent.description && (
              <p className="text-zinc-400 mt-1">{agent.description}</p>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <NavItem
            icon={<MessageSquare className="h-5 w-5" />}
            label="Chat"
            description="Start a conversation with this agent"
            disabled
            hint="Coming in Phase 3"
          />
          <NavItem
            icon={<Brain className="h-5 w-5" />}
            label="Memories"
            description="View and manage agent memories"
            disabled
            hint="Coming in Phase 3"
          />
          <NavItem
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            description="Configure agent behavior and tools"
            disabled
            hint="Coming in Phase 6"
          />
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">
            System Prompt
          </h3>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-950 rounded-lg p-4 max-h-64 overflow-y-auto">
            {agent.systemPrompt}
          </pre>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">
            Configuration
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Model:</span>{" "}
              <span className="text-zinc-300">{agent.model}</span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{" "}
              <span className="text-zinc-300">{agent.status}</span>
            </div>
            <div>
              <span className="text-zinc-500">Tools:</span>{" "}
              <span className="text-zinc-300">
                {agent.enabledToolSets.join(", ") || "None"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Slug:</span>{" "}
              <span className="text-zinc-300">{agent.slug}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function NavItem({
  icon,
  label,
  description,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-zinc-700 cursor-pointer"
      } transition-colors`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-zinc-500">{description}</div>
      </div>
      {hint && <span className="text-xs text-zinc-600">{hint}</span>}
    </div>
  );
}
