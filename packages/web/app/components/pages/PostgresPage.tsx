import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { Database, Plug, Unplug, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export function PostgresPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const dbConnection = useQuery(api.agentDatabases.getByTab, {
    tabId: tab._id,
  });
  const connect = useMutation(api.agentDatabases.connect);
  const disconnect = useMutation(api.agentDatabases.disconnect);

  const [connString, setConnString] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    if (!connString.trim() || !displayName.trim()) return;
    setConnecting(true);
    setError("");
    try {
      await connect({
        tabId: tab._id,
        displayName: displayName.trim(),
        connectionString: connString.trim(),
      });
      setConnString("");
      setDisplayName("");
    } catch (err: any) {
      setError(err.message);
    }
    setConnecting(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-2 shrink-0">
        <Database className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-medium">{tab.label}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto">
          {dbConnection === undefined ? (
            <div className="h-32 rounded-xl bg-zinc-900 animate-pulse" />
          ) : dbConnection ? (
            /* Connected state */
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950">
                    <Database className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {dbConnection.displayName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {dbConnection.status === "connected"
                        ? "Connected"
                        : dbConnection.status === "error"
                          ? "Connection error"
                          : "Disconnected"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => disconnect({ dbId: dbConnection._id })}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
              <div className="text-xs text-zinc-600 bg-zinc-950 rounded-lg p-3 font-mono">
                postgresql://****:****@****
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Your agent can query this database using read-only SELECT statements
                during conversations. Queries are limited to 10 seconds and 1,000 rows.
              </p>
            </div>
          ) : (
            /* Setup state */
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                  <Plug className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    Connect PostgreSQL Database
                  </div>
                  <div className="text-xs text-zinc-500">
                    Your agent will have read-only access
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="My Database"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Connection String
                  </label>
                  <input
                    type="password"
                    value={connString}
                    onChange={(e) => setConnString(e.target.value)}
                    placeholder="postgresql://user:pass@host:5432/db"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={
                  connecting || !connString.trim() || !displayName.trim()
                }
                className="mt-4 w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? "Connecting..." : "Connect Database"}
              </button>

              <p className="text-[10px] text-zinc-600 mt-3">
                Credentials are stored securely and never exposed in agent
                responses. Only read-only SELECT queries are allowed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
