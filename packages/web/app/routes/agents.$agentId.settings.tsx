import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useOutletContext } from "react-router";
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Wrench,
  Bot,
  Upload,
  Loader2,
  Image,
  Wand2,
  X,
  Sparkles,
  ArrowUp,
  FileText,
  RotateCcw,
  Check,
  Cpu,
  Pencil,
} from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";
import { CredentialManager } from "~/components/CredentialManager";
import { TOOL_SETS_REQUIRING_CREDENTIALS } from "@agent-maker/shared/src/credential-types";
import {
  TOOL_SET_REGISTRY,
  getToolSetsByCategory,
  getToolSetLabel,
} from "@agent-maker/shared/src/tool-set-registry";

type ToolSetCategory = {
  title: string;
  description: string;
  items: { key: string; label: string; description: string }[];
};

const CAPABILITY_CATEGORIES: ToolSetCategory[] = [
  ...getToolSetsByCategory("core"),
  ...getToolSetsByCategory("automation"),
];

const INTEGRATION_CATEGORIES: ToolSetCategory[] = getToolSetsByCategory("integration");

const AGENT_SERVER_URL =
  typeof window !== "undefined"
    ? (import.meta.env.VITE_AGENT_SERVER_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`)
    : (import.meta.env.VITE_AGENT_SERVER_URL ?? "http://localhost:3001");

const SECTION_TITLES: Record<string, string> = {
  general: "General",
  models: "Models",
  capabilities: "Capabilities",
  integrations: "Integrations",
  tools: "Tools",
};

// ── Shared input / label primitives ──────────────────────────────────

const inputClass =
  "w-full bg-transparent border-0 border-b border-rule-strong pb-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors";

const monoInputClass =
  "w-full bg-transparent border-0 border-b border-rule-strong pb-2 text-sm font-mono text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors";

const selectClass =
  "w-full bg-surface-sunken border border-rule px-3 py-2 text-sm text-ink focus:border-rule-strong focus:outline-none transition-colors";

const textareaClass =
  "w-full bg-transparent border-0 border-b border-rule-strong pb-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors resize-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="eyebrow block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Mini toggle (disc inside bar) ──────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center border transition-colors ${
        on ? "bg-ink border-ink" : "bg-surface-sunken border-rule-strong"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 border transition-transform ${
          on ? "translate-x-[18px] bg-surface border-surface" : "translate-x-0.5 bg-ink-faint border-ink-faint"
        }`}
      />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { agent, settingsSection } = useOutletContext<{
    agent: Doc<"agents">;
    settingsSection: string;
  }>();
  const section = settingsSection || "general";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
        {/* Section header */}
        <div className="flex items-baseline justify-between border-b border-rule pb-4">
          <div>
            <p className="eyebrow">Settings</p>
            <h1 className="mt-1 font-display text-2xl text-ink">
              {SECTION_TITLES[section] ?? "Settings"}
            </h1>
          </div>
          <Link
            to={`/agents/${agent._id}/editor`}
            className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            <Wand2 className="h-3 w-3" strokeWidth={1.5} />
            Edit with AI
          </Link>
        </div>

        {section === "general" && (
          <>
            <AgentIconSection agent={agent} />
            <AgentConfigSection agent={agent} />
          </>
        )}

        {section === "models" && <EnabledModelsSection agent={agent} />}

        {section === "capabilities" && <ToolSetsSection agent={agent} />}

        {section === "integrations" && (
          <>
            <IntegrationsSection agent={agent} />
            {(agent.enabledToolSets ?? [])
              .filter((ts) => TOOL_SETS_REQUIRING_CREDENTIALS[ts])
              .map((ts) => (
                <section key={ts} className="border border-rule p-6 bg-surface">
                  <p className="eyebrow mb-4">
                    {getToolSetLabel(ts)} Credentials
                  </p>
                  <CredentialManager agent={agent} toolSetName={ts} />
                </section>
              ))}
            {(agent.enabledToolSets ?? []).includes("discord") && (
              <DiscordBotSection agent={agent} />
            )}
            {(agent.enabledToolSets ?? []).includes("slack") && (
              <SlackBotSection agent={agent} />
            )}
          </>
        )}

        {section === "tools" && (
          <>
            {(agent.enabledToolSets ?? []).includes("rag") && (
              <DocumentsSection agent={agent} />
            )}
            <CustomToolsSection agent={agent} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Agent Icon ────────────────────────────────────────────────────────

function AgentIconSection({ agent }: { agent: Doc<"agents"> }) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const setIcon = useMutation(api.agents.setIcon);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await setIcon({ agentId: agent._id, storageId });
    } catch (err: any) {
      alert("Failed to upload icon");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="border border-rule p-6 bg-surface">
      <p className="eyebrow mb-4">Agent Icon</p>
      <div className="flex items-center gap-4">
        {agent.iconUrl ? (
          <img
            src={agent.iconUrl}
            alt="Agent icon"
            className="h-16 w-16 object-cover border border-rule"
          />
        ) : (
          <div className="h-16 w-16 border border-rule bg-surface-sunken flex items-center justify-center">
            <Bot className="h-7 w-7 text-ink-faint" strokeWidth={1.5} />
          </div>
        )}
        <div>
          <label
            className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] font-semibold text-ink-muted hover:text-ink cursor-pointer transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
            ) : (
              <Upload className="h-3 w-3" strokeWidth={1.5} />
            )}
            {uploading ? "Uploading…" : "Upload new icon"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <p className="text-[10px] text-ink-faint mt-1">PNG, JPG up to 2MB</p>
        </div>
      </div>
    </section>
  );
}

// ── Agent Config ─────────────────────────────────────────────────────

