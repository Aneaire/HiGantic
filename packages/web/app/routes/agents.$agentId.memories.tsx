import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useOutletContext } from "react-router";
import { Brain, Trash2, Search } from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";
import type { Id } from "@agent-maker/shared/convex/_generated/dataModel";

export default function MemoriesPage() {
  const { agent } = useOutletContext<{ agent: Doc<"agents"> }>();
  const [searchQuery, setSearchQuery] = useState("");

  const memories = useQuery(api.memories.list, { agentId: agent._id });
  const searchResults = useQuery(
    api.memories.search,
    searchQuery.trim()
      ? { agentId: agent._id, query: searchQuery.trim() }
      : "skip"
  );
  const removeMemory = useMutation(api.memories.remove);

  const displayMemories = searchQuery.trim() ? searchResults : memories;

  async function handleDelete(memoryId: Id<"memories">) {
    if (!confirm("Delete this memory?")) return;
    await removeMemory({ memoryId });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium">Memories</h2>
          {memories && (
            <span className="text-xs text-zinc-500">
              ({memories.length})
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-zinc-800">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {displayMemories === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-zinc-900 animate-pulse"
              />
            ))}
          </div>
        ) : displayMemories.length === 0 ? (
          <div className="text-center py-16">
            <Brain className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {searchQuery.trim()
                ? "No memories match your search"
                : "No memories stored yet"}
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Memories are automatically created during conversations
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {displayMemories.map((memory) => (
              <div
                key={memory._id}
                className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">{memory.content}</p>
                  {memory.category && (
                    <span className="inline-block mt-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      {memory.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(memory._id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
