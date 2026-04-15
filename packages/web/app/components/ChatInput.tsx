import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  ArrowUp, Square, MessageSquare, ChevronDown, ChevronUp,
  Eye, Brain, ImagePlus, Search, Lock, Check, Sparkles,
  Paperclip, X, FileText, Image as ImageIcon, Loader2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";

// ── Types ──────────────────────────────────────────────────────────────

export interface ChatAttachment {
  storageId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

interface PendingAttachment extends ChatAttachment {
  previewUrl?: string;
}

// ── Provider icons ──────────────────────────────────────────────────────

function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm1.21 5.175l-2.33 6.003h4.66l-2.33-6.003z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 11.366v3.38h5.32c-.235 1.395-.945 2.575-2.01 3.37l3.25 2.52c1.895-1.745 2.99-4.315 2.99-7.365 0-.71-.065-1.39-.185-2.045H12v.14zm-7.134 2.15a7.003 7.003 0 010-3.032L1.59 8.01A11.965 11.965 0 000 12c0 1.935.465 3.765 1.29 5.385l3.576-2.87zM12 4.83c1.77 0 3.355.61 4.605 1.8l3.455-3.455C17.955 1.185 15.235 0 12 0 7.31 0 3.255 2.69 1.59 6.615l3.575 2.87C6.145 6.665 8.835 4.83 12 4.83zM12 19.17c-3.165 0-5.855-1.835-6.835-4.655l-3.575 2.87C3.255 21.31 7.31 24 12 24c3.06 0 5.64-.995 7.55-2.73l-3.25-2.52c-.93.6-2.1.975-3.435.975l-.865-.555z" />
    </svg>
  );
}

function NanoBananaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-1.5-1.5L11 14l-2.5-2.5L10 10l2 2 4-4 1.5 1.5L12 15l-1 2z" />
    </svg>
  );
}

function OpenAIIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.1 14.11A4.5 4.5 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.724 2.727a4.5 4.5 0 0 1-.679 8.122V12.48a.79.79 0 0 0-.398-.729zm2.0-3.293l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 8.959V6.63a.07.07 0 0 1 .028-.061L14.17 3.86a4.492 4.492 0 0 1 6.67 4.653zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.81a4.492 4.492 0 0 1 7.375-3.453l-.142.08L8.704 6.196a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  );
}

// ── Model data ──────────────────────────────────────────────────────────

type ModelCapability = "vision" | "thinking";

interface ModelEntry {
  value: string;
  label: string;
  description: string;
  group: "Claude" | "Gemini" | "OpenAI";
  tier: string;
  capabilities: ModelCapability[];
  type: "chat";
}


const CHAT_MODELS: ModelEntry[] = [
  {
    value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6",
    description: "Balanced speed and capability",
    group: "Claude", tier: "$$", capabilities: ["vision", "thinking"], type: "chat",
  },
  {
    value: "claude-opus-4-6", label: "Claude Opus 4.6",
    description: "Most capable Claude model",
    group: "Claude", tier: "$$$", capabilities: ["vision", "thinking"], type: "chat",
  },
  {
    value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5",
    description: "Fastest and most affordable",
    group: "Claude", tier: "$", capabilities: ["vision"], type: "chat",
  },
  {
    value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro",
    description: "Most capable Gemini model",
    group: "Gemini", tier: "$$$", capabilities: ["vision", "thinking"], type: "chat",
  },
  {
    value: "gemini-3-flash-preview", label: "Gemini 3 Flash",
    description: "Lightning-fast with agentic capability",
    group: "Gemini", tier: "$$", capabilities: ["vision", "thinking"], type: "chat",
  },
  {
    value: "gemini-2.5-flash", label: "Gemini 2.5 Flash",
    description: "Balanced Gemini model",
    group: "Gemini", tier: "$$", capabilities: ["vision", "thinking"], type: "chat",
  },
  {
    value: "gpt-4o", label: "GPT-4o",
    description: "OpenAI flagship multimodal model",
    group: "OpenAI", tier: "$$$", capabilities: ["vision"], type: "chat",
  },
  {
    value: "gpt-4o-mini", label: "GPT-4o Mini",
    description: "Fast and affordable OpenAI model",
    group: "OpenAI", tier: "$", capabilities: ["vision"], type: "chat",
  },
  {
    value: "o4-mini", label: "o4-mini",
    description: "OpenAI fast reasoning model",
    group: "OpenAI", tier: "$$", capabilities: ["thinking"], type: "chat",
  },
];


