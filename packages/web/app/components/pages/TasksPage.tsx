import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import {
  CheckSquare,
  Plus,
  Trash2,
  GripVertical,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Palette,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Column config types ────────────────────────────────────────────

interface ColumnConfig {
  key: string;
  label: string;
  color: string; // tailwind color name: zinc, amber, emerald, blue, purple, rose, cyan, orange
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "todo", label: "To Do", color: "zinc" },
  { key: "in_progress", label: "In Progress", color: "amber" },
  { key: "done", label: "Done", color: "emerald" },
];

const COLOR_OPTIONS = [
  { name: "zinc", dot: "bg-zinc-400", text: "text-zinc-400", headerBg: "bg-zinc-500/10", ring: "ring-zinc-500" },
  { name: "amber", dot: "bg-amber-400", text: "text-amber-400", headerBg: "bg-amber-500/10", ring: "ring-amber-500" },
  { name: "emerald", dot: "bg-emerald-400", text: "text-emerald-400", headerBg: "bg-emerald-500/10", ring: "ring-emerald-500" },
  { name: "blue", dot: "bg-blue-400", text: "text-blue-400", headerBg: "bg-blue-500/10", ring: "ring-blue-500" },
  { name: "purple", dot: "bg-purple-400", text: "text-purple-400", headerBg: "bg-purple-500/10", ring: "ring-purple-500" },
  { name: "rose", dot: "bg-rose-400", text: "text-rose-400", headerBg: "bg-rose-500/10", ring: "ring-rose-500" },
  { name: "cyan", dot: "bg-cyan-400", text: "text-cyan-400", headerBg: "bg-cyan-500/10", ring: "ring-cyan-500" },
  { name: "orange", dot: "bg-orange-400", text: "text-orange-400", headerBg: "bg-orange-500/10", ring: "ring-orange-500" },
];

function getColorClasses(colorName: string) {
  return COLOR_OPTIONS.find((c) => c.name === colorName) ?? COLOR_OPTIONS[0];
}

const COLUMN_ICONS: Record<string, typeof Circle> = {
  zinc: Circle,
  amber: Clock,
  emerald: CheckCircle2,
  blue: Circle,
  purple: Circle,
  rose: Circle,
  cyan: Circle,
  orange: Circle,
};

// ── Main component ─────────────────────────────────────────────────

