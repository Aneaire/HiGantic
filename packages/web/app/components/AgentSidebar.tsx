import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import {
  Bot,
  MessageSquare,
  Brain,
  Settings,
  Plus,
  ChevronLeft,
  CheckSquare,
  FileText,
  Table,
  Type,
  Database,
  LayoutGrid,
  Globe,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

const TAB_ICONS: Record<string, React.ReactNode> = {
  tasks: <CheckSquare className="h-4 w-4" />,
  notes: <FileText className="h-4 w-4" />,
  spreadsheet: <Table className="h-4 w-4" />,
  markdown: <Type className="h-4 w-4" />,
  postgres: <Database className="h-4 w-4" />,
  api: <Globe className="h-4 w-4" />,
};

const PAGE_TYPES = [
  { type: "tasks" as const, label: "Tasks", description: "Kanban board", icon: CheckSquare },
  { type: "notes" as const, label: "Notes", description: "Markdown notes", icon: FileText },
  { type: "spreadsheet" as const, label: "Spreadsheet", description: "Data table", icon: Table },
  { type: "markdown" as const, label: "Markdown Page", description: "Read-only page", icon: Type },
  { type: "api" as const, label: "REST API", description: "Expose agent as API", icon: Globe },
];

export function AgentSidebar({ agent }: { agent: Doc<"agents"> }) {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const conversations = useQuery(api.conversations.list, {
    agentId: agent._id,
  });
  const tabs = useQuery(api.sidebarTabs.list, { agentId: agent._id });
  const createConversation = useMutation(api.conversations.create);
  const createTab = useMutation(api.sidebarTabs.create);
  const [showAddPage, setShowAddPage] = useState(false);

  async function handleNewChat() {
    const id = await createConversation({ agentId: agent._id });
    navigate(`/agents/${agent._id}/chat/${id}`);
  }

  async function handleAddPage(type: string, label: string) {
    const tabId = await createTab({
      agentId: agent._id,
      label,
      type: type as any,
    });
    setShowAddPage(false);
    navigate(`/agents/${agent._id}/tab/${tabId}`);
  }

  return (
    <aside className="w-64 border-r border-zinc-800/60 flex flex-col bg-zinc-950 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/60">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors mb-3 group"
        >
          <ChevronLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-zinc-700/50">
            <Bot className="h-5 w-5 text-zinc-300" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{agent.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  agent.status === "active"
                    ? "bg-emerald-400 animate-pulse"
                    : agent.status === "paused"
                      ? "bg-amber-400"
                      : "bg-zinc-600"
                }`}
              />
              <span className="text-xs text-zinc-500">{agent.model}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 space-y-0.5">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 transition-all group"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </div>
          New Chat
        </button>
        <Link
          to={`/agents/${agent._id}/memories`}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
            location.pathname.endsWith("/memories")
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
          }`}
        >
          <Brain className="h-4 w-4" />
          Memories
        </Link>
      </nav>

      {/* Dynamic Pages */}
      {tabs && tabs.length > 0 && (
        <div className="px-2 pb-1">
          <div className="text-[10px] text-zinc-600 px-3 py-2 font-semibold uppercase tracking-widest">
            Pages
          </div>
          <div className="space-y-0.5">
            {tabs.map((tab) => (
              <Link
                key={tab._id}
                to={`/agents/${agent._id}/tab/${tab._id}`}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all ${
                  location.pathname.includes(`/tab/${tab._id}`)
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                {TAB_ICONS[tab.type] ?? <LayoutGrid className="h-4 w-4" />}
                <span className="truncate">{tab.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add Page */}
      <div className="px-2 pb-1 relative">
        <button
          onClick={() => setShowAddPage(!showAddPage)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400 transition-all"
        >
          <Plus className="h-3 w-3" />
          Add Page
        </button>
        {showAddPage && (
          <div className="absolute left-2 right-2 mt-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl shadow-black/30 z-10">
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Add a page
              </span>
              <button
                onClick={() => setShowAddPage(false)}
                className="p-0.5 rounded text-zinc-600 hover:text-zinc-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {PAGE_TYPES.map((pt) => {
              const Icon = pt.icon;
              return (
                <button
                  key={pt.type}
                  onClick={() => handleAddPage(pt.type, pt.label)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Icon className="h-4 w-4 text-zinc-500" />
                  <div className="text-left">
                    <div className="font-medium">{pt.label}</div>
                    <div className="text-zinc-600 text-[10px]">
                      {pt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="text-[10px] text-zinc-600 px-3 py-2 font-semibold uppercase tracking-widest">
          Conversations
        </div>
        {conversations === undefined ? (
          <div className="space-y-1.5 px-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 rounded-xl bg-zinc-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-zinc-600 px-3 py-2">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <Link
                key={conv._id}
                to={`/agents/${agent._id}/chat/${conv._id}`}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all ${
                  conversationId === conv._id
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {conv.title || "New conversation"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-800/60">
        <Link
          to={`/agents/${agent._id}`}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
            location.pathname === `/agents/${agent._id}`
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
