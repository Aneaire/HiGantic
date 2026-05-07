import { ConvexHttpClient } from "convex/browser";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await convex.query(api.blogPosts.getBySlug, { slug });
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : undefined,
      modifiedTime: new Date(post.updatedAt).toISOString(),
      authors: [post.authorName],
      images: post.ogImageUrl
        ? [{ url: post.ogImageUrl, width: 1200, height: 630 }]
        : post.featuredImageUrl
          ? [{ url: post.featuredImageUrl }]
          : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await convex.query(api.blogPosts.getBySlug, { slug });
  if (!post) notFound();

  const wordCount = post.content.split(/\s+/).filter(Boolean).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImageUrl || post.ogImageUrl || undefined,
    author: { "@type": "Person", name: post.authorName },
    datePublished: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    publisher: {
      "@type": "Organization",
      name: "HiGantic",
      url: "https://higantic.com",
    },
    wordCount,
    timeRequired: `PT${post.readingTimeMinutes}M`,
    mainEntityOfPage: { "@type": "WebPage" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-5xl mx-auto px-6 pb-24">
        {/* Back link */}
        <div className="pt-8 mb-10">
          <a
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="opacity-60"
            >
              <path
                d="M9 2L4 7l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            All posts
          </a>
        </div>

        {/* Article header */}
        <header className="max-w-3xl mb-10">
          <div className="flex items-center gap-3 mb-5">
            {post.category && (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                {post.category.name}
              </span>
            )}
            {post.publishedAt && (
              <time
                dateTime={new Date(post.publishedAt).toISOString()}
                className="text-sm text-zinc-500"
              >
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            <span className="text-zinc-700">·</span>
            <span className="text-sm text-zinc-500">
              {post.readingTimeMinutes} min read
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-5">
            {post.title}
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed">
            {post.excerpt}
          </p>

          <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 flex items-center justify-center text-xs font-bold text-emerald-400">
              {post.authorName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                {post.authorName}
              </p>
            </div>
          </div>
        </header>

        {/* Featured image */}
        {post.featuredImageUrl && (
          <div className="mb-12 rounded-2xl overflow-hidden border border-white/5">
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="w-full"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex gap-12 items-start">
          <div className="flex-1 min-w-0">
            <div className="article-body">
              <MarkdownContent content={post.content} />
            </div>
          </div>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-14 pt-8 border-t border-white/5">
            <p className="text-xs uppercase tracking-widest text-zinc-600 font-semibold mb-4">
              Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: any) => (
                <span
                  key={tag._id}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/8 text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors cursor-default"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <p className="text-sm text-emerald-400 font-medium mb-2">
            Build your first AI agent
          </p>
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to automate with agents?
          </h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            HiGantic gives your agents persistent memory, tool integrations, and
            event-driven automations — all in one platform.
          </p>
          <a
            href="https://higantic.com"
            className="inline-flex items-center gap-2 bg-white text-zinc-900 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-zinc-100 transition-colors"
          >
            Start for free
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </article>

      <style>{`
        .article-body p {
          color: rgb(161 161 170);
          line-height: 1.85;
          margin-bottom: 1.5rem;
          font-size: 1.0625rem;
        }
        .article-body h2 {
          color: rgb(244 244 245);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-top: 2.75rem;
          margin-bottom: 1rem;
          line-height: 1.3;
        }
        .article-body h3 {
          color: rgb(228 228 231);
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }
        .article-body h4 {
          color: rgb(212 212 216);
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .article-body ul, .article-body ol {
          margin-bottom: 1.5rem;
          padding-left: 1.25rem;
          color: rgb(161 161 170);
          line-height: 1.8;
        }
        .article-body ul { list-style-type: disc; }
        .article-body ol { list-style-type: decimal; }
        .article-body li {
          margin-bottom: 0.4rem;
          font-size: 1.0625rem;
        }
        .article-body li::marker { color: rgb(52 211 153 / 0.6); }
        .article-body strong {
          color: rgb(228 228 231);
          font-weight: 600;
        }
        .article-body em { color: rgb(212 212 216); }
        .article-body a {
          color: rgb(52 211 153);
          text-decoration: underline;
          text-decoration-color: rgb(52 211 153 / 0.3);
          text-underline-offset: 3px;
          transition: text-decoration-color 0.15s;
        }
        .article-body a:hover {
          text-decoration-color: rgb(52 211 153);
        }
        .article-body code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.875em;
          color: rgb(110 231 183);
          background: rgb(52 211 153 / 0.08);
          padding: 0.15em 0.4em;
          border-radius: 0.25rem;
        }
        .article-body pre {
          background: rgb(24 24 27);
          border: 1px solid rgb(255 255 255 / 0.06);
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem;
          overflow-x: auto;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        .article-body pre code {
          background: none;
          padding: 0;
          color: rgb(212 212 216);
          font-size: 1em;
        }
        .article-body blockquote {
          border-left: 2px solid rgb(52 211 153 / 0.4);
          padding-left: 1.25rem;
          margin: 1.5rem 0;
          color: rgb(113 113 122);
          font-style: italic;
        }
        .article-body blockquote p { color: rgb(113 113 122); }
        .article-body hr {
          border: none;
          border-top: 1px solid rgb(255 255 255 / 0.06);
          margin: 2.5rem 0;
        }
        .article-body img {
          border-radius: 0.75rem;
          border: 1px solid rgb(255 255 255 / 0.06);
          margin: 1.5rem 0;
        }
      `}</style>
    </>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(
          `<pre><code>${codeBlockContent.join("\n")}</code></pre>`
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        if (inList) {
          html.push(listType === "ul" ? "</ul>" : "</ol>");
          inList = false;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(escapeHtml(line));
      continue;
    }

    const isListItem =
      line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/);
    if (inList && !isListItem && line.trim() !== "") {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
    }

    if (line.trim() === "") {
      if (inList) {
        html.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
      }
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(
        `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`
      );
      continue;
    }

    if (line.match(/^[-*_]{3,}\s*$/)) {
      html.push("<hr />");
      continue;
    }

    if (line.startsWith("> ")) {
      html.push(
        `<blockquote><p>${inlineFormat(line.slice(2))}</p></blockquote>`
      );
      continue;
    }

    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)/);
    if (ulMatch) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
        listType = "ul";
      }
      html.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList) {
        html.push("<ol>");
        inList = true;
        listType = "ol";
      }
      html.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      html.push(
        `<img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}" />`
      );
      continue;
    }

    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) html.push(listType === "ul" ? "</ul>" : "</ol>");

  return <div dangerouslySetInnerHTML={{ __html: html.join("\n") }} />;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
