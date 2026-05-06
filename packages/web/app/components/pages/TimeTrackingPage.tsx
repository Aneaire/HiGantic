import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Clock, Play, Square, Plus, Trash2, Tag } from "lucide-react";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function groupByDay(entries: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.startTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
  }
  return groups;
}

export function TimeTrackingPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const entries = useQuery(api.tabTimeEntries.list, { tabId: tab._id, limit: 100 });
  const runningEntry = useQuery(api.tabTimeEntries.listRunning, { agentId: tab.agentId });
  const summary = useQuery(api.tabTimeEntries.getSummary, { tabId: tab._id, period: "today" });
  const weekSummary = useQuery(api.tabTimeEntries.getSummary, { tabId: tab._id, period: "week" });

  const startTimer = useMutation(api.tabTimeEntries.startTimer);
  const stopTimer = useMutation(api.tabTimeEntries.stopTimer);
  const createEntry = useMutation(api.tabTimeEntries.create);
  const removeEntry = useMutation(api.tabTimeEntries.remove);

  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [manualBillable, setManualBillable] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Live timer update
  useEffect(() => {
    if (!runningEntry) return;
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - runningEntry.startTime) / 1000));
    }, 1000);
    setElapsed(Math.round((Date.now() - runningEntry.startTime) / 1000));
    return () => clearInterval(interval);
  }, [runningEntry]);

  const handleStart = async () => {
    if (!description.trim()) return;
    const parsedTags = tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    await startTimer({
      tabId: tab._id,
      description: description.trim(),
      tags: parsedTags,
    });
    setDescription("");
    setTags("");
  };

  const handleStop = async () => {
    await stopTimer({ agentId: tab.agentId });
  };

  const handleManualLog = async () => {
    if (!manualDesc.trim() || !manualDuration.trim()) return;
    const minutes = parseFloat(manualDuration);
    if (isNaN(minutes) || minutes <= 0) return;
    const parsedTags = manualTags.trim() ? manualTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    await createEntry({
      tabId: tab._id,
      description: manualDesc.trim(),
      durationMinutes: minutes,
      tags: parsedTags,
      billable: manualBillable || undefined,
    });
    setManualDesc("");
    setManualDuration("");
    setManualTags("");
    setManualBillable(false);
    setShowManual(false);
  };

  const grouped = entries ? groupByDay(entries) : {};

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="text-sm font-medium text-zinc-200">{tab.label}</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {summary && (
            <span>Today: <span className="text-zinc-300">{formatDurationShort(summary.totalSeconds)}</span></span>
          )}
          {weekSummary && (
            <span>Week: <span className="text-zinc-300">{formatDurationShort(weekSummary.totalSeconds)}</span></span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Active Timer Banner */}
          {runningEntry && (
            <div className="rounded-2xl border border-neon-400/30 bg-neon-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-neon-400 animate-pulse" />
                <div>
                  <p className="text-sm text-zinc-200">{runningEntry.description}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {runningEntry.tags?.length ? runningEntry.tags.join(", ") : "No tags"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono text-neon-400">{formatDuration(elapsed)}</span>
                <button
                  onClick={handleStop}
                  className="p-2 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-950/60 transition-colors"
                >
                  <Square className="h-4 w-4" fill="currentColor" />
                </button>
              </div>
            </div>
          )}

          {/* Start Timer Form */}
          {!runningEntry && (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  placeholder="What are you working on?"
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Tags (comma sep.)"
                  className="w-36 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={handleStart}
                  disabled={!description.trim()}
                  className="text-xs bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-semibold hover:bg-white disabled:opacity-30 transition-all flex items-center gap-1.5"
                >
                  <Play className="h-3 w-3" fill="currentColor" />
                  Start
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-xs text-zinc-500 px-3 py-2 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3 w-3" />
              Log manual entry
            </button>
          </div>

          {/* Manual Entry Form */}
          {showManual && (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
              <input
                type="text"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="Description"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none transition-colors"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  placeholder="Duration (minutes)"
                  className="w-40 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  value={manualTags}
                  onChange={(e) => setManualTags(e.target.value)}
                  placeholder="Tags (comma sep.)"
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none transition-colors"
                />
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualBillable}
                    onChange={(e) => setManualBillable(e.target.checked)}
                    className="rounded"
                  />
                  Billable
                </label>
              </div>
              <button
                onClick={handleManualLog}
                disabled={!manualDesc.trim() || !manualDuration.trim()}
                className="text-xs bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-semibold hover:bg-white disabled:opacity-30 transition-all"
              >
                Log Entry
              </button>
            </div>
          )}

          {/* Entries List Grouped by Day */}
          {entries === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-zinc-800/20 rounded-xl h-14" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No time entries yet. Start a timer or log time manually.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([day, dayEntries]) => {
                const dayTotal = dayEntries.reduce((sum, e) => {
                  return sum + (e.duration ?? (e.isRunning ? Math.round((Date.now() - e.startTime) / 1000) : 0));
                }, 0);
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-zinc-400">{day}</h3>
                      <span className="text-xs text-zinc-500">{formatDurationShort(dayTotal)}</span>
                    </div>
                    <div className="space-y-1">
                      {dayEntries.map((entry: any) => {
                        const dur = entry.isRunning
                          ? Math.round((Date.now() - entry.startTime) / 1000)
                          : (entry.duration ?? 0);
                        return (
                          <div
                            key={entry._id}
                            className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {entry.isRunning && (
                                <div className="h-2 w-2 rounded-full bg-neon-400 animate-pulse shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm text-zinc-200 truncate">{entry.description}</p>
                                {entry.tags?.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Tag className="h-2.5 w-2.5 text-zinc-600" />
                                    {entry.tags.map((t: string) => (
                                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {entry.billable && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-950/40 text-green-400">$</span>
                              )}
                              <span className={`text-sm font-mono ${entry.isRunning ? "text-neon-400" : "text-zinc-300"}`}>
                                {formatDurationShort(dur)}
                              </span>
                              <button
                                onClick={() => removeEntry({ entryId: entry._id })}
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
