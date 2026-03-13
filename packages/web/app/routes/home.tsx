import { useQuery } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { Show, SignInButton } from "@clerk/react";
import { useState } from "react";
import { DashboardLayout } from "~/components/DashboardLayout";
import { AgentCard } from "~/components/AgentCard";
import { CreateAgentDialog } from "~/components/CreateAgentDialog";
import { Plus, Bot } from "lucide-react";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Agent Maker" },
    { name: "description", content: "Create and manage your AI agents" },
  ];
}

export default function HomePage() {
  return (
    <DashboardLayout>
      <Show when="signed-out">
        <LandingView />
      </Show>
      <Show when="signed-in">
        <DashboardView />
      </Show>
    </DashboardLayout>
  );
}

function LandingView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mb-6">
        <Bot className="h-8 w-8 text-zinc-300" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Agent Maker</h1>
      <p className="mt-3 text-lg text-zinc-400 max-w-md">
        Create, customize, and interact with your own AI agents. Each agent gets
        its own memory, tools, and chat interface.
      </p>
      <SignInButton mode="modal">
        <button className="mt-8 rounded-lg bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
          Get Started
        </button>
      </SignInButton>
    </div>
  );
}

function DashboardView() {
  const agents = useQuery(api.agents.list);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Your Agents</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>

      {agents === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 mb-4">
            <Bot className="h-6 w-6 text-zinc-500" />
          </div>
          <p className="text-zinc-400">No agents yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-sm text-zinc-300 hover:text-zinc-100 underline underline-offset-4"
          >
            Create your first agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent._id} agent={agent} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAgentDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