function AgentConfigSection({ agent }: { agent: Doc<"agents"> }) {
  const updateAgent = useMutation(api.agents.update);
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [saving, setSaving] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description ?? "");
    setSystemPrompt(agent.systemPrompt);
  }, [agent]);

  const hasChanges =
    name !== agent.name ||
    description !== (agent.description ?? "") ||
    systemPrompt !== agent.systemPrompt;

  async function handleSave() {
    setSaving(true);
    try {
      await updateAgent({
        agentId: agent._id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
      });
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  }

  return (
    <>
      <section className="border border-rule p-6 bg-surface">
        <div className="flex items-baseline justify-between mb-6">
          <p className="eyebrow">Agent Configuration</p>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] font-semibold bg-ink text-surface px-3 py-1.5 hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Save className="h-3 w-3" strokeWidth={1.75} />
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>

        <div className="space-y-5">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
              className={inputClass}
            />
          </Field>

          <div>
            <p className="eyebrow mb-1.5">System Prompt</p>
            <button
              onClick={() => setShowPromptDialog(true)}
              className="w-full text-left group"
            >
              <div className="border border-rule bg-surface-sunken p-4 hover:border-rule-strong transition-all cursor-pointer">
                {systemPrompt ? (
                  <p className="text-sm text-ink-muted font-mono line-clamp-3 leading-relaxed">
                    {systemPrompt}
                  </p>
                ) : (
                  <p className="text-sm text-ink-faint italic">
                    No system prompt configured. Click to add one.
                  </p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-rule">
                  <span className="font-mono text-[11px] text-ink-faint">
                    {systemPrompt ? `${systemPrompt.length} characters` : "Empty"}
                  </span>
                  <span className="text-2xs uppercase tracking-[0.1em] font-semibold text-ink-faint group-hover:text-ink transition-colors">
                    Edit prompt →
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {showPromptDialog && (
        <SystemPromptDialog
          value={systemPrompt}
          onChange={setSystemPrompt}
          onClose={() => setShowPromptDialog(false)}
          agentName={name}
          agentDescription={description}
        />
      )}
    </>
  );
}

// ── System Prompt Dialog ─────────────────────────────────────────────

const QUICK_ACTIONS = [
  "Make it more concise",
  "Add error handling instructions",
  "Make the tone more professional",
  "Add output format guidelines",
  "Add safety guardrails",
  "Improve clarity and structure",
];

function SystemPromptDialog({
  value,
  onChange,
  onClose,
  agentName,
  agentDescription,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  agentName: string;
  agentDescription: string;
}) {
  const [draft, setDraft] = useState(value);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [beforeSuggestion, setBeforeSuggestion] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const hasSuggestion = beforeSuggestion !== null;

  function handleSave() {
    onChange(draft);
    onClose();
  }

  async function handleAiAssist(instruction: string) {
    if (!instruction.trim() || aiLoading) return;
    setAiLoading(true);
    setAiInput("");
    try {
      const res = await fetch(`${AGENT_SERVER_URL}/assist-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPrompt: draft,
          instruction: instruction.trim(),
          agentName,
          agentDescription,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.prompt || !data.prompt.trim()) throw new Error("AI returned empty result");
      setBeforeSuggestion(draft);
      setDraft(data.prompt);
    } catch (err: any) {
      console.error("AI assist failed:", err);
    }
    setAiLoading(false);
  }

  function acceptSuggestion() {
    setBeforeSuggestion(null);
  }

  function dismissSuggestion() {
    if (beforeSuggestion !== null) {
      setDraft(beforeSuggestion);
      setBeforeSuggestion(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-3xl max-h-[90vh] border border-rule bg-surface shadow-2xl flex flex-col overflow-hidden rise">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-rule shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.5} />
            <div>
              <p className="eyebrow leading-none">System Prompt</p>
              <p className="text-[11px] text-ink-faint mt-0.5">
                Define how your agent behaves
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-faint hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Editor */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="You are a helpful assistant that…"
              disabled={aiLoading}
              rows={12}
              className={`w-full border font-mono text-sm leading-relaxed px-4 py-3 placeholder:text-ink-faint focus:outline-none resize-none transition-colors disabled:opacity-60 bg-surface ${
                hasSuggestion
                  ? "border-accent text-ink bg-accent-soft/20"
                  : "border-rule text-ink focus:border-rule-strong"
              }`}
            />
            {aiLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
                <div className="flex items-center gap-2.5 px-4 py-2.5 border border-rule bg-surface shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-ink-muted" strokeWidth={1.5} />
                  <span className="text-xs text-ink-muted">Generating improved prompt…</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion action bar */}
          {hasSuggestion && (
            <div className="flex items-center justify-between border border-accent/40 bg-accent-soft/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                <span className="text-xs text-ink-muted">
                  AI suggestion — review and accept or dismiss
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={dismissSuggestion}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                  Dismiss
                </button>
                <button
                  onClick={acceptSuggestion}
                  className="inline-flex items-center gap-1.5 text-xs bg-ink text-surface px-3 py-1.5 hover:opacity-90 transition-all"
                >
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Accept
                </button>
              </div>
            </div>
          )}

          {/* AI Assistant */}
          <div className="border border-rule bg-surface-sunken p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.5} />
              <span className="eyebrow">AI Prompt Assistant</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleAiAssist(action)}
                  disabled={aiLoading}
                  className="text-[11px] px-2.5 py-1 border border-rule text-ink-faint hover:text-ink hover:border-rule-strong disabled:opacity-40 transition-all"
                >
                  {action}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiAssist(aiInput);
              }}
              className="relative"
            >
              <input
                ref={aiInputRef}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiLoading}
                placeholder={
                  draft
                    ? "Describe how to improve this prompt…"
                    : "Describe what your agent should do…"
                }
                className="w-full border border-rule bg-surface pl-4 pr-12 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-rule-strong disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={!aiInput.trim() || aiLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center transition-all ${
                  aiInput.trim() && !aiLoading
                    ? "bg-ink text-surface hover:opacity-90"
                    : "bg-surface-sunken text-ink-faint border border-rule"
                }`}
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-rule shrink-0">
          <span className="font-mono text-[11px] text-ink-faint">
            {draft.length} characters
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={hasSuggestion}
              className="inline-flex items-center gap-1.5 text-xs bg-ink text-surface px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Save className="h-3 w-3" strokeWidth={1.75} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Enabled Models ────────────────────────────────────────────────────

const ALL_MODELS = [
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    description: "Most capable Gemini model",
    provider: "Google",
    tier: "$$$",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Lightning-fast with agentic capability",
    provider: "Google",
    tier: "$$",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Balanced Gemini model",
    provider: "Google",
    tier: "$$",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI flagship multimodal model",
    provider: "OpenAI",
    tier: "$$$",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast and affordable OpenAI model",
    provider: "OpenAI",
    tier: "$",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    description: "OpenAI fast reasoning model",
    provider: "OpenAI",
    tier: "$$",
  },
];

function EnabledModelsSection({ agent }: { agent: Doc<"agents"> }) {
  const updateAgent = useMutation(api.agents.update);

  const aiProviders = useQuery(api.credentials.listAiProviders);
  const PROVIDER_TO_CRED: Record<string, string> = {
    Google: "google_ai",
    OpenAI: "openai",
  };
  const availableModels = aiProviders && aiProviders.length > 0
    ? ALL_MODELS.filter((m) => {
        const credType = PROVIDER_TO_CRED[m.provider];
        return credType ? aiProviders.includes(credType) : true;
      })
    : ALL_MODELS;

  const enabledModels = (agent.enabledModels ?? ALL_MODELS.map((m) => m.id))
    .filter((id) => availableModels.some((m) => m.id === id));

  async function handleToggle(modelId: string) {
    const isCurrentModel = agent.model === modelId;
    const isEnabled = enabledModels.includes(modelId);

    if (isEnabled && isCurrentModel) return;
    if (isEnabled && enabledModels.length <= 1) return;

    const newModels = isEnabled
      ? enabledModels.filter((m) => m !== modelId)
      : [...enabledModels, modelId];

    try {
      await updateAgent({ agentId: agent._id, enabledModels: newModels });
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (aiProviders === undefined) {
    return (
      <section className="border border-rule bg-surface">
        <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-rule">
          <p className="eyebrow">Enabled Models</p>
          <div className="h-3 w-10 bg-surface-sunken animate-pulse" />
        </div>
        <div className="divide-y divide-rule">
          {[
            { nameW: "w-36", descW: "w-52", tierW: "w-5", provW: "w-14" },
            { nameW: "w-28", descW: "w-48", tierW: "w-6", provW: "w-10" },
            { nameW: "w-32", descW: "w-44", tierW: "w-5", provW: "w-10" },
            { nameW: "w-40", descW: "w-56", tierW: "w-4", provW: "w-14" },
          ].map(({ nameW, descW, tierW, provW }, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5">
              {/* Toggle: border box + inner disc */}
              <div className="relative inline-flex h-5 w-9 shrink-0 items-center border border-rule-strong bg-surface-sunken animate-pulse">
                <span className="inline-block h-3.5 w-3.5 bg-rule ml-0.5" />
              </div>
              {/* Name row + description */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  {/* name: text-sm → ~20px line-height */}
                  <div className={`h-5 ${nameW} bg-surface-sunken animate-pulse`} />
                  {/* tier: text-[10px] mono → ~13px */}
                  <div className={`h-[13px] ${tierW} bg-surface-sunken animate-pulse`} />
                </div>
                {/* description: text-[11px] → ~15px */}
                <div className={`h-[15px] ${descW} bg-surface-sunken animate-pulse`} />
              </div>
              {/* provider: text-[10px] → ~13px */}
              <div className={`h-[13px] ${provW} shrink-0 bg-surface-sunken animate-pulse`} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border border-rule bg-surface">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">Enabled Models</p>
        <span className="font-mono text-xs text-ink-faint">
          {enabledModels.length} of {availableModels.length}
        </span>
      </div>
      {aiProviders.length > 0 && availableModels.length < ALL_MODELS.length && (
        <p className="px-6 pt-3 text-xs text-ink-faint">
          Add AI provider credentials to unlock more models.
        </p>
      )}
      <ol className="divide-y divide-rule">
        {availableModels.map((m) => {
          const enabled = enabledModels.includes(m.id);
          const isCurrentModel = agent.model === m.id;
          const cantDisable = enabled && (isCurrentModel || enabledModels.length <= 1);
          return (
            <li key={m.id}>
              <button
                onClick={() => handleToggle(m.id)}
                disabled={cantDisable}
                className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-colors ${
                  enabled ? "bg-surface-sunken/60" : "hover:bg-surface-sunken/40"
                } ${cantDisable ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Toggle on={enabled} onToggle={() => {}} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${enabled ? "text-ink" : "text-ink-muted"}`}>
                      {m.name}
                    </span>
                    <span className={`font-mono text-[10px] ${
                      m.tier === "$$$" ? "text-warn" : "text-ink-faint"
                    }`}>
                      {m.tier}
                    </span>
                    {isCurrentModel && (
                      <span className="eyebrow text-accent">Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-faint">{m.description}</p>
                </div>
                <span className="text-[10px] text-ink-faint">{m.provider}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Tool Set Toggle Grid (shared) ────────────────────────────────────

function ToolSetCategoryGrid({
  categories,
  enabledSets,
  onToggle,
}: {
  categories: ToolSetCategory[];
  enabledSets: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.title}>
          <div className="flex items-center gap-3 mb-2">
            <p className="eyebrow">{category.title}</p>
            <div className="flex-1 h-px bg-rule" />
          </div>
          <ol className="divide-y divide-rule border-y border-rule">
            {category.items.map((item) => {
              const enabled = enabledSets.includes(item.key);
              return (
                <li key={item.key}>
                  <button
                    onClick={() => onToggle(item.key)}
                    className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                      enabled ? "bg-surface-sunken/60" : "hover:bg-surface-sunken/40"
                    }`}
                  >
                    <Toggle on={enabled} onToggle={() => {}} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${enabled ? "text-ink" : "text-ink-muted"}`}>
                        {item.label}
                      </span>
                      <p className="text-[11px] text-ink-faint line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

function useToolSetToggle(agent: Doc<"agents">) {
  const updateAgent = useMutation(api.agents.update);
  const enabledSets = agent.enabledToolSets ?? [];

  async function handleToggle(toolSet: string) {
    const newSets = enabledSets.includes(toolSet)
      ? enabledSets.filter((s) => s !== toolSet)
      : [...enabledSets, toolSet];

    try {
      await updateAgent({ agentId: agent._id, enabledToolSets: newSets });
    } catch (err: any) {
      alert(err.message);
    }
  }

  return { enabledSets, handleToggle };
}

// ── Capabilities Section ─────────────────────────────────────────────

function ToolSetsSection({ agent }: { agent: Doc<"agents"> }) {
  const { enabledSets, handleToggle } = useToolSetToggle(agent);

  return (
    <section className="border border-rule bg-surface">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">Capabilities</p>
        <span className="font-mono text-xs text-ink-faint">{enabledSets.length} active</span>
      </div>
      <div className="p-6">
        <ToolSetCategoryGrid
          categories={CAPABILITY_CATEGORIES}
          enabledSets={enabledSets}
          onToggle={handleToggle}
        />
      </div>
    </section>
  );
}

// ── Integrations Section ─────────────────────────────────────────────

function IntegrationsSection({ agent }: { agent: Doc<"agents"> }) {
  const { enabledSets, handleToggle } = useToolSetToggle(agent);

  const activeCount = enabledSets.filter((s) =>
    INTEGRATION_CATEGORIES.some((c) => c.items.some((i) => i.key === s))
  ).length;

  return (
    <section className="border border-rule bg-surface">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">Integrations</p>
        <span className="font-mono text-xs text-ink-faint">{activeCount} active</span>
      </div>
      <div className="p-6">
        <ToolSetCategoryGrid
          categories={INTEGRATION_CATEGORIES}
          enabledSets={enabledSets}
          onToggle={handleToggle}
        />
      </div>
    </section>
  );
}

// ── Shared bot section helpers ────────────────────────────────────────

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-1.5 text-xs bg-ink text-surface px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
    >
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
      ) : saved ? (
        <Check className="h-3 w-3" strokeWidth={2} />
      ) : (
        <Save className="h-3 w-3" strokeWidth={1.75} />
      )}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

// ── Bot Soul (shared identity scaffolding for Discord + Slack bots) ──

type BotSoul = {
  identity?: string;
  personality?: string;
  boundaries?: string;
  whenToEngage?: string;
};

function BotSoulFields({
  value,
  onChange,
}: {
  value: BotSoul;
  onChange: (next: BotSoul) => void;
}) {
  const set = (key: keyof BotSoul) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange({ ...value, [key]: e.target.value });
  return (
    <div className="space-y-4 border border-rule bg-surface-sunken p-4">
      <div>
        <p className="eyebrow">Soul</p>
        <p className="mt-1 text-[10px] text-ink-faint">
          Structured identity for non-authorized users (bot mode). Authorized users use the agent's full system prompt instead. Leave blank to skip.
        </p>
      </div>
      <Field label="Identity">
        <textarea
          value={value.identity ?? ""}
          onChange={set("identity")}
          placeholder="e.g. Customer support bot for Hometown Roofing — answers warranty questions and routes leads."
          rows={2}
          className={textareaClass}
        />
      </Field>
      <Field label="Personality">
        <textarea
          value={value.personality ?? ""}
          onChange={set("personality")}
          placeholder="e.g. Warm, concise, never pushy. Uses plain language, not jargon."
          rows={2}
          className={textareaClass}
        />
      </Field>
      <Field label="Boundaries">
        <textarea
          value={value.boundaries ?? ""}
          onChange={set("boundaries")}
          placeholder="e.g. Don't quote prices. Never speculate about repair timelines. Redirect billing questions to ops."
          rows={2}
          className={textareaClass}
        />
      </Field>
      <Field label="When to Engage">
        <textarea
          value={value.whenToEngage ?? ""}
          onChange={set("whenToEngage")}
          placeholder="e.g. Only respond when explicitly @mentioned or DM'd. Stay silent in casual chatter."
          rows={2}
          className={textareaClass}
        />
      </Field>
    </div>
  );
}

function normalizeSoul(soul: BotSoul): BotSoul | undefined {
  const trimmed: BotSoul = {
    identity: soul.identity?.trim() || undefined,
    personality: soul.personality?.trim() || undefined,
    boundaries: soul.boundaries?.trim() || undefined,
    whenToEngage: soul.whenToEngage?.trim() || undefined,
  };
  const hasAny = Object.values(trimmed).some((v) => v);
  return hasAny ? trimmed : undefined;
}

// ── Discord Bot (Gateway / two-way chat) ────────────────────────────

function DiscordBotSection({ agent }: { agent: Doc<"agents"> }) {
  const updateDiscordBot = useMutation(api.agents.updateDiscordBot);

  const [enabled, setEnabled] = useState(agent.discordBotEnabled ?? false);
  const [botPrompt, setBotPrompt] = useState(agent.discordBotPrompt ?? "");
  const [botModel, setBotModel] = useState(agent.discordBotModel ?? "");
  const [soul, setSoul] = useState<BotSoul>(
    ((agent as any).discordSoul ?? {}) as BotSoul
  );
  const [authorizedUsers, setAuthorizedUsers] = useState<string[]>(
    agent.discordAuthorizedUsers ?? []
  );
  const [newUser, setNewUser] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDiscordBot({
        agentId: agent._id,
        discordBotEnabled: enabled,
        discordBotPrompt: botPrompt || undefined,
        discordBotModel: botModel || undefined,
        discordAuthorizedUsers: authorizedUsers,
        discordSoul: normalizeSoul(soul),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addUser() {
    const username = newUser.trim();
    if (!username || authorizedUsers.includes(username)) return;
    setAuthorizedUsers([...authorizedUsers, username]);
    setNewUser("");
  }

  function removeUser(username: string) {
    setAuthorizedUsers(authorizedUsers.filter((u) => u !== username));
  }

  return (
    <section className="border border-rule bg-surface">
      <div className="px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">Discord Bot (Two-Way Chat)</p>
        <p className="mt-1 text-xs text-ink-faint">
          @mention the bot in Discord to route messages through this agent.
        </p>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Enable Discord Bot</span>
          <Toggle on={enabled} onToggle={() => setEnabled(!enabled)} />
        </div>

        {enabled && (
          <>
            <Field label="Bot Prompt">
              <textarea
                value={botPrompt}
                onChange={(e) => setBotPrompt(e.target.value)}
                placeholder="You are a helpful assistant…"
                rows={4}
                className={textareaClass}
              />
              <p className="mt-1 text-[10px] text-ink-faint">
                Used for non-authorized users. Leave blank to use the agent's system prompt.
              </p>
            </Field>

            <BotSoulFields value={soul} onChange={setSoul} />

            <Field label="Bot Model (optional)">
              <select
                value={botModel}
                onChange={(e) => setBotModel(e.target.value)}
                className={selectClass}
              >
                <option value="">
                  Use agent's default ({ALL_MODELS.find((m) => m.id === agent.model)?.name ?? agent.model})
                </option>
                {(agent.enabledModels ?? ALL_MODELS.map((m) => m.id)).map((modelId) => {
                  const model = ALL_MODELS.find((m) => m.id === modelId);
                  return (
                    <option key={modelId} value={modelId}>
                      {model ? `${model.name} — ${model.description}` : modelId}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="space-y-2">
              <p className="eyebrow">Authorized Discord Usernames</p>
              <p className="text-xs text-ink-faint">
                These users get full agent access when they @mention the bot.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUser())}
                  placeholder="discord_username"
                  className="flex-1 bg-transparent border-0 border-b border-rule-strong pb-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={addUser}
                  className="text-xs text-ink-muted hover:text-ink border border-rule px-3 py-1 transition-colors"
                >
                  Add
                </button>
              </div>
              {authorizedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {authorizedUsers.map((u) => (
                    <span
                      key={u}
                      className="flex items-center gap-1 border border-rule bg-surface-sunken text-xs px-2.5 py-1"
                    >
                      {u}
                      <button
                        type="button"
                        onClick={() => removeUser(u)}
                        className="text-ink-faint hover:text-danger transition-colors ml-1"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <SaveButton saving={saving} saved={saved} />
        </div>
      </form>
    </section>
  );
}

// ── Slack Bot (Socket Mode / two-way chat) ──────────────────────────

function SlackBotSection({ agent }: { agent: Doc<"agents"> }) {
  const updateSlackBot = useMutation(api.agents.updateSlackBot);

  const [enabled, setEnabled] = useState((agent as any).slackBotEnabled ?? false);
  const [botPrompt, setBotPrompt] = useState((agent as any).slackBotPrompt ?? "");
  const [botModel, setBotModel] = useState((agent as any).slackBotModel ?? "");
  const [soul, setSoul] = useState<BotSoul>(
    ((agent as any).slackSoul ?? {}) as BotSoul
  );
  const [authorizedUsers, setAuthorizedUsers] = useState<string[]>(
    (agent as any).slackAuthorizedUsers ?? []
  );
  const [newUser, setNewUser] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSlackBot({
        agentId: agent._id,
        slackBotEnabled: enabled,
        slackBotPrompt: botPrompt || undefined,
        slackBotModel: botModel || undefined,
        slackAuthorizedUsers: authorizedUsers,
        slackSoul: normalizeSoul(soul),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addUser() {
    const id = newUser.trim();
    if (!id || authorizedUsers.includes(id)) return;
    setAuthorizedUsers([...authorizedUsers, id]);
    setNewUser("");
  }

  function removeUser(id: string) {
    setAuthorizedUsers(authorizedUsers.filter((u) => u !== id));
  }

  return (
    <section className="border border-rule bg-surface">
      <div className="px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">Slack Bot (Two-Way Chat)</p>
        <p className="mt-1 text-xs text-ink-faint">
          @mention or DM the bot to route messages through this agent. Requires Socket Mode and an App-Level Token.
        </p>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Enable Slack Bot</span>
          <Toggle on={enabled} onToggle={() => setEnabled(!enabled)} />
        </div>

        {enabled && (
          <>
            <Field label="Bot Prompt">
              <textarea
                value={botPrompt}
                onChange={(e) => setBotPrompt(e.target.value)}
                placeholder="You are a helpful assistant…"
                rows={4}
                className={textareaClass}
              />
              <p className="mt-1 text-[10px] text-ink-faint">
                Used for non-authorized Slack users. Leave blank to use the agent's system prompt.
              </p>
            </Field>

            <BotSoulFields value={soul} onChange={setSoul} />

            <Field label="Bot Model (optional)">
              <select
                value={botModel}
                onChange={(e) => setBotModel(e.target.value)}
                className={selectClass}
              >
                <option value="">
                  Use agent's default ({ALL_MODELS.find((m) => m.id === agent.model)?.name ?? agent.model})
                </option>
                {(agent.enabledModels ?? ALL_MODELS.map((m) => m.id)).map((modelId) => {
                  const model = ALL_MODELS.find((m) => m.id === modelId);
                  return (
                    <option key={modelId} value={modelId}>
                      {model ? `${model.name} — ${model.description}` : modelId}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="space-y-2">
              <p className="eyebrow">Authorized Slack User IDs</p>
              <p className="text-xs text-ink-faint">
                Slack user IDs (e.g.{" "}
                <code className="font-mono bg-surface-sunken px-1">U0AR2KKC2Q3</code>
                ) get full agent access.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUser())}
                  placeholder="U01234ABCDE"
                  className="flex-1 font-mono bg-transparent border-0 border-b border-rule-strong pb-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={addUser}
                  className="text-xs text-ink-muted hover:text-ink border border-rule px-3 py-1 transition-colors"
                >
                  Add
                </button>
              </div>
              {authorizedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {authorizedUsers.map((u) => (
                    <span
                      key={u}
                      className="flex items-center gap-1 border border-rule bg-surface-sunken font-mono text-xs px-2.5 py-1"
                    >
                      {u}
                      <button
                        type="button"
                        onClick={() => removeUser(u)}
                        className="text-ink-faint hover:text-danger transition-colors ml-1"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <SaveButton saving={saving} saved={saved} />
        </div>
      </form>
    </section>
  );
}

// ── Custom Tools ─────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type AuthType = "none" | "bearer" | "basic" | "header" | "query";
type BodyType = "json" | "form-data" | "url-encoded" | "raw";
type ResponseFormat = "auto" | "json" | "text";
type PaginationMode = "none" | "next_url" | "offset";
type ToolTab = "basic" | "auth" | "body" | "params" | "pagination" | "response" | "options";

interface KVEntry { name: string; value: string }

interface ToolFormState {
  name: string;
  description: string;
  endpoint: string;
  method: HttpMethod;
  // Auth
  authType: AuthType;
  authToken: string;
  authUsername: string;
  authPassword: string;
  authHeaderName: string;
  authHeaderValue: string;
  authQueryName: string;
  authQueryValue: string;
  // Body
  bodyType: BodyType;
  rawBody: string;
  // Params & Headers
  queryParams: KVEntry[];
  headers: KVEntry[];
  // Pagination
  paginationMode: PaginationMode;
  paginationNextUrlPath: string;
  paginationParamName: string;
  paginationParamStart: number;
  paginationParamStep: number;
  paginationMaxPages: number;
  // Response
  responseFormat: ResponseFormat;
  fullResponse: boolean;
  neverError: boolean;
  // Options
  timeoutMs: number;
  followRedirects: boolean;
  ignoreSSL: boolean;
}

const defaultToolState: ToolFormState = {
  name: "", description: "", endpoint: "", method: "GET",
  authType: "none", authToken: "", authUsername: "", authPassword: "",
  authHeaderName: "", authHeaderValue: "", authQueryName: "", authQueryValue: "",
  bodyType: "json", rawBody: "",
  queryParams: [], headers: [],
  paginationMode: "none", paginationNextUrlPath: "", paginationParamName: "",
  paginationParamStart: 0, paginationParamStep: 1, paginationMaxPages: 10,
  responseFormat: "auto", fullResponse: false, neverError: false,
  timeoutMs: 15000, followRedirects: true, ignoreSSL: false,
};

function recordToKV(obj: Record<string, string> | undefined): KVEntry[] {
  if (!obj) return [];
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

function kvToRecord(entries: KVEntry[]): Record<string, string> | undefined {
  const valid = entries.filter((e) => e.name.trim());
  if (!valid.length) return undefined;
  return Object.fromEntries(valid.map((e) => [e.name, e.value]));
}

function toolDocToFormState(tool: Doc<"customTools">): ToolFormState {
  const auth = tool.auth as any;
  const pagination = tool.pagination as any;
  return {
    name: tool.name,
    description: tool.description,
    endpoint: tool.endpoint,
    method: tool.method,
    authType: auth?.type ?? "none",
    authToken: auth?.token ?? "",
    authUsername: auth?.username ?? "",
    authPassword: auth?.password ?? "",
    authHeaderName: auth?.name ?? "",
    authHeaderValue: auth?.value ?? "",
    authQueryName: auth?.name ?? "",
    authQueryValue: auth?.value ?? "",
    bodyType: tool.bodyType ?? "json",
    rawBody: tool.rawBody ?? "",
    queryParams: tool.queryParams ?? [],
    headers: recordToKV(tool.headers as Record<string, string>),
    paginationMode: pagination?.mode ?? "none",
    paginationNextUrlPath: pagination?.nextUrlPath ?? "",
    paginationParamName: pagination?.paramName ?? "",
    paginationParamStart: pagination?.paramStartValue ?? 0,
    paginationParamStep: pagination?.paramStep ?? 1,
    paginationMaxPages: pagination?.maxPages ?? 10,
    responseFormat: tool.responseFormat ?? "auto",
    fullResponse: tool.fullResponse ?? false,
    neverError: tool.neverError ?? false,
    timeoutMs: tool.timeoutMs ?? 15000,
    followRedirects: tool.followRedirects ?? true,
    ignoreSSL: tool.ignoreSSL ?? false,
  };
}

function formStateToArgs(state: ToolFormState) {
  const auth: any =
    state.authType === "bearer" ? { type: "bearer", token: state.authToken }
    : state.authType === "basic" ? { type: "basic", username: state.authUsername, password: state.authPassword }
    : state.authType === "header" ? { type: "header", name: state.authHeaderName, value: state.authHeaderValue }
    : state.authType === "query" ? { type: "query", name: state.authQueryName, value: state.authQueryValue }
    : undefined;

  const pagination: any =
    state.paginationMode === "none" ? undefined : {
      mode: state.paginationMode,
      nextUrlPath: state.paginationNextUrlPath || undefined,
      paramName: state.paginationParamName || undefined,
      paramStartValue: state.paginationParamStart,
      paramStep: state.paginationParamStep,
      maxPages: state.paginationMaxPages,
    };

  return {
    name: state.name.trim(),
    description: state.description.trim() || state.name.trim(),
    endpoint: state.endpoint.trim(),
    method: state.method,
    auth,
    headers: kvToRecord(state.headers),
    queryParams: state.queryParams.filter((p) => p.name.trim()).length > 0
      ? state.queryParams.filter((p) => p.name.trim())
      : undefined,
    bodyType: state.bodyType !== "json" ? state.bodyType : undefined,
    rawBody: state.rawBody || undefined,
    pagination,
    responseFormat: state.responseFormat !== "auto" ? state.responseFormat : undefined,
    fullResponse: state.fullResponse || undefined,
    neverError: state.neverError || undefined,
    timeoutMs: state.timeoutMs !== 15000 ? state.timeoutMs : undefined,
    followRedirects: state.followRedirects === false ? false : undefined,
    ignoreSSL: state.ignoreSSL || undefined,
  };
}

// Sub-component: key-value list editor
function KVList({ entries, onChange, keyPlaceholder = "name", valuePlaceholder = "value" }: {
  entries: KVEntry[];
  onChange: (entries: KVEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  function update(i: number, field: "name" | "value", val: string) {
    const next = [...entries];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  function remove(i: number) {
    onChange(entries.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            value={entry.name}
            onChange={(e) => update(i, "name", e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-transparent border-b border-rule-strong pb-1.5 text-xs font-mono text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={entry.value}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-transparent border-b border-rule-strong pb-1.5 text-xs font-mono text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <button type="button" onClick={() => remove(i)} className="text-ink-faint hover:text-danger transition-colors shrink-0">
            <X className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...entries, { name: "", value: "" }])}
        className="text-2xs uppercase tracking-[0.1em] text-ink-faint hover:text-ink transition-colors"
      >
        + Add row
      </button>
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-950/50 border-emerald-800/60",
  POST: "text-blue-400 bg-blue-950/50 border-blue-800/60",
  PUT: "text-amber-400 bg-amber-950/50 border-amber-800/60",
  PATCH: "text-orange-400 bg-orange-950/50 border-orange-800/60",
  DELETE: "text-red-400 bg-red-950/50 border-red-800/60",
};

function HttpToolDialog({
  state,
  onChange,
  onSubmit,
  onClose,
  submitLabel,
  title,
}: {
  state: ToolFormState;
  onChange: (s: ToolFormState) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
  title: string;
}) {
  const [tab, setTab] = useState<ToolTab>("basic");
  const set = (patch: Partial<ToolFormState>) => onChange({ ...state, ...patch });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const navItems: { id: ToolTab; label: string; hint?: string }[] = [
    { id: "basic", label: "Basic", hint: "Name, URL, method" },
    { id: "auth", label: "Authentication", hint: state.authType !== "none" ? state.authType : undefined },
    { id: "body", label: "Body", hint: state.bodyType !== "json" ? state.bodyType : undefined },
    { id: "params", label: "Params & Headers", hint: (state.queryParams.length + state.headers.length) > 0 ? `${state.queryParams.length + state.headers.length} set` : undefined },
    { id: "pagination", label: "Pagination", hint: state.paginationMode !== "none" ? state.paginationMode.replace("_", " ") : undefined },
    { id: "response", label: "Response", hint: state.responseFormat !== "auto" ? state.responseFormat : undefined },
    { id: "options", label: "Options" },
  ];

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-3xl h-[600px] border border-rule bg-surface shadow-2xl rise flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`font-mono text-[10px] font-bold uppercase px-2 py-1 border ${METHOD_COLORS[state.method] ?? "text-ink-muted bg-surface-sunken border-rule"}`}>
              {state.method}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">
                {state.name || title}
              </p>
              {state.endpoint && (
                <p className="font-mono text-xs text-ink-faint truncate mt-0.5">{state.endpoint}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-faint hover:text-ink transition-colors shrink-0 ml-4">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Left nav */}
          <nav className="w-44 shrink-0 border-r border-rule flex flex-col py-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full text-left px-4 py-2.5 transition-colors group ${
                  tab === item.id
                    ? "bg-surface-sunken text-ink border-r-2 border-accent -mr-px"
                    : "text-ink-muted hover:text-ink hover:bg-surface-sunken/50"
                }`}
              >
                <span className="block text-xs font-medium">{item.label}</span>
                {item.hint && (
                  <span className="block text-[10px] text-ink-faint mt-0.5 font-mono truncate">{item.hint}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Basic */}
            {tab === "basic" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Field label="Tool Name">
                      <input autoFocus type="text" value={state.name} onChange={(e) => set({ name: e.target.value })}
                        placeholder="get_weather" className={inputClass} />
                    </Field>
                  </div>
                  <Field label="HTTP Method">
                    <select value={state.method} onChange={(e) => set({ method: e.target.value as HttpMethod })} className={selectClass}>
                      {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Endpoint URL">
                  <input type="text" value={state.endpoint} onChange={(e) => set({ endpoint: e.target.value })}
                    placeholder="https://api.example.com/data" className={monoInputClass} />
                  <p className="text-xs text-ink-faint mt-1.5">Use <code className="bg-surface-sunken px-1">{"{param}"}</code> in the URL to substitute agent input fields as path parameters.</p>
                </Field>
                <Field label="Description">
                  <textarea value={state.description} onChange={(e) => set({ description: e.target.value })}
                    placeholder="Describe what this tool does so the agent knows when to call it." rows={3}
                    className={textareaClass} />
                </Field>
              </>
            )}

            {/* Auth */}
            {tab === "auth" && (
              <>
                <Field label="Authentication Type">
                  <select value={state.authType} onChange={(e) => set({ authType: e.target.value as AuthType })} className={selectClass}>
                    <option value="none">No Authentication</option>
                    <option value="bearer">Bearer Token — Authorization: Bearer &lt;token&gt;</option>
                    <option value="basic">Basic Auth — Authorization: Basic &lt;base64&gt;</option>
                    <option value="header">Custom Header</option>
                    <option value="query">Query Parameter</option>
                  </select>
                </Field>

                {state.authType === "bearer" && (
                  <Field label="Token">
                    <input type="text" value={state.authToken} onChange={(e) => set({ authToken: e.target.value })}
                      placeholder="sk-..." className={monoInputClass} />
                  </Field>
                )}
                {state.authType === "basic" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Username">
                      <input type="text" value={state.authUsername} onChange={(e) => set({ authUsername: e.target.value })}
                        placeholder="user" className={inputClass} />
                    </Field>
                    <Field label="Password">
                      <input type="password" value={state.authPassword} onChange={(e) => set({ authPassword: e.target.value })}
                        placeholder="••••••••" className={inputClass} />
                    </Field>
                  </div>
                )}
                {state.authType === "header" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Header Name">
                      <input type="text" value={state.authHeaderName} onChange={(e) => set({ authHeaderName: e.target.value })}
                        placeholder="X-API-Key" className={monoInputClass} />
                    </Field>
                    <Field label="Header Value">
                      <input type="text" value={state.authHeaderValue} onChange={(e) => set({ authHeaderValue: e.target.value })}
                        placeholder="your-api-key" className={monoInputClass} />
                    </Field>
                  </div>
                )}
                {state.authType === "query" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Param Name">
                      <input type="text" value={state.authQueryName} onChange={(e) => set({ authQueryName: e.target.value })}
                        placeholder="api_key" className={monoInputClass} />
                    </Field>
                    <Field label="Param Value">
                      <input type="text" value={state.authQueryValue} onChange={(e) => set({ authQueryValue: e.target.value })}
                        placeholder="your-api-key" className={monoInputClass} />
                    </Field>
                  </div>
                )}
                {state.authType === "none" && (
                  <p className="text-sm text-ink-faint">No authentication will be sent with this request.</p>
                )}
              </>
            )}

            {/* Body */}
            {tab === "body" && (
              <>
                <Field label="Body Format">
                  <select value={state.bodyType} onChange={(e) => set({ bodyType: e.target.value as BodyType })} className={selectClass}>
                    <option value="json">JSON — application/json</option>
                    <option value="form-data">Form Data — multipart/form-data</option>
                    <option value="url-encoded">URL Encoded — application/x-www-form-urlencoded</option>
                    <option value="raw">Raw — custom content</option>
                  </select>
                </Field>
                {state.bodyType === "raw" ? (
                  <Field label="Raw Body">
                    <textarea value={state.rawBody} onChange={(e) => set({ rawBody: e.target.value })}
                      placeholder="Enter raw body content..." rows={8} className={textareaClass} />
                  </Field>
                ) : (
                  <div className="rounded border border-rule bg-surface-sunken p-4 text-sm text-ink-faint space-y-1">
                    <p className="font-medium text-ink-muted">How it works</p>
                    <p>
                      Fields defined in the Input Schema are sent as the request body in{" "}
                      <strong className="text-ink">
                        {state.bodyType === "json" ? "JSON" : state.bodyType === "form-data" ? "multipart form-data" : "URL-encoded"}
                      </strong>{" "}
                      format. The agent provides values for those fields when calling the tool.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Params & Headers */}
            {tab === "params" && (
              <div className="space-y-6">
                <div>
                  <p className="eyebrow mb-1">Static Query Parameters</p>
                  <p className="text-xs text-ink-faint mb-4">Always appended to the URL. Use for fixed API options, not credentials (use Auth tab for those).</p>
                  <KVList entries={state.queryParams} onChange={(v) => set({ queryParams: v })} keyPlaceholder="parameter name" valuePlaceholder="value" />
                </div>
                <div className="border-t border-rule pt-6">
                  <p className="eyebrow mb-1">Custom Headers</p>
                  <p className="text-xs text-ink-faint mb-4">Sent with every request. Auth headers are injected automatically from the Auth tab.</p>
                  <KVList entries={state.headers} onChange={(v) => set({ headers: v })} keyPlaceholder="Content-Type" valuePlaceholder="application/json" />
                </div>
              </div>
            )}

            {/* Pagination */}
            {tab === "pagination" && (
              <>
                <Field label="Pagination Mode">
                  <select value={state.paginationMode} onChange={(e) => set({ paginationMode: e.target.value as PaginationMode })} className={selectClass}>
                    <option value="none">None — single request</option>
                    <option value="next_url">Next URL — follow a link in the response</option>
                    <option value="offset">Offset / Page — increment a query parameter</option>
                  </select>
                </Field>

                {state.paginationMode === "next_url" && (
                  <Field label="Next URL Path">
                    <input type="text" value={state.paginationNextUrlPath} onChange={(e) => set({ paginationNextUrlPath: e.target.value })}
                      placeholder="links.next" className={monoInputClass} />
                    <p className="text-xs text-ink-faint mt-1.5">Dot-notation path to the next page URL in the JSON response. Stops when the value is empty or missing.</p>
                  </Field>
                )}

                {state.paginationMode === "offset" && (
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Param Name">
                      <input type="text" value={state.paginationParamName} onChange={(e) => set({ paginationParamName: e.target.value })}
                        placeholder="page" className={monoInputClass} />
                    </Field>
                    <Field label="Start Value">
                      <input type="number" value={state.paginationParamStart} onChange={(e) => set({ paginationParamStart: Number(e.target.value) })}
                        className={inputClass} />
                    </Field>
                    <Field label="Increment">
                      <input type="number" value={state.paginationParamStep} onChange={(e) => set({ paginationParamStep: Number(e.target.value) })}
                        className={inputClass} />
                    </Field>
                  </div>
                )}

                {state.paginationMode !== "none" && (
                  <Field label="Max Pages">
                    <input type="number" value={state.paginationMaxPages} onChange={(e) => set({ paginationMaxPages: Number(e.target.value) })}
                      min={1} max={100} className={inputClass} />
                    <p className="text-xs text-ink-faint mt-1.5">Safety cap to prevent infinite loops. Results from all pages are merged and returned together.</p>
                  </Field>
                )}
              </>
            )}

            {/* Response */}
            {tab === "response" && (
              <>
                <Field label="Response Format">
                  <select value={state.responseFormat} onChange={(e) => set({ responseFormat: e.target.value as ResponseFormat })} className={selectClass}>
                    <option value="auto">Auto-detect — try JSON, fall back to text</option>
                    <option value="json">JSON — always parse as JSON</option>
                    <option value="text">Text — return raw string</option>
                  </select>
                </Field>

                <div className="space-y-4 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={state.fullResponse} onChange={(e) => set({ fullResponse: e.target.checked })}
                      className="mt-0.5 accent-accent" />
                    <div>
                      <span className="text-sm font-medium text-ink">Full Response</span>
                      <p className="text-xs text-ink-faint mt-0.5">Include HTTP status code, status text, and response headers alongside the body. Useful for debugging or when status codes matter.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={state.neverError} onChange={(e) => set({ neverError: e.target.checked })}
                      className="mt-0.5 accent-accent" />
                    <div>
                      <span className="text-sm font-medium text-ink">Never Error</span>
                      <p className="text-xs text-ink-faint mt-0.5">Return error details as a successful text response instead of throwing. Good for when the agent should handle failures gracefully.</p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* Options */}
            {tab === "options" && (
              <>
                <Field label="Timeout">
                  <div className="flex items-baseline gap-2">
                    <input type="number" value={state.timeoutMs} onChange={(e) => set({ timeoutMs: Number(e.target.value) })}
                      min={1000} max={120000} step={1000} className="w-28 bg-transparent border-b border-rule-strong pb-2 text-sm text-ink focus:border-accent focus:outline-none" />
                    <span className="text-xs text-ink-faint">ms (default 15 000)</span>
                  </div>
                </Field>

                <div className="space-y-4 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={state.followRedirects} onChange={(e) => set({ followRedirects: e.target.checked })}
                      className="mt-0.5 accent-accent" />
                    <div>
                      <span className="text-sm font-medium text-ink">Follow Redirects</span>
                      <p className="text-xs text-ink-faint mt-0.5">Automatically follow HTTP 3xx redirects. Disable to receive the redirect response directly.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={state.ignoreSSL} onChange={(e) => set({ ignoreSSL: e.target.checked })}
                      className="mt-0.5 accent-accent" />
                    <div>
                      <span className="text-sm font-medium text-ink">Ignore SSL Errors</span>
                      <p className="text-xs text-ink-faint mt-0.5">Skip TLS certificate verification. Only use for trusted internal endpoints with self-signed certificates.</p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-rule shrink-0 bg-surface">
          <p className="text-xs text-ink-faint">
            {state.name && state.endpoint
              ? <>Tool will be available as <code className="font-mono bg-surface-sunken px-1">custom_{state.name}</code></>
              : "Fill in name and URL to save"}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink transition-colors px-3 py-2">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!state.name.trim() || !state.endpoint.trim()}
              className="text-sm font-medium bg-ink text-ink-inverse px-4 py-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

function CustomToolsSection({ agent }: { agent: Doc<"agents"> }) {
  const tools = useQuery(api.customTools.list, { agentId: agent._id });
  const createTool = useMutation(api.customTools.create);
  const updateTool = useMutation(api.customTools.update);
  const removeTool = useMutation(api.customTools.remove);

  // dialog state: null = closed, "new" = creating, string id = editing
  const [dialog, setDialog] = useState<null | "new" | string>(null);
  const [formState, setFormState] = useState<ToolFormState>(defaultToolState);

  function openNew() {
    setFormState(defaultToolState);
    setDialog("new");
  }

  function openEdit(tool: Doc<"customTools">) {
    setFormState(toolDocToFormState(tool));
    setDialog(tool._id);
  }

  function closeDialog() { setDialog(null); }

  async function handleSubmit() {
    if (!formState.name.trim() || !formState.endpoint.trim()) return;
    try {
      if (dialog === "new") {
        await createTool({ agentId: agent._id, ...formStateToArgs(formState) });
      } else if (dialog) {
        await updateTool({ toolId: dialog as any, ...formStateToArgs(formState) });
      }
      closeDialog();
    } catch (err: any) { alert(err.message); }
  }

  return (
    <section className="border border-rule bg-surface">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">
          Custom HTTP Tools
          {tools && (
            <span className="ml-2 font-mono font-normal text-ink-faint">{tools.length}</span>
          )}
        </p>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <Plus className="h-3 w-3" strokeWidth={1.75} />
          Add Tool
        </button>
      </div>

      {tools === undefined ? (
        <div className="p-6 space-y-[1px]">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-surface-sunken animate-pulse" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-ink-faint mb-3">No custom tools yet.</p>
          <button onClick={openNew} className="text-xs text-ink-muted hover:text-ink underline underline-offset-2 transition-colors">
            Add your first HTTP tool
          </button>
        </div>
      ) : (
        <ol className="divide-y divide-rule">
          {tools.map((tool) => {
            const authType = (tool.auth as any)?.type;
            const pagMode = (tool.pagination as any)?.mode;
            return (
              <li key={tool._id} className="group flex items-center justify-between px-6 py-4 hover:bg-surface-sunken/40 transition-colors">
                <div className="min-w-0 mr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 border ${METHOD_COLORS[tool.method] ?? "text-ink-muted bg-surface-sunken border-rule"}`}>
                      {tool.method}
                    </span>
                    <span className="text-sm text-ink font-medium">{tool.name}</span>
                    {authType && authType !== "none" && (
                      <span className="text-[10px] border border-rule px-1.5 py-0.5 text-ink-faint uppercase tracking-wide">
                        {authType}
                      </span>
                    )}
                    {pagMode && pagMode !== "none" && (
                      <span className="text-[10px] border border-rule px-1.5 py-0.5 text-ink-faint uppercase tracking-wide">
                        paginated
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-ink-faint mt-1 truncate">
                    {tool.endpoint}
                  </p>
                  {tool.description && tool.description !== tool.name && (
                    <p className="text-xs text-ink-faint mt-0.5 truncate">{tool.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all shrink-0">
                  <button
                    onClick={() => openEdit(tool)}
                    className="p-1.5 text-ink-faint hover:text-ink transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => removeTool({ toolId: tool._id })}
                    className="p-1.5 text-ink-faint hover:text-danger transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {dialog !== null && (
        <HttpToolDialog
          state={formState}
          onChange={setFormState}
          onSubmit={handleSubmit}
          onClose={closeDialog}
          submitLabel={dialog === "new" ? "Add Tool" : "Save Changes"}
          title={dialog === "new" ? "New HTTP Tool" : "Edit Tool"}
        />
      )}
    </section>
  );
}

// ── Documents / Knowledge Base ────────────────────────────────────────

const FILE_TYPES: Record<string, string> = {
  pdf: "PDF",
  txt: "TXT",
  md: "MD",
  docx: "DOCX",
  csv: "CSV",
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
  webp: "WEBP",
  gif: "GIF",
};

const ACCEPT = ".pdf,.txt,.md,.docx,.csv,.png,.jpg,.jpeg,.webp,.gif";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function DocumentsSection({ agent }: { agent: Doc<"agents"> }) {
  const documents = useQuery(api.documents.list, { agentId: agent._id });
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const getStorageUrl = useConvex();
  const uploadDoc = useMutation(api.documents.upload);
  const removeDoc = useMutation(api.documents.remove);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function getFileType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    return FILE_TYPES[ext] ? ext : "";
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = getFileType(file.name);
    if (!fileType) {
      alert("Unsupported file type. Accepted: PDF, TXT, MD, DOCX, CSV, PNG, JPG, WEBP, GIF");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const { storageId } = await result.json();

      const documentId = await uploadDoc({
        agentId: agent._id,
        fileName: file.name,
        fileType,
        storageId,
        fileSize: file.size,
      });

      const storageUrl = await getStorageUrl.query(api.storage.getUrl, { storageId });

      await fetch(`${AGENT_SERVER_URL}/process-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          storageUrl,
          fileName: file.name,
          fileType,
          agentId: agent._id,
        }),
      });
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRetry(doc: any) {
    try {
      const storageUrl = await getStorageUrl.query(api.storage.getUrl, {
        storageId: doc.storageId,
      });
      if (!storageUrl) {
        alert("Storage file not found — please re-upload the document.");
        return;
      }
      await fetch(`${AGENT_SERVER_URL}/process-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc._id,
          storageUrl,
          fileName: doc.fileName,
          fileType: doc.fileType,
          agentId: agent._id,
        }),
      });
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  }

  const statusColors: Record<string, string> = {
    uploading: "text-warn",
    processing: "text-accent",
    ready: "text-accent",
    error: "text-danger",
  };

  const statusLabels: Record<string, string> = {
    uploading: "Uploading…",
    processing: "Processing…",
    ready: "Ready",
    error: "Error",
  };

  return (
    <section className="border border-rule bg-surface">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-rule">
        <p className="eyebrow">
          Knowledge Base
          {documents && (
            <span className="ml-2 font-mono font-normal text-ink-faint">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        <label
          className={`inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] font-semibold cursor-pointer transition-colors ${
            uploading ? "text-ink-faint" : "text-ink-muted hover:text-ink"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
          ) : (
            <Upload className="h-3 w-3" strokeWidth={1.5} />
          )}
          {uploading ? "Uploading…" : "Upload Document"}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {documents === undefined ? (
        <div className="p-6 space-y-[1px]">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-surface-sunken animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <p className="px-6 py-8 text-sm text-ink-faint">
          No documents uploaded. Upload PDF, TXT, MD, DOCX, CSV, or image files for
          your agent to search during conversations.
        </p>
      ) : (
        <ol className="divide-y divide-rule">
          {documents.map((doc) => (
            <li key={doc._id} className="group flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[10px] uppercase bg-surface-sunken border border-rule px-1.5 py-0.5 text-ink-muted shrink-0">
                  {doc.fileType}
                </span>
                <div className="min-w-0">
                  <span className="text-sm text-ink truncate block">{doc.fileName}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${statusColors[doc.status] ?? "text-ink-faint"}`}>
                      {doc.status === "processing" && (
                        <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-1" strokeWidth={1.5} />
                      )}
                      {statusLabels[doc.status] ?? doc.status}
                    </span>
                    {doc.chunkCount && (
                      <span className="font-mono text-[10px] text-ink-faint">
                        {doc.chunkCount} chunks
                      </span>
                    )}
                    {doc.error && (
                      <span className="text-[10px] text-danger truncate max-w-48">
                        {doc.error}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {doc.status === "error" && (
                  <button
                    onClick={() => handleRetry(doc)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-faint hover:text-warn focus:opacity-100 transition-all"
                    title="Retry processing"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => removeDoc({ documentId: doc._id })}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-faint hover:text-danger focus:opacity-100 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