export function TasksPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const tasks = useQuery(api.tabTasks.list, { tabId: tab._id });
  const createTask = useMutation(api.tabTasks.create);
  const updateTask = useMutation(api.tabTasks.update).withOptimisticUpdate(
    (localStore, args) => {
      const currentTasks = localStore.getQuery(api.tabTasks.list, { tabId: tab._id });
      if (currentTasks) {
        localStore.setQuery(
          api.tabTasks.list,
          { tabId: tab._id },
          currentTasks.map((t) =>
            t._id === args.taskId ? { ...t, ...Object.fromEntries(Object.entries(args).filter(([k, v]) => k !== "taskId" && v !== undefined)) } : t
          )
        );
      }
    }
  );
  const removeTask = useMutation(api.tabTasks.remove).withOptimisticUpdate(
    (localStore, args) => {
      const currentTasks = localStore.getQuery(api.tabTasks.list, { tabId: tab._id });
      if (currentTasks) {
        localStore.setQuery(
          api.tabTasks.list,
          { tabId: tab._id },
          currentTasks.filter((t) => t._id !== args.taskId)
        );
      }
    }
  );
  const updateTab = useMutation(api.sidebarTabs.update);

  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Doc<"tabTasks"> | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);

  // Load columns from tab config or use defaults
  const columns: ColumnConfig[] = (tab.config as any)?.columns ?? DEFAULT_COLUMNS;

  function saveColumns(newColumns: ColumnConfig[]) {
    updateTab({
      tabId: tab._id,
      config: { ...(tab.config as any), columns: newColumns },
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function handleCreate(status: string) {
    if (!newTitle.trim()) return;
    await createTask({
      tabId: tab._id,
      title: newTitle.trim(),
      status,
    });
    setNewTitle("");
    setNewTaskColumn(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks?.find((t) => t._id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetStatus: string | null = null;

    // Check if dropped on a column droppable
    const isColumn = columns.some((c) => c.key === overId);
    if (isColumn) {
      targetStatus = overId;
    } else {
      // Dropped on another task — use that task's column
      const overTask = tasks?.find((t) => t._id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    const currentTask = tasks?.find((t) => t._id === taskId);
    if (targetStatus && currentTask && currentTask.status !== targetStatus) {
      updateTask({ taskId: taskId as any, status: targetStatus });
    }
  }

  function handleAddColumn(label: string, color: string) {
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!key || columns.some((c) => c.key === key)) return;
    saveColumns([...columns, { key, label, color }]);
    setShowAddColumn(false);
  }

  function handleRemoveColumn(key: string) {
    // Move tasks from this column to the first column
    const firstCol = columns.find((c) => c.key !== key);
    if (firstCol) {
      tasks
        ?.filter((t) => t.status === key)
        .forEach((t) => updateTask({ taskId: t._id, status: firstCol.key }));
    }
    saveColumns(columns.filter((c) => c.key !== key));
  }

  function handleRenameColumn(key: string, newLabel: string) {
    saveColumns(
      columns.map((c) => (c.key === key ? { ...c, label: newLabel } : c))
    );
  }

  function handleRecolorColumn(key: string, newColor: string) {
    saveColumns(
      columns.map((c) => (c.key === key ? { ...c, color: newColor } : c))
    );
  }

  const totalTasks = tasks?.length ?? 0;
  const doneCol = columns.find((c) => c.key === "done");
  const doneTasks = doneCol
    ? (tasks?.filter((t) => t.status === "done").length ?? 0)
    : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/80">
            <CheckSquare className="h-4 w-4 text-zinc-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{tab.label}</h2>
            {tasks && (
              <p className="text-xs text-zinc-500">
                {totalTasks} task{totalTasks !== 1 ? "s" : ""}
                {doneCol && totalTasks > 0 && ` · ${doneTasks} done`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          {doneCol && totalTasks > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${(doneTasks / totalTasks) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-zinc-500 tabular-nums">
                {Math.round((doneTasks / totalTasks) * 100)}%
              </span>
            </div>
          )}

          {/* Add Column */}
          <button
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Column
          </button>
        </div>
      </div>

      {/* Add Column Dialog */}
      {showAddColumn && (
        <AddColumnDialog
          onAdd={handleAddColumn}
          onClose={() => setShowAddColumn(false)}
        />
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-h-full">
            {columns.map((col) => {
              const columnTasks =
                tasks?.filter((t) => t.status === col.key) ?? [];

              return (
                <KanbanColumn
                  key={col.key}
                  col={col}
                  tasks={columnTasks}
                  isAddingTask={newTaskColumn === col.key}
                  newTitle={newTitle}
                  canDelete={columns.length > 1}
                  onStartAdd={() => setNewTaskColumn(col.key)}
                  onTitleChange={setNewTitle}
                  onConfirmAdd={() => handleCreate(col.key)}
                  onCancelAdd={() => {
                    setNewTaskColumn(null);
                    setNewTitle("");
                  }}
                  onDelete={(taskId) => removeTask({ taskId })}
                  onRemoveColumn={() => handleRemoveColumn(col.key)}
                  onRenameColumn={(name) => handleRenameColumn(col.key, name)}
                  onRecolorColumn={(color) => handleRecolorColumn(col.key, color)}
                />
              );
            })}
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeTask ? (
              <div className="rounded-xl border border-zinc-600 bg-zinc-800 p-3.5 shadow-2xl shadow-black/50 rotate-1 w-68 opacity-90">
                <p className="text-sm text-zinc-100 font-medium">
                  {activeTask.title}
                </p>
                {activeTask.priority && (
                  <PriorityBadge priority={activeTask.priority} />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

// ── Add Column Dialog ──────────────────────────────────────────────

function AddColumnDialog({
  onAdd,
  onClose,
}: {
  onAdd: (label: string, color: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("blue");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="border-b border-zinc-800/60 px-6 py-3 bg-zinc-900/50">
      <div className="flex items-center gap-3 max-w-md">
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && label.trim()) onAdd(label.trim(), color);
            if (e.key === "Escape") onClose();
          }}
          placeholder="Column name..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.name}
              onClick={() => setColor(c.name)}
              className={`h-5 w-5 rounded-full ${c.dot} transition-all ${
                color === c.name
                  ? "ring-2 ring-offset-2 ring-offset-zinc-900 " + c.ring
                  : "opacity-50 hover:opacity-80"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => label.trim() && onAdd(label.trim(), color)}
          disabled={!label.trim()}
          className="text-xs bg-zinc-100 text-zinc-900 px-3 py-2 rounded-lg font-semibold hover:bg-white disabled:opacity-30 transition-all"
        >
          Add
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────

function KanbanColumn({
  col,
  tasks,
  isAddingTask,
  newTitle,
  canDelete,
  onStartAdd,
  onTitleChange,
  onConfirmAdd,
  onCancelAdd,
  onDelete,
  onRemoveColumn,
  onRenameColumn,
  onRecolorColumn,
}: {
  col: ColumnConfig;
  tasks: Doc<"tabTasks">[];
  isAddingTask: boolean;
  newTitle: string;
  canDelete: boolean;
  onStartAdd: () => void;
  onTitleChange: (v: string) => void;
  onConfirmAdd: () => void;
  onCancelAdd: () => void;
  onDelete: (taskId: any) => void;
  onRemoveColumn: () => void;
  onRenameColumn: (name: string) => void;
  onRecolorColumn: (color: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const colorClasses = getColorClasses(col.color);
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(col.label);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <div
      className={`w-76 shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${
        isOver
          ? "border-zinc-600 bg-zinc-800/40 scale-[1.01] shadow-lg shadow-black/20"
          : "border-zinc-800/60 bg-zinc-900/30"
      }`}
    >
      {/* Column Header */}
      <div
        className={`px-4 py-3.5 rounded-t-2xl flex items-center justify-between ${colorClasses.headerBg}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colorClasses.dot}`} />
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                if (renameValue.trim()) onRenameColumn(renameValue.trim());
                setIsRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  onRenameColumn(renameValue.trim());
                  setIsRenaming(false);
                }
                if (e.key === "Escape") setIsRenaming(false);
              }}
              className={`text-sm font-semibold bg-transparent border-b border-zinc-600 focus:outline-none ${colorClasses.text} min-w-0`}
            />
          ) : (
            <span
              className={`text-sm font-semibold truncate ${colorClasses.text}`}
            >
              {col.label}
            </span>
          )}
          <span className="text-xs text-zinc-600 bg-zinc-800/80 px-2 py-0.5 rounded-full font-medium shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onStartAdd}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* Column menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl shadow-black/40 z-20">
                <button
                  onClick={() => {
                    setIsRenaming(true);
                    setRenameValue(col.label);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Rename
                </button>

                {/* Color submenu */}
                <div className="px-3 py-2">
                  <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                    Color
                  </span>
                  <div className="flex gap-1.5 mt-1.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          onRecolorColumn(c.name);
                          setShowMenu(false);
                        }}
                        className={`h-4 w-4 rounded-full ${c.dot} transition-all ${
                          col.color === c.name
                            ? "ring-2 ring-offset-1 ring-offset-zinc-900 " + c.ring
                            : "opacity-50 hover:opacity-80"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {canDelete && (
                  <>
                    <div className="border-t border-zinc-800 my-1" />
                    <button
                      onClick={() => {
                        if (
                          tasks.length === 0 ||
                          confirm(
                            `Delete "${col.label}"? ${tasks.length} task(s) will be moved to the first column.`
                          )
                        ) {
                          onRemoveColumn();
                        }
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete column
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-[80px]">
        {isAddingTask && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3.5 shadow-lg shadow-black/20">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirmAdd();
                if (e.key === "Escape") onCancelAdd();
              }}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={onConfirmAdd}
                disabled={!newTitle.trim()}
                className="text-xs bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-white disabled:opacity-30 transition-all"
              >
                Add Task
              </button>
              <button
                onClick={onCancelAdd}
                className="text-xs text-zinc-500 px-2.5 py-1.5 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              onDelete={() => onDelete(task._id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAddingTask && (
          <button
            onClick={onStartAdd}
            className="flex flex-col items-center justify-center py-6 text-center w-full rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30 transition-all group"
          >
            <Plus className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            <p className="text-xs text-zinc-700 group-hover:text-zinc-500 mt-1 transition-colors">
              Add a task
            </p>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sortable Task Card ─────────────────────────────────────────────

function SortableTaskCard({
  task,
  onDelete,
}: {
  task: Doc<"tabTasks">;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border border-zinc-800/60 bg-zinc-900/80 p-3.5 hover:border-zinc-700 transition-all cursor-default ${
        isDragging ? "opacity-40 scale-95" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing transition-all shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
          {task.priority && <PriorityBadge priority={task.priority} />}
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<
    string,
    { icon: typeof AlertCircle; bg: string; text: string }
  > = {
    high: {
      icon: AlertCircle,
      bg: "bg-red-950/50 ring-1 ring-red-900/30",
      text: "text-red-400",
    },
    medium: {
      icon: Clock,
      bg: "bg-amber-950/50 ring-1 ring-amber-900/30",
      text: "text-amber-400",
    },
    low: {
      icon: Circle,
      bg: "bg-zinc-800/50 ring-1 ring-zinc-700/30",
      text: "text-zinc-400",
    },
  };

  const c = config[priority] ?? config.low;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {priority}
    </span>
  );
}
