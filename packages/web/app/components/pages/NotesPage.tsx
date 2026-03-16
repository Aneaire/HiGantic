import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { FileText, Plus, Trash2, Search, ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";
import type { Id } from "@agent-maker/shared/convex/_generated/dataModel";

export function NotesPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const notes = useQuery(api.tabNotes.list, { tabId: tab._id });
  const createNote = useMutation(api.tabNotes.create);
  const updateNote = useMutation(api.tabNotes.update);
  const removeNote = useMutation(api.tabNotes.remove);
  const [selectedId, setSelectedId] = useState<Id<"tabNotes"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useQuery(
    api.tabNotes.search,
    searchQuery.trim()
      ? { tabId: tab._id, query: searchQuery.trim() }
      : "skip"
  );

  const displayNotes = searchQuery.trim() ? searchResults : notes;
  const selectedNote = notes?.find((n) => n._id === selectedId);

  async function handleCreate() {
    const id = await createNote({
      tabId: tab._id,
      title: "Untitled",
    });
    setSelectedId(id);
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Note List */}
      <div className="w-64 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium">{tab.label}</span>
          </div>
          <button
            onClick={handleCreate}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {displayNotes === undefined ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : displayNotes.length === 0 ? (
            <p className="text-xs text-zinc-600 px-2 py-4 text-center">
              {searchQuery ? "No matches" : "No notes yet"}
            </p>
          ) : (
            displayNotes.map((note) => (
              <button
                key={note._id}
                onClick={() => setSelectedId(note._id)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                  selectedId === note._id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                <div className="text-sm truncate">{note.title}</div>
                <div className="text-xs text-zinc-600 truncate mt-0.5">
                  {note.content.substring(0, 50) || "Empty note"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onUpdate={(updates) =>
              updateNote({ noteId: selectedNote._id, ...updates })
            }
            onDelete={() => {
              removeNote({ noteId: selectedNote._id });
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  onUpdate,
  onDelete,
}: {
  note: Doc<"tabNotes">;
  onUpdate: (updates: { title?: string; content?: string }) => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="bg-transparent text-sm font-medium text-zinc-100 focus:outline-none flex-1"
        />
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={note.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="Start writing..."
        className="flex-1 bg-transparent px-6 py-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none font-mono"
      />
    </>
  );
}