function getModelLabel(value: string) {
  return CHAT_MODELS.find((m) => m.value === value)?.label ?? value;
}

function getProviderIcon(group: string) {
  if (group === "Claude") return AnthropicIcon;
  if (group === "Gemini") return GoogleIcon;
  if (group === "OpenAI") return OpenAIIcon;
  if (group === "Nano Banana") return NanoBananaIcon;
  return AnthropicIcon;
}

function TierBadge({ tier }: { tier: string }) {
  const color =
    tier === "$$$" ? "text-amber-400" :
    tier === "$$" ? "text-zinc-400" :
    "text-zinc-600";
  return <span className={`text-[10px] font-mono ${color}`}>{tier}</span>;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Model Selector (all-in-one with open/close managed internally) ──────

function ModelDropdown({
  model,
  onModelChange,
  disabled,
  enabledModels,
}: {
  model: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  enabledModels?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Claude" | "Gemini" | "OpenAI">("all");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setFilter("all");
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const id = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  const visibleModels = useMemo(() => {
    const base = enabledModels
      ? CHAT_MODELS.filter((m) => enabledModels.includes(m.value))
      : CHAT_MODELS;
    const q = search.toLowerCase();
    return base.filter((m) => {
      if (filter !== "all" && m.group !== filter) return false;
      if (q && !m.label.toLowerCase().includes(q) && !m.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, filter, enabledModels]);

  const groups = useMemo(() => {
    const map = new Map<string, ModelEntry[]>();
    for (const m of visibleModels) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return Array.from(map.entries());
  }, [visibleModels]);

  const filterTabs: { key: typeof filter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "all", label: "All", icon: Sparkles },
    { key: "Claude", label: "Claude", icon: AnthropicIcon },
    { key: "Gemini", label: "Gemini", icon: GoogleIcon },
    { key: "OpenAI", label: "OpenAI", icon: OpenAIIcon },
  ];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 disabled:opacity-50 transition-all cursor-pointer"
      >
        {getModelLabel(model)}
        {open ? <ChevronUp className="h-2.5 w-2.5 text-zinc-600" /> : <ChevronDown className="h-2.5 w-2.5 text-zinc-600" />}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[370px] h-[420px] flex rounded-2xl border border-zinc-800 bg-zinc-950 backdrop-blur-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          {/* Sidebar */}
          <div className="flex flex-col items-center gap-1 py-3 px-1.5 border-r border-zinc-800/60 bg-zinc-950/80">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`relative flex items-center justify-center h-9 w-9 rounded-xl transition-all ${
                    isActive ? "bg-neon-400/10 text-neon-400" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60"
                  }`}
                  title={tab.label}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-neon-400" />}
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models..."
                  autoFocus
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {groups.map(([group, models]) => (
                <div key={group}>
                  <div className="px-2 py-1 text-[9px] font-semibold text-zinc-600 uppercase tracking-wider">{group}</div>
                  {models.map((m) => {
                    const isSelected = m.value === model;
                    const ProviderIcon = getProviderIcon(m.group);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => onModelChange(m.value)}
                        className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all mb-0.5 ${
                          isSelected ? "bg-neon-400/8 ring-1 ring-neon-400/20" : "hover:bg-zinc-900/80"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-neon-400/10" : "bg-zinc-900"}`}>
                          <ProviderIcon className={`h-4 w-4 ${isSelected ? "text-neon-400" : "text-zinc-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-medium leading-tight ${isSelected ? "text-zinc-100" : "text-zinc-300"}`}>{m.label}</span>
                            <TierBadge tier={m.tier} />
                          </div>
                          <p className="text-[11px] mt-0.5 leading-tight text-zinc-500">{m.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.capabilities.includes("vision") && <Eye className={`h-3.5 w-3.5 ${isSelected ? "text-blue-400" : "text-zinc-700"}`} />}
                          {m.capabilities.includes("thinking") && <Brain className={`h-3.5 w-3.5 ${isSelected ? "text-pink-400" : "text-zinc-700"}`} />}
                          {isSelected && <Check className="h-3.5 w-3.5 text-neon-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              {visibleModels.length === 0 && (
                <div className="text-center py-6 text-xs text-zinc-600">No models found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Image Picker Button ─────────────────────────────────────────────────

function ImagePickerButton({
  agentId,
  onSelect,
  disabled,
}: {
  agentId: string;
  onSelect: (attachment: PendingAttachment) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const images = useQuery(api.assets.list, { agentId: agentId as any });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [open]);

  const imageAssets = (images ?? [])
    .filter((a: any) => a.type === "image" && a.resolvedUrl)
    .sort((a: any, b: any) => b.createdAt - a.createdAt);

  if (!imageAssets.length && images !== undefined) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title="Reference a generated image"
        className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-zinc-800/80 disabled:opacity-40 transition-all"
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Generated Images
            </p>
          </div>
          <div className="p-2 max-h-56 overflow-y-auto">
            {images === undefined ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
              </div>
            ) : imageAssets.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No images generated yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {imageAssets.map((asset: any) => (
                  <button
                    key={asset._id}
                    type="button"
                    onClick={() => {
                      onSelect({
                        storageId: asset.storageId,
                        fileName: asset.name,
                        contentType: asset.mimeType || "image/png",
                        fileSize: asset.fileSize || 0,
                        previewUrl: asset.resolvedUrl,
                      });
                      setOpen(false);
                    }}
                    className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-violet-500/50 hover:ring-1 hover:ring-violet-500/30 transition-all group"
                  >
                    <img
                      src={asset.resolvedUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChatInput ───────────────────────────────────────────────────────────

export function ChatInput({
  onSend,
  onStop,
  isProcessing,
  hasActiveQuestions,
  model,
  onModelChange,
  enabledModels,
  agentId,
}: {
  onSend: (content: string, attachments?: ChatAttachment[]) => void;
  onStop?: () => void;
  isProcessing?: boolean;
  hasActiveQuestions?: boolean;
  model?: string;
  onModelChange?: (model: string) => void;
  enabledModels?: string[];
  agentId?: string;
}) {
  const [value, setValue] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  // Credential-based model filtering: only show models for providers the user has credentials for.
  // If no AI provider credentials are configured, show all models (backward-compatible).
  const aiProviders = useQuery(api.credentials.listAiProviders);
  const credentialFilteredModels = useMemo(() => {
    if (!aiProviders || aiProviders.length === 0) return undefined; // no filter — show all
    const GROUP_TO_CRED: Record<string, string> = {
      Claude: "anthropic",
      Gemini: "google_ai",
      OpenAI: "openai",
    };
    return CHAT_MODELS
      .filter((m) => {
        const credType = GROUP_TO_CRED[m.group];
        return credType ? aiProviders.includes(credType) : true;
      })
      .map((m) => m.value);
  }, [aiProviders]);

  // Merge agent-level enabledModels with credential-level filtering
  const effectiveEnabledModels = useMemo(() => {
    if (!credentialFilteredModels && !enabledModels) return undefined;
    const base = enabledModels ?? CHAT_MODELS.map((m) => m.value);
    if (!credentialFilteredModels) return base;
    return base.filter((v) => credentialFilteredModels.includes(v));
  }, [enabledModels, credentialFilteredModels]);

  async function uploadFile(file: File): Promise<PendingAttachment | null> {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      console.warn(`Unsupported file type: ${file.type}`);
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`File too large: ${formatFileSize(file.size)} (max ${formatFileSize(MAX_FILE_SIZE)})`);
      return null;
    }

    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    return {
      storageId,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      previewUrl,
    };
  }

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      const results = await Promise.all(
        Array.from(files).slice(0, 5).map(uploadFile)
      );
      const uploaded = results.filter(Boolean) as PendingAttachment[];
      if (uploaded.length > 0) {
        setAttachments((prev) => [...prev, ...uploaded]);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isProcessing) return;

    const finalAttachments = attachments.length > 0
      ? attachments.map(({ storageId, fileName, contentType, fileSize }) => ({
          storageId,
          fileName,
          contentType,
          fileSize,
        }))
      : undefined;

    onSend(trimmed || "(attached files)", finalAttachments);
    setValue("");
    setAttachments([]);
    setShowManualInput(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  if (hasActiveQuestions && !showManualInput) {
    return (
      <div className="p-4 pb-5">
        <div className="max-w-3xl mx-auto flex justify-center">
          <button
            onClick={() => {
              setShowManualInput(true);
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900 transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Type your own answer
          </button>
        </div>
      </div>
    );
  }

  const hasContent = value.trim().length > 0 || attachments.length > 0;

  return (
    <div className="p-4 pb-5">
      <div className="max-w-3xl mx-auto">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 shadow-inner shadow-black/10 ${
            dragOver
              ? "border-neon-400/50 shadow-lg shadow-neon-400/10 bg-neon-400/5"
              : hasContent
                ? "border-neon-400/30 shadow-lg shadow-neon-400/5"
                : "border-zinc-800 hover:border-zinc-700"
          }`}
        >
          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-neon-400 text-sm font-medium">
                <Paperclip className="h-4 w-4" />
                Drop files here
              </div>
            </div>
          )}

          {/* Attachment preview strip */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="relative shrink-0 group/att"
                >
                  {att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.fileName}
                      className="h-16 w-16 rounded-lg object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="h-16 w-20 rounded-lg border border-zinc-700 bg-zinc-800/60 flex flex-col items-center justify-center gap-1 px-1">
                      <FileText className="h-4 w-4 text-zinc-500" />
                      <span className="text-[9px] text-zinc-500 truncate w-full text-center">
                        {att.fileName}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity hover:bg-red-900/60 hover:border-red-700"
                  >
                    <X className="h-3 w-3 text-zinc-400" />
                  </button>
                </div>
              ))}
              {uploading && (
                <div className="h-16 w-16 rounded-lg border border-zinc-700 bg-zinc-800/40 flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={isProcessing}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
          />

          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              {model && onModelChange ? (
                <ModelDropdown
                  model={model}
                  onModelChange={onModelChange}
                  disabled={isProcessing}
                  enabledModels={effectiveEnabledModels}
                />
              ) : (
                <div />
              )}

              {/* Attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || uploading}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/80 disabled:opacity-40 transition-all"
                title="Attach files"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Image picker — only shown when agent has generated images */}
              {agentId && (
                <ImagePickerButton
                  agentId={agentId}
                  disabled={isProcessing}
                  onSelect={(att) => setAttachments((prev) => [...prev, att])}
                />
              )}
            </div>

            {isProcessing ? (
              <button
                onClick={onStop}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-400 text-zinc-950 hover:bg-neon-300 transition-all"
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!hasContent}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 send-bounce ${
                  hasContent
                    ? "bg-neon-400 text-zinc-950 hover:bg-neon-300 glow-neon-sm"
                    : "bg-zinc-800 text-zinc-600 cursor-default"
                }`}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-2.5 select-none">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
