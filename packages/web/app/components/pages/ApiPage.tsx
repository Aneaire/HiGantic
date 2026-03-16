import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import {
  Globe,
  Plus,
  Trash2,
  Key,
  Copy,
  CheckCheck,
  Power,
  PowerOff,
} from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export function ApiPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const endpoints = useQuery(api.tabApiEndpoints.list, { tabId: tab._id });
  const keys = useQuery(api.tabApiEndpoints.listKeys, {
    agentId: tab.agentId,
  });
  const createEndpoint = useMutation(api.tabApiEndpoints.create);
  const updateEndpoint = useMutation(api.tabApiEndpoints.update);
  const removeEndpoint = useMutation(api.tabApiEndpoints.remove);
  const createKey = useMutation(api.tabApiEndpoints.createKey);
  const revokeKey = useMutation(api.tabApiEndpoints.revokeKey);

  const [showAdd, setShowAdd] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "http://localhost:3001";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium">{tab.label}</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Endpoint
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* API Keys Section */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-medium">API Keys</h3>
              </div>
              <button
                onClick={() => setShowKeyForm(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                Generate Key
              </button>
            </div>

            {showKeyForm && (
              <KeyForm
                onGenerate={async (label) => {
                  const result = await createKey({
                    agentId: tab.agentId,
                    label,
                  });
                  setNewKey(result.key);
                  setShowKeyForm(false);
                }}
                onCancel={() => setShowKeyForm(false)}
              />
            )}

            {newKey && (
              <div className="mb-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
                <p className="text-xs text-amber-400 mb-2">
                  Copy this key now — it won't be shown again:
                </p>
                <CopyableCode text={newKey} />
                <button
                  onClick={() => setNewKey(null)}
                  className="text-xs text-zinc-500 mt-2 hover:text-zinc-300"
                >
                  Dismiss
                </button>
              </div>
            )}

            {keys && keys.length > 0 ? (
              <div className="space-y-2">
                {keys.map((k: any) => (
                  <div
                    key={k._id}
                    className="group flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
                  >
                    <div>
                      <span className="text-sm">{k.label}</span>
                      <span className="ml-2 text-xs text-zinc-500 font-mono">
                        {k.key}
                      </span>
                    </div>
                    <button
                      onClick={() => revokeKey({ keyId: k._id })}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-all"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Generate an API key to authenticate requests to your endpoints.
              </p>
            )}
          </section>

          {/* Endpoints Section */}
          {showAdd && (
            <EndpointForm
              onSave={async (data) => {
                await createEndpoint({ tabId: tab._id, ...data });
                setShowAdd(false);
              }}
              onCancel={() => setShowAdd(false)}
            />
          )}

          {endpoints === undefined ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-zinc-900 animate-pulse"
                />
              ))}
            </div>
          ) : endpoints.length === 0 && !showAdd ? (
            <div className="text-center py-12">
              <Globe className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No API endpoints yet</p>
              <p className="text-zinc-600 text-xs mt-1">
                Create endpoints to expose your agent as a REST API
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {endpoints.map((ep) => (
                <EndpointCard
                  key={ep._id}
                  endpoint={ep}
                  baseUrl={baseUrl}
                  agentId={tab.agentId}
                  onToggle={() =>
                    updateEndpoint({
                      endpointId: ep._id,
                      isActive: !ep.isActive,
                    })
                  }
                  onDelete={() => removeEndpoint({ endpointId: ep._id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EndpointCard({
  endpoint,
  baseUrl,
  agentId,
  onToggle,
  onDelete,
}: {
  endpoint: Doc<"tabApiEndpoints">;
  baseUrl: string;
  agentId: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [showCurl, setShowCurl] = useState(false);
  const url = `${baseUrl}/api/${agentId}/${endpoint.slug}`;

  const curlExample =
    endpoint.method === "GET"
      ? `curl "${url}" -H "Authorization: Bearer YOUR_API_KEY"`
      : `curl -X ${endpoint.method} "${url}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "hello"}'`;

  const methodColors: Record<string, string> = {
    GET: "bg-emerald-950 text-emerald-400",
    POST: "bg-blue-950 text-blue-400",
    PUT: "bg-amber-950 text-amber-400",
    DELETE: "bg-red-950 text-red-400",
    PATCH: "bg-purple-950 text-purple-400",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${methodColors[endpoint.method] ?? "bg-zinc-800 text-zinc-400"}`}
          >
            {endpoint.method}
          </span>
          <span className="text-sm font-medium">{endpoint.name}</span>
          {!endpoint.isActive && (
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
              Disabled
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
            title={endpoint.isActive ? "Disable" : "Enable"}
          >
            {endpoint.isActive ? (
              <Power className="h-3.5 w-3.5" />
            ) : (
              <PowerOff className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 font-mono mb-2 truncate">{url}</p>

      {endpoint.description && (
        <p className="text-xs text-zinc-400 mb-3">{endpoint.description}</p>
      )}

      <button
        onClick={() => setShowCurl(!showCurl)}
        className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {showCurl ? "Hide" : "Show"} cURL example
      </button>

      {showCurl && (
        <div className="mt-2 group relative">
          <pre className="text-xs text-zinc-400 font-mono bg-zinc-950 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {curlExample}
          </pre>
          <CopyButton text={curlExample} />
        </div>
      )}
    </div>
  );
}

function EndpointForm({
  onSave,
  onCancel,
}: {
  onSave: (data: {
    name: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    description?: string;
    promptTemplate: string;
    responseFormat?: "json" | "text";
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [method, setMethod] = useState<
    "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  >("POST");
  const [description, setDescription] = useState("");
  const [promptTemplate, setPromptTemplate] = useState(
    "Process the following request and return the result."
  );
  const [responseFormat, setResponseFormat] = useState<"json" | "text">(
    "json"
  );

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-medium">New API Endpoint</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Endpoint Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="get-summary"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none"
            >
              {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Response
            </label>
            <select
              value={responseFormat}
              onChange={(e) => setResponseFormat(e.target.value as any)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none"
            >
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this endpoint does"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Prompt Template{" "}
          <span className="text-zinc-600">
            (instructions for how the agent handles this request)
          </span>
        </label>
        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          rows={4}
          placeholder="Analyze the incoming data and return a summary..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            onSave({
              name,
              method,
              description: description || undefined,
              promptTemplate,
              responseFormat,
            })
          }
          disabled={!name.trim() || !promptTemplate.trim()}
          className="text-xs bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-30 transition-colors"
        >
          Create Endpoint
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-zinc-500 px-3 py-2 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function KeyForm({
  onGenerate,
  onCancel,
}: {
  onGenerate: (label: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");

  return (
    <div className="mb-3 flex items-center gap-2">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Key label (e.g. production)"
        autoFocus
        className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) onGenerate(label.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        onClick={() => label.trim() && onGenerate(label.trim())}
        disabled={!label.trim()}
        className="text-xs bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-md font-medium hover:bg-zinc-200 disabled:opacity-30"
      >
        Generate
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-zinc-500 hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}

function CopyableCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="group relative">
      <pre className="text-xs text-zinc-300 font-mono bg-zinc-950 rounded-lg p-2.5 overflow-x-auto">
        {text}
      </pre>
      <CopyButton text={text} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
