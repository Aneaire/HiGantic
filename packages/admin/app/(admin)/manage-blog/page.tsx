"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

type BlogStatus = "draft" | "published" | "scheduled";

const STATUS_TABS: Array<{ value: BlogStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
];

const STATUS_BADGE: Record<BlogStatus, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  published: "bg-emerald-900/60 text-emerald-400",
  scheduled: "bg-blue-900/60 text-blue-400",
};

export default function BlogListPage() {
  const [statusFilter, setStatusFilter] = useState<BlogStatus | "all">("all");
  const [search, setSearch] = useState("");

  const posts = useQuery(api.blogPosts.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
    searchQuery: search.trim() || undefined,
  });
  const categories = useQuery(api.blogCategories.list);
  const publishPost = useMutation(api.blogPosts.publish);
  const unpublishPost = useMutation(api.blogPosts.unpublish);
  const removePost = useMutation(api.blogPosts.remove);

  const categoryMap = new Map(
    (categories ?? []).map((c) => [c._id, c.name])
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/60 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Blog Posts</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage and generate blog content
            </p>
          </div>
          <Link
            href="/manage-blog/new"
            className="text-sm bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-semibold hover:bg-white transition-all"
          >
            New Post
          </Link>
        </div>
      </header>

      <main className="px-8 py-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1 rounded-lg bg-zinc-900/50 border border-zinc-800/60 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === tab.value
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors w-64"
          />
        </div>

        {/* Table */}
        {posts === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-zinc-800/20 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">No posts found</p>
            <Link
              href="/manage-blog/new"
              className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-block"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 text-left">
                  <th className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                    Title
                  </th>
                  <th className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                    Category
                  </th>
                  <th className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post._id}
                    className="border-b border-zinc-800/30 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/manage-blog/edit/${post._id}`}
                        className="text-zinc-100 hover:text-white font-medium"
                      >
                        {post.title}
                      </Link>
                      {post.aiGenerated && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-violet-400 bg-violet-900/30 px-1.5 py-0.5 rounded">
                          AI
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[post.status]}`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {post.categoryId
                        ? categoryMap.get(post.categoryId) ?? "—"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {post.status === "draft" ? (
                          <button
                            onClick={() => publishPost({ id: post._id })}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Publish
                          </button>
                        ) : post.status === "published" ? (
                          <button
                            onClick={() => unpublishPost({ id: post._id })}
                            className="text-xs text-zinc-400 hover:text-zinc-300"
                          >
                            Unpublish
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            if (confirm("Delete this post?")) {
                              removePost({ id: post._id });
                            }
                          }}
                          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
