import { useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useNavigate } from "react-router";
import { useState } from "react";
import {
  Wand2,
  ChevronLeft,
  Loader2,
  ArrowRight,
  LayoutTemplate,
} from "lucide-react";
import { Link } from "react-router";
import {
  PERSONAL_TEMPLATES,
  BUSINESS_TEMPLATES,
  type Template,
} from "~/lib/templates";

export default function NewAgentPage() {
  const navigate = useNavigate();
  const createFromTemplate = useMutation(api.agents.createFromTemplate);
  const [creating, setCreating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "business">("personal");
  const templates = activeTab === "personal" ? PERSONAL_TEMPLATES : BUSINESS_TEMPLATES;

  async function handleTemplateSelect(template: Template) {
    setCreating(template.id);
    try {
      const agentId = await createFromTemplate({
        name: template.name,
        description: template.description,
        systemPrompt: template.systemPrompt,
        model: template.model,
        enabledToolSets: template.enabledToolSets,
        starterPages: template.starterPages,
        starterEndpoints: template.starterEndpoints,
      });
      navigate(`/agents/${agentId}`);
    } catch (err: any) {
      alert(err.message);
      setCreating(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Dashboard
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm font-medium">New Agent</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight">
            Create a New Agent
          </h1>
          <p className="mt-3 text-zinc-400 text-base">
            Start from a template or build a custom agent with AI guidance
          </p>
        </div>

        {/* Build with AI Card */}
        <div className="mb-10">
          <Link
            to="/agents/new/creator"
            className="group block rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 p-6 hover:border-zinc-600 hover:from-zinc-800/80 hover:to-zinc-900/80 transition-all"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/5 ring-1 ring-violet-500/20">
                <Wand2 className="h-7 w-7 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Build with AI</h2>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Chat with an AI assistant that guides you through creating a
                  fully customized agent — name, personality, tools, pages, and
                  API endpoints
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
            </div>
          </Link>
        </div>

        {/* Templates Section */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <LayoutTemplate className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Templates
            </h2>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 mb-6 bg-zinc-900/50 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "personal"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab("business")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "business"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Business
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              const isCreating = creating === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  disabled={creating !== null}
                  className="group text-left rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-600 hover:bg-zinc-900/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${template.color} ring-1`}
                    >
                      {isCreating ? (
                        <Loader2 className="h-5 w-5 text-zinc-300 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5 text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold group-hover:text-white transition-colors">
                        {template.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  {/* Pages preview */}
                  <div className="mt-3 flex flex-wrap gap-1.5 ml-15">
                    {template.starterPages.map((page) => (
                      <span
                        key={page.label}
                        className="text-[10px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full"
                      >
                        {page.label}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
