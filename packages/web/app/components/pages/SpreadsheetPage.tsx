import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { Table, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export function SpreadsheetPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const columns = useQuery(api.tabSpreadsheet.listColumns, {
    tabId: tab._id,
  });
  const rows = useQuery(api.tabSpreadsheet.listRows, { tabId: tab._id });
  const addColumn = useMutation(api.tabSpreadsheet.addColumn);
  const removeColumn = useMutation(api.tabSpreadsheet.removeColumn);
  const addRow = useMutation(api.tabSpreadsheet.addRow);
  const updateRow = useMutation(api.tabSpreadsheet.updateRow);
  const removeRow = useMutation(api.tabSpreadsheet.removeRow);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<
    "text" | "number" | "date" | "checkbox"
  >("text");

  async function handleAddColumn() {
    if (!newColName.trim()) return;
    await addColumn({
      tabId: tab._id,
      name: newColName.trim(),
      type: newColType,
    });
    setNewColName("");
    setShowAddCol(false);
  }

  async function handleAddRow() {
    const data: Record<string, any> = {};
    columns?.forEach((col) => {
      data[col.name] = col.type === "checkbox" ? false : "";
    });
    await addRow({ tabId: tab._id, data });
  }

  async function handleCellChange(
    rowId: any,
    currentData: any,
    colName: string,
    value: any
  ) {
    await updateRow({
      rowId,
      data: { ...currentData, [colName]: value },
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium">{tab.label}</h2>
          {rows && (
            <span className="text-xs text-zinc-500">
              ({rows.length} rows)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCol(true)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Column
          </button>
          <button
            onClick={handleAddRow}
            disabled={!columns || columns.length === 0}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Row
          </button>
        </div>
      </div>

      {/* Add Column Dialog */}
      {showAddCol && (
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Column name"
            autoFocus
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddColumn();
              if (e.key === "Escape") setShowAddCol(false);
            }}
          />
          <select
            value={newColType}
            onChange={(e) => setNewColType(e.target.value as any)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <button
            onClick={handleAddColumn}
            disabled={!newColName.trim()}
            className="text-xs bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-md font-medium hover:bg-zinc-200 disabled:opacity-30"
          >
            Add
          </button>
          <button
            onClick={() => setShowAddCol(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!columns || columns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Add a column to get started
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="w-10 px-2 py-2 text-zinc-600 text-xs font-medium">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col._id}
                    className="px-3 py-2 text-left text-xs font-medium text-zinc-400 group"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {col.name}{" "}
                        <span className="text-zinc-600">({col.type})</span>
                      </span>
                      <button
                        onClick={() => removeColumn({ columnId: col._id })}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows?.map((row, i) => (
                <tr
                  key={row._id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/30 group"
                >
                  <td className="px-2 py-1.5 text-xs text-zinc-600 text-center">
                    {i + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col._id} className="px-1 py-0.5">
                      <CellEditor
                        type={col.type}
                        value={(row.data as any)?.[col.name]}
                        onChange={(val) =>
                          handleCellChange(row._id, row.data, col.name, val)
                        }
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    <button
                      onClick={() => removeRow({ rowId: row._id })}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CellEditor({
  type,
  value,
  onChange,
}: {
  type: string;
  value: any;
  onChange: (val: any) => void;
}) {
  if (type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-600"
      />
    );
  }

  return (
    <input
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      value={value ?? ""}
      onChange={(e) =>
        onChange(type === "number" ? Number(e.target.value) : e.target.value)
      }
      className="w-full bg-transparent px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:bg-zinc-800 rounded"
    />
  );
}
