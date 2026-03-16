import { useOutletContext, useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { Bot, MessageSquare, Brain, Settings } from "lucide-react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export default function AgentIndexPage() {
  const { agent } = useOutletContext<{ agent: Doc<"agents"> }>();
  const navigate = useNavigate();
  const createConversation = useMutation(api.conversations.create);

  async function handleStartChat() {
    const id = await createConversation({ agentId: agent._id });
    navigate(`/agents/${agent._id}/chat/${id}`);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mx-auto mb-6">
          <Bot className="h-8 w-8 text-zinc-300" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{agent.name}</h1>
        {agent.description && (
          <p className="text-zinc-400 mb-8">{agent.description}</p>
        )}

        <div className="grid gap-3">
          <button
            onClick={handleStartChat}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 cursor-pointer transition-colors text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">Start a Chat</div>
              <div className="text-sm text-zinc-500">
                Begin a new conversation
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left">
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
    </div>
  );
}
