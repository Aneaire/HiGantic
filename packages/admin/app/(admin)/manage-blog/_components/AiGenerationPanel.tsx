"use client";

import { useAction } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useState } from "react";

interface GeneratedContent {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  suggestedTags: string[];
}

interface AiGenerationPanelProps {
  onContentGenerated: (content: GeneratedContent) => void;
  postId?: string;
  onImageGenerated?: () => void;
}

const TONES = ["professional", "casual", "technical", "educational"];
const LENGTHS = [
  { value: "short" as const, label: "Short (~800 words)" },
  { value: "medium" as const, label: "Medium (~1500 words)" },
  { value: "long" as const, label: "Long (~2500 words)" },
];

export default function AiGenerationPanel({
  onContentGenerated,
  postId,
  onImageGenerated,
}: AiGenerationPanelProps) {
  const generateContent = useAction(api.blogGeneration.generateContent);
  const generateFeaturedImage = useAction(api.blogGeneration.generateFeaturedImage);
  const generateOgImage = useAction(api.blogGeneration.generateOgImage);

  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingOg, setGeneratingOg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function handleGenerateContent() {
    if (!topic.trim()) return;
    setGeneratingContent(true);
    setError(null);
    try {
      const result = await generateContent({
        topic: topic.trim(),
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        tone,
        length,
      });
      onContentGenerated(result as GeneratedContent);
    } catch (err: any) {
      setError(err.message || "Content generation failed");
    } finally {
      setGeneratingContent(false);
    }
  }

  async function handleGenerateFeaturedImage() {
    if (!postId) return;
    setGeneratingImage(true);
    setError(null);
    try {
      await generateFeaturedImage({ postId: postId as any });
      onImageGenerated?.();
    } catch (err: any) {
      setError(err.message || "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleGenerateOgImage() {
    if (!postId) return;
    setGeneratingOg(true);
    setError(null);
    try {
      await generateOgImage({ postId: postId as any });
      onImageGenerated?.();
    } catch (err: any) {
      setError(err.message || "OG image generation failed");
    } finally {
      setGeneratingOg(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-violet-300 hover:bg-violet-950/30 transition-colors"
      >
        <span>AI Generation</span>
        <span className="text-xs text-violet-500">
          {expanded ? "Collapse" : "Expand"}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-violet-900/30">
          {/* Content Generation */}
          <div className="pt-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold">
              Generate Content with Gemini 3.0 Flash
            </p>
            <input
              type="text"
              placeholder="Blog topic (e.g., AI agents for business automation)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors"
            />
            <input
              type="text"
              placeholder="Keywords (comma-separated)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors"
            />
            <div className="flex gap-3">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as any)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors"
              >
                {LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerateContent}
              disabled={generatingContent || !topic.trim()}
              className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-500 disabled:opacity-30 transition-all"
            >
              {generatingContent ? "Generating..." : "Generate Content"}
            </button>
          </div>

          {/* Image Generation */}
          {postId && (
            <div className="pt-3 border-t border-violet-900/30 space-y-3">
              <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold">
                Generate Images with NanoBanana 2.0
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateFeaturedImage}
                  disabled={generatingImage}
                  className="text-sm bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 disabled:opacity-30 transition-all border border-zinc-700"
                >
                  {generatingImage
                    ? "Generating..."
                    : "Generate Featured Image"}
                </button>
                <button
                  onClick={handleGenerateOgImage}
                  disabled={generatingOg}
                  className="text-sm bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 disabled:opacity-30 transition-all border border-zinc-700"
                >
                  {generatingOg ? "Generating..." : "Generate OG Image"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
