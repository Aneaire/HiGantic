---
name: blog-generator
description: Generate, edit, seed, or publish HiGantic blog posts for this repository. Use this skill whenever the user asks for blog content, SEO posts, article drafts, seeded blog examples, admin blog entries, featured/OG image prompts, or changes to the HiGantic blog system, even if they only say "write a post" or "make a blog".
---

# HiGantic Blog Generator

Generate production-ready blog content and repository changes for the HiGantic blog system.

## Scope

Use this skill for:
- Drafting a HiGantic blog post.
- Creating a seeded/sample blog post in Convex.
- Preparing content for the admin blog editor.
- Updating blog categories, tags, SEO metadata, featured image prompts, or OG image prompts.
- Verifying blog listing and article routes in `packages/web`.

Do not use this skill for:
- Generic marketing pages that are not blog posts.
- Agent workspace page types unrelated to public blog content.
- Admin authentication or non-blog CMS changes.

## Repository Map

Read only the files needed for the task:

- Public web listing: `packages/web/app/routes/blog.tsx`
- Public article route: `packages/web/app/routes/blog.$slug.tsx`
- Web route registry: `packages/web/app/routes.ts`
- Admin listing: `packages/admin/app/(admin)/manage-blog/page.tsx`
- Admin editor: `packages/admin/app/(admin)/manage-blog/_components/BlogEditor.tsx`
- AI generation panel: `packages/admin/app/(admin)/manage-blog/_components/AiGenerationPanel.tsx`
- Public admin blog surface: `packages/admin/app/(public)/blog/`
- Convex posts API: `packages/shared/convex/blogPosts.ts`
- Convex categories API: `packages/shared/convex/blogCategories.ts`
- Convex tags API: `packages/shared/convex/blogTags.ts`
- Convex AI generation: `packages/shared/convex/blogGeneration.ts`
- Sample seed: `packages/shared/convex/blogSeed.ts`
- Schema: `packages/shared/convex/schema.ts`, tables `blogCategories`, `blogTags`, `blogPosts`

## Content Contract

Every generated post should have:

- `title`: clear, specific, SEO-aware, not clickbait.
- `slug`: lowercase, hyphen-separated, URL-safe.
- `excerpt`: under 300 characters, suitable for listing cards.
- `content`: Markdown body, title omitted because the page renders the H1.
- `metaTitle`: under 60 characters when feasible.
- `metaDescription`: under 160 characters.
- `suggestedTags`: 3 to 6 short tags.
- `category`: one concise category if the task asks for categorization.
- `status`: default to `draft` unless the user explicitly asks to publish.

Use H2/H3 headings only inside `content`. Keep body paragraphs readable, generally 2 to 5 sentences. Use code blocks only when they add practical value.

## Voice

HiGantic blog posts should read like practical field notes for builders using AI agents:

- Concrete over hype.
- Operational examples over abstract predictions.
- Clear technical detail without academic density.
- Honest tradeoffs, failure modes, and verification steps.
- No em dashes.
- No generic "in today's fast-paced digital landscape" openings.
- No unsupported claims about dates, model capabilities, pricing, or laws.

For current topics, model names, regulations, APIs, or pricing, verify with browsing before writing. Use exact dates when discussing recent events.

## Generation Workflow

1. Identify the post target:
   - audience: founders, operators, developers, support teams, marketers, or agent builders.
   - outcome: educate, compare, announce, tutorial, architecture note, or SEO acquisition.
   - funnel stage: awareness, evaluation, implementation, or retention.

2. Gather repository context:
   - Read the blog files listed above only as needed.
   - Check existing categories/tags if assigning taxonomy.
   - Preserve current schema fields and route conventions.

3. Draft the post package:
   - Create the title, slug, excerpt, metadata, tags, and Markdown body.
   - Include practical sections: problem, agent workflow, implementation pattern, verification, limitations, next step.
   - Avoid publishing language unless the user explicitly asks for a publish-ready post.

4. If editing repository files:
   - Use `apply_patch` for manual edits.
   - Keep edits scoped to blog files.
   - Do not rewrite unrelated admin or web surfaces.
   - Do not overwrite user changes in dirty files.

5. If adding a seed post:
   - Add or update a seed function in `packages/shared/convex/blogSeed.ts` or a clearly named blog seed module.
   - Compute reading time using the same markdown-stripping pattern from `blogPosts.ts`.
   - Use `status: "published"` only for explicit public sample posts.

6. If using the Convex AI generation action:
   - Content action: `api.blogGeneration.generateContent`
   - Image actions: `api.blogGeneration.generateFeaturedImage`, `api.blogGeneration.generateOgImage`
   - Required env vars: `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`; image generation also needs `NANO_BANANA_API_KEY`.

## Output Formats

When the user asks for content only, return:

```json
{
  "title": "",
  "slug": "",
  "excerpt": "",
  "content": "",
  "metaTitle": "",
  "metaDescription": "",
  "suggestedTags": []
}
```

When the user asks to create repository changes, edit files directly and summarize:

- files changed.
- post status.
- verification run.
- any env vars or manual publish step still needed.

## Verification

Run the smallest useful checks:

```bash
npm run typecheck --workspace packages/web
```

If blog backend/schema files changed, also run:

```bash
npm run typecheck
```

For visual smoke testing:

```bash
cd packages/web && bun run dev
curl -I http://127.0.0.1:5173/blog
```

If Convex blog data changed and the environment is configured:

```bash
npx convex run blogSeed:createSamplePost '{}'
```

If checks fail because of known unrelated workspace issues, report the first relevant errors and separate them from blog-specific issues.

## Quality Checklist

Before finalizing:

- The post body does not include an H1.
- The excerpt is under 300 characters.
- The meta description is under 160 characters.
- Slug is unique or the code handles duplicates.
- Markdown renders correctly with `react-markdown` and `remark-gfm`.
- Images have a real URL, storage ID, or intentional fallback.
- Draft/published status matches the user's request.
- No unrelated dirty files were staged for commit.
