"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Nano Banana config ────────────────────────────────────────────────

const NANO_BANANA_BASE = "https://api.nanobananaapi.ai/api/v1/nanobanana";
const NANO_BANANA_POLL_INTERVAL = 3000;
const NANO_BANANA_MAX_POLLS = 60;

// ── Gemini content generation ─────────────────────────────────────────

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const generateContent = action({
  args: {
    topic: v.string(),
    keywords: v.optional(v.array(v.string())),
    tone: v.optional(v.string()),
    length: v.optional(
      v.union(v.literal("short"), v.literal("medium"), v.literal("long"))
    ),
  },
  handler: async (_ctx, args) => {
    const apiKey =
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const wordTargets = { short: 800, medium: 1500, long: 2500 };
    const targetWords = wordTargets[args.length ?? "medium"];
    const keywordList = args.keywords?.length
      ? `Target keywords: ${args.keywords.join(", ")}.`
      : "";
    const toneInstr = args.tone ? `Tone: ${args.tone}.` : "Tone: professional.";

    const systemPrompt = `You are an expert SEO blog writer. Generate a complete blog post as a JSON object.

Requirements:
- Target approximately ${targetWords} words for the content body
- ${toneInstr}
- ${keywordList}
- Use proper heading hierarchy: H2 and H3 only (the title is H1)
- Include a compelling introduction and conclusion
- Naturally incorporate target keywords without stuffing
- Write in markdown format for the content field
- Meta description must be under 160 characters
- Excerpt must be under 300 characters
- Slug must be URL-safe (lowercase, hyphens only)

Respond with ONLY a JSON object (no markdown code fences) with these fields:
{
  "title": "SEO-optimized title",
  "slug": "url-safe-slug",
  "excerpt": "Compelling excerpt under 300 chars",
  "content": "Full markdown blog content with H2/H3 headings",
  "metaTitle": "SEO meta title (under 60 chars)",
  "metaDescription": "SEO meta description (under 160 chars)",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

    const res = await fetch(
      `${GEMINI_API_BASE}/gemini-3.0-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `Write a blog post about: ${args.topic}` }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content returned from Gemini");

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini returned invalid JSON: " + text.slice(0, 200));
    }
  },
});

// ── NanoBanana image generation for blog posts ────────────────────────

async function generateImageWithNanoBanana(
  apiKey: string,
  prompt: string,
  aspectRatio: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const body: Record<string, unknown> = {
    prompt,
    aspectRatio,
    resolution: "2K",
    outputFormat: "png",
  };

  const submitRes = await fetch(`${NANO_BANANA_BASE}/generate-2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Nano Banana API error (${submitRes.status}): ${err}`);
  }

  const submitData = await submitRes.json();
  const taskId = submitData.data?.taskId;
  if (!taskId) throw new Error("No taskId returned from Nano Banana API");

  for (let i = 0; i < NANO_BANANA_MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, NANO_BANANA_POLL_INTERVAL));

    const pollRes = await fetch(
      `${NANO_BANANA_BASE}/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const status = pollData.data?.successFlag ?? pollData.successFlag;

    if (status === 1) {
      const imageUrl =
        pollData.data?.response?.resultImageUrl ??
        pollData.response?.resultImageUrl;
      if (!imageUrl)
        throw new Error("Nano Banana returned success but no image URL");

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok)
        throw new Error(
          `Failed to download generated image: ${imgRes.status}`
        );
      const buf = await imgRes.arrayBuffer();
      return {
        imageBase64: Buffer.from(buf).toString("base64"),
        mimeType: imgRes.headers.get("content-type") || "image/png",
      };
    } else if (status === 2 || status === 3) {
      const errMsg =
        pollData.data?.errorMessage ??
        pollData.errorMessage ??
        "Unknown error";
      throw new Error(`Nano Banana generation failed: ${errMsg}`);
    }
  }

  throw new Error("Nano Banana image generation timed out");
}

async function uploadAndPatch(
  ctx: any,
  postId: any,
  imageBase64: string,
  mimeType: string,
  field: "featuredImageStorageId" | "ogImageStorageId"
): Promise<string> {
  const uploadUrl = await ctx.storage.generateUploadUrl();
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: Buffer.from(imageBase64, "base64"),
  });
  if (!uploadRes.ok) throw new Error("Failed to upload image to storage");
  const { storageId } = await uploadRes.json();

  await ctx.runMutation(internal.blogPosts._patchImage, {
    id: postId,
    [field]: storageId,
    aiImageModel: "nano_banana_generate_2",
  });

  return storageId;
}

export const generateFeaturedImage = action({
  args: {
    postId: v.id("blogPosts"),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiKey) throw new Error("NANO_BANANA_API_KEY not configured");

    const post = await ctx.runQuery(internal.blogPosts._getById, {
      id: args.postId,
    });
    if (!post) throw new Error("Post not found");

    const imagePrompt =
      args.prompt ||
      `Professional blog featured image for an article titled "${post.title}". ${post.excerpt}. Modern, clean, high-quality digital illustration style. No text overlay.`;

    const { imageBase64, mimeType } = await generateImageWithNanoBanana(
      apiKey,
      imagePrompt,
      "16:9"
    );

    const storageId = await uploadAndPatch(
      ctx,
      args.postId,
      imageBase64,
      mimeType,
      "featuredImageStorageId"
    );
    return { storageId };
  },
});

export const generateOgImage = action({
  args: {
    postId: v.id("blogPosts"),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiKey) throw new Error("NANO_BANANA_API_KEY not configured");

    const post = await ctx.runQuery(internal.blogPosts._getById, {
      id: args.postId,
    });
    if (!post) throw new Error("Post not found");

    const imagePrompt =
      args.prompt ||
      `Open Graph social sharing image for blog post: "${post.title}". Clean, bold, eye-catching design suitable for social media previews. No text overlay.`;

    const { imageBase64, mimeType } = await generateImageWithNanoBanana(
      apiKey,
      imagePrompt,
      "16:9"
    );

    const storageId = await uploadAndPatch(
      ctx,
      args.postId,
      imageBase64,
      mimeType,
      "ogImageStorageId"
    );
    return { storageId };
  },
});
