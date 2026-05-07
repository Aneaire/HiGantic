"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AiGenerationPanel from "./AiGenerationPanel";

interface BlogEditorProps {
  postId?: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BlogEditor({ postId }: BlogEditorProps) {
  const router = useRouter();
  const isEditing = !!postId;

  const existingPost = useQuery(
    api.blogPosts.getById,
    postId ? { id: postId as any } : "skip"
  );
  const categories = useQuery(api.blogCategories.list);
  const tags = useQuery(api.blogTags.list);
  const createPost = useMutation(api.blogPosts.create);
  const updatePost = useMutation(api.blogPosts.update);
  const upsertTags = useMutation(api.blogTags.upsertMany);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Populate from existing post
  useEffect(() => {
    if (!existingPost) return;
    setTitle(existingPost.title);
    setSlug(existingPost.slug);
    setSlugManual(true);
    setExcerpt(existingPost.excerpt);
    setContent(existingPost.content);
    setCategoryId(existingPost.categoryId ?? "");
    setMetaTitle(existingPost.metaTitle ?? "");
    setMetaDescription(existingPost.metaDescription ?? "");
    setStatus(existingPost.status);
  }, [existingPost]);

  // Populate tag names from IDs
  useEffect(() => {
    if (!existingPost?.tagIds?.length || !tags) return;
    const tagMap = new Map(tags.map((t) => [t._id, t.name]));
    const names = existingPost.tagIds
      .map((id) => tagMap.get(id))
      .filter(Boolean);
    setTagInput(names.join(", "));
  }, [existingPost, tags]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  const handleAiContent = useCallback(
    (generated: any) => {
      setTitle(generated.title || "");
      setSlug(slugify(generated.slug || generated.title || ""));
      setSlugManual(true);
      setExcerpt(generated.excerpt || "");
      setContent(generated.content || "");
      setMetaTitle(generated.metaTitle || "");
      setMetaDescription(generated.metaDescription || "");
      if (generated.suggestedTags?.length) {
        setTagInput(generated.suggestedTags.join(", "));
      }
    },
    []
  );

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setSaveStatus("idle");

    try {
      // Upsert tags
      let tagIds: string[] | undefined;
      const tagNames = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagNames.length > 0) {
        tagIds = await upsertTags({ names: tagNames });
      }

      if (isEditing) {
        await updatePost({
          id: postId as any,
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          content,
          categoryId: categoryId ? (categoryId as any) : undefined,
          tagIds: tagIds as any,
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          status,
        });
      } else {
        const newId = await createPost({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          content,
          categoryId: categoryId ? (categoryId as any) : undefined,
          tagIds: tagIds as any,
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          status,
          aiGenerated: false,
        });
        router.push(`/manage-blog/edit/${newId}`);
        return;
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const wordCount = content
    .split(/\s+/)
    .filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/60 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              {isEditing ? "Edit Post" : "New Post"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {isEditing ? `Editing: ${existingPost?.title ?? "..."}` : "Create a new blog post"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saved" && (
              <span className="text-sm text-emerald-400">Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-400">Error saving</span>
            )}
            <button
              onClick={() => router.push("/manage-blog")}
              className="text-sm text-zinc-400 px-3 py-2 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="text-sm bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-semibold hover:bg-white disabled:opacity-30 transition-all"
            >
              {saving ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </header>

      <main className="px-8 py-6">
        {/* AI Generation */}
        <div className="mb-6">
          <AiGenerationPanel
            onContentGenerated={handleAiContent}
            postId={postId}
            onImageGenerated={() => {
              // Re-queries will auto-refresh via Convex reactivity
            }}
          />
        </div>

        <div className="flex gap-6">
          {/* Left: Content */}
          <div className="flex-1 min-w-0 space-y-4">
            <input
              type="text"
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg text-zinc-100 font-semibold focus:border-zinc-500 focus:outline-none transition-colors"
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Slug:</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManual(true);
                }}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 focus:border-zinc-500 focus:outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">Excerpt</span>
                <span
                  className={`text-xs ${
                    excerpt.length > 300 ? "text-red-400" : "text-zinc-600"
                  }`}
                >
                  {excerpt.length}/300
                </span>
              </div>
              <textarea
                placeholder="Brief description for blog listing and SEO..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">Content (Markdown)</span>
                <span className="text-xs text-zinc-600">
                  {wordCount} words &middot; {readingTime} min read
                </span>
              </div>
              <textarea
                placeholder="Write your blog content in Markdown..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors resize-y font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Right: Metadata */}
          <div className="w-72 shrink-0 space-y-4">
            {/* Status */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {/* Category */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
              >
                <option value="">None</option>
                {(categories ?? []).map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Tags
              </label>
              <input
                type="text"
                placeholder="Comma-separated tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-zinc-600">New tags created automatically</p>
            </div>

            {/* Featured Image */}
            {isEditing && existingPost?.featuredImageUrl && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
                <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Featured Image
                </label>
                <img
                  src={existingPost.featuredImageUrl}
                  alt="Featured"
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* OG Image */}
            {isEditing && existingPost?.ogImageUrl && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
                <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  OG Image
                </label>
                <img
                  src={existingPost.ogImageUrl}
                  alt="OG"
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* SEO */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                SEO
              </label>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-600">Meta Title</span>
                  <span
                    className={`text-xs ${
                      metaTitle.length > 60 ? "text-red-400" : "text-zinc-600"
                    }`}
                  >
                    {metaTitle.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="SEO title (defaults to post title)"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-600">Meta Description</span>
                  <span
                    className={`text-xs ${
                      metaDescription.length > 160
                        ? "text-red-400"
                        : "text-zinc-600"
                    }`}
                  >
                    {metaDescription.length}/160
                  </span>
                </div>
                <textarea
                  placeholder="SEO description (defaults to excerpt)"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
