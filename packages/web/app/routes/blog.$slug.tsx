import { api } from "@agent-maker/shared/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router";
import remarkGfm from "remark-gfm";

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  readingTimeMinutes: number;
  featuredImageUrl: string | null;
  ogImageUrl: string | null;
  metaTitle?: string;
  metaDescription?: string;
  authorName: string;
  publishedAt?: number;
  updatedAt: number;
  category: {
    name: string;
    slug: string;
  } | null;
  tags: Array<{
    _id: string;
    name: string;
    slug: string;
  }>;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1800&q=80";

export function meta({ params }: { params: { slug?: string } }) {
  const slugTitle = params.slug
    ?.split("-")
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return [
    { title: slugTitle ? `${slugTitle} | HiGantic Blog` : "HiGantic Blog" },
    {
      name: "description",
      content:
        "Read the HiGantic Blog for practical notes on AI agents, memory, tools, and automation.",
    },
  ];
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = useQuery(
    api.blogPosts.getBySlug,
    slug ? { slug } : "skip"
  ) as BlogPost | null | undefined;

  if (post === undefined) return <PostSkeleton />;
  if (post === null) return <PostNotFound />;

  const publishedIso = post.publishedAt
    ? new Date(post.publishedAt).toISOString()
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImageUrl || post.ogImageUrl || undefined,
    author: { "@type": "Person", name: post.authorName },
    datePublished: publishedIso,
    dateModified: new Date(post.updatedAt).toISOString(),
    publisher: {
      "@type": "Organization",
      name: "HiGantic",
      url: "https://higantic.com",
    },
    timeRequired: `PT${post.readingTimeMinutes}M`,
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <header className="mx-auto max-w-7xl px-5 pb-10 pt-24 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Blog
          </Link>

          <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                {post.category && (
                  <span className="font-medium text-emerald-300">
                    {post.category.name}
                  </span>
                )}
                {post.publishedAt && (
                  <time dateTime={publishedIso}>{formatDate(post.publishedAt)}</time>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {post.readingTimeMinutes} min read
                </span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-tight text-zinc-50 sm:text-6xl">
                {post.title}
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              {post.excerpt}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="relative aspect-[16/8.5] min-h-[260px] overflow-hidden border border-zinc-800 bg-zinc-900">
            <img
              src={post.featuredImageUrl ?? FALLBACK_IMAGE}
              alt=""
              className="h-full w-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-transparent to-transparent" />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[220px_minmax(0,720px)_1fr] lg:px-8">
          <aside className="hidden text-sm text-zinc-500 lg:block">
            <div className="sticky top-24 border-t border-zinc-800 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Written by
              </p>
              <p className="mt-3 font-medium text-zinc-300">{post.authorName}</p>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="prose prose-invert max-w-none prose-headings:tracking-tight prose-headings:text-zinc-100 prose-p:leading-8 prose-p:text-zinc-400 prose-a:text-emerald-300 prose-strong:text-zinc-100 prose-code:text-emerald-200 prose-pre:border prose-pre:border-zinc-800 prose-pre:bg-zinc-900 prose-blockquote:border-l-emerald-300/40 prose-blockquote:text-zinc-400">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-4 transition-colors hover:decoration-emerald-300"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {post.tags.length > 0 && (
              <div className="mt-12 border-t border-zinc-800 pt-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag._id}
                      className="border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 border border-emerald-400/20 bg-emerald-400/5 p-5">
              <p className="text-sm font-semibold text-zinc-100">
                Build the workflow behind the article.
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Create an agent with memory, tools, pages, and event-driven
                automations in one workspace.
              </p>
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"
              >
                Start building
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}

function PostSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-24 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-24 animate-pulse bg-zinc-800" />
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="h-4 w-56 animate-pulse bg-zinc-800" />
            <div className="h-16 w-full animate-pulse bg-zinc-800" />
            <div className="h-16 w-3/4 animate-pulse bg-zinc-800" />
          </div>
          <div className="h-28 animate-pulse bg-zinc-900" />
        </div>
        <div className="mt-10 aspect-[16/8.5] animate-pulse bg-zinc-900" />
      </div>
    </main>
  );
}

function PostNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 text-center text-zinc-100">
      <div>
        <h1 className="text-3xl font-semibold">Post not found</h1>
        <p className="mt-3 text-sm text-zinc-500">
          This article is unpublished or the link has changed.
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          Back to blog
        </Link>
      </div>
    </main>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
