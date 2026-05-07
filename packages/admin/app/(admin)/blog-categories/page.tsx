"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useState } from "react";

export default function BlogCategoriesPage() {
  const categories = useQuery(api.blogCategories.list);
  const createCategory = useMutation(api.blogCategories.create);
  const updateCategory = useMutation(api.blogCategories.update);
  const removeCategory = useMutation(api.blogCategories.remove);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    await createCategory({ name: newName.trim(), description: newDescription.trim() || undefined });
    setNewName("");
    setNewDescription("");
  }

  async function handleUpdate(id: any) {
    await updateCategory({
      id,
      name: editName.trim() || undefined,
      description: editDescription.trim() || undefined,
    });
    setEditingId(null);
  }

  async function handleDelete(id: any) {
    if (!confirm("Delete this category?")) return;
    try {
      await removeCategory({ id });
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/60 px-8 py-5">
        <h1 className="text-lg font-semibold text-zinc-100">Blog Categories</h1>
        <p className="text-sm text-zinc-500 mt-1">Organize your blog posts</p>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-8 space-y-8">
        {/* Create */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 space-y-3">
          <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            New Category
          </label>
          <input
            type="text"
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="text-sm bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-semibold hover:bg-white disabled:opacity-30 transition-all"
          >
            Add Category
          </button>
        </div>

        {/* List */}
        {categories === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-zinc-800/20 rounded-xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No categories yet</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 flex items-center justify-between"
              >
                {editingId === cat._id ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none flex-1"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none flex-1"
                    />
                    <button
                      onClick={() => handleUpdate(cat._id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-zinc-100 font-medium">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(cat._id);
                          setEditName(cat.name);
                          setEditDescription(cat.description ?? "");
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
