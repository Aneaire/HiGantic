import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import {
  CheckSquare,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

const COLUMNS = [
  { key: "todo" as const, label: "To Do", color: "text-zinc-400" },
  { key: "in_progress" as const, label: "In Progress", color: "text-amber-400" },
  { key: "done" as const, label: "Done", color: "text-emerald-400" },
];

export function TasksPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const tasks = useQuery(api.tabTasks.list, { tabId: tab._id });
  const createTask = useMutation(api.tabTasks.create);
  const updateTask = useMutation(api.tabTasks.update);
  const removeTask = useMutation(api.tabTasks.remove);
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  async function handleCreate(status: "todo" | "in_progress" | "done") {
    if (!newTitle.trim()) return;
    await createTask({
      tabId: tab._id,
      title: newTitle.trim(),
      status,
    });
    setNewTitle("");
    setNewTaskColumn(null);
  }

  async function handleMove(
    taskId: any,
    status: "todo" | "in_progress" | "done"
  ) {
    await updateTask({ taskId, status });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-2 shrink-0">
        <CheckSquare className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-medium">{tab.label}</h2>
        {tasks && (
          <span className="text-xs text-zinc-500">({tasks.length})</span>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-h-full">
          {COLUMNS.map((col) => {
            const columnTasks =
              tasks?.filter((t) => t.status === col.key) ?? [];

            return (
              <div
                key={col.key}
                className="w-72 shrink-0 flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800"
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setNewTaskColumn(col.key)}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {newTaskColumn === col.key && (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreate(col.key);
                          if (e.key === "Escape") {
                            setNewTaskColumn(null);
                            setNewTitle("");
                          }
                        }}
                        placeholder="Task title..."
                        autoFocus
                        className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleCreate(col.key)}
                          disabled={!newTitle.trim()}
                          className="text-xs bg-zinc-100 text-zinc-900 px-2.5 py-1 rounded font-medium hover:bg-zinc-200 disabled:opacity-30 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setNewTaskColumn(null);
                            setNewTitle("");
                          }}
                          className="text-xs text-zinc-500 px-2 py-1 hover:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onMove={handleMove}
                      onDelete={() => removeTask({ taskId: task._id })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onMove,
  onDelete,
}: {
  task: Doc<"tabTasks">;
  onMove: (taskId: any, status: "todo" | "in_progress" | "done") => void;
  onDelete: () => void;
}) {
  const priorityColors = {
    high: "bg-red-950 text-red-400",
    medium: "bg-amber-950 text-amber-400",
    low: "bg-zinc-800 text-zinc-400",
  };

  const nextStatus: Record<string, "todo" | "in_progress" | "done"> = {
    todo: "in_progress",
    in_progress: "done",
    done: "todo",
  };

  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onMove(task._id, nextStatus[task.status])}
          className="text-sm text-zinc-200 text-left flex-1 hover:text-zinc-100"
          title={`Move to ${nextStatus[task.status].replace("_", " ")}`}
        >
          {task.title}
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 transition-all"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}
      {task.priority && (
        <span
          className={`inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </span>
      )}
    </div>
  );
}
